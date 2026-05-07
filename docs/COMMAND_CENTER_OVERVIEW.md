# SEO Command Center — Overview

> **Repo:** `premieratx/seo-command-center`
> **Live:** https://seo-command-center.netlify.app
> **Stack:** Next.js 16 (App Router) + Supabase + Tailwind + Claude API + Playwright
> **Last updated:** 2026-05-07 (Ad Loop branch)

A unified internal console for **Premier Party Cruises** that ties together SEO,
ads, customer ops, content, and AI assistance for the cruise site
(`premierpartycruises.com` / `premier-party-cruises-v2.netlify.app`, repo:
`premieratx/CruiseConcierge`).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (Turbopack, React 19) |
| Hosting | Netlify (`@netlify/plugin-nextjs`, site id `843ba33c-5888-4098-bb8c-eb35889c1430`) |
| Database | Supabase Postgres (project `gtoiejwibueezlhfjcue`) + Supabase Auth + RLS |
| AI | Anthropic Claude API — Opus 4.7 / Sonnet 4.6 / Haiku 4.5, streaming + tool-use |
| Styling | Tailwind v4 + shadcn/ui primitives, light theme (zinc-50 canvas, white cards) |
| Browser automation | Playwright + `@sparticuz/chromium` for SEMRush AI scraping |
| Charts | Recharts |
| Code editor (in-app) | Monaco Editor |

---

## Top-level tabs (11)

The app's main view is a single page (`/profiles/[id]/sites/[siteId]`) with a
horizontal tab nav. Each tab is its own pane, lazy-loaded on activation.

| Tab | Component | Purpose |
|---|---|---|
| 📊 SEO | `SiteDashboard` | The original dashboard — score, audit issues, keywords, AI Visibility, competitors, cannibalization, agent chat, methodology |
| 📣 Ad Loop | `AdLoopPane` | Google Ads + Meta Ads dashboards (Overview / Google / Meta sub-tabs). See [AD_LOOP.md](./AD_LOOP.md) |
| 🎨 Preview | `WebDesignTab` | Live site preview iframe + Claude chat for design / copy edits |
| 👥 CRM | `CRMPane` | Lead Mgmt + Customer Mgmt (ported from the Lovable quote-app) |
| 🧮 Quotes | `QuotePricingTab` | Quote Builder admin + Pricing Calculator builder |
| 📈 Stats | `AnalyticsPane` | Live operational metrics from Supabase |
| 🎟️ Promos | `MarketingPane` | Affiliate partners + promo codes (3-tier discount) |
| ✍️ Blog | `BlogPane` | In-house CMS + AI writer + bulk SEO analyzer for 124+ static blogs |
| 💬 Chatbot | `ChatbotTab` | Customer chatbot training (Knowledge / Test / Logs / System / Widget sub-tabs) |
| 🔐 Users | `UsersPane` | Admin user management (super-admin only invite flow) |
| ✅ To-Do | `TodoListPane` | Reminders + open work items, persisted to localStorage |
| 📚 Docs | `DocsBrowser` | This documentation, in-app |

---

## Multi-agent system

The Command Center isn't one model talking — it's a 5-agent team behind
`/api/agent-chat`, with a router that dispatches based on keywords.

| Agent | Domain |
|---|---|
| 🎯 Command Center (Main) | Orchestrator — examines all selected fixes together, plans one comprehensive solution, hands off to Content Review before READY_TO_EXECUTE |
| 🔍 SEO Specialist | Keywords, meta tags, technical SEO, rankings, internal linking, cannibalization |
| 🤖 AI Visibility Specialist | Share of Voice, LLM mentions, AI-optimized content, narrative drivers |
| 🎨 Web Design Specialist | UX, layout, Wes McDowell principles, conversion, mobile-first |
| ⚡ Implementation Agent | Code changes, file edits, GitHub commits, deployment |

Each agent has its own system prompt + DB context (which Supabase tables to
inject as context) defined in `src/lib/agents/definitions.ts`.

The agent-chat endpoint also exposes **tools** Claude can call:

- GitHub: `read_file`, `list_files`, `edit_file`, `branch_status`
- Ad Loop: `list_ad_campaigns`, `list_ad_alerts`, `get_ad_campaign_drilldown`, `pause_or_enable_ad_campaign` (always preview-then-confirm)

This makes "pause the Bachelor Party search campaign" a real one-shot command —
Claude lists campaigns, finds the match, returns a preview, and only mutates after
explicit user confirmation in the chat.

---

## Key API routes

### AI / chat
| Route | Purpose |
|---|---|
| `POST /api/agent-chat` | Streaming multi-agent chat with routing + tool use. Auth: Supabase session OR `x-seo-sync-token`. CORS-enabled for V2 admin. |
| `POST /api/generate-fix` | One-shot AI-generated code fix for a specific issue |

### Audit + SEMRush
| Route | Purpose |
|---|---|
| `POST /api/audit/run` | Live site crawler + SEO scorer (up to 200 pages) |
| `POST /api/audit/refresh-semrush` | Pull fresh organic keywords + metrics + competitors via SEMRush REST. See [SEMRush manual](./integration-manuals/SEMRUSH_AND_AI_VISIBILITY.md) |
| `POST /api/audit/ai-audit` | AI Audit with 1-click "Fix & Commit" recommendations |
| `POST /api/audit/execute-fix` | Commit a specific fix to the repo on the working branch |
| `POST /api/pagespeed/run` | Google PageSpeed Insights analysis |

### AI Visibility
| Route | Purpose |
|---|---|
| `POST /api/ai-visibility-refresh` | Run the headless Playwright SEMRush AI Toolkit scraper (90-180 sec) |
| `POST /api/ai-visibility-trigger` | Dispatch a remote Claude Code agent with Chrome MCP for the same scrape |
| `POST /api/ai-visibility-ingest` | Universal parser — accepts structured JSON or raw text/CSV, uses Claude Opus to extract |
| `POST /api/semrush-screenshot-ingest` | Drop SEMRush dashboard screenshots, Claude Vision extracts everything |

### Ad Loop (added in this branch)
| Route | Purpose |
|---|---|
| `GET /api/ads/google` | Google Ads campaigns + 30-day summary (sample data when not configured) |
| `GET /api/ads/meta` | Meta Ads campaigns + 30-day summary |
| `GET /api/ads/overview` | Cross-platform combined KPIs + 30-day spend series + top-campaigns leaderboard |
| `GET /api/ads/alerts` | Auto-detected alerts: waste, ROAS drops, creative fatigue, scale opportunities |
| `GET /api/ads/drilldown` | Per-campaign ad groups + search terms (Google) / creatives (Meta) |
| `GET /api/ads/test-connection` | Pings the configured platform API and returns account info or precise error |
| `POST /api/ads/action` | Pause/enable/remove a campaign with two-step preview-and-confirm |

### GitHub integration (Octokit, per-site token)
| Route | Purpose |
|---|---|
| `GET /api/github/files` | Browse / read repo files |
| `GET /api/github/branch-status` | Diff working branch vs main |
| `GET /api/github/pending-changes` | Haiku summary of branch diff |
| `GET /api/github/history` | Per-file commit history |
| `POST /api/fix-session/create` | Create working branch + link issues |
| `POST /api/fix-session/apply` | Commit changes to branch |
| `POST /api/publish` | Open PR, merge, trigger deploy |

### Cross-app sync ([SEO_SYNC_API.md](./SEO_SYNC_API.md))
| Route | Purpose |
|---|---|
| `GET/POST /api/seo-sync` | Public token-authed read/write API for sister apps (V2 admin) — pages, keywords, issues, recommendations, AI visibility, **ads-overview / ads-google / ads-meta** |

### Misc
| Route | Purpose |
|---|---|
| `POST /api/admin/invite` | Super-admin invites new users via Supabase email |
| `POST /api/digest/send` | Daily / weekly email digest via Resend |
| `GET /api/proxy` | Server-side iframe proxy for the Preview tab |

---

## Database schema (Supabase project `gtoiejwibueezlhfjcue`)

### Core
- `profiles` — Brand profiles (multi-site)
- `sites` — Connected websites (domain, GitHub repo, Netlify site id, working branch)
- `app_config` — Key-value store for API keys, settings

### SEO Audit
- `audits` — Audit runs (overall score, issue counts, status)
- `audit_issues` — Individual issues (severity, category, recommended fix, applied state)
- `audit_pages` — Per-page analysis (title, h1, meta, schema, score, target keyword)
- `cannibalization_issues` — Keyword conflicts between pages

### Keywords + metrics
- `keywords` — SEMRush rankings (position, volume, KD, CPC, traffic %)
- `site_metrics` — Domain authority, organic traffic, backlinks (one row per refresh)
- `competitors` — Top competitor domains + relevance + shared keywords

### AI Visibility
- `ai_share_of_voice` — Brand mention % per platform (own + competitors)
- `ai_insights` — Actionable AI visibility recommendations (priority, source LLM, source surface)
- `ai_strategy_reports` — Long-form strategy docs from narrative-drivers surface
- `ai_competitor_sentiment` — Competitor SoV + favorable sentiment + summary
- `ai_visibility` — Raw visibility data points
- `ai_prompt_research` — Query/prompt tracking for AI platforms

### Workflow
- `fix_sessions` — Working branches + linked issues + Netlify preview
- `fixes` — Individual file changes within a session (before/after content)
- `recommendations` — AI-generated improvement suggestions
- `job_runs` — Background job execution log

### Chatbot
- `chatbot_knowledge_base` — Q&A training entries (category, priority, tags, active)
- `chatbot_conversations` — Session-based message log

---

## Deploy pipeline

**Today** — manual CLI deploy from a logged-in machine:

```bash
./node_modules/.bin/next build
npx netlify deploy --prod \
  --dir=.next \
  --site=843ba33c-5888-4098-bb8c-eb35889c1430
```

**Goal** — GitHub auto-deploy. Linked once via Netlify dashboard, then every
push to `main` deploys automatically. Tracked as a To-Do item in the app.

### Function-specific timeouts

Pro plan standard functions cap at 26 seconds; long-running routes need
explicit bumps in `netlify.toml`:

```toml
[functions."ai-visibility-refresh"]      timeout = 300
[functions."agent-chat"]                 timeout = 300
[functions."chatbot-test"]               timeout = 120
[functions."pending-changes"]            timeout = 60
[functions."execute-fix"]                timeout = 120
[functions."run"]                        timeout = 300
[functions."ai-visibility-ingest"]       timeout = 120
[functions."semrush-screenshot-ingest"]  timeout = 300
[functions."refresh-semrush"]            timeout = 120
```

Plus Playwright bundling:

```toml
[functions]
  external_node_modules = ["@sparticuz/chromium", "playwright-core", "playwright"]
  included_files = [
    "node_modules/@sparticuz/chromium/**",
    "node_modules/playwright-core/**"
  ]
```

---

## Security model

- **Auth**: Supabase Auth (email/password, invite-only). Super admins defined in `src/lib/admin.ts`. Session cookies via `@supabase/ssr`.
- **Service role**: Used only by API routes that need to bypass RLS (admin invite, ingest endpoints). Never exposed to the client.
- **Cross-app token**: `SEO_SYNC_TOKEN` (16+ char) for `/api/seo-sync`. Constant-time compare. CORS allowlist via `SEO_SYNC_ALLOWED_ORIGINS` (never `*`).
- **Per-site GitHub tokens**: Stored encrypted in `sites.github_token_encrypted`. Used by Octokit-backed routes for the user's own repos.
- **Prompt injection defense**: User inputs in fix-execution wrapped in `<untrusted_input>` blocks before going to Claude.

---

## Environment variables (production)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gtoiejwibueezlhfjcue.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Anthropic (Claude API)
ANTHROPIC_API_KEY=sk-ant-...

# SEMRush
SEMRUSH_API_KEY=...
SEMRUSH_SESSION_COOKIE=...           # for AI Visibility scraper, ~30-day rotation
SEMRUSH_PID=122198                   # SEMRush project id
SEMRUSH_FID=8797552                  # SEMRush filter id

# Optional — remote Claude Code trigger for AI Visibility fallback
ANTHROPIC_TRIGGER_URL=https://api.anthropic.com/v1/code/triggers/trig_.../run
ANTHROPIC_TRIGGER_TOKEN=sk-ant-...

# Cross-app sync
SEO_SYNC_TOKEN=...                   # 16+ chars
SEO_SYNC_ALLOWED_ORIGINS=https://premierpartycruises.com,https://premier-party-cruises-v2.netlify.app

# Email
RESEND_API_KEY=...

# Optional Ad Loop integrations (each set independent — none required for sample data)
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=...
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_LOGIN_CUSTOMER_ID=9876543210   # only for MCC accounts
META_ADS_ACCESS_TOKEN=EAAG...
META_ADS_AD_ACCOUNT_ID=1234567890
META_ADS_API_VERSION=v19.0
ADLOOP_BRIDGE_URL=http://your-adloop-host:4545   # if using the Python AdLoop bridge
ADLOOP_BRIDGE_TOKEN=...

# Misc
GOOGLE_PAGESPEED_API_KEY=...
```

---

## Known business context (Premier Party Cruises)

| Item | Value |
|---|---|
| Domain | premierpartycruises.com |
| Phone | (512) 488-5892 |
| Marina | Anderson Mill Marina, Leander TX (25 min from downtown Austin) |
| Fleet | 4 boats: Day Tripper (14), Meeseeks (25-30), The Irony (25-30), Clever Girl (50-75) |
| Rates | Day Tripper from $200/hr · Meeseeks/Irony from $225/hr · Clever Girl from $250/hr · 4-hour minimum |
| Add-ons | Gratuity 20%, sales tax 8.25%, booking fee 3% |
| ATX Disco Cruise | Bachelor / bachelorette / combined ONLY, March-October seasonal |
| Private Cruises | Any event type, year-round |
| Trust signals | BYOB, licensed captains, 15+ years, 4.9/5 rating, 150,000+ guests |

This context is injected into the agents' system prompts so they don't
hallucinate pricing or fleet details.

---

## What's NOT yet built (queued)

See the in-app **✅ To-Do** tab for the live list. Highlights:

1. GitHub → Netlify auto-deploy hookup (every deploy is manual today)
2. Connect real Google Ads + Meta Ads accounts (env vars only — UI is built)
3. V2-side `AdLoopAdminPanel` mounted in CruiseConcierge (snippet ready in `docs/v2-snippets/`)
4. SEMRush scheduled cron jobs (Edge Functions + pg_cron) — see SEMRush manual Section G
5. Keyword Difficulty backfill (`getKeywordOverview` is implemented but not called)
6. 6 Page-2 keywords for ~400 clicks/mo lift
7. Merge `seo-fixes-only` branch to main on CruiseConcierge (115 blogs + 47 V2 pages)

---

## How an agent should navigate this codebase

If you're an AI agent reading this repo to make changes, here's the
fast-path:

1. **Read `CLAUDE.md` and `AGENTS.md` first** — they enforce framework
   conventions (Next.js 16 specifics that differ from your training data).
2. **Read `CAPABILITIES.md`** at the repo root — historical session log
   with deep architectural context.
3. **Read this file** for the current state.
4. **For SEMRush / AI Visibility work** — go to
   `docs/integration-manuals/SEMRUSH_AND_AI_VISIBILITY.md`.
5. **For cross-repo work with the V2 cruise site** — read
   `docs/SEO_SYNC_API.md` and `docs/v2-snippets/`.
6. **For Ad Loop work** — read `docs/AD_LOOP.md`.

Source layout:

```
src/
├── app/                  # Next.js App Router
│   ├── api/              # All API routes (one folder per route)
│   ├── docs/             # In-app docs viewer (renders this folder)
│   ├── demo/             # Public demos (no auth, like /demo/ad-loop)
│   ├── profiles/         # Authenticated brand-profile + site routes
│   └── ...
├── components/
│   ├── ads/              # Ad Loop UI (AdLoopPane, AdDashboard, AdAlerts, etc.)
│   ├── BusinessCommandCenter.tsx   # Top-level tab shell
│   ├── SiteDashboard.tsx           # The original SEO tab
│   ├── TodoListPane.tsx            # ✅ To-Do tab
│   └── ...
├── lib/
│   ├── ads/              # Ad Loop adapters (google.ts, meta.ts, alerts.ts, ...)
│   ├── agents/           # Multi-agent definitions
│   ├── integrations/     # SEMRush, GitHub (Octokit), email, crawler
│   ├── supabase/         # Server + client + middleware
│   ├── todo/             # Static seed list for the To-Do tab
│   └── types.ts          # All Supabase row types
└── quote-app/            # Vendored Lovable quote-builder app (separate React Router app)
```
