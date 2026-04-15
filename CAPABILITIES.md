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

## Design System (from Party On Concierge — ppc-booking-concierge.netlify.app)

Source code: `/Users/brianhill/Desktop/ClaudeCode/concierge-dashboard-hub/`

**Fonts**:
- Display: Cormorant Garamond (weight 300, italic for emphasis words)
- Body: Jost (weight 400-600)

**Color Palette**:
- Background: #07070C (deepest), #0F0F18 (alt sections), #1A1A26 (cards)
- Gold: #C8A96E (primary accent), #DFC08A (light), #EDD9AA (pale)
- Cream: #F0E6D0 (headings), #C8B898 (body), #A89878 (muted)
- Borders: rgba(200,169,110,0.16)

**Components**:
- Cards: dark bg + gold borders, sharp edges (no border-radius)
- Buttons: gold fill (#C8A96E), dark text, UPPERCASE, letter-spacing 0.16em
- Headlines: clamp(3.75rem, 4vw, 5.47rem), weight 300
- Section labels: small uppercase gold + ::after gold line (32px)
- Hero: left-aligned, video at 35% opacity, massive heading
- Trust bars: dark card bg, gold icon + uppercase label

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

## Completed Work (Session 2 — April 2026)

### SEO Command Center (seo-command-center repo)
- [x] **Command Center tab fixed** — replaced hardcoded `generateResponse()` with real `/api/agent-chat` streaming
- [x] **Model selector + agent picker** added to Command Center tab
- [x] **Agent context enrichment** — 6 new formatters (ai_insights, competitor_sentiment, site_metrics, audit_pages, cannibalization, recommendations)
- [x] **CORS support** — PPC admin can call agent-chat and seo-sync APIs cross-origin
- [x] **Design agent updated** — correct Concierge design tokens (Cormorant Garamond/Jost, dark/gold palette)
- [x] **Main agent** gets recommendations in context

### CruiseConcierge (PPC site, branch: seo-improvements-apr2026)
- [x] **"30 min" → "25 min"** fixed across 60+ occurrences in pageContent.ts + schemaLoader.ts
- [x] **Private cruises page expanded** — year-round availability, event types, safety, 4-boat FAQ (estimated +1,200 words)
- [x] **Homepage meta description improved** for CTR
- [x] **SEOCommandCenter admin component** — multi-agent chat wired into PPC admin at `/admin/seo-command-center`
- [x] **Navigation link added** for SEO Command Center in admin
- [x] **HomeV2 luxury redesign** at `/home-v2` — Party On Concierge design system + McDowell principles
  - Cormorant Garamond + Jost fonts, dark/gold palette, left-aligned hero, sharp cards
  - 8 sections: Hero (video) → Trust Bar → Promise → Experiences → Fleet → Testimonials → FAQ (10 items) → CTA
  - All SEO content preserved in FAQ accordions
  - Mobile responsive, 44px touch targets, lazy-loaded footer

### PR Live
- PR #1: https://github.com/premieratx/CruiseConcierge/pull/1
- Branch: `seo-improvements-apr2026`

---

## Session 3 — Luxury V2 Pages + AI Visibility (April 2026)

### 9 Luxury V2 Pages Built (Concierge design system)
All at premieratx/CruiseConcierge branch `seo-improvements-apr2026`:
- HomeV2 (/home-v2) — 1,329 lines
- DiscoV2 (/disco-v2) — 1,380 lines
- BachelorV2 (/bachelor-v2) — 1,440 lines
- BacheloretteV2 (/bachelorette-v2) — 1,486 lines
- CombinedBachV2 (/combined-bach-v2) — 1,422 lines
- PrivateCruisesV2 (/private-cruises-v2) — 1,499 lines
- CorporateV2 (/corporate-v2) — 1,164 lines
- WeddingV2 (/wedding-v2) — 1,198 lines
- BirthdayV2 (/birthday-v2) — 1,249 lines

Each page includes: hero video, trust bar, feature sections, fleet/pricing,
photo galleries (real party photos), expandable detail sections, private
charter pricing tables, AI-optimized FAQs (12-14 per page), final CTA.

### SEO Fixes Applied
- 20+ meta descriptions rewritten for CTR
- og:url now dynamic per page
- Keyword cannibalization canonical overrides (6 blog posts)
- 22+ AI-extractable FAQ entries on SSR pages
- Birthday parties FAQ section added
- Private cruises page expanded (+1,200 words)

### To Preview Locally
```bash
cd /Users/brianhill/Desktop/ClaudeCode/CruiseConcierge
ln -sf ../attached_assets public/attached_assets  # symlink for images
PATH="/usr/local/bin:$PATH" npx vite --port 5173 --host
# Then open http://localhost:5173/home-v2 (or any V2 URL above)
```

---

## Session 4 — App Features + Data Integration (April 14, 2026)

### App Features Built & Deployed
- Command Center merged with Preview (chat left, preview right, resizable)
- Top Fixes table with "Fix Now" auto-execute buttons
- AI Audit with 1-click "Fix & Commit" to GitHub
- "Audit Page" button in preview pane
- Preview source toggle: Live | Branch | Local
- V2 Pages dropdown with Publish dialog (replace/new URL)
- "Publish Live" button
- Auto-sync hooks from Claude Code (.claude/settings.json in both repos)
- Code Editor: Apply Code, Stage File, multi-file batch commit, deploy, branches, file search, templates
- Smart model selection (Auto: Haiku for routine, Sonnet for complex)
- Documentation tab (How to Use / Capabilities / Methodology)
- Version history + revert API (per-file, via GitHub commits)
- Party On Delivery profile + Allan's account (allan@partyondelivery.com / admin123)
- Resend email integration (brian@premierpartycruises.com sender)
- Daily cron: SEMRush 6AM, AI Visibility 7AM, Recs 8AM, Email 10AM
- SEMRush expanded: 500 keywords, organic pages, keyword overview, domain history
- Site audit expanded: 200 pages per crawl
- 56 keywords loaded in DB, daily refresh pulls all 500
- 10 competitors with full traffic/keyword data
- Anthropic API key: stored in app_config (refreshed April 14)
- Haiku model ID fixed: claude-3-haiku-20240307

### On Branch (NOT published — premieratx/CruiseConcierge branch seo-improvements-apr2026):
- 9 luxury V2 pages (Home, Disco, Bachelor, Bachelorette, Combined, Private, Corporate, Wedding, Birthday)
- Admin SEO Command Center component (/admin/seo-command-center)
- TikTok video embeds with lazy-load autoplay
- 20-photo gallery on DiscoV2
- PR #1 open: https://github.com/premieratx/CruiseConcierge/pull/1

---

## Session 5 — Full UX Overhaul + Data Load (April 15, 2026)

### Data Loaded
- [x] 100 keywords pulled from SEMRush (85 unique) — top keywords by traffic
- [x] Full 185-page site audit (96/100 score, 0 critical, 2 high, 76 medium issues)
- [x] All audit data in Supabase: audits, audit_pages (185), audit_issues (78)
- [x] SEMRush API units depleted after first batch — remaining ~1,300 keywords await unit recharge
- [x] keyword_difficulty is NULL — SEMRush didn't return KD data; needs separate API call

### Major UI/UX Overhaul
- [x] **11 tabs consolidated to 5**: Overview, Research (4 sub-tabs), AI Visibility, Command Center, Documentation
- [x] **Research tab** — sub-tabs: Keywords (100), Pages (185), Competitors (10), Cannibalization
- [x] **Every stat is clickable** — all numbers navigate to actionable views or Command Center
- [x] **Keyword table rows** — click any keyword → opens Command Center with architecture-aware fix prompt
- [x] **Position distribution bars** — click any range → filters keywords to that position range
- [x] **Winners/Losers** — click any keyword → Command Center with improvement/recovery prompt; hover "Fix" button on losers
- [x] **Overview cards** — Score/Issues scroll to issues section; Pages navigates to Research → Pages sub-tab
- [x] **AI Visibility "Fix Now"** — every recommendation has Fix Now button + multi-select checkboxes + floating batch fix bar
- [x] **Command Center view modes** — Split View | Chat Only | Preview Only toggle
- [x] **Collapsible Top Fixes table** — click header to collapse/expand
- [x] **Streaming indicator** — bouncing dots while AI responds
- [x] **Affected pages on issue cards** — shows which URLs each issue affects
- [x] **Empty states with CTAs** — "Run Your First Audit" button when no data
- [x] **Accessibility** — role="tablist/tab", aria-selected, keyboard handlers on interactive cards

### Architecture Fixes
- [x] **Model IDs fixed** — `claude-sonnet-4-20250514` (was `claude-sonnet-4-6-20250514` causing 404), `claude-opus-4-20250514`, `claude-haiku-4-5-20251001` — fixed across all 6 files
- [x] **Removed orphaned PreviewTab** — was 200 lines of dead code
- [x] **Removed "preview" from Tab type** — cleanup
- [x] **Header simplified** — "Code Editor" + "Start Fix Session" buttons replaced with single "Command Center" button
- [x] **"Open Full Code Editor"** — link inside Command Center for deep editing
- [x] **sessionStorage prompt bridge** — AI Visibility Fix Now → Command Center auto-sends prompt via sessionStorage + useRef
- [x] **ResearchTab initialSubTab** — Overview cards navigate to correct sub-tab (e.g., Pages)

### Automation Changes
- [x] All cron jobs changed to **weekly (Mondays)**: SEMRush 6AM, AI Visibility 7AM, Recs 8AM, Email 3PM
- [x] Manual "Refresh SEMRush" and "Run New Audit" buttons still work anytime

### PPC Site (premierpartycruises.com)
- [x] Confirmed: all SEO content fixes (meta descriptions, FAQs, "25 min") already live on main
- [x] Branch `seo-fixes-only` pushed with admin SEO Command Center component
- [x] V2 pages remain on `seo-improvements-apr2026` (separate branch per process rule)
- [x] **Process rule saved**: SEO fixes and V2 pages always go on separate branches/PRs

### Documentation Updated
- [x] Documentation tab: 4 fix workflow options (AI Audit, Top Fixes, AI Visibility Fix Now, Code Editor)
- [x] Documentation tab: Publishing V2 pages workflow
- [x] Documentation tab: Updated capabilities with all Session 5 features
- [x] CAPABILITIES.md: this section

---

## QUEUED — Do These Next (Priority Order)

### Data (Urgent — Do First)
1. **Pull remaining ~1,300 keywords** — SEMRush API units need to recharge (weekly cron will pull automatically on Monday, or recharge manually)
2. **Pull keyword_difficulty** — KD is NULL for all keywords; may need separate SEMRush `keyword_overview` report
3. **Fix 6 Page 2 keywords** — biggest immediate SEO win (~400 clicks/mo):
   - "lake travis boat rentals" #20 (1,300 vol)
   - "austin bachelorette party" #15 (1,000 vol)
   - "bachelorette weekend in austin" #14 (590 vol)
   - "lake travis party boat" #10 (390 vol)
   - "lake travis boat tours" #11 (260 vol)
   - "austin party barge" #13 (210 vol)

### App Features (Build Next)
4. **Auto-run PageSpeed** when audit runs — catches speed issues killing rankings
5. **Broken link checker** in audit crawler — broken links tank authority
6. **Position tracking chart** — line graph of keyword positions over time
7. **Revert UI in preview panel** — version history dropdown with 1-click revert
8. **"Not Published" tags** — badge on branch-only items in preview
9. **Content gap analysis** — what competitors rank for that you don't

### External
10. Fix 20 broken business listings (Google Business, Yelp, etc.)
11. Address 59 missing AI topics (create FAQ content in pageContent.ts)
12. 473 source opportunities (external citations strategy)
13. Verify Resend domain (premierpartycruises.com) for email delivery

### V2 Pages
14. Merge V2 pages PR (or publish individually via Publish dialog)
15. Additional V2 pages: Contact, FAQ, Gallery, Testimonials
16. Sub-pages: team-building-v2, client-entertainment-v2, etc.
17. A/B test framework for V2 vs current pages

---

## How to Run

```bash
cd /Users/brianhill/Desktop/ClaudeCode/seo-dashboard
npm run dev
# or:
PATH="/usr/local/bin:$PATH" node node_modules/.bin/next dev --webpack --port 3000
```

To preview V2 pages locally:
```bash
cd /Users/brianhill/Desktop/ClaudeCode/CruiseConcierge
ln -sf ../../attached_assets client/public/attached_assets
npx vite --port 5173 --host
```

To deploy SEO Command Center:
```bash
cd /Users/brianhill/Desktop/ClaudeCode/seo-dashboard
PATH="/usr/local/bin:$PATH" ./node_modules/.bin/next build
PATH="/usr/local/bin:/opt/homebrew/bin:$PATH" npx netlify deploy --prod --dir=.next --site=843ba33c-5888-4098-bb8c-eb35889c1430
```

---

## How to Resume

Type `/clear` in Claude Code, then paste:

> Read /Users/brianhill/Desktop/ClaudeCode/seo-dashboard/CAPABILITIES.md and continue from the QUEUED section. Start with pulling all 500 keywords into Supabase, then build the UI features.
