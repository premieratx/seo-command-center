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

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { setPendingFix, useCommandCenter } from "@/components/command-center-context";
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

// New analytics / marketing / users panes — lazy-loaded so the live
// Supabase queries only fire when the operator actually opens the tab.
const AnalyticsPane = dynamic(() => import("@/components/AnalyticsPane"), {
  ssr: false,
  loading: () => <TabLoading label="Loading analytics…" />,
});
const MarketingPane = dynamic(() => import("@/components/MarketingPane"), {
  ssr: false,
  loading: () => <TabLoading label="Loading marketing…" />,
});
const UsersPane = dynamic(() => import("@/components/UsersPane"), {
  ssr: false,
  loading: () => <TabLoading label="Loading users…" />,
});
const BlogPane = dynamic(() => import("@/components/BlogPane"), {
  ssr: false,
  loading: () => <TabLoading label="Loading blog…" />,
});
const CRMPane = dynamic(() => import("@/components/CRMPane"), {
  ssr: false,
  loading: () => <TabLoading label="Loading CRM…" />,
});
const AdLoopPane = dynamic(() => import("@/components/ads/AdLoopPane"), {
  ssr: false,
  loading: () => <TabLoading label="Loading Ad Loop…" />,
});

type TopTab =
  | "seo"
  | "adloop"
  | "web-design"
  | "dashboard"
  | "quote-pricing"
  | "chatbot"
  | "analytics"
  | "marketing"
  | "blog"
  | "users"
  | "docs";

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

// Short labels are shown on tablet/desktop; full labels are used for the
// mobile <select> fallback so the dropdown reads naturally.
const TOP_TABS: {
  id: TopTab;
  label: string;
  fullLabel: string;
  icon: string;
}[] = [
  { id: "seo", label: "SEO", fullLabel: "SEO", icon: "📊" },
  { id: "adloop", label: "Ad Loop", fullLabel: "Ad Loop · Google + Meta Ads", icon: "📣" },
  { id: "web-design", label: "Preview", fullLabel: "Preview & Chat (live site + AI)", icon: "🎨" },
  { id: "dashboard", label: "CRM", fullLabel: "Dashboard (Leads + Customers)", icon: "👥" },
  { id: "quote-pricing", label: "Quotes", fullLabel: "Quote Builder & Pricing", icon: "🧮" },
  { id: "analytics", label: "Stats", fullLabel: "Analytics", icon: "📈" },
  { id: "marketing", label: "Promos", fullLabel: "Marketing · Affiliates + Promo Codes", icon: "🎟️" },
  { id: "blog", label: "Blog", fullLabel: "Blog · Draft + Publish", icon: "✍️" },
  { id: "chatbot", label: "Chatbot", fullLabel: "Customer Chatbot", icon: "💬" },
  { id: "users", label: "Users", fullLabel: "Admin Users", icon: "🔐" },
  { id: "docs", label: "Docs", fullLabel: "Docs", icon: "📚" },
];

export default function BusinessCommandCenter(props: Props) {
  const [active, setActive] = useState<TopTab>("seo");

  // Cross-tab "Fix this" router.
  //
  // Fix Now keeps the user on the SEO top tab — SiteDashboard handles the
  // sub-tab switch to its own Command Center, which streams /api/agent-chat
  // to the Claude agent team. We still broadcast `pendingFix` so the Design
  // tab can pick it up if the user manually opens it, but we no longer
  // force-switch — the Design tab's live preview iframe was getting blocked
  // by the V2 site's X-Frame-Options and rendering Chrome's
  // "This page couldn't load" error, which looked like a broken redirect.
  function handleFixNow(prompt: string) {
    setPendingFix(prompt, "seo");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-200">
      {/* Top-level nav:
       *  - Mobile (< sm): <select> dropdown so every tab is reachable without
       *    horizontal scroll.
       *  - Tablet + desktop (>= sm): icon + short label pills, no scroll
       *    needed because labels are kept to ≤7 chars each.
       *  - Wide desktop (>= xl): "Premier Party Cruises · Command Center"
       *    brand slug reappears on the left.
       */}
      <nav
        className="sticky top-0 z-30 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur"
        aria-label="Business Command Center"
      >
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4">
          {/* Mobile dropdown */}
          <div className="sm:hidden py-2 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 shrink-0">
              PPC · CC
            </span>
            <select
              value={active}
              onChange={(e) => setActive(e.target.value as TopTab)}
              aria-label="Command Center tab"
              className="flex-1 bg-[#141414] border border-[#262626] text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              {TOP_TABS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.fullLabel}
                </option>
              ))}
            </select>
          </div>

          {/* Tablet + desktop pills */}
          <div
            className="hidden sm:flex items-center gap-1"
            role="tablist"
            aria-label="Command Center"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 mr-3 py-4 hidden xl:block whitespace-nowrap">
              Premier Party Cruises · Command Center
            </div>
            {TOP_TABS.map((t) => {
              const isActive = active === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={isActive}
                  title={t.fullLabel}
                  onClick={() => setActive(t.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 md:px-3.5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? "border-blue-500 text-white"
                      : "border-transparent text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  <span aria-hidden="true" className="text-base">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Tab content */}
      <div className="max-w-[1800px] mx-auto px-4 py-6">
        {active === "seo" && <SiteDashboard {...props} onFixNow={handleFixNow} />}
        {active === "adloop" && <AdLoopPane />}
        {active === "web-design" && <WebDesignTab site={props.site} />}
        {active === "dashboard" && <DashboardTab site={props.site} />}
        {active === "quote-pricing" && <QuotePricingTab site={props.site} />}
        {active === "analytics" && <AnalyticsTab />}
        {active === "marketing" && <MarketingTab />}
        {active === "blog" && (
          <BlogTab
            keywords={props.keywords}
            auditPages={props.pages}
            siteUrl={props.site.production_url || `https://${props.site.domain}`}
            siteId={props.site.id}
          />
        )}
        {active === "chatbot" && <ChatbotTab />}
        {active === "users" && <UsersTab />}
        {active === "docs" && <DocsTab />}
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

// Lazy-load the gallery pane so its 91-entry manifest + image grid only
// loads when the user actually opens it.
const GalleryPane = dynamic(() => import("@/components/GalleryPane"), {
  ssr: false,
  loading: () => <TabLoading label="Loading gallery…" />,
});

// ═════════════════════════════════════════════════════════════════════════
// Tab 2: Web Design
// ═════════════════════════════════════════════════════════════════════════
type DesignMsg = {
  role: "user" | "assistant";
  content: string;
  agent?: { id: string; name: string; emoji: string };
};

/**
 * Infer the specialist agents to fan out to based on simple keyword
 * signals — same logic as lib/agents/definitions.ts routeByKeywords, kept
 * client-side so we can show the user which agents will run before they
 * send the prompt. Always includes the main orchestrator at the end for
 * final synthesis when more than one specialist is involved.
 */
function inferSpecialists(message: string): string[] {
  const m = message.toLowerCase();
  const out: string[] = [];

  // Batch orchestration — 2+ items or explicit batch phrasing lead with the
  // main orchestrator so ONE comprehensive plan is designed before specialists
  // execute. Keeps batched fixes conflict-free.
  const isBatch =
    /please execute\s+\d+\s+(recommendation|fix|ai visibility)/i.test(message) ||
    /fix\s+\d+\s+selected/i.test(message) ||
    /orchestrator mode/i.test(message) ||
    /\n\s*[23456789]\.\s+/.test(message);
  if (isBatch) out.push("main");

  if (
    /keyword|meta|title tag|canonical|h1|heading|sitemap|robots|schema|internal link|cannibalization|indexing|ranking|serp|position|search volume|backlink/.test(
      m,
    )
  )
    out.push("seo");
  if (
    /ai visibility|share of voice|sov|llm|chatgpt|perplexity|gemini|ai mode|ai overview|mention|narrative|float on|competitor sentiment/.test(
      m,
    )
  )
    out.push("ai_visibility");
  if (
    /design|layout|hero|cta|button|mobile|responsive|font|color|typography|ux|conversion|mcdowell|glassmorphism|gradient|visual/.test(
      m,
    )
  )
    out.push("design");
  if (
    /fix|change|update|edit|commit|deploy|publish|code|file|branch|implement|add to|remove from|rewrite/.test(
      m,
    )
  )
    out.push("implementation");

  // Any implementation path ends with Content Review before ship so prose,
  // readability, and brand voice (luxury + turnkey + fun) are verified.
  if (out.includes("implementation") && !out.includes("content_review")) {
    out.push("content_review");
  }

  // Default to SEO if nothing matched
  if (out.length === 0) out.push("seo");
  return out;
}

function WebDesignTab({ site }: { site: Site }) {
  const [sub, setSub] = useState<"editor" | "gallery">("editor");
  const [model, setModel] = useState<string>("auto");
  const [agentId, setAgentId] = useState<string>("auto"); // auto = router picks
  const [orchestrate, setOrchestrate] = useState(true); // run router + parallel specialists
  const [deviceWidth, setDeviceWidth] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewMode, setPreviewMode] = useState<"live" | "branch" | "local">("live");

  const liveUrl = site.production_url || `https://${site.domain}`;
  const branchUrl = `https://seo-fixes-only--${(site.domain || "premier-party-cruises-v2.netlify.app").replace(/\/$/, "")}`;
  const localUrl = "http://localhost:5173";
  const previewUrl =
    previewMode === "live" ? liveUrl : previewMode === "branch" ? branchUrl : localUrl;

  const widths = { desktop: "100%", tablet: "768px", mobile: "390px" } as const;

  // Real AI chat state — proper SSE streaming so tokens stream live
  const [messages, setMessages] = useState<DesignMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  // Execute-fix state
  const [executing, setExecuting] = useState(false);
  const [executeErr, setExecuteErr] = useState<string | null>(null);
  const [shippedChanges, setShippedChanges] = useState<
    Array<{ title: string; file: string; prUrl: string; at: string }>
  >([]);
  const { pendingFix, clearPendingFix } = useCommandCenter();

  async function streamAgent(
    text: string,
    history: DesignMsg[],
    agent: string | undefined,
  ): Promise<DesignMsg> {
    // Route Design-tab chat through the same Supabase Edge Function as the
    // Command Center so both chats share one code path, one brain, and
    // neither burns Netlify function minutes.
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data: sess } = await supabase.auth.getSession();
    const jwt = sess.session?.access_token;
    const edgeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-chat`
      : "/api/agent-chat";
    const res = await fetch(edgeUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify({
        messages: history,
        model,
        site_id: site.id,
        agent: agent && agent !== "auto" ? agent : undefined,
      }),
    });

    if (!res.ok) {
      // Non-2xx = JSON error, not a stream
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Request failed (${res.status})`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";
    let assistantAgent: DesignMsg["agent"];

    // Insert a placeholder assistant message we'll mutate as tokens arrive
    const placeholderIdx = history.length;
    setMessages([...history, { role: "assistant", content: "", agent: undefined }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const ev of events) {
        const line = ev.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.agent) {
            assistantAgent = parsed.agent;
          }
          if (parsed.text) {
            assistantContent += parsed.text;
          }
          setMessages((prev) => {
            const next = prev.slice();
            next[placeholderIdx] = {
              role: "assistant",
              content: assistantContent,
              agent: assistantAgent,
            };
            return next;
          });
        } catch {
          /* skip malformed line */
        }
      }
    }

    return { role: "assistant", content: assistantContent, agent: assistantAgent };
  }

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    setChatError(null);
    const next: DesignMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      if (orchestrate && agentId === "auto") {
        // Orchestrator mode: pull agents from the router on the backend,
        // then fan out in parallel by calling once per specialist. We ALSO
        // call the main orchestrator at the end to synthesize the final
        // plan the way Claude Code's multi-agent workflow does.
        //
        // Keyword-heuristic routing happens server-side when agent is
        // omitted — we invoke each specialist explicitly for richer
        // context injection per agent.
        const specialists = inferSpecialists(text);
        // Run specialists sequentially so we can stream each agent's
        // response distinctly into the chat.
        let history = next;
        for (const sid of specialists) {
          const assistant = await streamAgent(text, history, sid);
          history = [...history, assistant];
        }
        // Final synthesis pass from the main orchestrator
        if (specialists.length > 1) {
          const synth = await streamAgent(
            "Based on the specialist responses above, give me the final prioritized plan with exact file paths, specific code changes, and the order to ship them in. Then at the bottom add one line: `READY_TO_EXECUTE: yes` if we can proceed, `READY_TO_EXECUTE: no — <reason>` otherwise.",
            history,
            "main",
          );
          history = [...history, synth];
        }
      } else {
        await streamAgent(text, next, agentId);
      }
    } catch (e: any) {
      setChatError(e?.message || "Failed to reach the AI agent.");
    } finally {
      setSending(false);
      requestAnimationFrame(() => {
        messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
      });
    }
  };

  // Pick up pendingFix routed from SEO / Blog tabs
  useEffect(() => {
    if (!pendingFix) return;
    setSub("editor");
    send(pendingFix.prompt);
    clearPendingFix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFix]);

  // Detect "READY_TO_EXECUTE: yes" in the most recent assistant message.
  // If present, show an "Execute now" button that calls /api/audit/execute-fix
  // to actually commit the change to the CruiseConcierge repo.
  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  const readyToExecute = useMemo(() => {
    if (!lastAssistant?.content) return false;
    return /READY_TO_EXECUTE:\s*yes/i.test(lastAssistant.content);
  }, [lastAssistant]);

  async function executePlan() {
    if (!lastAssistant?.content) return;
    const firstUser = messages.find((m) => m.role === "user")?.content || "Apply latest plan";
    setExecuting(true);
    setExecuteErr(null);
    try {
      const res = await fetch("/api/audit/execute-fix", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          site_id: site.id,
          title: firstUser.slice(0, 90),
          description: firstUser.slice(0, 500),
          fix_action: lastAssistant.content.slice(0, 6000),
          category: "seo",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Execute failed (${res.status})`);

      if (data.status === "committed") {
        setShippedChanges((prev) => [
          ...prev,
          {
            title: firstUser.slice(0, 90),
            file: data.file,
            prUrl: data.pr_url,
            at: new Date().toLocaleTimeString(),
          },
        ]);
        // Add a "Shipped" assistant message so the chat log shows the result
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✅ Committed to branch \`${data.branch}\` — file: \`${data.file}\` — +${data.diff_size} bytes. [Open pull request ↗](${data.pr_url})`,
            agent: { id: "implementation", name: "Implementation Agent", emoji: "⚡" },
          },
        ]);
      } else if (data.status === "skipped") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `⚠️ Execute skipped — ${data.reason}`,
            agent: { id: "implementation", name: "Implementation Agent", emoji: "⚡" },
          },
        ]);
      }
    } catch (e: any) {
      setExecuteErr(e?.message || "Execute failed");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Web Design"
        title={sub === "gallery" ? "Asset Gallery" : "Preview + AI Editor"}
        description={
          sub === "gallery"
            ? "All photos imported from the Lovable quote-app (boats, party, add-ons, slides, tiles). Click any photo to grab its URL or paste-ready <img> markup for use anywhere across the site."
            : "Live preview of the Netlify site with an AI assistant that can edit pages, swap components, and push to the branch. Same Claude agent that edits the repo locally."
        }
        action={
          sub === "editor" ? (
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <label className="flex items-center gap-1.5 text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={orchestrate}
                  onChange={(e) => setOrchestrate(e.target.checked)}
                  className="accent-blue-500"
                />
                <span>Orchestrator mode</span>
              </label>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">Agent</span>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="bg-[#141414] border border-[#262626] rounded px-2 py-1.5 text-white"
              >
                <option value="auto">🔀 Auto-route</option>
                <option value="main">🎯 Orchestrator</option>
                <option value="seo">🔍 SEO Specialist</option>
                <option value="ai_visibility">🤖 AI Visibility</option>
                <option value="design">🎨 Web Design</option>
                <option value="implementation">⚡ Implementation</option>
              </select>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-500">Model</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="bg-[#141414] border border-[#262626] rounded px-2 py-1.5 text-white"
              >
                <option value="auto">Auto (picks best for the task)</option>
                <option value="claude-opus-4-7">Opus 4.7 (deep reasoning)</option>
                <option value="claude-sonnet-4-6">Sonnet 4.6 (balanced)</option>
                <option value="claude-haiku-4-5-20251001">Haiku 4.5 (fast + cheap)</option>
              </select>
            </div>
          ) : null
        }
      />

      {/* Design sub-tabs */}
      <div className="flex gap-0 border-b border-[#262626] mb-6" role="tablist">
        <button
          role="tab"
          aria-selected={sub === "editor"}
          onClick={() => setSub("editor")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            sub === "editor"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Preview + AI Editor
        </button>
        <button
          role="tab"
          aria-selected={sub === "gallery"}
          onClick={() => setSub("gallery")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            sub === "gallery"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Gallery
        </button>
      </div>

      {sub === "gallery" ? (
        <GalleryPane />
      ) : (
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

        {/* AI assistant panel — live Claude agent via /api/agent-chat */}
        <Card title="AI Assistant">
          <div className="flex flex-col gap-3 h-[72vh]">
            <div
              ref={messagesRef}
              className="flex-1 bg-[#0a0a0a] rounded border border-[#1f1f1f] p-4 overflow-y-auto space-y-3"
            >
              {messages.length === 0 && (
                <div className="text-sm text-zinc-400 space-y-3">
                  <p>Hi — I can edit any page on this site, analyze SEO, and write code changes. Try:</p>
                  <ul className="space-y-1.5 text-zinc-500 text-xs">
                    <li>• "Change the hero headline on /wedding-parties to …"</li>
                    <li>• "Add a new FAQ to /bachelor-party-austin targeting 'austin bachelor party ideas'"</li>
                    <li>• "Rewrite /blog/atx-disco-cruise-experience to 1,800 words with FAQs"</li>
                    <li>• "Fix the 10 lowest-scoring blog posts"</li>
                  </ul>
                  <p className="text-xs text-zinc-600 border-t border-[#1f1f1f] pt-3 mt-4">
                    Model: <span className="text-zinc-300">{model}</span> · Site:{" "}
                    <span className="text-zinc-300">{site.name}</span>
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`text-sm whitespace-pre-wrap rounded px-3 py-2 ${
                    m.role === "user"
                      ? "bg-blue-600/10 border border-blue-500/30 text-blue-100 ml-6"
                      : "bg-[#141414] border border-[#262626] text-zinc-200 mr-6"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 flex items-center gap-1.5">
                    {m.role === "assistant" && m.agent ? (
                      <>
                        <span aria-hidden="true">{m.agent.emoji}</span>
                        <span className="text-zinc-300 normal-case tracking-normal text-xs font-medium">
                          {m.agent.name}
                        </span>
                      </>
                    ) : (
                      m.role
                    )}
                  </div>
                  {m.content || (m.role === "assistant" && sending && i === messages.length - 1 ? (
                    <span className="text-zinc-500 italic">Thinking…</span>
                  ) : null)}
                </div>
              ))}
              {sending && messages[messages.length - 1]?.role === "user" && (
                <div className="text-xs text-zinc-500 italic animate-pulse">
                  {orchestrate ? "Routing to specialists…" : "Claude is thinking…"}
                </div>
              )}
              {chatError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                  {chatError}
                </div>
              )}
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={2}
                placeholder="Ask Claude to edit the site…"
                className="flex-1 bg-[#141414] border border-[#262626] rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send(input);
                  }
                }}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2.5 rounded transition-colors"
              >
                <span aria-hidden="true">🤖</span> {sending ? "Sending…" : "Send"}
              </button>
            </form>

            {/* Execute Now — appears when the orchestrator signals
                READY_TO_EXECUTE: yes. Calls /api/audit/execute-fix which
                commits the change to premieratx/CruiseConcierge on the
                seo-fixes-only branch and returns a PR URL. */}
            {readyToExecute && !sending && (
              <div className="mt-2 flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded p-2.5">
                <div className="text-xs text-green-300">
                  <strong>Plan ready.</strong> Opus flagged it
                  <code className="mx-1 text-green-200">READY_TO_EXECUTE: yes</code>— push the change?
                </div>
                <button
                  onClick={executePlan}
                  disabled={executing}
                  className="text-xs px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium whitespace-nowrap"
                >
                  {executing ? "Committing…" : "⚡ Execute now"}
                </button>
              </div>
            )}
            {executeErr && (
              <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                {executeErr}
              </div>
            )}
            {shippedChanges.length > 0 && (
              <div className="mt-2 bg-[#0a0a0a] border border-[#262626] rounded p-2.5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">
                  Changes shipped this session ({shippedChanges.length})
                </div>
                <div className="space-y-1">
                  {shippedChanges.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="text-zinc-300 truncate block">{c.title}</span>
                        <span className="text-zinc-500 text-[10px]">
                          {c.file} · {c.at}
                        </span>
                      </div>
                      <a
                        href={c.prUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-[11px] whitespace-nowrap"
                      >
                        Open PR ↗
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab 3: Dashboard (Leads + Customers)
// ═════════════════════════════════════════════════════════════════════════
function DashboardTab({ site: _site }: { site: Site }) {
  return (
    <div>
      <SectionHeader
        eyebrow="CRM · Lead Mgmt + Customer Mgmt"
        title="Customer Relationship Management"
        description="Full lead + customer admin ported from the Lovable quote-app. Lead Mgmt houses the Lead Dashboard, Lead Database, Abandoned carts, Live Chat, and Engagement/Quote analytics. Customer Mgmt houses the Customer Dashboard, Booking Database, Customer Directory, Calendar, Cruise Prep, Time Slots, and Boats."
      />
      <CRMPane />
    </div>
  );
}

/**
 * Embeds one of our Next.js sub-apps (quote builder / lead dashboard /
 * customer dashboard / docs) into a command-center tab via a same-origin
 * iframe. Same-origin means the iframe shares cookies + Supabase session
 * with the parent, so auth "just works" and the child apps don't need a
 * separate login.
 */
function EmbeddedAppPane({
  path,
  title,
  openLabel,
  height = "calc(100vh - 220px)",
}: {
  path: string;
  title: string;
  openLabel: string;
  height?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="-mx-5 -mt-5 mb-5 px-5 py-3 border-b border-[#262626] flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{title}</span>
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
        >
          {openLabel} <span aria-hidden="true">↗</span>
        </a>
      </div>
      <iframe
        src={path}
        title={title}
        className="w-full rounded border border-[#262626] bg-[#0a0a0a]"
        style={{ height, minHeight: "620px" }}
      />
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab 4: Quote Builder & Pricing
// ═════════════════════════════════════════════════════════════════════════
function QuotePricingTab({ site }: { site: Site }) {
  const [sub, setSub] = useState<"quote-builder" | "pricing-calculator" | "preview">("preview");

  const liveQuoteUrl = `${(site.production_url || `https://${site.domain}`).replace(/\/$/, "")}/quote`;

  return (
    <div>
      <SectionHeader
        eyebrow="Quote Builder & Pricing"
        title={
          sub === "quote-builder"
            ? "Quote Builder Admin"
            : sub === "pricing-calculator"
              ? "Pricing Calculator Builder"
              : "Live Quote Page Preview"
        }
        description={
          sub === "quote-builder"
            ? "Full admin for the in-house quote flow — edit time slots, party type menu, package options, and post-submit routing. No more iframe from booking.premierpartycruises.com — the flow is native now."
            : sub === "pricing-calculator"
              ? "Build, tune, and preview the pricing calculator that renders on /pricing. Adjust boat rates, day-of-week logic, gratuity, tax, and booking fee."
              : "Live preview of the in-house quote flow as it appears on the cruise site. Identical to what customers see at /quote."
        }
      />

      <div className="flex gap-0 border-b border-[#262626] mb-6" role="tablist">
        {[
          { id: "preview" as const, label: "Live Preview" },
          { id: "quote-builder" as const, label: "Admin" },
          { id: "pricing-calculator" as const, label: "Pricing Calculator" },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={sub === t.id}
            onClick={() => setSub(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              sub === t.id
                ? "border-blue-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "preview" && <QuotePreviewPane liveQuoteUrl={liveQuoteUrl} />}
      {sub === "quote-builder" && <QuoteBuilderPane />}
      {sub === "pricing-calculator" && <PricingCalculatorPane siteId={site.id} />}
    </div>
  );
}

function QuotePreviewPane({ liveQuoteUrl }: { liveQuoteUrl: string }) {
  return (
    <Card className="overflow-hidden">
      <div className="-mx-5 -mt-5 mb-5 px-5 py-3 border-b border-[#262626] flex items-center justify-between">
        <span className="text-sm font-semibold text-white">
          Live: <span className="text-zinc-400 font-mono text-xs">{liveQuoteUrl}</span>
        </span>
        <a
          href={liveQuoteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
        >
          Open in new tab <span aria-hidden="true">↗</span>
        </a>
      </div>
      <div className="bg-white rounded overflow-hidden">
        <iframe
          src={liveQuoteUrl}
          title="Quote page preview"
          className="w-full"
          style={{ height: "calc(100vh - 280px)", minHeight: "700px", border: "none" }}
        />
      </div>
    </Card>
  );
}

function QuoteBuilderPane() {
  return (
    <EmbeddedAppPane
      path="/quote-builder"
      title="Quote Builder Admin (in-house)"
      openLabel="Open full admin"
    />
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

// ═════════════════════════════════════════════════════════════════════════
// Tab 5: Chatbot (customer-facing chatbot training — NOT the admin Claude)
// ═════════════════════════════════════════════════════════════════════════
//
// Single hub for the customer-facing Claude chatbot that greets visitors on
// premierpartycruises.com. Sub-tabs:
//
//   • Knowledge  — CRUD on chatbot_knowledge_base (what the bot "knows")
//   • Test       — Live chat against the same Claude endpoint customers hit
//   • Logs       — Recent guest conversations (chatbot_conversations)
//   • System     — System prompt + voice + guided-flow config
//   • Widget     — Deploy / embed snippet for the cruise site
//
// Does NOT include admin Claude tools (SEO content gen, web-design assistant,
// fix-session chat, Claude Code, etc.) — those live in the SEO + Web Design
// tabs where they belong.
type ChatbotSub = "knowledge" | "test" | "logs" | "system" | "widget";

const CHATBOT_SUBTABS: { id: ChatbotSub; label: string; blurb: string }[] = [
  {
    id: "knowledge",
    label: "Knowledge",
    blurb: "What the bot knows — Q&A pairs by category, priority, and tag.",
  },
  {
    id: "test",
    label: "Test Chat",
    blurb: "Live chat against the production endpoint, as a customer would see it.",
  },
  {
    id: "logs",
    label: "Conversations",
    blurb: "Recent guest chat sessions, page context, and full message history.",
  },
  {
    id: "system",
    label: "System Prompt",
    blurb: "Identity, tone, guided-flow rules, and voice fallbacks.",
  },
  {
    id: "widget",
    label: "Widget & Deploy",
    blurb: "Embed snippet and deploy target for the cruise site widget.",
  },
];

function ChatbotTab() {
  const [sub, setSub] = useState<ChatbotSub>("knowledge");
  const active = CHATBOT_SUBTABS.find((s) => s.id === sub) ?? CHATBOT_SUBTABS[0];

  return (
    <div>
      <SectionHeader
        eyebrow="Customer Chatbot · Single source of truth"
        title={active.label}
        description={active.blurb}
      />

      <div className="flex gap-0 border-b border-[#262626] mb-6 overflow-x-auto" role="tablist">
        {CHATBOT_SUBTABS.map((s) => {
          const isActive = sub === s.id;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setSub(s.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? "border-blue-500 text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {sub === "knowledge" && (
        <EmbeddedAppPane
          path="/chatbot-training?focus=knowledge"
          title="Knowledge base"
          openLabel="Open full editor"
        />
      )}
      {sub === "test" && (
        <EmbeddedAppPane
          path="/chatbot-training?focus=test"
          title="Live test chat"
          openLabel="Open full page"
        />
      )}
      {sub === "logs" && (
        <EmbeddedAppPane
          path="/chatbot-training?focus=logs"
          title="Recent guest conversations"
          openLabel="Open full log viewer"
        />
      )}
      {sub === "system" && <ChatbotSystemPane />}
      {sub === "widget" && <ChatbotWidgetPane />}
    </div>
  );
}

function ChatbotSystemPane() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
      <Card title="System prompt">
        <div className="space-y-3 text-sm text-zinc-300">
          <p>
            The system prompt is what Claude reads before every visitor
            message. It sets the bot&apos;s identity, tone, guided-flow rules,
            and escalation paths. Edit it live below — changes persist to
            Supabase and take effect on next message.
          </p>
          <textarea
            rows={18}
            placeholder="You are the friendly concierge for Premier Party Cruises on Lake Travis. Always answer first, then invite the booking flow. Use ONLY facts from the Knowledge tab…"
            className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white placeholder:text-zinc-600 font-mono resize-y"
          />
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-zinc-500">
              Stored at <code className="text-green-400">chatbot_config</code>{" "}
              / key =&nbsp;<code className="text-green-400">system_prompt</code>
            </div>
            <div className="flex gap-2">
              <button className="text-xs px-3 py-2 rounded bg-[#141414] border border-[#262626] hover:border-zinc-500 text-zinc-300">
                Revert to default
              </button>
              <button className="text-xs px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium">
                Save
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 border-t border-[#1f1f1f] pt-3">
            Backing function:{" "}
            <code className="text-green-400">chat-assistant</code>. Fallback
            function: <code className="text-green-400">ai-chat-test</code>.
          </p>
        </div>
      </Card>

      <div className="space-y-4">
        <Card title="Guided-flow rules">
          <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside">
            <li>Greet + ask party type</li>
            <li>Capture date</li>
            <li>Capture guest count</li>
            <li>Show availability (disco vs private)</li>
            <li>Capture name + email + phone</li>
            <li>Create lead → redirect to Lead Dashboard</li>
          </ol>
          <p className="text-xs text-zinc-500 mt-3">
            Seeded from <code className="text-green-400">chatbotKnowledge.ts</code>{" "}
            → overridable in Supabase.
          </p>
        </Card>
        <Card title="Voice (ElevenLabs)">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Voice</span>
              <span className="text-white">Not configured</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Session fn</span>
              <code className="text-green-400 text-xs">elevenlabs-create-session</code>
            </div>
            <button className="w-full mt-2 text-xs px-3 py-2 rounded bg-[#141414] border border-[#262626] hover:border-zinc-500 text-zinc-300">
              Connect voice
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ChatbotWidgetPane() {
  const cruiseDomain = "premierpartycruises.com";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Embed snippet">
        <p className="text-sm text-zinc-400 mb-3">
          Drop this into the cruise site&apos;s shared layout. It mounts the
          floating chat widget on every page and posts events back to{" "}
          <code className="text-green-400 text-xs">chat-widget-messages</code>.
        </p>
        <pre className="bg-[#0a0a0a] border border-[#262626] rounded p-3 text-xs text-green-300 overflow-x-auto">
{`<!-- Premier Party Cruises chat widget -->
<script
  src="https://chat.premierpartycruises.com/widget.js"
  data-site-id="37292000-d661-4238-8ba4-6a53b71c2d07"
  defer
></script>`}
        </pre>
        <p className="text-xs text-zinc-500 mt-3">
          Served by edge fn{" "}
          <code className="text-green-400">chat-widget-script</code>. Tracks{" "}
          <code className="text-green-400">chat-widget-track</code>.
        </p>
      </Card>

      <Card title="Deploy state">
        <dl className="text-sm divide-y divide-[#1f1f1f]">
          {[
            { k: "Live on", v: cruiseDomain, ok: true },
            { k: "Script endpoint", v: "chat-widget-script (edge fn)", ok: true },
            { k: "Message endpoint", v: "chat-widget-messages (edge fn)", ok: true },
            { k: "Knowledge source", v: "chatbot_knowledge_base (Supabase)", ok: true },
            { k: "Iframe embed (legacy)", v: "quote-v2 lightbox — deprecated", ok: false },
          ].map((row) => (
            <div key={row.k} className="flex justify-between py-2.5 items-center">
              <dt className="text-zinc-400">{row.k}</dt>
              <dd
                className={`${
                  row.ok ? "text-green-400" : "text-amber-400"
                } font-medium text-right`}
              >
                {row.v}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-zinc-500 border-t border-[#1f1f1f] pt-3 mt-3">
          Once the cruise site adopts the shared chat widget above, the legacy
          iframe lightbox at <code>booking.premierpartycruises.com/quote-v2</code>{" "}
          can be retired.
        </p>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Tab 6: Docs
// ═════════════════════════════════════════════════════════════════════════
function DocsTab() {
  return (
    <EmbeddedAppPane
      path="/docs"
      title="Docs · PPC Quote Builder knowledge base"
      openLabel="Open docs"
    />
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Analytics · Marketing · Users tabs
// ═════════════════════════════════════════════════════════════════════════
function AnalyticsTab() {
  return (
    <div>
      <SectionHeader
        eyebrow="Analytics · Business Command Center"
        title="Analytics"
        description="Live operational metrics pulled directly from Supabase. Same project powering the cruise site's quote flow and customer dashboards — so every number here matches production."
      />
      <AnalyticsPane />
    </div>
  );
}

function MarketingTab() {
  return (
    <div>
      <SectionHeader
        eyebrow="Marketing · Affiliates + Promo Codes"
        title="Marketing"
        description="Manage affiliate partners and promo codes. Affiliate click + conversion tracking is already wired in the cruise site's quote flow (reads sessionStorage UUIDs and posts to create-lead). Promo codes support 3-tier pricing so early bookers see a bigger discount than last-minute ones."
      />
      <MarketingPane />
    </div>
  );
}

function UsersTab() {
  return (
    <div>
      <SectionHeader
        eyebrow="Users · Access Control"
        title="Admin Users"
        description="Everyone who can sign in to the Business Command Center. Source of truth is public.admin_profiles in the shared Supabase project."
      />
      <UsersPane />
    </div>
  );
}

function BlogTab({
  keywords,
  auditPages,
  siteUrl,
  siteId,
}: {
  keywords: Keyword[];
  auditPages: AuditPage[];
  siteUrl: string | null;
  siteId: string;
}) {
  return (
    <div>
      <SectionHeader
        eyebrow="Blog · Draft + Publish + SEO"
        title="Blog"
        description="In-house CMS. All 124 static cruise-site blogs + CMS + AI-generated posts show up here. Each post gets a live SEO analyzer using the same tracked-keyword + audit knowledge base as the SEO tab. AI Writer generates drafts grounded in your SEMrush data. Bulk Analyze surfaces quick wins and deep rewrites with one-click Fix This routing to the Design tab's AI agent."
      />
      <BlogPane keywords={keywords} auditPages={auditPages} siteUrl={siteUrl} siteId={siteId} />
    </div>
  );
}
