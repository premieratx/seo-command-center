# SEO Command Center — Full Capabilities Reference

> Last updated: 2026-04-12
> Project: seo-command-center (Next.js 16 App Router)
> Repo: premieratx/seo-command-center
> Live: seo-command-center.netlify.app
> Supabase: gtoiejwibueezlhfjcue (us-east-1)

---

## Architecture Overview

A full-stack SEO SaaS platform that replaces SEMRush + Replit with:
- Multi-agent AI system (5 specialist agents + router)
- Live site preview with full navigation
- Monaco code editor with GitHub read/write/commit/deploy
- Terminal emulator for SEO commands
- AI chat with Claude (streaming, model selector, file upload)
- Daily automated SEMRush refresh + AI visibility tracking
- Two-way sync with PPC website's admin section
- Multi-site support via profiles

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL + RLS |
| Background Jobs | Supabase Edge Functions + pg_cron |
| AI | Anthropic Claude API (streaming) |
| Code Editor | Monaco Editor (@monaco-editor/react) |
| Git | GitHub API via Octokit |
| Deployment | Netlify (CLI + MCP) |
| SEO Data | SEMRush REST API |
| AI Visibility | Perplexity API (sonar model) |
| Email | Resend API |

---

## Multi-Agent System

### Agents (defined in `src/lib/agents/definitions.ts`)

| Agent | Emoji | Domain |
|-------|-------|--------|
| **Command Center (Main)** | :dart: | Orchestrator — delegates to specialists, coordinates multi-step tasks |
| **SEO Specialist** | :mag: | Keywords, meta tags, technical SEO, rankings, internal linking |
| **AI Visibility Specialist** | :robot: | Share of Voice, LLM mentions, AI-optimized content, narrative drivers |
| **Web Design Specialist** | :art: | UX, layout, Wes McDowell principles, conversion, mobile-first |
| **Implementation Agent** | :zap: | Code changes, file edits, GitHub commits, deployment |
| **Router** | :twisted_rightwards_arrows: | Analyzes requests, routes to correct specialist(s) |

### How Routing Works

1. User sends message to `/api/agent-chat`
2. If no agent specified, `routeByKeywords()` matches against signal words
3. Primary agent's system prompt + DB context is assembled
4. Claude API called with streaming response
5. Agent metadata sent as first SSE event, then text chunks

### Context Injection

Each agent has `contextKeys` that pull relevant data from Supabase:
- SEO Agent gets: keywords, audit_issues, audit_pages, site_metrics, cannibalization
- AI Visibility gets: ai_share_of_voice, ai_insights, ai_strategy_reports, ai_competitor_sentiment
- Main gets: keywords, audit_issues, site_metrics, ai_share_of_voice

---

## API Routes

### AI & Chat
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/agent-chat` | POST | Multi-agent chat with routing + streaming |
| `/api/chat` | POST | Legacy single-agent chat (deprecated) |
| `/api/generate-fix` | POST | AI-generated code fix for a specific issue |

### SEO & Audit
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/audit/run` | POST | Live site crawler + SEO scorer |
| `/api/audit/refresh-semrush` | POST | Pull fresh SEMRush keywords/metrics |
| `/api/pagespeed/run` | POST | Google PageSpeed Insights analysis |

### GitHub Integration
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/github/files` | GET | Browse/read repo files via Octokit |
| `/api/fix-session/create` | POST | Create working branch + link issues |
| `/api/fix-session/apply` | POST | Commit file changes to branch |
| `/api/publish` | POST | Create PR, merge, trigger deploy |

### Sync & External
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/seo-sync` | GET/POST | Public API for PPC admin two-way sync |
| `/api/proxy` | GET | Server-side proxy for iframe embedding |
| `/api/digest/send` | POST | Email digest via Resend |

---

## Dashboard Tabs (`SiteDashboard.tsx`)

1. **Overview** — Score ring, issue counts, metrics cards, category breakdown
2. **Issues** — Filterable/sortable audit issues with severity badges
3. **AI Visibility** — Share of Voice charts, competitor comparison, insights
4. **Keywords** — Full keyword table with position, volume, KD, CPC
5. **Competitors** — Competitor domain analysis
6. **Pages** — All audited pages with scores and meta data
7. **Cannibalization** — Keyword conflict detection + resolution
8. **Preview** — Live iframe of production site (via proxy)
9. **Command Center** — Multi-agent AI chat interface
10. **Methodology** — 8-section reference guide

---

## Code Editor Page (`/profiles/[id]/sites/[siteId]/editor`)

Full IDE experience with 3 view modes:
- **Chat + Editor** (split view)
- **Chat Only** (full width)
- **Editor Only** (full width)

Features:
- Monaco Editor with TypeScript/JSX syntax highlighting
- GitHub file browser (tree view)
- File read/write/commit directly from editor
- AI chat with streaming + agent routing
- Model selector (Claude Sonnet, Opus, Haiku)
- File upload (images, PDFs, code files)
- Terminal emulator panel
- Live preview panel

---

## Supabase Edge Functions (Background Cloud Jobs)

### `daily-semrush-refresh`
- Runs daily via pg_cron
- Pulls from SEMRush API: domain_organic, domain_ranks, backlinks_overview
- Updates: keywords, site_metrics, competitors tables
- Regenerates AI recommendations

### `ai-visibility-tracker` (v2)
- Queries Perplexity API from 16 US cities
- Uses unbiased third-person prompts (no personalization)
- Tracks mentions across: Google AI Mode, ChatGPT, Perplexity, Gemini
- Updates: ai_share_of_voice, ai_insights tables

### `seo-sync`
- Public API for PPC admin site to read/write shared data
- Token-authenticated (x-seo-sync-token header)

---

## Database Schema (20 tables)

### Core
- `profiles` — Brand profiles (multi-site support)
- `sites` — Connected websites with GitHub/domain config
- `app_config` — Key-value store for API keys and settings

### SEO Audit
- `audits` — Audit runs with overall scores
- `audit_issues` — Individual SEO problems found
- `audit_pages` — Per-page SEO analysis
- `cannibalization_issues` — Keyword conflict detection

### Keywords & Metrics
- `keywords` — SEMRush keyword data (position, volume, KD, CPC)
- `site_metrics` — Domain authority, organic traffic, backlinks
- `competitors` — Competitor domain tracking

### AI Visibility
- `ai_share_of_voice` — Brand mention percentages by platform
- `ai_insights` — Actionable AI visibility recommendations
- `ai_strategy_reports` — Long-form strategy documents
- `ai_competitor_sentiment` — Sentiment analysis per competitor
- `ai_visibility` — Raw visibility data points
- `ai_prompt_research` — Query/prompt tracking for AI platforms

### Workflow
- `fix_sessions` — Working branches with linked issues
- `fixes` — Individual file changes within a session
- `recommendations` — AI-generated SEO improvement suggestions
- `job_runs` — Background job execution log

---

## External Integrations

### SEMRush REST API
- **Endpoints used**: domain_organic, domain_ranks, domain_organic_organic, backlinks_overview
- **Key**: Stored in `app_config` table
- **Refresh**: Daily via Edge Function + manual via dashboard button

### Perplexity API (AI Visibility)
- **Model**: sonar
- **Strategy**: Unbiased third-person prompts from 16 US cities
- **Key**: Stored in `app_config` table

### GitHub (Octokit)
- **Capabilities**: Browse files, create branches, commit changes, create PRs, merge
- **Token**: Per-site, stored in `sites` table
- **Repo**: premieratx/CruiseConcierge (PPC site)

### Netlify
- **Site ID**: 843ba33c-5888-4098-bb8c-eb35889c1430
- **Deploy**: Via CLI + MCP integration
- **Branch deploys**: Automatic for working branches

### Google PageSpeed Insights
- **Endpoint**: /api/pagespeed/run
- **Metrics**: LCP, FID, CLS, TTFB, Speed Index

---

## Two-Way Sync with PPC Admin (`/api/seo-sync`)

The PPC website's admin section can:
- **READ**: pages, overview stats, keywords, issues, recommendations, AI visibility data
- **WRITE**: update page meta, update issue status, dismiss recommendations

Authentication: Shared token (`ppc-seo-sync-2026`)

---

## Key Business Context (Premier Party Cruises)

- **4 boats**: Day Tripper (14), Meeseeks (25-30), The Irony (25-30), Clever Girl (50-75)
- **ATX Disco Cruise**: Bachelor/bachelorette/combined ONLY, March-October seasonal
- **Private Cruises**: Any event type, year-round (all 12 months)
- **Marina**: Anderson Mill Marina, Leander TX — 25 minutes from downtown Austin
- **BYOB**, licensed captains, 15+ years, perfect safety record, 150,000+ guests, 4.9/5 rating
- **Phone**: (512) 488-5892

### Architecture Rules (PPC Site)
- SEO content goes in `server/ssr/pageContent.ts` (NEVER in React components)
- JSON-LD schemas go in `attached_assets/schema_data/` (NEVER from React)
- NEVER reduce crawler word count without replacing coverage
- SSR layer uses `[[token]]` syntax for internal links
- All changes go to working branch first, never direct to main

---

## AI Visibility Current Status

- **Share of Voice**: 17% (2nd place, Float On leads at 27%)
- **Favorable Sentiment**: 77% (Float On only 30%)
- **70 mentions**, 120 citations, 63 cited pages
- **Strongest**: Google AI Mode (38.6%)
- **Weakest**: ChatGPT (11.4%)
- **Strategy**: Close Float On gap through segment-specific authority content

---

## Design System (from PPC Booking Concierge)

- Primary: hsl(210, 85%, 45%) — ocean blue
- Accent: hsl(195, 85%, 50%) — cyan
- Secondary: hsl(15, 85%, 60%) — sunset coral
- Luxury gold: hsl(45, 90%, 60%)
- Cards: bg-white/10 backdrop-blur-sm (glassmorphism)
- Buttons: scale(1.05) + translateY(-2px) on hover
- Typography: Inter (body), Playfair Display (luxury/formal)
- Border radius: 0.75rem
- Transitions: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)

### Wes McDowell's 8 Keys
1. Message clarity over design complexity
2. Hero section 5-second test
3. One clear CTA per page
4. Social proof above the fold
5. Guide the journey (Problem > Solution > How it works > Proof > CTA)
6. Mobile-first design
7. Speed is a feature
8. Video as welcome mat

---

## Credentials & IDs

| Item | Value |
|------|-------|
| Supabase Project ID | gtoiejwibueezlhfjcue |
| Netlify Site ID | 843ba33c-5888-4098-bb8c-eb35889c1430 |
| PPC site_id (DB) | 37292000-d661-4238-8ba4-6a53b71c2d07 |
| PPC profile_id | 9ab346ff-aeeb-47a6-957a-ccb9fbb09fa7 |
| User ID | f65b427e-1c81-4c1b-af2d-8e1fa5175948 |
| GitHub (PPC) | premieratx/CruiseConcierge |
| GitHub (Dashboard) | premieratx/seo-command-center |
| Supabase Org | mzljjchrilxjnrxprize |
| API Keys | Stored in Supabase `app_config` table |

---

## Known Issues / Pending Work

### Critical Bug
- **Command Center tab** in `SiteDashboard.tsx` still uses hardcoded `generateResponse()` instead of calling `/api/agent-chat` API. Needs streaming integration like the Editor page.

### Priority Tasks
1. Fix Command Center tab to use real agent-chat API with streaming
2. Build admin chat integration for live PPC site (/admin pages)
3. Wire agents to sync API for instant admin publish
4. Execute top 5 SEO improvements:
   - Fix 59 missing AI topics
   - Fix 20 broken business listings
   - Close Float On SoV gap (17% -> 27%+)
   - Expand /private-cruises from 2,800 to 4,000+ words
   - Fix meta descriptions site-wide
5. Create new homepage design (concierge luxury + McDowell principles)
6. Build admin AI assistant into PPC admin pages
7. Make all capabilities reusable for future site profiles

---

## How to Run

```bash
cd /Users/brianhill/Desktop/ClaudeCode/seo-dashboard
npm run dev
# or if turbopack issues:
PATH="/usr/local/bin:$PATH" node node_modules/.bin/next dev --webpack --port 3000
```

Dev server runs at http://localhost:3000

---

## How to Resume Development

Start a new Claude Code session in `/Users/brianhill/Desktop/ClaudeCode/seo-dashboard` and say:

> "Read CAPABILITIES.md and continue from the pending work section."

The compact summary from this session will also persist automatically.
