# AI Visibility Refresh Pipeline

Automates the end-to-end SEMRush AI Visibility data pull for the PPC V2 site command center.

## Two scrape modes

### Mode 1 — Automated (server-side Playwright)
Click **"↻ Refresh (automated)"** on the AI Visibility tab:
1. POST to `/api/ai-visibility-refresh` with `site_id`
2. Endpoint runs Playwright with a stored SEMRush session cookie
3. Scrapes 13 extractions (4 surfaces × 4 LLMs minus Questions which is cross-LLM)
4. For each surface, extracts `<main>` text
5. Forwards raw text to `/api/ai-visibility-ingest` (existing Claude Opus parser)
6. Claude Opus extracts structured rows into `ai_share_of_voice`, `ai_insights`, `ai_competitor_sentiment`
7. Returns aggregate counts to the button UI

Requires one-time env setup (see below). Runs unattended in 90–180s.

### Mode 2 — Via Chrome (user-driven, works today)
Click **"or open in Chrome →"** under the Refresh button:
1. Opens all 4 SEMRush AI Visibility surfaces in your authenticated Chrome tabs
2. You screenshot each view (switch the LLM dropdown to capture each combination)
3. Drop screenshots into the **SEMRush Bulk Ingest** widget below — Claude Vision parses, same tables populated

Works on the live site without any server-side setup. Best path until the automated Playwright env is wired.

The button automatically falls back to showing the Chrome option whenever the automated path returns 400/401/502 (e.g. cookie expired, env not set).

## Why this architecture

- **Reuses the existing ingest endpoint** — no new Supabase writes, no new Claude prompts to maintain.
- **Server-side Playwright** — avoids the user having to click through 16 tabs + dropdowns manually each refresh.
- **Netlify Background Function** — needs up to 3 min runtime, which is within the 15-min background function limit on Pro plans.
- **Uses SEMRush session cookie** — SEMRush has no AI Visibility API, so we scrape. Storing a session cookie rotated every ~30 days is the pragmatic answer. The alternative (automated login with 2FA) is brittle.

## One-time setup (Mode 1 only; Mode 2 works without this)

### Install deps
```bash
cd seo-dashboard
npm install playwright-core @sparticuz/chromium
```

### Get your SEMRush session cookie
1. Log into SEMRush in your main browser
2. Open DevTools → Application → Cookies → `https://www.semrush.com`
3. Copy the value of the `spbl` and `rmbl` cookies (or use the full cookie string from Network tab)
4. Paste into Netlify: Site Settings → Environment → add `SEMRUSH_SESSION_COOKIE` (secret)

### Confirm required env vars
- `SEMRUSH_SESSION_COOKIE` — the cookie string from above
- `SEMRUSH_PID` — your SEMRush project ID (`122198` for PPC)
- `SEMRUSH_FID` — your SEMRush filter ID (`8797552` for PPC)
- `ANTHROPIC_API_KEY` — already set (reused by ingest endpoint)
- `SEO_SYNC_TOKEN` — already set (reused for auth)

## Cookie rotation

SEMRush session cookies expire when you log out or after ~30 days of inactivity. If the refresh starts returning 401, copy a fresh cookie from devtools and redeploy the env var. The endpoint logs `"auth failed"` when this happens.

## Failure modes

- **Cookie expired** → endpoint returns 401, button shows "Re-auth needed"
- **SEMRush changes DOM structure** → scraper falls back to `document.body.innerText` and still extracts text; Claude Opus tolerates format drift
- **Surface loads but has no data** → returns empty arrays (normal for a fresh project)
- **Timeout** → background function has 15-min ceiling; batched parallelism keeps us at ~3 min typical

## Alternative architectures considered

| Option | Why rejected |
|---|---|
| SEMRush API | No AI Visibility endpoints exist |
| Client-side scraper (bookmarklet) | Requires user to paste bookmarklet each time; not "one click" |
| GitHub Action | Slower feedback, harder to surface progress to UI |
| Browserless.io | Adds $ dependency + vendor lock-in |
| Puppeteer + @sparticuz/chromium | What we chose |

## Files

- **Scraper lib:** [`src/lib/semrush-ai-scraper.ts`](../src/lib/semrush-ai-scraper.ts)
- **Endpoint:** [`src/app/api/ai-visibility-refresh/route.ts`](../src/app/api/ai-visibility-refresh/route.ts)
- **Button UI:** [`src/components/SemrushAiRefreshButton.tsx`](../src/components/SemrushAiRefreshButton.tsx)
- **Ingest (reused):** [`src/app/api/ai-visibility-ingest/route.ts`](../src/app/api/ai-visibility-ingest/route.ts)

## Next iteration (v2)

- Schedule via Netlify cron — weekly auto-refresh
- Diff UI: "what changed since last refresh" panel in AI Visibility tab
- Auto-posting of new insights to Slack
- Store raw page text per surface for historical comparison
