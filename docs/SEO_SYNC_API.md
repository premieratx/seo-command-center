# `/api/seo-sync` — Cross-app sync API

Public, token-authenticated read/write API the V2 cruise-site admin
(`premieratx/CruiseConcierge`) uses to read/write SEO + Ad Loop data
from the Command Center's shared Supabase + ad-platform integrations.

> If you're an agent working on the V2 site, this is the one API surface
> you call. Don't hit Supabase directly — it's RLS'd and you don't have
> a session anyway. Always go through this route with the shared token.

---

## Auth

```
Header:  x-seo-sync-token: <SEO_SYNC_TOKEN>
```

`SEO_SYNC_TOKEN` is a 16+ char random string. Constant-time compared on
the server. If wrong → 401.

CORS allowlist is set via `SEO_SYNC_ALLOWED_ORIGINS` env var
(comma-separated, **never** `*`). Preflight `OPTIONS` returns 204.

---

## GET endpoints (read)

All take `site_id` as a query param. The Premier Party Cruises site id is
`37292000-d661-4238-8ba4-6a53b71c2d07`.

### SEO data
| URL | Returns |
|---|---|
| `?action=pages&site_id=…` | All `audit_pages` rows with SEO scores, ordered worst-first |
| `?action=overview&site_id=…` | Summary: `{ totalPages, averageScore, highPriorityIssues, pagesNeedingOptimization, lastAnalyzed, metrics: { authority_score, organic_keywords, organic_traffic, total_backlinks, referring_domains } }` |
| `?action=keywords&site_id=…` | Top 300 keywords transformed to PPC admin format: `{ allKeywords: [{ keyword, position, volume, kd, visibility, intent, category, priority, cpc }], stats, categories }` |
| `?action=issues&site_id=…` | All `audit_issues` rows ordered by severity |
| `?action=recommendations&site_id=…` | New `recommendations` rows (status='new', limit 20, ordered by priority) |
| `?action=ai-visibility&site_id=…` | `{ share_of_voice: [...], insights: [...], strategy_reports: [...] }` |

### Ad Loop data (added in the Ad Loop branch)
| URL | Returns |
|---|---|
| `?action=ads-overview&site_id=…` | Combined Google + Meta KPIs, per-platform totals, counts, top campaigns, 30-day series, date range |
| `?action=ads-google&site_id=…` | Google Ads payload: `{ summary: { connected, totals, date_range, ... }, campaigns: [...] }` |
| `?action=ads-meta&site_id=…` | Same shape for Meta |

> Note: `site_id` is accepted but ignored for ads endpoints today (single
> set of ad-platform credentials per server). Stays in the call signature
> so V2 admin can pass it consistently and so we can scope by site once
> multi-tenant ad credentials land.

---

## POST endpoints (write)

`Content-Type: application/json` · body includes `action` + payload.

### `{ "action": "update_page", "site_id": "...", "url": "...", "updates": {...} }`
Update an `audit_pages` row by `(site_id, url)`. Updateable fields:
`title` (or `metaTitle`), `meta_description` (or `metaDescription`), `h1`,
`target_keyword` (or `focusKeyword`).

```json
{ "updated": [...] }
```

### `{ "action": "update_issue", "site_id": "...", "issue_id": "...", "status": "..." }`
Update an `audit_issues` status. When `status === "fixed"`, also stamps
`fixed_at = now()`.

### `{ "action": "dismiss_recommendation", "site_id": "...", "recommendation_id": "..." }`
Sets `recommendations.status = 'dismissed'` + `dismissed_at = now()`.

---

## V2 admin example — read Ad Loop overview

```ts
const r = await fetch(
  `${SEO_DASHBOARD_URL}/api/seo-sync?action=ads-overview&site_id=${SITE_ID}`,
  { headers: { "x-seo-sync-token": SEO_SYNC_TOKEN } }
);
const overview = await r.json();
// overview.totals.combined.cost      // 30-day combined spend
// overview.totals.combined.roas      // combined ROAS
// overview.top_campaigns             // top 8 by spend, cross-platform
// overview.series                    // 30 daily points
// overview.connected.google          // bool
```

A complete ready-to-paste V2 admin component is staged at
[`v2-snippets/AdLoopAdminPanel.tsx`](./v2-snippets/AdLoopAdminPanel.tsx).

---

## V2 admin example — write a meta description

```ts
await fetch(`${SEO_DASHBOARD_URL}/api/seo-sync`, {
  method: "POST",
  headers: {
    "x-seo-sync-token": SEO_SYNC_TOKEN,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    action: "update_page",
    site_id: SITE_ID,
    url: "/wedding-parties",
    updates: {
      metaDescription: "Lake Travis wedding cruise charters for 25-75 guests. Book today, captain included.",
      focusKeyword: "lake travis wedding cruise",
    },
  }),
});
```

---

## Why this API exists (and why V2 doesn't query Supabase directly)

1. **One source of truth** — the Command Center owns the data model.
   Schema changes happen here; V2 keeps a stable contract.
2. **RLS friendliness** — the API uses the service-role key on the server
   side after token check, so V2 doesn't need its own RLS policies.
3. **Audit trail** — every read/write hits the Command Center's logs,
   making cross-app debugging tractable.
4. **Future cron** — once the daily SEMRush refresh + AI Visibility scrape
   move to scheduled Edge Functions, the V2 admin's read calls hit fresh
   data automatically without a code change on the V2 side.

---

## Adding a new action

```ts
// src/app/api/seo-sync/route.ts

case "ads-creative-fatigue": {
  const { detectAlerts } = await import("@/lib/ads/alerts");
  const { getGoogleAdsData } = await import("@/lib/ads/google");
  const { getMetaAdsData } = await import("@/lib/ads/meta");
  const [g, m] = await Promise.all([getGoogleAdsData(), getMetaAdsData()]);
  const alerts = detectAlerts([...g.campaigns, ...m.campaigns])
    .filter((a) => a.category === "creative_fatigue");
  return json({ alerts });
}
```

Add the case to the `switch (action)` in `GET` (or `POST`), then update
the default-error message string at the bottom of the switch so callers
discover the action exists.

V2 admin picks it up immediately — no V2-side deploy needed for a read-only addition.
