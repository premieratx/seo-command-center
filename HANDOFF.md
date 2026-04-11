# SEO Command Center — Handoff

## Status: Safe to shut down. Resume anytime.

Everything saved. No background processes running. No data loss risk.

---

## What's Done

### Infrastructure
- **Supabase project created**: `seo-command-center` (id: `gtoiejwibueezlhfjcue`, region: us-east-1)
- **Database schema applied**: 8 tables with RLS policies
  - `profiles`, `sites`, `audits`, `audit_issues`, `audit_pages`, `cannibalization_issues`, `fix_sessions`, `fixes`
- **Auto-seed function**: `seed_ppc_profile()` — runs on first sign-in, creates PPC profile + site + 18 audit issues + 10 pages + 4 cannibalization issues
- **Credentials**: Stored in `.env.local` (URL + publishable key)

### App
- **Next.js 16 app at**: `/Users/brianhill/Desktop/ClaudeCode/seo-dashboard`
- **Auth**: Supabase email/password (sign in + sign up)
- **Middleware**: Protects all routes except `/`, `/login`, `/auth/*`
- **Routes built**:
  - `/` — landing page (auto-redirects to `/profiles` if logged in)
  - `/login` — sign in / sign up form
  - `/profiles` — list of brand profiles (auto-seeds PPC on first visit)
  - `/profiles/new` — create new brand profile
  - `/profiles/[id]` — profile detail with list of sites
  - `/profiles/[id]/sites/new` — connect a new site (with GitHub repo + token form)
  - `/profiles/[id]/sites/[siteId]` — site detail dashboard with 6 tabs:
    - Overview (score ring, issue counts, category breakdown)
    - Issues (filterable by severity, expandable cards)
    - Pages (sortable table)
    - Cannibalization (keyword conflict cards with fixes)
    - Preview (live iframe of production site)
    - Command Center (natural language Q&A)

### Build state
- Builds clean — all 7 routes compile, no TypeScript errors
- Verified the landing page and login page render correctly in preview

---

## What's NOT Done Yet

In rough priority order:

1. **GitHub integration backend** — The form to connect a repo exists, but the actual code that:
   - Validates the GitHub token
   - Lists files from the repo
   - Creates working branches
   - Commits SEO fixes
   - Opens pull requests
   ...is not built yet. Needs server actions or API routes using `@octokit/rest` (already installed).

2. **Audit runner** — The dashboard reads audits from Supabase but there's no "Run Audit" button wired up. We need to port the crawl logic from `seo-optimizer/scripts/crawl_site.py` into a server action or background job that crawls a live URL, scores pages, and writes results to the DB.

3. **Fix sessions / change preview workflow** — The "Preview" tab shows the production site only. After fix sessions exist, it should show side-by-side production vs. preview branch.

4. **Netlify integration** — Connect Netlify API to:
   - Create branch deploy previews from working branches
   - Trigger production deploys when "Publish" is clicked
   - Pull deploy status into the dashboard

5. **"Publish" flow** — Server action that:
   - Merges working branch → main via GitHub API
   - Triggers Netlify production deploy
   - Updates fix_session status to "published"
   - Marks fixed audit_issues as "fixed"

6. **Deploy this dashboard to seo-command-center.netlify.app** — App is built locally but not deployed. Needs:
   - `git init` + push to GitHub
   - Netlify project create + connect to repo
   - Set env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Configure custom name `seo-command-center`

7. **SEMRush MCP authentication** — Configured in `.mcp.json` but you need to restart Claude Code and OAuth in. Once connected, the dashboard can pull live keyword rankings to verify the cannibalization issues with real SERP data.

8. **PageSpeed Insights API integration** — Needs an API route that calls Google PageSpeed Insights and adds Core Web Vitals to the dashboard.

9. **Command Center → real fixes** — Currently the chat just generates suggestions. Needs to call into the GitHub backend to actually edit files based on natural language instructions.

---

## How to Resume When You're Back

When you restart Claude Code from `/Users/brianhill/Desktop/ClaudeCode`, just say:

> "Resume the SEO command center build. Read seo-dashboard/HANDOFF.md and continue from where we left off."

I'll pick up exactly where I am now. Suggested first task on resume: **deploy what we have to Netlify so you can sign up and see the auto-seeded PPC data live**, then continue building the GitHub integration backend.

---

## How to Test What's Built (When You're Back)

```bash
# Start the dev server
cd /Users/brianhill/Desktop/ClaudeCode/seo-dashboard
PATH="/usr/local/bin:$PATH" node node_modules/.bin/next dev --webpack --port 3000
```

Then:
1. Open http://localhost:3000
2. Click "Create Account"
3. Sign up with any email + password (Supabase will email a confirmation link, but you can disable email confirmation in the Supabase dashboard if you want to skip that)
4. Once logged in, you'll land on `/profiles` and the **Premier Party Cruises** profile will auto-appear with all the audit data we collected
5. Click into the profile → click into the site → see the full dashboard with all 18 issues, 10 pages, 4 cannibalization conflicts

---

## Important Files

- `seo-dashboard/.env.local` — Supabase credentials
- `seo-dashboard/.mcp.json` — (in parent dir) SEMRush MCP config
- `seo-dashboard/src/lib/supabase/` — Supabase client setup
- `seo-dashboard/src/components/SiteDashboard.tsx` — main dashboard component with all 6 tabs
- `seo-dashboard/src/app/profiles/[id]/sites/new/page.tsx` — site connection form
- `seo-optimizer/` — the original skill (separate from the dashboard)

---

## Cost Status

- **Supabase Pro**: $25/mo (you upgraded today) — covers unlimited projects
- **Supabase project compute**: $10/mo (covered by Pro plan credits)
- **Netlify**: $0 — not yet deployed
- **Total**: ~$25/mo currently
