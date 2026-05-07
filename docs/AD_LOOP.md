# Ad Loop — Google Ads + Meta Ads Dashboard

> Tab in the SEO Command Center for managing paid ads.
> Built on top of the open-source [`kLOsk/adloop`](https://github.com/kLOsk/adloop)
> Python MCP server's safety model (preview-then-confirm, daily budget caps,
> dry-run defaults) — though the Python server itself is optional.

---

## What it does

A single dashboard that mirrors a paid-ads agency console — Google Ads + Meta
Ads in one place, with:

- 30-day combined KPIs (spend, impressions, clicks, CTR, conversions, CPA, ROAS, revenue)
- Per-platform campaign tables with sortable columns + status filter
- **Drill-down** on any campaign: ad groups, search terms (Google), creatives (Meta)
- **Multi-select bulk actions** with one confirm modal
- **Auto-detected alerts** (waste, ROAS drops, creative fatigue, scale opportunities)
- **AI Insights** panel — Claude analyzes the 30-day snapshot and returns a
  prioritized pause / scale / fix list
- **Two-step preview-and-confirm** for every mutation (the AdLoop safety model)

Lives at:

- **In-app** (auth required): `/profiles/[id]/sites/[siteId]` → 📣 Ad Loop tab
- **Public demo** (no auth, sample data): `/demo/ad-loop`

---

## Three integration paths

The dashboard auto-detects which path is configured via env vars and falls
back to sample data when nothing is set, so the UI always renders.

### Option A — Direct REST (recommended, ~15 min setup)

Calls Google Ads REST v17 / Meta Graph API v19.0 directly. Zero extra
infrastructure. Setup walkthrough is built into the in-app setup panel
(open `/demo/ad-loop` → Google Ads tab → setup section → Option A).

```bash
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=...
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_LOGIN_CUSTOMER_ID=9876543210   # only for MCC accounts

META_ADS_ACCESS_TOKEN=EAAG...
META_ADS_AD_ACCOUNT_ID=1234567890
META_ADS_API_VERSION=v19.0
```

### Option B — AdLoop MCP bridge (~10 min, but needs Python host)

Run [`pip install adloop && adloop init && adloop serve --http`](https://github.com/kLOsk/adloop)
on a host the Netlify functions can reach (your Mac for dev, Fly.io / Railway
for prod). Adds an audit log + dry-run guards on top of every mutation.

```bash
ADLOOP_BRIDGE_URL=http://localhost:4545
ADLOOP_BRIDGE_TOKEN=mysecret
```

When both Option A and Option B vars are set, the bridge wins.

### Option C — Sample data (default, no setup)

Lifelike PPC-themed campaigns ("Search · Bachelorette Party Austin", "PMax ·
Private Cruises", etc.) so reviewers can demo the UI before any auth work.
Defined in `src/lib/ads/sample-data.ts`.

---

## File map

```
src/
├── app/
│   ├── api/ads/
│   │   ├── google/route.ts          # GET — campaigns + 30d summary
│   │   ├── meta/route.ts            # GET — campaigns + 30d summary
│   │   ├── overview/route.ts        # GET — combined cross-platform KPIs + 30d series + top campaigns
│   │   ├── alerts/route.ts          # GET — auto-detected alerts (waste / ROAS / fatigue / scale)
│   │   ├── drilldown/route.ts       # GET — ad groups + search terms / creatives
│   │   ├── test-connection/route.ts # GET — pings the configured platform, returns account info or precise error
│   │   └── action/route.ts          # POST — pause/enable/remove with two-step preview-and-confirm
│   └── demo/ad-loop/page.tsx        # Public full-screen demo route
├── components/ads/
│   ├── AdLoopPane.tsx               # Top wrapper with Overview / Google / Meta sub-tabs
│   ├── AdOverview.tsx               # Combined KPIs + chart + leaderboard + AdAlerts
│   ├── AdDashboard.tsx              # Per-platform campaign table (re-used for both Google + Meta)
│   ├── AdDrilldown.tsx              # Inline expand-row with ad groups + search terms / creatives
│   ├── AdAlerts.tsx                 # Auto-detected alerts panel
│   ├── AdInsights.tsx               # Claude analysis (calls /api/agent-chat)
│   └── AdLoopSetup.tsx              # Full setup walkthrough + Test Connection button
└── lib/ads/
    ├── types.ts                     # AdMetrics, Campaign, AdLoopResponse, AdLoopAction
    ├── google.ts                    # readGoogleAdsConfig, getGoogleAdsData, mutateGoogleCampaign, testGoogleAdsConnection
    ├── meta.ts                      # readMetaAdsConfig, getMetaAdsData, mutateMetaCampaign, testMetaAdsConnection
    ├── timeseries.ts                # 30-day daily-cost synthesiser (until live segment-by-date is wired)
    ├── alerts.ts                    # detectAlerts() heuristic engine — pure function over Campaign[]
    ├── drilldown.ts                 # Per-campaign drill-down builder (deterministic synthetic for now)
    ├── drilldown-types.ts           # AdGroup, SearchTerm, CreativeRow, DrilldownPayload
    └── sample-data.ts               # PPC-themed sample campaigns + sumMetrics()
```

---

## Data shape

Both Google + Meta normalize into the same `Campaign` shape so one UI
component handles both:

```ts
type AdPlatform = "google" | "meta";

interface AdMetrics {
  impressions: number;
  clicks: number;
  cost: number;            // dollars
  conversions: number;
  conversion_value: number;
  ctr: number;             // 0-1
  cpc: number;             // dollars
  cpa: number;             // 0 when no conv
  roas: number;            // 0 when no cost
}

interface Campaign {
  id: string;
  platform: AdPlatform;
  name: string;
  status: "ENABLED" | "PAUSED" | "REMOVED" | "ENDED";
  channel: "SEARCH" | "PERFORMANCE_MAX" | "DISPLAY" | "VIDEO" | "SHOPPING"
         | "META_FEED" | "META_REELS" | "META_STORIES" | "META_ADVANTAGE_PLUS"
         | "OTHER";
  daily_budget: number | null;
  metrics: AdMetrics;
  bidding_strategy?: string | null;   // Google
  objective?: string | null;          // Meta
  start_date?: string | null;
  end_date?: string | null;
}
```

---

## Two-step mutation safety model

Every write goes through `POST /api/ads/action`:

```
Step 1 — Preview (dry_run: true)
  → returns { ok, preview: "Google Ads · campaign 123 → PAUSED", applied: false }
  → UI shows confirm modal with the preview text

Step 2 — Confirm (dry_run: false)
  → only fires after operator clicks "Confirm & apply"
  → returns { ok, preview, applied: true }
```

Bulk actions iterate this flow per campaign, with one confirm modal showing
all previews stacked. A failure on any single mutation surfaces in the modal
without rolling back successful ones.

---

## Auto-detected alerts (`src/lib/ads/alerts.ts`)

A pure-function heuristic engine. Given `Campaign[]` it returns ranked
`AdAlert[]`. Currently detects:

| Category | Trigger | Severity | Action |
|---|---|---|---|
| **Waste** | `cost ≥ $100` AND `conversions = 0` | Critical | Pause |
| **Poor ROAS** | `ROAS > 0` AND `< 2x` AND `cost ≥ $100` | Critical (`< 1x`) / Warning | Pause / Fix targeting |
| **Creative fatigue** | `impressions > 50K` AND `CTR < 0.5%` | Warning | Rotate creative |
| **Scale opportunity** | `ROAS ≥ 4x` AND `daily spend ≥ 95% of budget cap` | Info | Raise budget |

Each alert ships with a `monthly_dollar_impact` so the UI sums them into
"Save ~$X/mo" + "+ $Y/mo upside" totals.

The same engine powers the `list_ad_alerts` agent tool — Claude can reason
over alerts in the Command Center chat.

---

## Agent-chat integration

Four tools added to `/api/agent-chat`:

| Tool | What it does |
|---|---|
| `list_ad_campaigns(platform)` | Returns 30-day metrics for every campaign on Google or Meta |
| `list_ad_alerts()` | Returns the auto-detected alert list |
| `get_ad_campaign_drilldown(platform, campaign_id)` | Returns ad groups + search terms / creatives |
| `pause_or_enable_ad_campaign(platform, campaign_id, action, dry_run)` | Mutates with preview-then-confirm — defaults to dry_run:true |

Lets the operator type things like:

> "Show me wasteful Google campaigns and pause the worst one."

Claude calls `list_ad_alerts`, picks the worst-spending zero-conversion one,
calls `pause_or_enable_ad_campaign` with `dry_run:true`, asks the user
to confirm, then calls again with `dry_run:false`.

Mutations only ever fire after explicit confirmation in the chat. The system
prompt for `pause_or_enable_ad_campaign` reinforces that.

---

## V2 admin sync

`/api/seo-sync` now exposes Ad Loop data to the V2 admin via three new
actions:

```
GET /api/seo-sync?action=ads-overview&site_id=...
GET /api/seo-sync?action=ads-google&site_id=...
GET /api/seo-sync?action=ads-meta&site_id=...
```

Same `x-seo-sync-token` header the V2 admin already uses for SEO data.

A ready-to-paste V2-side React component is staged at
[`docs/v2-snippets/AdLoopAdminPanel.tsx`](./v2-snippets/AdLoopAdminPanel.tsx)
— drop it into `client/src/admin/AdLoopAdminPanel.tsx` in the CruiseConcierge
repo, mount inside the existing `SEOCommandCenter` admin component, set 3
Vite env vars, deploy. Done in ~5 min.

The V2 mirror is intentionally **read-only**. Mutations stay on the Command
Center side to keep the customer-site admin simple and prevent accidental
ad-spend changes.

---

## What's queued

| Feature | Status |
|---|---|
| Live daily breakdown (replace synthetic timeseries) | Needs GAQL `segments.date` + Meta `time_increment=1` calls |
| Negative keyword commits | "+ Negative" button on search-term rows is wired in UI but doesn't write yet |
| Multi-account support | Today env vars are global — need per-site config in Supabase |
| Campaign creation flow | Today only pause/enable/remove — adlibs would need full RSA / asset workflow |
| Cron-driven alert digest | Wire `/api/ads/alerts` into the daily Resend digest |
| Real Meta system-user automation | Today the cookie/token rotation is manual; Meta supports never-expiring system-user tokens which we already document but haven't programmatically rotated |
