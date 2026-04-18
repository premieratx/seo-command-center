"use client";

/*
 * BusinessCommandCenter — top-level shell for the company's internal apps.
 *
 * Four top-level tabs:
 *   1. SEO                   → existing <SiteDashboard> (SEO Command Center)
 *   2. Web Design            → <WebDesignTab> (preview + Claude chatbot)
 *   3. Dashboard             → Leads + Customers sub-tabs
 *   4. Quote Builder & Pricing → Quote Builder app + Pricing Calculator builder
 *
 * All tabs share the same Supabase client (projectId `gtoiejwibueezlhfjcue`)
 * so future apps plug into the existing schema + RLS without new API keys.
 */

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type {
  Site,
  Audit,
  AuditIssue,
  AuditPage,
  CannibalizationIssue,
  SiteMetrics,
  Keyword,
  Competitor,
  AIShareOfVoice,
  AIInsight,
  AIStrategyReport,
  AICompetitorSentiment,
} from "@/lib/types";

// Lazy-load the heavy SEO dashboard so it only hydrates when the SEO tab
// is active. Keeps TTI on the new top-level tabs fast.
const SiteDashboard = dynamic(
  () => import("@/components/SiteDashboard").then((m) => ({ default: m.SiteDashboard })),
  { ssr: false, loading: () => <TabLoading label="Loading SEO Command Center…" /> },
);

type TopTab = "seo" | "web-design" | "dashboard" | "quote-pricing";

type Props = {
  // Everything SiteDashboard needs, forwarded as-is.
  site: Site;
  audit: Audit | null;
  issues: AuditIssue[];
  pages: AuditPage[];
  cannibalization: CannibalizationIssue[];
  metrics: SiteMetrics | null;
  keywords: Keyword[];
  competitors: Competitor[];
  aiShareOfVoice: AIShareOfVoice[];
  aiInsights: AIInsight[];
  aiStrategyReports: AIStrategyReport[];
  aiCompetitorSentiment: AICompetitorSentiment[];
};

const TOP_TABS: { id: TopTab; label: string; icon: string }[] = [
  { id: "seo", label: "SEO", icon: "📊" },
  { id: "web-design", label: "Web Design", icon: "🎨" },
  { id: "dashboard", label: "Dashboard", icon: "👥" },
  { id: "quote-pricing", label: "Quote Builder & Pricing", icon: "🧮" },
];

export default function BusinessCommandCenter(props: Props) {
  const [active, setActive] = useState<TopTab>("seo");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-200">
      {/* Top-level nav */}
      <nav
        className="sticky top-0 z-30 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur"
        role="tablist"
        aria-label="Business Command Center"
      >
        <div className="max-w-[1800px] mx-auto px-4 flex items-center gap-1 overflow-x-auto">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 mr-6 py-4 hidden sm:block whitespace-nowrap">
            Premier Party Cruises · Command Center
          </div>
          {TOP_TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-blue-500 text-white"
                    : "border-transparent text-zinc-400 hover:text-zinc-100"
                }`}
              >
                <span aria-hidden="true" className="text-base">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab content */}
      <div className="max-w-[1800px] mx-auto px-4 py-6">
        {active === "seo" && <SiteDashboard {...props} />}
        {active === "web-design" && <WebDesignTab site={props.site} />}
        {active === "dashboard" && <DashboardTab site={props.site} />}
        {active === "quote-pricing" && <QuotePricingTab site={props.site} />}
      </div>
    </div>
  );
}

// ─── Helper: shared tab loading state ────────────────────────────────────
function TabLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
      {label}
    </div>
  );
}

// ─── Section header (reused across the new tabs) ─────────────────────────
function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 mb-6">
      <div>
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.22em] text-blue-400 mb-2">{eyebrow}</p>
        )}
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-400 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-[#141414] border border-[#262626] rounded-lg ${className}`}>
      {title && (
        <div className="px-5 py-3 border-b border-[#262626] text-sm font-semibold text-white">
          {title}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab 2: Web Design
// ═════════════════════════════════════════════════════════════════════════
function WebDesignTab({ site }: { site: Site }) {
  const [model, setModel] = useState<string>("auto");
  const [deviceWidth, setDeviceWidth] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewMode, setPreviewMode] = useState<"live" | "branch" | "local">("live");

  const liveUrl = "https://premier-party-cruises-v2.netlify.app";
  const branchUrl = "https://seo-fixes-only--premier-party-cruises-v2.netlify.app";
  const localUrl = "http://localhost:5173";
  const previewUrl =
    previewMode === "live" ? liveUrl : previewMode === "branch" ? branchUrl : localUrl;

  const widths = { desktop: "100%", tablet: "768px", mobile: "390px" } as const;

  return (
    <div>
      <SectionHeader
        eyebrow="Web Design"
        title="Preview + AI Editor"
        description="Live preview of the Netlify site with an AI assistant that can edit pages, swap components, and push to the branch. Same Claude agent that edits the repo locally."
        action={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">Model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-[#141414] border border-[#262626] rounded px-2 py-1.5 text-white"
            >
              <option value="auto">Auto (recommended)</option>
              <option value="claude-opus-4-6">Claude Opus 4.6</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
              <option value="claude-haiku-4-5">Claude Haiku 4.5 (fast)</option>
            </select>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        {/* Preview panel */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between -mt-5 -mx-5 px-5 py-3 border-b border-[#262626] mb-5">
            <div className="flex items-center gap-1">
              {(["live", "branch", "local"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPreviewMode(m)}
                  className={`px-3 py-1.5 text-xs rounded ${
                    previewMode === m
                      ? "bg-[#262626] text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {m === "live" ? "Live" : m === "branch" ? "Branch" : "Local"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {(["desktop", "tablet", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDeviceWidth(d)}
                  className={`px-3 py-1.5 text-xs rounded capitalize ${
                    deviceWidth === d
                      ? "bg-[#262626] text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
            >
              Open <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className="bg-[#0a0a0a] rounded overflow-hidden flex items-center justify-center -mx-2">
            <iframe
              key={`${previewMode}-${deviceWidth}`}
              src={previewUrl}
              title="Live site preview"
              className="bg-white border border-[#262626] rounded"
              style={{
                width: widths[deviceWidth],
                maxWidth: "100%",
                height: "72vh",
              }}
            />
          </div>
        </Card>

        {/* AI assistant panel */}
        <Card title="AI Assistant">
          <div className="flex flex-col gap-3 h-[72vh]">
            <div className="flex-1 bg-[#0a0a0a] rounded border border-[#1f1f1f] p-4 overflow-y-auto">
              <div className="text-sm text-zinc-400 space-y-3">
                <p>
                  Hi — I can edit any page on this site. Try one of these:
                </p>
                <ul className="space-y-1.5 text-zinc-500 text-xs">
                  <li>• "Change the hero headline on /wedding-parties to …"</li>
                  <li>• "Add a new FAQ to /bachelor-party-austin"</li>
                  <li>• "Make the footer logo 20% smaller on mobile"</li>
                  <li>• "Swap the hero video on the homepage"</li>
                </ul>
                <p className="text-xs text-zinc-600 border-t border-[#1f1f1f] pt-3 mt-4">
                  Model: <span className="text-zinc-300">{model}</span> · Site: <span className="text-zinc-300">{site.name}</span>
                </p>
              </div>
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                // Hooking up to the same Claude-edit pipeline that powers the
                // SEO Command Center's Command tab. Placeholder for now.
                alert("Web Design chat hookup: connect to /api/claude-edit with model=" + model);
              }}
            >
              <textarea
                rows={2}
                placeholder="Ask Claude to edit the site…"
                className="flex-1 bg-[#141414] border border-[#262626] rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2.5 rounded transition-colors"
              >
                <span aria-hidden="true">🤖</span> Send
              </button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab 3: Dashboard (Leads + Customers)
// ═════════════════════════════════════════════════════════════════════════
function DashboardTab({ site }: { site: Site }) {
  const [sub, setSub] = useState<"leads" | "customers">("leads");

  return (
    <div>
      <SectionHeader
        eyebrow="Dashboard"
        title={sub === "leads" ? "Lead Dashboard" : "Customer Dashboard"}
        description={
          sub === "leads"
            ? "Inbound quote requests, chat leads, attribution, and stage tracking. Ready to connect the existing lead app."
            : "Past + current customers, bookings, lifetime value, and repeat-cruise tracking."
        }
      />

      {/* Sub-tab switcher */}
      <div className="flex gap-0 border-b border-[#262626] mb-6" role="tablist">
        <button
          role="tab"
          aria-selected={sub === "leads"}
          onClick={() => setSub("leads")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            sub === "leads"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Leads
        </button>
        <button
          role="tab"
          aria-selected={sub === "customers"}
          onClick={() => setSub("customers")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            sub === "customers"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Customers
        </button>
      </div>

      {sub === "leads" ? (
        <DashboardPlaceholder
          kind="leads"
          siteId={site.id}
          supabaseHints={[
            "leads",
            "lead_events",
            "lead_attribution",
          ]}
        />
      ) : (
        <DashboardPlaceholder
          kind="customers"
          siteId={site.id}
          supabaseHints={["customers", "bookings", "payments", "cruise_events"]}
        />
      )}
    </div>
  );
}

function DashboardPlaceholder({
  kind,
  siteId,
  supabaseHints,
}: {
  kind: "leads" | "customers";
  siteId: string;
  supabaseHints: string[];
}) {
  const label = kind === "leads" ? "Lead" : "Customer";
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card title="Ready to import" className="md:col-span-2">
        <div className="space-y-4 text-sm text-zinc-300">
          <p>
            This tab is scaffolded for the existing {label} app. When it's
            imported it will connect to the SAME Supabase project already
            powering SEO + auth + RLS — no new credentials needed.
          </p>
          <div className="bg-[#0a0a0a] rounded p-3 border border-[#1f1f1f] text-xs">
            <div className="text-zinc-500 mb-2">Expected Supabase tables:</div>
            <div className="flex flex-wrap gap-1.5">
              {supabaseHints.map((t) => (
                <code
                  key={t}
                  className="bg-[#141414] text-green-400 px-2 py-0.5 rounded border border-[#262626]"
                >
                  {t}
                </code>
              ))}
            </div>
          </div>
          <p className="text-zinc-400 text-xs">
            Site scope: <code className="text-zinc-300">{siteId}</code>
          </p>
        </div>
      </Card>
      <Card title="Quick metrics">
        <div className="space-y-3 text-sm">
          <Metric label="Total this month" value="—" hint="Connect source" />
          <Metric label="Conversion rate" value="—" hint="Connect source" />
          <Metric label="Avg. response time" value="—" hint="Connect source" />
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[#1f1f1f] last:border-b-0 pb-2">
      <div>
        <div className="text-zinc-400">{label}</div>
        {hint && <div className="text-xs text-zinc-600">{hint}</div>}
      </div>
      <div className="text-white font-semibold text-lg">{value}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab 4: Quote Builder & Pricing
// ═════════════════════════════════════════════════════════════════════════
function QuotePricingTab({ site }: { site: Site }) {
  const [sub, setSub] = useState<"quote-builder" | "pricing-calculator">("quote-builder");

  return (
    <div>
      <SectionHeader
        eyebrow="Quote Builder & Pricing"
        title={sub === "quote-builder" ? "Quote Builder App" : "Pricing Calculator Builder"}
        description={
          sub === "quote-builder"
            ? "Configure the quote-builder app that lives at booking.premierpartycruises.com/quote-v2 — the same iframe embedded in the Get-a-Quote lightbox on the V2 site."
            : "Build, tune, and preview the pricing calculator that renders on /pricing. Adjust boat rates, day-of-week logic, gratuity, tax, and booking fee."
        }
      />

      <div className="flex gap-0 border-b border-[#262626] mb-6" role="tablist">
        <button
          role="tab"
          aria-selected={sub === "quote-builder"}
          onClick={() => setSub("quote-builder")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            sub === "quote-builder"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Quote Builder
        </button>
        <button
          role="tab"
          aria-selected={sub === "pricing-calculator"}
          onClick={() => setSub("pricing-calculator")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            sub === "pricing-calculator"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Pricing Calculator
        </button>
      </div>

      {sub === "quote-builder" ? (
        <QuoteBuilderPane />
      ) : (
        <PricingCalculatorPane siteId={site.id} />
      )}
    </div>
  );
}

function QuoteBuilderPane() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      <Card className="overflow-hidden">
        <div className="-mx-5 -mt-5 mb-5 px-5 py-3 border-b border-[#262626] flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Live preview</span>
          <a
            href="https://booking.premierpartycruises.com/quote-v2"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
          >
            Open full app <span aria-hidden="true">↗</span>
          </a>
        </div>
        <iframe
          src="https://booking.premierpartycruises.com/quote-v2?sourceType=command_center_preview"
          title="Quote Builder preview"
          className="w-full rounded border border-[#262626] bg-white"
          style={{ height: "72vh" }}
        />
      </Card>
      <Card title="Import existing app">
        <div className="space-y-4 text-sm text-zinc-300">
          <p>
            The Quote Builder app is hosted separately at{" "}
            <code className="text-green-400 text-xs">booking.premierpartycruises.com</code>. To
            bring it into this command center:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-zinc-400 text-xs">
            <li>Move the quote-builder repo under this monorepo or add it as a dependency.</li>
            <li>Point it at the same Supabase project (gtoiejwibueezlhfjcue).</li>
            <li>Re-use NEXT_PUBLIC_SUPABASE_URL + anon key from .env.local.</li>
            <li>Mount its router under /quote-builder here.</li>
          </ol>
          <p className="text-xs text-zinc-500 border-t border-[#1f1f1f] pt-3">
            The iframe preview stays live regardless — visitors landing via the
            Get-a-Quote lightbox on the Netlify site always see the current
            version.
          </p>
        </div>
      </Card>
    </div>
  );
}

function PricingCalculatorPane({ siteId }: { siteId: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Current values (source of truth)">
        <dl className="text-sm divide-y divide-[#1f1f1f]">
          {[
            { k: "Day Tripper · up to 14 guests", v: "From $200/hr" },
            { k: "Meeseeks · 25–30 guests", v: "From $225/hr" },
            { k: "The Irony · 25–30 guests", v: "From $225/hr (same tier)" },
            { k: "Clever Girl · 31–75 guests", v: "From $250/hr" },
            { k: "4-hour minimum", v: "Always" },
            { k: "Gratuity", v: "20%" },
            { k: "Sales tax", v: "8.25%" },
            { k: "Booking fee", v: "3%" },
          ].map((row) => (
            <div key={row.k} className="flex justify-between py-2.5">
              <dt className="text-zinc-400">{row.k}</dt>
              <dd className="text-white font-medium">{row.v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-zinc-500 mt-3">
          These are the canonical pricing rules stored in Supabase{" "}
          <code className="text-green-400">design_guidelines</code> for site{" "}
          <code className="text-zinc-400">{siteId}</code>. Change them here to push to
          both this calculator and the V2 site's /pricing page.
        </p>
      </Card>
      <Card title="Preview">
        <iframe
          src="https://premier-party-cruises-v2.netlify.app/pricing#pricing-calculator"
          title="Pricing Calculator preview"
          className="w-full rounded border border-[#262626] bg-white"
          style={{ height: "62vh" }}
        />
      </Card>

      <Card title="Coming soon — editable pricing" className="md:col-span-2">
        <p className="text-sm text-zinc-400">
          Full CRUD for boat rates, gratuity %, sales tax %, and booking fee. Changes
          will write to Supabase and the V2 site's PricingCalculator will read from
          there on next build.
        </p>
      </Card>
    </div>
  );
}
