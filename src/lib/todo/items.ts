// Seeded To-Do list for the Command Center's new "To-Do" tab.
//
// Source-of-truth lives in code so it survives across all sessions /
// environments. Per-item completion state is persisted to localStorage on
// the operator's machine — no backend round-trip needed.
//
// To add a new item: append to the array below, push, redeploy. The id
// must be stable so localStorage "done" state lines up across sessions.

export type TodoCategory =
  | "security"
  | "ads"
  | "deploy"
  | "v2-sync"
  | "seo"
  | "polish"
  | "content";

export type TodoPriority = "urgent" | "high" | "normal";

export interface TodoItem {
  id: string;
  title: string;
  detail: string;
  category: TodoCategory;
  priority: TodoPriority;
  // Optional one-click "open" target — URL or copy-to-clipboard prompt.
  action?: { label: string; href?: string; copy?: string };
  // Step list rendered when expanded.
  steps?: string[];
  // ISO date string for "added on" display.
  added: string;
}

export const TODO_CATEGORIES: { id: TodoCategory; label: string; emoji: string }[] = [
  { id: "security", label: "Security", emoji: "🔒" },
  { id: "ads", label: "Ad Loop", emoji: "📣" },
  { id: "deploy", label: "Deploy", emoji: "🚀" },
  { id: "v2-sync", label: "V2 site sync", emoji: "🔁" },
  { id: "seo", label: "SEO", emoji: "📊" },
  { id: "polish", label: "Polish", emoji: "✨" },
  { id: "content", label: "Content", emoji: "✍️" },
];

export const TODO_ITEMS: TodoItem[] = [
  {
    id: "revoke-netlify-token-2026-05-06",
    title: "Revoke the Netlify personal access token shared in chat",
    detail:
      "Token is in chat logs and grants full account access. Revoke it now or after we're done deploying for the day. No data loss — just generate a new one when needed.",
    category: "security",
    priority: "urgent",
    action: {
      label: "Open Netlify token settings",
      href: "https://app.netlify.com/user/applications#personal-access-tokens",
    },
    steps: [
      "Click the trash icon next to the token named 'claude-deploy'",
      "Confirm revocation",
      "If you want me to deploy again later, generate a new one with a 30-day expiry",
    ],
    added: "2026-05-06",
  },
  {
    id: "github-netlify-auto-deploy",
    title: "Connect GitHub → Netlify auto-deploy",
    detail:
      "One-time setup. After this, every push to main triggers a deploy automatically — no more pasting tokens or running CLI commands.",
    category: "deploy",
    priority: "high",
    action: {
      label: "Open Netlify deploy settings",
      href: "https://app.netlify.com/sites/seo-command-center/configuration/deploys",
    },
    steps: [
      "Click 'Link repository'",
      "Pick GitHub → authorize → choose premieratx/seo-command-center",
      "Production branch: main · Build command: next build · Publish dir: .next",
      "Save — first auto-deploy fires within 90 seconds",
    ],
    added: "2026-05-06",
  },
  {
    id: "google-ads-connect",
    title: "Connect your real Google Ads account",
    detail:
      "Right now Ad Loop renders sample data. Adding 5 env vars wires up live spend, conversions, and ROAS for every campaign.",
    category: "ads",
    priority: "high",
    action: {
      label: "Open setup walkthrough",
      href: "/demo/ad-loop",
    },
    steps: [
      "Apply for a Google Ads developer token (Test access = instant approval)",
      "Create OAuth client in Google Cloud Console",
      "Mint a refresh token via npx google-ads-refresh-token",
      "Find your Customer ID in ads.google.com",
      "Paste 5 env vars into Netlify → Site settings → Environment variables",
      "Redeploy → click 'Test now' on the Google Ads tab to verify",
    ],
    added: "2026-05-06",
  },
  {
    id: "meta-ads-connect",
    title: "Connect your real Meta Ads account",
    detail:
      "Generate a long-lived System User token in Meta Business Manager and add 2 env vars. Walkthrough is on the Meta Ads tab.",
    category: "ads",
    priority: "normal",
    action: {
      label: "Open setup walkthrough",
      href: "/demo/ad-loop",
    },
    steps: [
      "Business Settings → System users → Add (Admin role)",
      "Assign your Ad Account with Full control",
      "Generate new token with ads_read + ads_management scopes",
      "Find Ad Account ID in Ads Manager (act_NNNNNN)",
      "Add META_ADS_ACCESS_TOKEN + META_ADS_AD_ACCOUNT_ID to Netlify env vars",
    ],
    added: "2026-05-06",
  },
  {
    id: "v2-admin-ad-loop-panel",
    title: "Wire AdLoopAdminPanel into the V2 admin (CruiseConcierge repo)",
    detail:
      "/api/seo-sync now exposes ads-overview, ads-google, ads-meta actions. V2 admin needs a small React component to fetch + display them with the existing x-seo-sync-token header. I can't push to CruiseConcierge from this sandbox — needs to be done from Claude Code Desktop with that repo open.",
    category: "v2-sync",
    priority: "normal",
    action: {
      label: "Copy starter snippet",
      copy: `// CruiseConcierge: src/admin/AdLoopAdminPanel.tsx
const r = await fetch(
  \`\${SEO_DASHBOARD_URL}/api/seo-sync?action=ads-overview&site_id=\${SITE_ID}\`,
  { headers: { "x-seo-sync-token": process.env.SEO_SYNC_TOKEN! } }
);
const overview = await r.json();
// overview.totals.combined.cost, .roas, .top_campaigns, .series, etc.`,
    },
    added: "2026-05-06",
  },
  {
    id: "light-theme-accent-polish",
    title: "Polish accent text on tinted backgrounds",
    detail:
      "After the dark→light flip, some accent text (text-amber-200 on bg-amber-500/10, text-red-300 on bg-red-500/5, etc.) is faint on the new white canvas. Sweep AdAlerts, AdDrilldown, AdDashboard severity badges and bump shades by 400-500 (e.g. text-red-300 → text-red-700).",
    category: "polish",
    priority: "normal",
    added: "2026-05-06",
  },
  {
    id: "page-2-keywords",
    title: "Fix 6 Page-2 keywords for ~400 clicks/mo SEO win",
    detail:
      "Biggest immediate SEO opportunity from CAPABILITIES.md. Each is sitting at position 10-20 with strong volume.",
    category: "seo",
    priority: "high",
    steps: [
      "lake travis boat rentals · #20 · 1,300 vol",
      "austin bachelorette party · #15 · 1,000 vol",
      "bachelorette weekend in austin · #14 · 590 vol",
      "lake travis party boat · #10 · 390 vol",
      "lake travis boat tours · #11 · 260 vol",
      "austin party barge · #13 · 210 vol",
    ],
    added: "2026-05-06",
  },
  {
    id: "merge-seo-fixes-only-to-main",
    title: "Merge CruiseConcierge seo-fixes-only branch into main",
    detail:
      "Contains 115 blog posts converted to BlogV2Layout, 47 V2 pages, and the chatbot training endpoint. All from Sessions 5-8 — sitting unmerged.",
    category: "v2-sync",
    priority: "high",
    added: "2026-05-06",
  },
  {
    id: "publish-homev2",
    title: "Publish HomeV2 to production /",
    detail:
      "Luxury redesign is built and previews cleanly at /home-v2. Needs renderer.tsx title/meta swap + route swap on the / index.",
    category: "content",
    priority: "normal",
    added: "2026-05-06",
  },
  {
    id: "missing-ai-topics",
    title: "Address 59 missing AI topics in pageContent.ts",
    detail:
      "Tracked in the ai_insights table. Each missing topic costs us a citation in ChatGPT/Perplexity. Bulk-add as FAQs on the most relevant SSR pages.",
    category: "content",
    priority: "normal",
    added: "2026-05-06",
  },
  {
    id: "broken-business-listings",
    title: "Fix 20 broken business listings",
    detail:
      "Google Business Profile, Yelp, etc. — wrong NAP or duplicate listings. Each one weakens local SEO trust signals.",
    category: "seo",
    priority: "normal",
    added: "2026-05-06",
  },
  {
    id: "semrush-keywords-recharge",
    title: "Pull remaining ~1,300 SEMRush keywords",
    detail:
      "API units depleted last session. When the monthly quota recharges, fan out and pull the rest into Supabase.",
    category: "seo",
    priority: "normal",
    added: "2026-05-06",
  },
];
