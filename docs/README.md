# SEO Command Center · Documentation

Authoritative documentation for `premieratx/seo-command-center` — what the app is,
what it integrates with, how data flows through it, and how to extend it.

These docs are the single source of truth for both:

1. **Operators** using the app at https://seo-command-center.netlify.app
2. **Other AI agents** reading this repo (e.g. the cruise-site V2 admin agent)
   to understand the architecture before making cross-repo changes.

---

## Files in this folder

| File | What it covers |
|---|---|
| [COMMAND_CENTER_OVERVIEW.md](./COMMAND_CENTER_OVERVIEW.md) | **Start here.** End-to-end overview of the app: tech stack, all 11 tabs, integrations, deploy pipeline, security model. |
| [AD_LOOP.md](./AD_LOOP.md) | Google Ads + Meta Ads dashboard — architecture, data sources, three integration paths (sample / direct REST / AdLoop bridge), agent tools, V2 sync. |
| [SEO_SYNC_API.md](./SEO_SYNC_API.md) | Public read/write API the V2 admin uses. Auth, endpoints, request/response shapes. |
| [integration-manuals/SEMRUSH_AND_AI_VISIBILITY.md](./integration-manuals/SEMRUSH_AND_AI_VISIBILITY.md) | Complete inventory of SEMRush REST API + browser-scraper + AI Visibility ingestion. Cron blueprint, schema, env vars, port-it-yourself guide. |
| [v2-snippets/AdLoopAdminPanel.tsx](./v2-snippets/AdLoopAdminPanel.tsx) | Ready-to-paste V2-side React component that mirrors Ad Loop in the cruise-site admin via `/api/seo-sync`. |
| [ai-visibility-refresh-pipeline.md](./ai-visibility-refresh-pipeline.md) | Original AI Visibility pipeline doc (kept for reference; superseded by the SEMRUSH_AND_AI_VISIBILITY manual). |
| [screenshots/](./screenshots/) | Captured Playwright screenshots of `/demo/ad-loop` for review without running locally. |

---

## Quick links

- **Live app** — https://seo-command-center.netlify.app
- **Public Ad Loop demo** (no auth) — https://seo-command-center.netlify.app/demo/ad-loop
- **In-app docs viewer** — https://seo-command-center.netlify.app/docs (login required)
- **Repo** — https://github.com/premieratx/seo-command-center
- **Sister repo (V2 cruise site)** — https://github.com/premieratx/CruiseConcierge

## For other agents reading this repo

If you're an agent spun up to work on the V2 site (CruiseConcierge) and you need
to know how the SEO Command Center exposes data to V2, the right read order is:

1. `COMMAND_CENTER_OVERVIEW.md` — get the lay of the land
2. `SEO_SYNC_API.md` — the contract V2 admin uses today
3. `v2-snippets/AdLoopAdminPanel.tsx` — example V2-side consumer

If you need to replicate the SEMRush data pipeline elsewhere, read
`integration-manuals/SEMRUSH_AND_AI_VISIBILITY.md` end-to-end. It's a complete
porting guide.
