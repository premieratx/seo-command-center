# SEMRush + AI Visibility — Integration Manual

> Source repo: `premieratx/seo-command-center` · Live at `seo-command-center.netlify.app`
> Target audience: a different Claude project that needs to replicate this so
> a "Live Websites Admin" section runs the same scraping + ingestion as a
> cron-driven pipeline.
> Last verified against the codebase: 2026-05-07

This is the **complete inventory** of how the SEO Command Center pulls data
from SEMRush — both the REST API and a Playwright-driven browser scraper —
plus the AI Visibility ingestion pipeline that turns that data into
share-of-voice, narrative drivers, perception, and competitive AI questions.

Use it as a copy-paste blueprint when porting this into another project.

---

## TL;DR — what's running today

There are **two parallel data pipelines** that feed the same Supabase tables:

| # | Pipeline | What | How |
|---|---|---|---|
| 1 | **SEMRush REST API** | Organic rankings, domain authority, backlinks, competitors, keyword gap | `https://api.semrush.com` calls with an API key |
| 2 | **SEMRush AI Visibility scraper** | Narrative drivers, brand performance, perception, AI questions — across 4 LLMs | Playwright + bundled Chromium opens authenticated SEMRush AI-Toolkit pages, switches LLMs in a dropdown, extracts the rendered `<main>` text, and ships it to Claude Opus to parse into structured rows |

Plus three **ingestion endpoints** that accept either structured JSON or
raw text/screenshots and use Claude (Opus or Vision) to parse them into
Supabase rows.

**No cron yet.** Today everything runs from manual buttons. Section H below
shows the cron blueprint to add.

---

## Section A — SEMRush REST API (`src/lib/integrations/semrush.ts`)

### Auth

```ts
// Lookup order (first hit wins):
//   1. supabase.app_config row where key = 'semrush_api_key'
//   2. process.env.SEMRUSH_API_KEY
//   3. Hardcoded fallback (read-only PPC key)
const apiKey = await getSemrushApiKey(); // throws if all three miss
```

Endpoint base: `https://api.semrush.com` (with one report on
`https://api.semrush.com/analytics/v1/` for backlinks).

### Reports pulled today

Each report below is implemented as a function in
`src/lib/integrations/semrush.ts`. Column codes are SEMRush's compact
field names — see https://www.semrush.com/api-documentation/ for the full
list.

#### 1. `getDomainMetrics(domain, database="us")` — `?type=domain_ranks`
Used for the Overview KPIs (authority, organic keywords, organic traffic).

```
export_columns = Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac
→ domain_rank, organic_keywords, organic_traffic, organic_cost,
  adwords_keywords, adwords_traffic, adwords_cost
```

→ Writes one row to **`site_metrics`** per refresh.

#### 2. `getOrganicKeywords(domain, limit=500, database="us")` — `?type=domain_organic`
The primary keyword-rankings pull. Limit=500 today; SEMRush will return
up to 100,000 rows per call but quota cost scales linearly.

```
export_columns = Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Nr
→ keyword, position, previous_position, position_difference,
  search_volume, cpc, url, traffic_percent, traffic_cost_percent,
  competition, number_of_results
```

→ Replaces all rows in **`keywords`** for the site (delete-then-insert).

#### 3. `getOrganicPages(domain, limit=50, database="us")` — `?type=domain_organic_organic`
SEMRush's confusingly-named "top organic pages" report. Currently fetched
for audit context but **not persisted**. Easy add to start saving it.

```
export_columns = Ur,Tr,Tc,Nq
→ url, traffic, traffic_percent, keywords_count
```

#### 4. `getKeywordOverview(keyword, database="us")` — `?type=phrase_all`
Per-keyword detail used to fill in **Keyword Difficulty (KD)** which the
domain_organic report doesn't include.

```
export_columns = Ph,Nq,Cp,Co,Kd,Nr,Td
→ keyword, volume, cpc, competition, difficulty, results, trend
```

⚠️ **Implemented but not currently called**. KD column is `NULL` in
`keywords` table because the bulk refresh pulls domain_organic only.
Fix: after the keyword refresh, fan out N concurrent
`getKeywordOverview()` calls (rate-limited) to populate KD.

#### 5. `getDomainHistory(domain)` — `?type=domain_ranks_history`
12 months of monthly snapshots — meant for the position-tracking chart.

```
export_columns = Dt,Rk,Or,Ot,Oc,Ad,At,Ac
```

⚠️ **Implemented but not persisted**. Add a `site_metrics_history` table
or extend `site_metrics` with a date column to record this month-over-month.

#### 6. `getCompetitors(domain, limit=10)` — `?type=domain_organic_organic` (different fields)

```
export_columns = Dn,Cr,Np,Or,Ot,Oc,Ad
→ domain, relevance, common_keywords, organic_keywords,
  organic_traffic, organic_cost, adwords_keywords
```

→ Replaces all rows in **`competitors`** for the site.

#### 7. `getBacklinksOverview(domain)` — `?type=backlinks_overview` (analytics/v1 endpoint)

```
export_columns = ascore,total,domains_num,follows_num,nofollows_num
→ authority_score, total_backlinks, referring_domains,
  follow_backlinks, nofollow_backlinks
```

→ Merged into the same `site_metrics` row written by `getDomainMetrics`.

### REST refresh endpoint

`POST /api/audit/refresh-semrush`
- Body: `{ site_id }`
- Auth: Supabase session OR `x-seo-sync-token` header (for cron)
- Calls reports 1, 2, 6, 7 in parallel
- Replaces `keywords` and `competitors`, appends `site_metrics`

```json
{ "ok": true, "keywords": 500, "competitors": 10, "metrics": true }
```

### NOT implemented as a REST pull (gaps)

These would be valuable adds — SEMRush exposes them via the standard API:

| Want | SEMRush report type | Notes |
|---|---|---|
| **Keyword gap analysis** | `domain_domains` (keyword overlap matrix) | Take 1 own domain + 3-5 competitor domains, return shared/unique keywords |
| **Keyword difficulty backfill** | `phrase_all` | Loop over `keywords` table, fill `keyword_difficulty` |
| **Position tracking history** | `domain_ranks_history` | Already implemented, just needs persistence |
| **Position changes (winners/losers)** | `domain_organic` filter on `Pd` (position diff) | Already pulled via `getOrganicKeywords`, just needs surfacing |
| **Top pages by traffic** | `domain_organic_organic` (org pages variant) | Already pulled, just needs persistence |
| **Featured snippet ownership** | `domain_organic` filter on serp features | Add `Fp` column code |

---

## Section B — Browser-based AI Visibility scraper (`src/lib/semrush-ai-scraper.ts`)

This is the half that does **not** have a REST API equivalent. SEMRush's AI
Toolkit is browser-only, so we run a headless Chromium that authenticates
via stored cookie and scrapes the rendered DOM.

### Stack

- `playwright-core` — drives the browser
- `@sparticuz/chromium` — bundles a Lambda-compatible Chromium binary
  (~100MB, ships with Netlify functions via `external_node_modules`)
- A Node 20 runtime function with `timeout = 300` in `netlify.toml` (~3 min
  budget; full scrape takes 90-180 sec)

### Auth model

```ts
// Cookie-based — no login flow. Operator extracts their authenticated
// SEMRush session from DevTools and stores it in env:
SEMRUSH_SESSION_COOKIE = "spbl=...; rmbl=..."   // ~30-day expiry
```

When the cookie expires, every scrape returns 502 with "likely cookie
expired" — operator re-pastes from DevTools. Manual rotation; could be
automated with a SEMRush login flow but not worth it given the cadence.

### Project + filter scoping

SEMRush AI Toolkit pages take two query params:

```
SEMRUSH_PID = "122198"     // SEMRush project id (one per tracked site)
SEMRUSH_FID = "8797552"    // SEMRush filter id (which prompts/markets to pull)
```

These are also env vars; they live in Netlify. To track a different site,
spin up a SEMRush project + filter and update the env vars.

### Surfaces scraped (4) × LLMs (4) = 13 extracts per run

```
Surface              URL                                                LLM dropdown?
─────────────────────────────────────────────────────────────────────────────────────
narrative_drivers    /ai-seo/narrative-drivers/?pid=…&fid=…             yes (4 LLMs)
brand_performance    /ai-seo/brand-performance/?pid=…&fid=…             yes (4 LLMs)
perception           /ai-seo/perception/?pid=…&fid=…                    yes (4 LLMs)
questions            /ai-seo/questions/?pid=…&fid=…                     no  (1 combined)
```

The 4 LLMs scraped via dropdown:

| Internal id | SEMRush dropdown label |
|---|---|
| `google_ai_mode` | Google AI Mode (AI Overviews / Search Labs) |
| `chatgpt` | ChatGPT |
| `perplexity` | Perplexity |
| `gemini` | Gemini |

Total per run: 3 surfaces × 4 LLMs + 1 combined questions surface = **13 raw extracts**.

### Per-extract algorithm

```ts
async function extractOne(page, surface, llm) {
  await page.goto(SURFACE_URL[surface], { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(4000);                 // let charts render
  if (surface !== "questions") {
    // Find the LLM-provider dropdown and switch
    await page.click('[role="combobox"][aria-label*="provider"]');
    await page.click(`[role="option"]:has-text("${LLM_LABEL[llm]}")`);
    await page.waitForTimeout(4500);               // re-render after switch
  }
  const text = await page.evaluate(() =>
    document.querySelector("main")?.innerText.slice(0, 80_000) || ""
  );
  return { surface, llm, url: page.url(), text, extractedAt: new Date().toISOString(), bytes: text.length };
}
```

### What each surface contains

| Surface | Content captured | Data we extract from it |
|---|---|---|
| **narrative_drivers** | Themes that come up when AI engines describe the brand | `ai_strategy_reports.recommendations[]` + `ai_insights` rows tagged `narrative` |
| **brand_performance** | Brand mention counts vs. competitors, share-of-voice charts | `ai_share_of_voice` rows (one per brand × platform) + `ai_competitor_sentiment` |
| **perception** | Positive / negative / neutral sentiment per platform | `ai_competitor_sentiment.favorable_sentiment` + insights tagged `perception` |
| **questions** | Top questions AI engines are asked about the brand and competitors, all platforms combined | `ai_insights` rows tagged `questions` (highest priority for content gaps) |

### Manual-Chrome fallback

When the headless scraper fails (cookie expired, JS-heavy chart fails to
render, IP blocked, etc.), the dashboard exposes an **"open in Chrome →"**
button that opens all 4 surfaces in the operator's authenticated browser.
The operator screenshots each (manually switching LLMs in the dropdown) and
drops the screenshots into a bulk-ingest panel. From there it goes through
the screenshot pipeline (Section C, endpoint #5) which uses Claude Vision
to extract the same fields.

### Remote-Claude fallback (`/api/ai-visibility-trigger`)

Third option: instead of running the scrape in a Netlify function, dispatch
a remote Claude Code agent (`ANTHROPIC_TRIGGER_URL`) that has the Chrome
MCP attached to a real browser. The agent navigates SEMRush, switches
LLMs, extracts, and POSTs results back to the ingest endpoint. Lets the
scrape happen in a fully-authenticated Chrome with all extensions, no
Lambda timeout. Async — returns a 202 immediately, the agent runs 1-3 min.

---

## Section C — Ingestion endpoints (5 routes)

These are the entry points data flows through on its way to Supabase. Each
one accepts a different shape of input but writes to the same tables.

### 1. `POST /api/audit/refresh-semrush` — REST data

```
Body:    { site_id }
Auth:    session OR x-seo-sync-token
Calls:   getDomainMetrics + getBacklinksOverview + getOrganicKeywords + getCompetitors
Writes:  site_metrics (insert), keywords (replace), competitors (replace)
Returns: { ok, keywords, competitors, metrics }
```

### 2. `POST /api/ai-visibility-refresh` — automated scraper

```
Body:    { site_id }
Auth:    session OR x-seo-sync-token
Env req: SEMRUSH_SESSION_COOKIE, SEMRUSH_PID, SEMRUSH_FID
Calls:   scrapeAiVisibility() → 13 SurfaceExtract objects → POSTs each to /api/ai-visibility-ingest
Returns: { ok, extracts: 13, share_of_voice_rows, insights_rows, sentiment_rows, failed, failures, elapsed_ms }
```

### 3. `POST /api/ai-visibility-ingest` — universal parser

Two modes:

**Mode A — structured JSON (skip Claude):**
```json
{ "site_id": "...", "share_of_voice": [...], "insights": [...], "sentiment": [...] }
```
Direct upsert into the three AI Visibility tables.

**Mode B — raw text/CSV/transcription (Claude Opus parses):**
```json
{ "site_id": "...", "raw": "[any unstructured SEMRush dump]" }
```
Claude Opus extracts the same shape as Mode A using a system prompt that
knows which brand is "own" vs competitor and which competitors to expect.
Max output: 4k tokens.

Writes to:
- `ai_share_of_voice` — one row per (brand, platform)
- `ai_insights` — up to 20 rows, each with title/description/category/source_llm/source_surface/priority
- `ai_competitor_sentiment` — one row per competitor

### 4. `POST /api/ai-visibility-trigger` — remote Claude fallback

```
Body:    { site_id }
Auth:    session OR x-seo-sync-token
Env req: ANTHROPIC_TRIGGER_URL, ANTHROPIC_TRIGGER_TOKEN
Action:  dispatches a verbose 6-step prompt to a remote Claude Code agent
         that has Chrome MCP attached; returns immediately
Returns: { ok, trigger_id, status: "enqueued" }
```

### 5. `POST /api/semrush-screenshot-ingest` — Vision parser

Operator drops 1-8 SEMRush dashboard screenshots; Claude Opus Vision
(claude-opus-4-7, max 8k tokens) extracts:
- Keywords table (position, volume, KD, CPC, URL)
- Site metrics (authority, organic kw, traffic, backlinks)
- Share-of-Voice breakdown
- Insights / recommendations
- Competitor sentiment

Writes everything in one transaction:
- `keywords` (replaces all — avoids dupes from multi-screenshot uploads)
- `site_metrics` (insert with `source = "semrush_vision"`)
- `ai_share_of_voice`, `ai_insights`, `ai_competitor_sentiment`

This is the highest-leverage manual fallback — SEMRush has many reports
that don't have a clean API path. Screenshot + Vision is faster than
building a scraper for each one.

---

## Section D — Supabase schema needed

Create these tables in the new project's Supabase (column types kept loose;
copy from `src/lib/types.ts` in the source repo for exact definitions).

```sql
-- Core
profiles            (id, user_id, name, description, logo_url, ...)
sites               (id, profile_id, name, domain, production_url,
                     github_repo_owner, github_repo_name, github_token_encrypted,
                     netlify_site_id, current_working_branch, last_audit_at, ...)
app_config          (key, value)                  -- for storing API keys

-- SEMRush data
keywords            (id, site_id, keyword, position, previous_position,
                     position_difference, search_volume, keyword_difficulty,
                     cpc, url, traffic_percent, traffic_cost_percent,
                     competition, number_of_results, captured_at)
site_metrics        (id, site_id, source, domain_rank, organic_keywords,
                     organic_traffic, organic_cost, adwords_keywords,
                     adwords_traffic, adwords_cost, authority_score,
                     total_backlinks, referring_domains, follow_backlinks,
                     nofollow_backlinks, captured_at)
competitors         (id, site_id, domain, relevance, common_keywords,
                     organic_keywords, organic_traffic, organic_cost,
                     adwords_keywords, captured_at)

-- AI Visibility
ai_share_of_voice         (id, site_id, brand, share_percent, platform,
                           is_own_brand, mentions, avg_position, captured_at)
ai_insights               (id, site_id, rank_order, title, description,
                           category, source, target_keywords[], target_pages[],
                           source_llm, source_surface, priority, status,
                           applied_commit, applied_at, task_status, captured_at)
ai_strategy_reports       (id, site_id, title, summary, timeframe,
                           recommendations[], source, captured_at)
ai_competitor_sentiment   (id, site_id, competitor, share_of_voice, sov_trend,
                           favorable_sentiment, sentiment_trend, summary, captured_at)

-- Audit + workflow (carry over if you want the full audit pipeline too)
audits, audit_pages, audit_issues, cannibalization_issues
recommendations, fix_sessions, fixes
job_runs                 -- for cron observability
```

RLS: enable on all of these. The dashboard uses authenticated user RLS;
API routes that need service-role (cron + ingest endpoints) call
`createClient(url, SUPABASE_SERVICE_ROLE_KEY)` directly to bypass RLS.

---

## Section E — Environment variables

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...                       # for service-role writes from API routes

# SEMRush API (required for REST pipeline)
SEMRUSH_API_KEY=...                                 # production key

# SEMRush AI Visibility scraper (required for browser pipeline)
SEMRUSH_SESSION_COOKIE="spbl=...; rmbl=..."         # from DevTools, ~30-day rotation
SEMRUSH_PID=122198                                  # SEMRush project id
SEMRUSH_FID=8797552                                 # SEMRush filter id

# Anthropic (required — Opus does the parsing)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_TRIGGER_URL=https://api.anthropic.com/v1/code/triggers/trig_.../run   # optional, for remote-Claude fallback
ANTHROPIC_TRIGGER_TOKEN=sk-ant-...                  # optional

# Cross-app sync (required if a sister admin app reads this data)
SEO_SYNC_TOKEN=...                                  # 16+ char random string
SEO_SYNC_ALLOWED_ORIGINS=https://your-admin-site.com  # comma-separated, NOT *
```

Set them on Netlify → Site config → Environment variables. For local dev,
mirror them in `.env.local` (gitignored).

---

## Section F — Files to copy into the new project

In dependency order. The new project should match Next.js 16 App Router
conventions.

```
src/lib/integrations/semrush.ts          # All REST API calls
src/lib/semrush-ai-scraper.ts            # Playwright browser scraper
src/lib/api-auth.ts                      # verifySyncToken + corsHeaders
src/lib/anthropic-key.ts                 # Anthropic key resolver
src/lib/supabase/{server,client}.ts      # Supabase clients (server-side has service-role helper)

src/app/api/audit/refresh-semrush/route.ts
src/app/api/ai-visibility-refresh/route.ts
src/app/api/ai-visibility-ingest/route.ts
src/app/api/ai-visibility-trigger/route.ts
src/app/api/semrush-screenshot-ingest/route.ts
src/app/api/seo-sync/route.ts            # public read/write API for the sister admin

src/components/SemrushAiRefreshButton.tsx
src/components/SemrushBulkIngest.tsx     # operator paste/upload panel
```

`netlify.toml` additions (so Playwright works in functions):

```toml
[functions]
  external_node_modules = ["@sparticuz/chromium", "playwright-core", "playwright"]
  included_files = [
    "node_modules/@sparticuz/chromium/**",
    "node_modules/playwright-core/**"
  ]

# Function-specific timeouts — Pro standard cap is 26s, AI Visibility scrape needs ~3 min
[functions."ai-visibility-refresh"]      timeout = 300
[functions."ai-visibility-ingest"]       timeout = 120
[functions."semrush-screenshot-ingest"]  timeout = 300
[functions."refresh-semrush"]            timeout = 120
```

---

## Section G — Wiring it as a repeatable cron job

Today the SEO Command Center has **no cron** — everything is a manual
button. To make this a "set it and forget it" pipeline in the new admin,
add Supabase Edge Functions + pg_cron.

### G.1 — Create one Edge Function per pipeline

```
supabase/functions/
  daily-semrush-refresh/index.ts       # pulls REST data
  weekly-ai-visibility-refresh/index.ts # runs the Playwright scraper
  daily-ai-recommendations/index.ts    # regenerates insights from latest data
  weekly-digest-email/index.ts         # Resend email summary
```

Each Edge Function is a tiny shim:

```ts
// supabase/functions/daily-semrush-refresh/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req) => {
  const adminUrl = Deno.env.get("DASHBOARD_URL")!;          // https://your-admin.netlify.app
  const token   = Deno.env.get("SEO_SYNC_TOKEN")!;
  const siteId  = Deno.env.get("DEFAULT_SITE_ID")!;         // or query Supabase for all enabled sites

  const res = await fetch(`${adminUrl}/api/audit/refresh-semrush`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-seo-sync-token": token,
    },
    body: JSON.stringify({ site_id: siteId }),
  });
  return new Response(await res.text(), { status: res.status });
});
```

Same shape for the other three — each one POSTs to its corresponding
`/api/...` endpoint with the sync token. The HTTP work happens on Netlify
where Playwright is bundled; the Edge Function is just the trigger.

### G.2 — Schedule with pg_cron

Run once in the Supabase SQL editor:

```sql
-- Daily REST refresh at 6 AM Central
select cron.schedule(
  'daily-semrush-refresh',
  '0 11 * * *',                       -- 11:00 UTC == 6:00 AM CT (CDT)
  $$select net.http_post(
    'https://[project].supabase.co/functions/v1/daily-semrush-refresh',
    '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.functions_secret')
    )
  )$$
);

-- Weekly AI Visibility scrape, Mondays at 7 AM CT (the SEMRush cookie
-- typically lasts 4 weeks → run weekly, alert on cookie-expired errors)
select cron.schedule(
  'weekly-ai-visibility-refresh',
  '0 12 * * 1',
  $$select net.http_post(
    'https://[project].supabase.co/functions/v1/weekly-ai-visibility-refresh',
    '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.functions_secret')
    )
  )$$
);

-- Daily AI recommendations regeneration at 8 AM CT
select cron.schedule(
  'daily-ai-recommendations',
  '0 13 * * *',
  $$select net.http_post(
    'https://[project].supabase.co/functions/v1/daily-ai-recommendations',
    '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.functions_secret')
    )
  )$$
);

-- Weekly digest email, Mondays at 3 PM CT
select cron.schedule(
  'weekly-digest-email',
  '0 20 * * 1',
  $$select net.http_post(
    'https://[project].supabase.co/functions/v1/weekly-digest-email',
    '{}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.functions_secret')
    )
  )$$
);
```

### G.3 — Observability — write to `job_runs`

Wrap each function in a `job_runs` insert so you have a history of
successes / failures / row counts:

```ts
const start = Date.now();
const result = await fetch(/* ... */);
await supabase.from("job_runs").insert({
  job: "daily-semrush-refresh",
  ok: result.ok,
  status_code: result.status,
  duration_ms: Date.now() - start,
  payload: await result.json().catch(() => null),
});
```

Surface the latest 50 in the admin UI as a "Cron health" card.

### G.4 — Cookie-expired alerting

The AI Visibility scrape is the brittle one. Add a check in
`weekly-ai-visibility-refresh` that emails you (Resend) if the response
body contains "Likely cookie expired" or `failed === 13`. Two-line
snippet — easy to forget, breaks the whole pipeline if you do.

---

## Section H — Improvements to make in the new project

Numbered roughly by ROI:

1. **Persist `domain_ranks_history` and `getOrganicPages`** — already
   pulled but currently dropped. Adds the position-tracking-over-time
   chart and the top-pages table.

2. **Backfill `keyword_difficulty`** — fan-out `getKeywordOverview` after
   the bulk pull. ~500 extra API calls per refresh, but KD is the
   #1 missing field.

3. **Real keyword gap analysis** — call `domain_domains` (overlap matrix)
   on (own domain) × (top 5 competitors). Persist a `keyword_gaps` table
   with columns `(keyword, your_position, [competitor]_position, ...)`.
   Feeds a "what they rank for that you don't" view.

4. **Multi-tenant scraping** — today the env vars are global. To track
   multiple sites, store `semrush_pid`, `semrush_fid` per-site in the
   `sites` table and read them from the row instead.

5. **Standalone Perplexity tracker** — supplement SEMRush AI Visibility
   with direct Perplexity API calls (`sonar` model). Query 16 US cities
   with unbiased third-person prompts, dedupe brand mentions.

6. **Cookie auto-refresh** — replace the manual cookie paste with a
   Playwright login flow that reads SEMRush creds from a vault. Removes
   the 30-day rotation chore.

7. **Featured-snippet ownership tracking** — extend `domain_organic` with
   the `Fp` column code; surface as a "snippet positions you own / lost"
   view.

8. **Backlinks deep dive** — today only `backlinks_overview`. Add
   `backlinks_refdomains` and `backlinks_anchors` for deeper analysis.

9. **Position-change alerting** — when 3+ tracked keywords drop 5+
   positions in one day, fire a Resend alert. The data is there
   (`position_difference`); just needs a check + email.

10. **Quota dashboard** — SEMRush counts API units per call. Track usage
    in `app_config` (key: `semrush_units_used_today`) so cron knows when
    to throttle.

---

## Section I — File-by-file porting sequence

Suggested order to add this to the new project, smallest pieces first:

1. **DB migration** — create the tables in Section D
2. **`src/lib/api-auth.ts`** — copy verbatim
3. **`src/lib/integrations/semrush.ts`** — copy verbatim
4. **`POST /api/audit/refresh-semrush`** — first endpoint to wire up; test
   with a curl + SEO_SYNC_TOKEN header
5. **`SemrushBulkIngest` component + `POST /api/ai-visibility-ingest`** —
   the universal entry point; works without scrapers
6. **`POST /api/semrush-screenshot-ingest`** — gives operators an immediate
   way to load AI Visibility data via screenshots, even before the scraper is up
7. **`src/lib/semrush-ai-scraper.ts` + `POST /api/ai-visibility-refresh`** —
   the automated scraper; needs Chromium bundled in `netlify.toml`
8. **Cron Edge Functions + pg_cron schedules** — once the manual pipeline
   is healthy, automate it
9. **`POST /api/ai-visibility-trigger`** — optional, for the remote-Claude
   fallback path

Validate after each step:
- Step 4 — keywords + competitors + site_metrics rows appear after one curl
- Step 5 — JSON insert lands in ai_share_of_voice, ai_insights, ai_competitor_sentiment
- Step 6 — drop a screenshot, see Claude Vision parse it into rows
- Step 7 — full scrape returns 13 extracts, each ingest writes 5-15 rows
- Step 8 — `select * from job_runs order by created_at desc limit 5;` shows recent cron hits

---

## Section J — Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Refresh returns 200 but `keywords` table is empty | SEMRush API quota exhausted (units = 0) | Wait for monthly reset or upgrade plan |
| `keyword_difficulty` is `NULL` for every row | `getKeywordOverview()` not called in the bulk path | Add a fan-out loop after the bulk pull |
| AI Visibility scrape returns 502 with "Likely cookie expired" | Session cookie expired (~30 day TTL) | Re-extract from DevTools → paste to Netlify env var |
| AI Visibility returns 502 with "no `<main>` element" | SEMRush UI changed | Update selectors in `semrush-ai-scraper.ts` (rare but happens 1-2× per year) |
| Vision ingest returns `{"keywords":[]}` | Screenshot not legible / not a SEMRush page | Re-screenshot at higher resolution; ensure the screenshot includes the metric values, not just chart |
| Sister-app sync returns 401 | `SEO_SYNC_TOKEN` mismatch | Both apps must have the same value; constant-time compare is exact-match only |
| Sister-app sync returns CORS error | Origin not in `SEO_SYNC_ALLOWED_ORIGINS` | Add the requesting origin to the comma-separated list; never use `*` |
| pg_cron fires but Edge Function 500s | Function couldn't reach the Netlify route | Check `DASHBOARD_URL` env var on Supabase, check Netlify function logs |

---

## Appendix — quick reference: which surface fills which table

```
SEMRush REST API
├── domain_ranks         → site_metrics (org metrics half)
├── domain_organic       → keywords
├── domain_organic_organic (competitors variant) → competitors
├── backlinks_overview   → site_metrics (backlinks half)
├── domain_organic_organic (top pages variant)  → [not persisted yet]
├── phrase_all           → keywords.keyword_difficulty [not persisted yet]
└── domain_ranks_history → site_metrics_history [not persisted yet]

SEMRush AI Toolkit (browser scrape)
├── narrative_drivers    → ai_strategy_reports + ai_insights (narrative-tagged)
├── brand_performance    → ai_share_of_voice + ai_competitor_sentiment
├── perception           → ai_competitor_sentiment.favorable_sentiment + ai_insights (perception-tagged)
└── questions            → ai_insights (questions-tagged, highest priority for content gaps)

Manual paths
├── /api/ai-visibility-ingest (raw text + Claude Opus parser)  → all 3 ai_* tables
└── /api/semrush-screenshot-ingest (image + Claude Vision)     → all 3 ai_* tables + keywords + site_metrics
```

That's the entire pipeline. Copy this whole file into the new Claude
project, point it at the codebase, and ask Claude to start with Section I.
