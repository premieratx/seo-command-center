import fs from "node:fs/promises";
import path from "node:path";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DocsBrowser from "@/components/DocsBrowser";

// In-app docs viewer.
//
// Reads markdown from two locations and merges them into one sidebar:
//
//   1. /docs/                          → repo-root docs (architecture overviews,
//                                        integration manuals, API references).
//                                        These are also what shows up first when
//                                        someone opens the GitHub repo.
//   2. /src/quote-app/docs/            → Lovable quote-app's vendored docs
//                                        (business rules, payment policies, etc.)
//
// New repo-root docs (drop a .md file in /docs/ or /docs/integration-manuals/)
// auto-appear in the sidebar with the order set in TOP_LEVEL_ORDER.

const REPO_DOCS_DIR = path.join(process.cwd(), "docs");
const QUOTE_DOCS_DIR = path.join(process.cwd(), "src", "quote-app", "docs");

// Sidebar ordering — keep the architecture overview at the top, then the
// integration deep-dives, then the quote-app docs. Anything not listed
// falls to the bottom alphabetically.
const TOP_LEVEL_ORDER = [
  "README.md",
  "COMMAND_CENTER_OVERVIEW.md",
  "AD_LOOP.md",
  "SEO_SYNC_API.md",
  "integration-manuals/SEMRUSH_AND_AI_VISIBILITY.md",
  "ai-visibility-refresh-pipeline.md",
];

const DOC_META: Record<string, { title: string; blurb: string; group: string }> = {
  "README.md": {
    title: "Documentation index",
    blurb: "What's where + quick links for operators and other AI agents.",
    group: "Command Center",
  },
  "COMMAND_CENTER_OVERVIEW.md": {
    title: "Command Center · Overview",
    blurb:
      "End-to-end architecture: tech stack, all 11 tabs, integrations, deploy pipeline, security, env vars.",
    group: "Command Center",
  },
  "AD_LOOP.md": {
    title: "Ad Loop · Google + Meta Ads",
    blurb:
      "Dashboard architecture, three integration paths, alerts engine, agent tools, V2 sync.",
    group: "Command Center",
  },
  "SEO_SYNC_API.md": {
    title: "/api/seo-sync — Cross-app sync API",
    blurb:
      "Public token-authed read/write endpoints the V2 admin uses to read SEO + Ad Loop data.",
    group: "Command Center",
  },
  "integration-manuals/SEMRUSH_AND_AI_VISIBILITY.md": {
    title: "SEMRush + AI Visibility · Integration Manual",
    blurb:
      "Complete inventory of REST API + browser-scraper + ingestion. Cron blueprint + port-it-yourself guide.",
    group: "Integrations",
  },
  "ai-visibility-refresh-pipeline.md": {
    title: "AI Visibility refresh pipeline (legacy)",
    blurb:
      "Original pipeline doc — superseded by SEMRush + AI Visibility manual. Kept for reference.",
    group: "Integrations",
  },
  "BUSINESS_RULES.md": {
    title: "Business Rules",
    blurb: "Canonical pricing — boats, tiers, crew fees, ATX Disco, scheduling.",
    group: "Quote Builder",
  },
  "STRIPE_PAYMENT_MANAGEMENT.md": {
    title: "Stripe Payment Management",
    blurb: "Deposit, final payment, refund, and reconciliation policies.",
    group: "Quote Builder",
  },
  "GHL_CHAT_INTEGRATION.md": {
    title: "Go High Level Integration",
    blurb: "Lead + customer sync with GHL workflows and pipelines.",
    group: "Quote Builder",
  },
  "PAYMENT_SAFEGUARDS.md": {
    title: "Payment Safeguards",
    blurb: "Guardrails against double-charges, chargebacks, and fraud.",
    group: "Quote Builder",
  },
  "PHASE_1_IMPROVEMENTS.md": {
    title: "Phase 1 Improvements",
    blurb: "Roadmap of launch-phase upgrades and their status.",
    group: "Quote Builder",
  },
  "QUOTE_README.md": {
    title: "Quote Builder README",
    blurb: "Architecture overview, getting started, and conventions.",
    group: "Quote Builder",
  },
};

interface DiskDoc {
  filename: string; // logical id (may include subfolder, e.g. "integration-manuals/...")
  content: string;
}

async function safeRead(absPath: string): Promise<string | null> {
  try {
    return await fs.readFile(absPath, "utf8");
  } catch {
    return null;
  }
}

async function loadRepoDocs(): Promise<DiskDoc[]> {
  const out: DiskDoc[] = [];
  // Top-level files in /docs/
  let entries: string[] = [];
  try {
    entries = await fs.readdir(REPO_DOCS_DIR);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name.endsWith(".md")) {
      const content = await safeRead(path.join(REPO_DOCS_DIR, name));
      if (content) out.push({ filename: name, content });
    }
  }
  // /docs/integration-manuals/*.md (one level deep — that's enough for now)
  const subdir = path.join(REPO_DOCS_DIR, "integration-manuals");
  let subEntries: string[] = [];
  try {
    subEntries = await fs.readdir(subdir);
  } catch {
    /* missing folder is fine */
  }
  for (const name of subEntries) {
    if (name.endsWith(".md")) {
      const content = await safeRead(path.join(subdir, name));
      if (content)
        out.push({ filename: `integration-manuals/${name}`, content });
    }
  }
  return out;
}

async function loadQuoteDocs(): Promise<DiskDoc[]> {
  const out: DiskDoc[] = [];
  let entries: string[] = [];
  try {
    entries = await fs.readdir(QUOTE_DOCS_DIR);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (!name.endsWith(".md")) continue;
    const content = await safeRead(path.join(QUOTE_DOCS_DIR, name));
    if (!content) continue;
    // Disambiguate "README.md" between the two folders so the meta map
    // can target each separately.
    const filename = name === "README.md" ? "QUOTE_README.md" : name;
    out.push({ filename, content });
  }
  return out;
}

async function loadDocs() {
  const [repoDocs, quoteDocs] = await Promise.all([loadRepoDocs(), loadQuoteDocs()]);
  const all = [...repoDocs, ...quoteDocs];

  const byFilename = new Map(all.map((d) => [d.filename, d]));
  const ordered: DiskDoc[] = [];

  // 1. The explicit ordered list first
  for (const f of TOP_LEVEL_ORDER) {
    const d = byFilename.get(f);
    if (d) {
      ordered.push(d);
      byFilename.delete(f);
    }
  }
  // 2. Everything else, alphabetical
  ordered.push(
    ...[...byFilename.values()].sort((a, b) => a.filename.localeCompare(b.filename)),
  );

  return ordered.map((d) => {
    const meta = DOC_META[d.filename] ?? {
      title: d.filename.replace(/\.md$/, "").replace(/^.*\//, ""),
      blurb: "",
      group: "Other",
    };
    return { filename: d.filename, content: d.content, ...meta };
  });
}

export default async function DocsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const docs = await loadDocs();

  return (
    <AppShell user={user}>
      <DocsBrowser docs={docs} />
    </AppShell>
  );
}
