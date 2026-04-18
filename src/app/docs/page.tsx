import fs from "node:fs/promises";
import path from "node:path";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DocsBrowser from "@/components/DocsBrowser";

const DOCS_DIR = path.join(process.cwd(), "src", "quote-app", "docs");

const DOC_META: Record<string, { title: string; blurb: string }> = {
  "BUSINESS_RULES.md": {
    title: "Business Rules",
    blurb: "Canonical pricing — boats, tiers, crew fees, ATX Disco, scheduling.",
  },
  "STRIPE_PAYMENT_MANAGEMENT.md": {
    title: "Stripe Payment Management",
    blurb: "Deposit, final payment, refund, and reconciliation policies.",
  },
  "GHL_CHAT_INTEGRATION.md": {
    title: "Go High Level Integration",
    blurb: "Lead + customer sync with GHL workflows and pipelines.",
  },
  "PAYMENT_SAFEGUARDS.md": {
    title: "Payment Safeguards",
    blurb: "Guardrails against double-charges, chargebacks, and fraud.",
  },
  "PHASE_1_IMPROVEMENTS.md": {
    title: "Phase 1 Improvements",
    blurb: "Roadmap of launch-phase upgrades and their status.",
  },
  "README.md": {
    title: "Quote Builder README",
    blurb: "Architecture overview, getting started, and conventions.",
  },
};

async function loadDocs() {
  const files = await fs.readdir(DOCS_DIR);
  const md = files.filter((f) => f.endsWith(".md")).sort();
  return Promise.all(
    md.map(async (filename) => {
      const content = await fs.readFile(path.join(DOCS_DIR, filename), "utf8");
      const meta = DOC_META[filename] ?? {
        title: filename.replace(/\.md$/, ""),
        blurb: "",
      };
      return { filename, content, ...meta };
    }),
  );
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
