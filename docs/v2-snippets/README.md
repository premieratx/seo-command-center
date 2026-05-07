# V2 site snippets — ready-to-paste components for `premieratx/CruiseConcierge`

Components built on the `seo-command-center` side, packaged so they can be
copied into the V2 site (CruiseConcierge / `premier-party-cruises-v2`) admin
without any rewriting.

## `AdLoopAdminPanel.tsx` — Ad Loop mirror in V2 admin

A read-only Google + Meta ads dashboard for the V2 site's
`/admin/seo-command-center` (or any V2 admin route). Pulls live data from
`seo-command-center.netlify.app/api/seo-sync` using the same shared token
the V2 admin already uses for SEO data.

### Install

1. **Drop the file into CruiseConcierge:**
   ```
   client/src/admin/AdLoopAdminPanel.tsx
   ```
2. **Add 3 env vars** to the V2 site's Netlify (or `.env`):
   ```
   VITE_SEO_DASHBOARD_URL=https://seo-command-center.netlify.app
   VITE_SEO_SYNC_TOKEN=<same token already used for SEO sync>
   VITE_PPC_SITE_ID=37292000-d661-4238-8ba4-6a53b71c2d07
   ```
3. **Mount it** somewhere visible — e.g. inside the existing
   `SEOCommandCenter` admin component:
   ```tsx
   import AdLoopAdminPanel from "./AdLoopAdminPanel";

   // ... inside the admin layout
   <AdLoopAdminPanel />
   ```
4. Build + deploy V2 → admin now shows live Ad Loop data.

### Why read-only?

Mutations (pause / enable / bulk actions) intentionally happen only on the
Command Center side. That keeps the V2 site simple and prevents accidental
ad-spend changes from a customer-facing-adjacent admin. To make changes,
the operator opens the Command Center.

### Easiest way to install (Claude Code Desktop)

From your Mac, open the CruiseConcierge repo in Claude Code Desktop and
paste:

> Copy `docs/v2-snippets/AdLoopAdminPanel.tsx` from the seo-command-center
> repo into `client/src/admin/AdLoopAdminPanel.tsx` here. Then mount it
> inside the `SEOCommandCenter` admin component as a new tab. Add the 3
> required Vite env vars to Netlify if they aren't already there.
> Commit + push to the `seo-fixes-only` branch.
