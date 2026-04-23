"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { createClient } from "@/lib/supabase/client";
import SiteCompareView from "@/components/SiteCompareView";
import SmartRefreshButton from "@/components/SmartRefreshButton";
import SemrushBulkIngest from "@/components/SemrushBulkIngest";
import SemrushAiRefreshButton from "@/components/SemrushAiRefreshButton";
import AIRecommendationsTable from "@/components/AIRecommendationsTable";

type Tab =
  | "overview"
  | "research"
  | "ai_visibility"
  | "compare"
  | "command"
  | "docs";

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#262626" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="transform rotate-90 origin-center"
        fill={color}
        fontSize={size / 3.5}
        fontWeight="bold"
      >
        {score}
      </text>
    </svg>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const classes: Record<string, string> = {
    critical: "bg-red-900/60 text-red-300 border border-red-800",
    high: "bg-amber-900/60 text-amber-300 border border-amber-800",
    medium: "bg-blue-900/60 text-blue-300 border border-blue-800",
    low: "bg-green-900/60 text-green-300 border border-green-800",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${classes[severity] || ""}`}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    open: "bg-zinc-800 text-zinc-400",
    in_progress: "bg-blue-900/40 text-blue-400",
    fixed: "bg-green-900/40 text-green-400",
    dismissed: "bg-zinc-900 text-zinc-600",
  };
  const labels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    fixed: "Fixed",
    dismissed: "Dismissed",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${classes[status] || ""}`}>
      {labels[status] || status}
    </span>
  );
}

export function SiteDashboard({
  site,
  audit,
  issues,
  pages,
  cannibalization,
  metrics,
  keywords,
  competitors,
  aiShareOfVoice,
  aiInsights,
  aiStrategyReports,
  aiCompetitorSentiment,
  onFixNow: onFixNowExternal,
}: {
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
  // Parent (BusinessCommandCenter) passes this so the per-keyword + per-insight
  // "Fix this" buttons route the prompt into the Design tab's AI Assistant.
  onFixNow?: (prompt: string) => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [researchSubTab, setResearchSubTab] = useState<"keywords" | "pages" | "competitors" | "cannibalization">("keywords");

  // Navigate to a specific Research sub-tab from Overview cards
  const navigateToResearch = useCallback((subTab: "keywords" | "pages" | "competitors" | "cannibalization") => {
    setResearchSubTab(subTab);
    setActiveTab("research");
  }, []);

  async function runAudit() {
    setLoading("audit");
    setNotice("Running live audit — crawling sitemap and analyzing pages...");
    try {
      const res = await fetch("/api/audit/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: site.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setNotice(
        `Audit complete! Score: ${data.score}/100, ${data.pages_crawled} pages crawled, ${data.issues} issues found.`,
      );
      setTimeout(() => router.refresh(), 1500);
    } catch (e) {
      setNotice(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(null);
    }
  }

  async function refreshSemrush() {
    setLoading("semrush");
    setNotice("Pulling fresh data from SEMRush...");
    try {
      const res = await fetch("/api/audit/refresh-semrush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: site.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh failed");
      setNotice(`SEMRush refreshed: ${data.keywords} keywords, ${data.competitors} competitors.`);
      setTimeout(() => router.refresh(), 1500);
    } catch (e) {
      setNotice(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(null);
    }
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "research", label: "Research", count: keywords.length },
    { id: "ai_visibility", label: "AI Visibility" },
    { id: "compare", label: "Compare ⚔️ Marketing" },
    { id: "command", label: "Command Center" },
    { id: "docs", label: "Documentation" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full">
      <div className="mb-6">
        <Link
          href={`/profiles/${site.profile_id}`}
          className="text-sm text-zinc-500 hover:text-zinc-300 mb-3 inline-block"
        >
          ← Back to profile
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{site.name}</h1>
            <p className="text-zinc-500 text-sm mt-1">
              <a
                href={site.production_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400"
              >
                {site.domain}
              </a>
              {site.last_audit_at && (
                <>
                  {" "}
                  &mdash; Last audit{" "}
                  {new Date(site.last_audit_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <SmartRefreshButton
              siteId={site.id}
              domain={site.domain}
              onComplete={() => {
                // Reload so the dashboard picks up freshly-ingested rows
                if (typeof window !== "undefined") window.location.reload();
              }}
            />
            <button
              onClick={runAudit}
              disabled={loading !== null}
              className="bg-[#141414] border border-[#262626] hover:border-[#404040] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading === "audit" ? "Running..." : "Run New Audit"}
            </button>
            <Link
              href={`/profiles/${site.profile_id}/sites/${site.id}/settings`}
              className="bg-[#141414] border border-[#262626] hover:border-[#404040] text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Settings
            </Link>
            <Link
              href="/chatbot-training"
              className="bg-[#141414] border border-amber-600/40 hover:border-amber-500 text-amber-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Train Chatbot
            </Link>
            <button
              onClick={() => setActiveTab("command")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Command Center
            </button>
          </div>
        </div>
        {notice && (
          <div className="mt-4 bg-blue-900/20 border border-blue-800/50 rounded-lg px-4 py-3 text-sm text-blue-200">
            {notice}
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#262626] overflow-x-auto" role="tablist" aria-label="Site dashboard tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-xs">
                {tab.count.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          audit={audit}
          issues={issues}
          pages={pages}
          metrics={metrics}
          keywords={keywords}
          runAudit={runAudit}
          setActiveTab={setActiveTab}
          navigateToResearch={navigateToResearch}
          siteId={site.id}
          onFixNow={(prompt) => {
            sessionStorage.setItem("commandCenterPrompt", prompt);
            if (onFixNowExternal) onFixNowExternal(prompt);
            else setActiveTab("command");
          }}
        />
      )}
      {activeTab === "research" && (
        <ResearchTab keywords={keywords} competitors={competitors} pages={pages} cannibalization={cannibalization} metrics={metrics} initialSubTab={researchSubTab} onFixNow={(prompt) => {
          sessionStorage.setItem("commandCenterPrompt", prompt);
          // Prefer routing to the Design tab's AI Assistant (parent-provided).
          // Falls back to the old in-SEO Command sub-tab if no parent handler.
          if (onFixNowExternal) onFixNowExternal(prompt);
          else setActiveTab("command");
        }} />
      )}
      {activeTab === "ai_visibility" && (
        <AIVisibilityTab
          siteId={site.id}
          aiShareOfVoice={aiShareOfVoice}
          aiInsights={aiInsights}
          aiStrategyReports={aiStrategyReports}
          aiCompetitorSentiment={aiCompetitorSentiment}
          onFixNow={(prompt) => {
            sessionStorage.setItem("commandCenterPrompt", prompt);
            if (onFixNowExternal) onFixNowExternal(prompt);
            else setActiveTab("command");
          }}
        />
      )}
      {activeTab === "compare" && <SiteCompareView currentSiteId={site.id} />}
      {activeTab === "command" && <CommandTab siteId={site.id} site={site} issues={issues} pages={pages} keywords={keywords} />}
      {activeTab === "docs" && <DocumentationTab siteId={site.id} />}
    </div>
  );
}

function OverviewTab({
  audit,
  issues,
  pages,
  metrics,
  keywords = [],
  runAudit,
  setActiveTab,
  navigateToResearch,
  siteId,
  onFixNow,
}: {
  audit: Audit | null;
  issues: AuditIssue[];
  pages: AuditPage[];
  metrics: SiteMetrics | null;
  keywords?: Keyword[];
  runAudit: () => void;
  setActiveTab: (tab: Tab) => void;
  navigateToResearch: (subTab: "keywords" | "pages" | "competitors" | "cannibalization") => void;
  siteId: string;
  onFixNow?: (prompt: string) => void;
}) {
  const [showAllIssues, setShowAllIssues] = useState(true);

  if (!audit) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-12 text-center">
        <div className="text-zinc-500 mb-4">No audit has been run yet for this site.</div>
        <button onClick={runAudit} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium">
          Run Your First Audit
        </button>
        <p className="text-zinc-600 text-xs mt-2">Audits analyze 200+ pages for SEO issues and opportunities</p>
      </div>
    );
  }

  const categoryCounts = issues.reduce(
    (acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 flex flex-col items-center cursor-pointer hover:border-blue-500/50 hover:bg-[#1a1a1a] transition-colors"
          role="button"
          aria-label={`Overall SEO Score: ${audit.overall_score || 0}. Click to view issues.`}
          onClick={() => document.getElementById("recent-issues-section")?.scrollIntoView({ behavior: "smooth" })}
        >
          <ScoreRing score={audit.overall_score || 0} />
          <p className="text-sm text-zinc-400 mt-2">Overall SEO Score <span className="text-[10px] text-blue-400/70 ml-1">Click to view</span></p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 cursor-pointer hover:border-blue-500/50 hover:bg-[#1a1a1a] transition-colors"
          role="button"
          aria-label={`${audit.critical_issues} critical issues, ${audit.high_issues} high priority. Click to view.`}
          onClick={() => document.getElementById("recent-issues-section")?.scrollIntoView({ behavior: "smooth" })}
        >
          <div className="text-3xl font-bold text-red-400">{audit.critical_issues}</div>
          <p className="text-sm text-zinc-400">Critical Issues <span className="text-[10px] text-blue-400/70 ml-1">Click to view</span></p>
          <div className="text-2xl font-bold text-amber-400 mt-2">{audit.high_issues}</div>
          <p className="text-sm text-zinc-400">High Priority</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 cursor-pointer hover:border-blue-500/50 hover:bg-[#1a1a1a] transition-colors"
          role="button"
          aria-label={`${audit.total_pages || 0} total pages. Click to view pages.`}
          onClick={() => navigateToResearch("pages")}
        >
          <div className="text-3xl font-bold text-white">{(audit.total_pages || 0).toLocaleString()}</div>
          <p className="text-sm text-zinc-400">Total Pages <span className="text-[10px] text-blue-400/70 ml-1">Click to view</span></p>
          <div className="mt-2 text-xs text-zinc-500">
            {pages.length.toLocaleString()} analyzed in detail
          </div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 cursor-pointer hover:border-blue-500/50 hover:bg-[#1a1a1a] transition-colors"
          role="button"
          aria-label={`${issues.length} total issues, ${issues.filter((i) => i.status === "fixed").length} fixed. Click to view.`}
          onClick={() => document.getElementById("recent-issues-section")?.scrollIntoView({ behavior: "smooth" })}
        >
          <div className="text-3xl font-bold text-blue-400">{issues.length}</div>
          <p className="text-sm text-zinc-400">Total Issues <span className="text-[10px] text-blue-400/70 ml-1">Click to view</span></p>
          <div className="text-2xl font-bold text-green-400 mt-2">
            {issues.filter((i) => i.status === "fixed").length}
          </div>
          <p className="text-sm text-zinc-400">Fixed</p>
        </div>
      </div>

      {metrics && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Live SEMRush Metrics</h3>
            <span className="text-xs text-zinc-500">
              Updated {new Date(metrics.captured_at).toLocaleString()}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <MetricBox label="Authority Score" value={metrics.authority_score ?? "—"} accent="blue" />
            <MetricBox
              label="Organic Keywords"
              value={metrics.organic_keywords?.toLocaleString() ?? "—"}
              accent="green"
            />
            <MetricBox
              label="Organic Traffic/mo"
              value={metrics.organic_traffic?.toLocaleString() ?? "—"}
              accent="green"
            />
            <MetricBox
              label="Traffic Value/mo"
              value={metrics.organic_cost ? `$${Number(metrics.organic_cost).toLocaleString()}` : "—"}
              accent="amber"
            />
            <MetricBox
              label="Backlinks"
              value={metrics.total_backlinks?.toLocaleString() ?? "—"}
              accent="white"
            />
            <MetricBox
              label="Referring Domains"
              value={metrics.referring_domains?.toLocaleString() ?? "—"}
              accent="white"
            />
          </div>
        </div>
      )}

      {/* PageSpeed Insights */}
      <PageSpeedSection siteId={audit.site_id} productionUrl={pages[0]?.url ? `https://${pages[0].url.includes('.') ? pages[0].url : 'premierpartycruises.com'}` : ""} />

      {Object.keys(categoryCounts).length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Issues by Category</h3>
          <div className="space-y-2">
            {Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-32 text-sm text-zinc-400">{category}</div>
                  <div className="flex-1 bg-zinc-800 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(count / issues.length) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-sm text-zinc-400 text-right">{count}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top Issues Preview */}
      {issues.length > 0 && (
        <div id="recent-issues-section" className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Recent Issues</h3>
            <button
              onClick={() => setShowAllIssues(!showAllIssues)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              {showAllIssues ? "Collapse" : "Expand"}
            </button>
          </div>
          {showAllIssues && (
            <div className="space-y-2">
              {issues.slice(0, 10).map((issue) => (
                <div key={issue.id} className="flex items-center gap-3 bg-[#0a0a0a] rounded px-3 py-2">
                  <SeverityBadge severity={issue.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{issue.title}</div>
                    <div className="text-xs text-zinc-500">{issue.category}</div>
                    {issue.affected_pages && issue.affected_pages.length > 0 && (
                      <div className="mt-1 text-[10px] text-zinc-600">
                        <span className="text-zinc-500">Affects:</span>{" "}
                        {issue.affected_pages.slice(0, 3).map(p => p.replace('https://premierpartycruises.com', '')).join(", ")}
                        {issue.affected_pages.length > 3 && ` +${issue.affected_pages.length - 3} more`}
                      </div>
                    )}
                  </div>
                  <StatusBadge status={issue.status} />
                </div>
              ))}
              {issues.length > 10 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-zinc-500">Showing 10 of {issues.length} issues</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Easy Wins + Most Impactful — actionable keyword opportunities */}
      {keywords.length > 0 && (
        <OverviewRecommendations keywords={keywords} onFixNow={onFixNow} onSeeAll={() => navigateToResearch("keywords")} />
      )}

      {/* Audit History Section */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Audit History</h3>
        </div>
        <AuditHistoryTab siteId={siteId} />
      </div>
    </div>
  );
}

/**
 * Actionable recommendations block — Easy Wins + Most Impactful.
 *
 * Each row has an explicit "Fix this →" button that fires onFixNow() —
 * when we're mounted inside BusinessCommandCenter the handler switches
 * to the Design tab and pre-loads the prompt into the Claude agent chat.
 */
function OverviewRecommendations({
  keywords,
  onFixNow,
  onSeeAll,
}: {
  keywords: Keyword[];
  onFixNow?: (prompt: string) => void;
  onSeeAll: () => void;
}) {
  const easyWins = useMemo(() => {
    // Primary: low KD + decent volume
    const strict = keywords.filter((k) => {
      const d = k.keyword_difficulty ?? 999;
      return d !== 999 && d <= 15 && (k.search_volume || 0) >= 30;
    });
    if (strict.length >= 3) {
      return strict
        .sort((a, b) => (a.keyword_difficulty ?? 100) - (b.keyword_difficulty ?? 100))
        .slice(0, 6);
    }
    // Fallback when SEMrush didn't populate KD (null across the board):
    // treat "position 11-30 with volume >= 100" as low-hanging fruit — we
    // already rank on pages 2-3 and small lifts put us on page 1.
    const fallback = keywords
      .filter((k) => {
        const p = k.position || 0;
        return p >= 11 && p <= 30 && (k.search_volume || 0) >= 100;
      })
      .sort((a, b) => (a.position || 999) - (b.position || 999))
      .slice(0, 6);
    return fallback;
  }, [keywords]);

  const mostImpactful = useMemo(() => {
    return [...keywords]
      .map((k) => ({ ...k, _impact: calculateImpactScore(k) }))
      .sort((a, b) => b._impact - a._impact)
      .slice(0, 6);
  }, [keywords]);

  const buildPrompt = (k: Keyword, kind: "easy-win" | "most-impactful") => {
    if (kind === "easy-win") {
      return `Easy Win — "${k.keyword}" (${(k.search_volume || 0).toLocaleString()}/mo, KD ${k.keyword_difficulty ?? "?"}${k.position ? `, currently #${k.position}` : ""}). This is low-competition and we should rank quickly. Target page: ${k.url || "(pick the best match)"}. Add 200+ words, a FAQ answering this exact query, and 2-3 internal links from related pages. Show me the exact edits in pageContent.ts.`;
    }
    return `Most Impactful — "${k.keyword}" (${(k.search_volume || 0).toLocaleString()}/mo${k.position ? `, currently #${k.position}` : ", not ranking yet"}). Biggest-lift target on the site. Rewrite the H1, first 150 words, and add 3-5 FAQ entries targeting this keyword + variations on ${k.url || "(pick best-matching page)"}. Also add internal links from the top 5 most-related pages pointing here. Show exact pageContent.ts changes.`;
  };

  const Row = ({ k, kind }: { k: Keyword & { _impact?: number }; kind: "easy-win" | "most-impactful" }) => (
    <div className="flex items-center justify-between gap-3 bg-[#0a0a0a] border border-[#1f1f1f] rounded px-3 py-2 hover:border-[#2a2a2a]">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{k.keyword}</div>
        <div className="text-xs text-zinc-500">
          {(k.search_volume || 0).toLocaleString()}/mo
          {k.position ? ` · #${k.position}` : ""}
          {k.keyword_difficulty !== null && k.keyword_difficulty !== undefined
            ? ` · KD ${k.keyword_difficulty}`
            : ""}
          {kind === "most-impactful" && k._impact ? ` · Impact ${k._impact}` : ""}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onFixNow?.(buildPrompt(k, kind))}
        disabled={!onFixNow}
        className="text-xs px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        title={onFixNow ? "Send this to the Design tab's AI Agent" : "Fix-this handler not wired"}
      >
        Fix this →
      </button>
    </div>
  );

  if (!easyWins.length && !mostImpactful.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <span>🎯</span> Easy Wins <span className="text-xs text-zinc-500">(KD ≤ 15)</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Low-competition keywords you can rank quickly. Pick the highest-volume one and ship the
              content update.
            </p>
          </div>
          <button
            onClick={onSeeAll}
            className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
          >
            See all →
          </button>
        </div>
        <div className="space-y-1.5">
          {easyWins.length ? (
            easyWins.map((k) => <Row key={k.id} k={k} kind="easy-win" />)
          ) : (
            <div className="text-xs text-zinc-500 italic py-4 text-center">
              No KD ≤ 15 keywords in the current set. Refresh SEMrush to pull more.
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <span>🔥</span> Most Impactful
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Weighted mix of search volume × position opportunity × difficulty × current traffic.
              Biggest total lift for the effort.
            </p>
          </div>
          <button
            onClick={onSeeAll}
            className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
          >
            See all →
          </button>
        </div>
        <div className="space-y-1.5">
          {mostImpactful.map((k) => (
            <Row key={k.id} k={k} kind="most-impactful" />
          ))}
        </div>
      </div>
    </div>
  );
}

// NOTE: IssuesTab is currently unused — it was replaced by inline issue rendering in OverviewTab.
// Kept for potential future use as a standalone tab.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function IssuesTab({ issues }: { issues: AuditIssue[] }) {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? issues : issues.filter((i) => i.severity === filter);

  if (issues.length === 0) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-8 text-center text-zinc-500">
        No issues found yet. Run an audit to identify SEO problems.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["all", "critical", "high", "medium", "low"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}{" "}
            ({f === "all" ? issues.length : issues.filter((i) => i.severity === f).length})
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: AuditIssue }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-start gap-3 hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="shrink-0 mt-0.5">
          <SeverityBadge severity={issue.severity} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{issue.title}</div>
          <div className="text-sm text-zinc-500 mt-0.5">{issue.category}</div>
          {issue.affected_pages && issue.affected_pages.length > 0 && (
            <div className="mt-2 text-[10px] text-zinc-600">
              <span className="text-zinc-500">Affects:</span>{" "}
              {issue.affected_pages.slice(0, 3).map(p => p.replace('https://premierpartycruises.com', '')).join(", ")}
              {issue.affected_pages.length > 3 && ` +${issue.affected_pages.length - 3} more`}
            </div>
          )}
        </div>
        <div className="shrink-0">
          <StatusBadge status={issue.status} />
        </div>
        <div className="shrink-0 text-zinc-500">{expanded ? "\u2212" : "+"}</div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#262626] pt-3">
          {issue.description && (
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Description</div>
              <div className="text-sm text-zinc-300">{issue.description}</div>
            </div>
          )}
          {issue.affected_pages && issue.affected_pages.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Affected Pages</div>
              <div className="flex flex-wrap gap-1">
                {issue.affected_pages.map((p, i) => (
                  <span key={i} className="text-xs bg-zinc-800 px-2 py-0.5 rounded font-mono">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
          {issue.recommended_fix && (
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Recommended Fix</div>
              <div className="text-sm text-blue-300">{issue.recommended_fix}</div>
            </div>
          )}
          {issue.impact && (
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Impact</div>
              <div className="text-sm text-zinc-300">{issue.impact}</div>
            </div>
          )}
          {issue.status === "open" && (
            <div className="flex gap-2 pt-2 border-t border-[#262626]">
              <button
                onClick={async () => {
                  const res = await fetch("/api/generate-fix", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      site_id: issue.site_id,
                      issue_id: issue.id,
                      recommendation: issue.title + " " + (issue.recommended_fix || ""),
                    }),
                  });
                  const data = await res.json();
                  if (data.fixes && data.fixes.length > 0) {
                    alert(`Generated ${data.total_fixes} fix(es)! Open the Code Editor to review and apply.`);
                  } else {
                    alert(data.message || "Open the Code Editor to fix this issue manually.");
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
              >
                Generate Fix
              </button>
              <button
                onClick={() => {
                  window.open(`${window.location.pathname.replace(/\/[^/]+$/, "")}/editor`, "_blank");
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
              >
                Open in Editor
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResearchTab({
  keywords,
  competitors,
  pages,
  cannibalization,
  metrics,
  initialSubTab,
  onFixNow,
}: {
  keywords: Keyword[];
  competitors: Competitor[];
  pages: AuditPage[];
  cannibalization: CannibalizationIssue[];
  metrics: SiteMetrics | null;
  initialSubTab?: "keywords" | "pages" | "competitors" | "cannibalization";
  onFixNow?: (prompt: string) => void;
}) {
  const [subTab, setSubTab] = useState<"keywords" | "pages" | "competitors" | "cannibalization">(initialSubTab || "keywords");

  // Sync with parent when initialSubTab changes (e.g., navigating from Overview)
  useEffect(() => {
    if (initialSubTab) setSubTab(initialSubTab);
  }, [initialSubTab]);
  return (
    <div>
      <div className="flex gap-0 border-b border-[#262626] mb-6" role="tablist" aria-label="Research sub-tabs">
        {[
          { id: "keywords" as const, label: "Keywords", count: keywords.length },
          { id: "pages" as const, label: "Pages", count: pages.length },
          { id: "competitors" as const, label: "Competitors", count: competitors.length },
          { id: "cannibalization" as const, label: "Cannibalization", count: cannibalization.length },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={subTab === t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subTab === t.id
                ? "border-blue-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1 text-zinc-600">({t.count.toLocaleString()})</span>
            )}
          </button>
        ))}
      </div>
      {subTab === "keywords" && <KeywordsTab keywords={keywords} onFixNow={onFixNow} />}
      {subTab === "pages" && <PagesTab pages={pages} />}
      {subTab === "competitors" && <CompetitorsTab competitors={competitors} metrics={metrics} />}
      {subTab === "cannibalization" && <CannibalizationTab cannibalization={cannibalization} />}
    </div>
  );
}

function PagesTab({ pages }: { pages: AuditPage[] }) {
  const [sortBy, setSortBy] = useState<"score" | "wordCount" | "url">("score");

  if (pages.length === 0) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-8 text-center text-zinc-500">
        No pages analyzed yet.
      </div>
    );
  }

  const sorted = [...pages].sort((a, b) => {
    if (sortBy === "score") return (a.score || 0) - (b.score || 0);
    if (sortBy === "wordCount") return (a.word_count || 0) - (b.word_count || 0);
    return a.url.localeCompare(b.url);
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <span className="text-sm text-zinc-500">Sort by:</span>
        {(["score", "wordCount", "url"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1.5 rounded text-sm ${
              sortBy === s ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {s === "wordCount" ? "Word Count" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto max-h-[70vh] overflow-y-auto rounded border border-[#1a1a1a]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[#0a0a0a]">
            <tr className="text-left text-zinc-400 border-b border-[#262626] shadow-[0_1px_0_#262626]">
              <th className="py-2.5 pr-4 pl-3 bg-[#0a0a0a]">Page</th>
              <th className="py-2.5 pr-4 bg-[#0a0a0a]">Score</th>
              <th className="py-2.5 pr-4 bg-[#0a0a0a]">Words</th>
              <th className="py-2.5 pr-4 bg-[#0a0a0a]">Meta Desc</th>
              <th className="py-2.5 pr-4 bg-[#0a0a0a]">Canonical</th>
              <th className="py-2.5 pr-4 bg-[#0a0a0a]">OG Tags</th>
              <th className="py-2.5 pr-4 bg-[#0a0a0a]">Schema</th>
              <th className="py-2.5 pr-3 bg-[#0a0a0a]">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {sorted.map((page) => (
              <tr key={page.id} className="hover:bg-[#141414]">
                <td className="py-3 pr-4 max-w-[300px]">
                  <div className="font-mono text-xs truncate" title={page.url}>{page.url}</div>
                  {page.target_keyword && (
                    <div className="text-xs text-zinc-500 mt-0.5">{page.target_keyword}</div>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`font-bold ${
                      (page.score || 0) >= 70
                        ? "text-green-400"
                        : (page.score || 0) >= 50
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {page.score || "—"}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className={(page.word_count || 0) < 1000 ? "text-red-400" : "text-zinc-300"}>
                    {(page.word_count || 0).toLocaleString()}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {page.meta_description ? (
                    <span className="text-green-400">Yes</span>
                  ) : (
                    <span className="text-red-400">Missing</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {page.canonical ? (
                    <span className="text-green-400">Yes</span>
                  ) : (
                    <span className="text-red-400">Missing</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {page.has_og_tags ? (
                    <span className="text-green-400">Yes</span>
                  ) : (
                    <span className="text-red-400">Missing</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span className="text-xs text-zinc-400">
                    {page.schema_types?.length || 0} types
                  </span>
                </td>
                <td className="py-3">{page.internal_links_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CannibalizationTab({ cannibalization }: { cannibalization: CannibalizationIssue[] }) {
  if (cannibalization.length === 0) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-8 text-center text-zinc-500">
        No cannibalization issues found yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4 text-sm text-amber-200">
        <strong>Keyword cannibalization</strong> is when multiple pages on your site compete for
        the same keyword. Instead of one page ranking well, both rank poorly.
      </div>
      {cannibalization.map((issue) => (
        <div
          key={issue.id}
          className="bg-[#141414] border border-[#262626] rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">&quot;{issue.keyword}&quot;</div>
              <div className="text-sm text-zinc-500">
                Should rank: <span className="font-mono text-green-400">{issue.intended_page}</span>
              </div>
            </div>
            <SeverityBadge severity={issue.severity} />
          </div>
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
              Competing Pages
            </div>
            <div className="space-y-2">
              {issue.competing_pages.map((cp, j) => (
                <div
                  key={j}
                  className="flex items-center justify-between bg-zinc-900 rounded px-3 py-2"
                >
                  <span className="font-mono text-xs text-red-300">{cp.url}</span>
                  <span className="text-xs text-zinc-500">Score: {cp.score}</span>
                </div>
              ))}
            </div>
          </div>
          {issue.recommendation && (
            <div className="text-sm text-blue-300 bg-blue-900/20 border border-blue-800/30 rounded p-3">
              <strong>Fix:</strong> {issue.recommendation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CommandTab({ siteId, site, issues, pages, keywords }: { siteId: string; site: Site; issues: AuditIssue[]; pages: AuditPage[]; keywords: Keyword[] }) {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [model, setModel] = useState("auto");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [activeAgent, setActiveAgent] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [chatWidth, setChatWidth] = useState(55); // percentage
  const [viewMode, setViewMode] = useState<"split" | "chat" | "preview">("split");
  const [fixesCollapsed, setFixesCollapsed] = useState(true);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [expandedFix, setExpandedFix] = useState<number | null>(null);
  const [fixingIndex, setFixingIndex] = useState<number | null>(null);
  const [fixedIndices, setFixedIndices] = useState<Set<number>>(new Set());

  // Generate top fixes from issues and keywords
  const topFixes = React.useMemo(() => {
    const fixes: Array<{ title: string; category: string; impact: string; traffic: string; details: string; action: string }> = [];

    // Critical issues first
    const critical = issues.filter(i => i.severity === "critical");
    critical.forEach(i => {
      fixes.push({
        title: i.title,
        category: i.category,
        impact: "High",
        traffic: "+5-15%",
        details: `${i.severity} severity issue affecting SEO. Category: ${i.category}. Status: ${i.status}.`,
        action: `Fix: ${i.title}`,
      });
    });

    // High severity
    const high = issues.filter(i => i.severity === "high").slice(0, 3);
    high.forEach(i => {
      fixes.push({
        title: i.title,
        category: i.category,
        impact: "Medium-High",
        traffic: "+3-8%",
        details: `High severity issue. Category: ${i.category}. Status: ${i.status}.`,
        action: `Fix: ${i.title}`,
      });
    });

    // Keyword opportunities
    const kwOpps = [...keywords]
      .filter(k => k.position && k.position > 5 && k.position <= 20 && k.search_volume && k.search_volume > 100)
      .sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0))
      .slice(0, 5);
    kwOpps.forEach(k => {
      fixes.push({
        title: `Improve "${k.keyword}" from position ${k.position} to top 5`,
        category: "keywords",
        impact: "Medium",
        traffic: `+${Math.round((k.search_volume || 0) * 0.15)} clicks/mo`,
        details: `Currently ranking #${k.position} with ${k.search_volume} monthly searches. Moving to top 5 could capture 15-25% CTR.`,
        action: `Optimize content for "${k.keyword}" — improve page targeting, add FAQ content, strengthen internal links.`,
      });
    });

    // Low-scoring pages
    const weakPages = [...pages]
      .filter(p => p.score !== null && p.score < 60)
      .sort((a, b) => (a.score || 0) - (b.score || 0))
      .slice(0, 3);
    weakPages.forEach(p => {
      fixes.push({
        title: `Improve ${p.url} (score: ${p.score}/100)`,
        category: "content",
        impact: "Medium",
        traffic: "+2-5%",
        details: `Page scores ${p.score}/100. Title: "${p.title}". Word count: ${p.word_count}. Needs content expansion, meta optimization, and internal linking.`,
        action: `Expand content on ${p.url}, improve meta description, add FAQ section.`,
      });
    });

    return fixes.slice(0, 10);
  }, [issues, keywords, pages]);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; agent?: { id: string; name: string; emoji: string } }[]>([
    {
      role: "assistant",
      content: `Welcome to the SEO Command Center. I have ${issues.length} issues and ${pages.length} pages loaded for this site.

You can ask me to:
- "Generate meta descriptions for all service pages"
- "What are the worst scoring pages?"
- "What should I fix first?"
- "Create a keyword map for my pillar pages"
- "Start a fix session for the missing meta descriptions"

I can directly edit your connected GitHub repo and create branch previews on Netlify before publishing.`,
      agent: { id: "main", name: "Command Center", emoji: "\uD83C\uDFAF" },
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendChatMessageRef = useRef<((msg: string) => Promise<void>) | undefined>(undefined);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pick up queued prompt from AI Visibility "Fix Now"
  React.useEffect(() => {
    const queued = sessionStorage.getItem("commandCenterPrompt");
    if (queued) {
      sessionStorage.removeItem("commandCenterPrompt");
      // Small delay to let the component fully mount and ref to be set
      setTimeout(() => sendChatMessageRef.current?.(queued), 500);
    }
  }, []);

  // Send a message programmatically (used by Fix Now)
  const sendChatMessage = async (msg: string) => {
    if (!msg.trim() || isStreaming) return;
    const newMessages = [...messages, { role: "user" as const, content: msg.trim() }];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);
    setActiveAgent(null);

    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          site_id: siteId,
          model,
          ...(selectedAgent && { agent: selectedAgent }),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.error || "Failed to get response"}` }]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setIsStreaming(false); return; }

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";
      let agentInfo: { id: string; name: string; emoji: string } | undefined;

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.agent) { agentInfo = parsed.agent; setActiveAgent(parsed.agent); }
            if (parsed.text) {
              assistantContent += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent, agent: agentInfo };
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [...prev, { role: "assistant", content: `Connection error: ${errorMsg}. This usually means the response took too long. Try a simpler prompt, or click Retry below.` }]);
      setLastFailedMessage(messages[messages.length - 1]?.content || input);
    } finally {
      setIsStreaming(false);
    }
  };

  // Keep ref in sync so the useEffect closure can call the latest version
  sendChatMessageRef.current = sendChatMessage;

  // Fix Now — auto-execute a fix from the top fixes table
  const fixNow = async (fixIndex: number, action: string) => {
    setFixingIndex(fixIndex);
    const prompt = `Please execute this SEO fix now. Analyze the issue, determine exactly what needs to change in which file, and make the specific code changes needed:\n\n${action}\n\nBe specific — show me the exact content to add or change, and which file (e.g., server/ssr/pageContent.ts or server/ssr/renderer.ts).`;
    await sendChatMessage(prompt);
    setFixingIndex(null);
    setFixedIndices(prev => new Set(prev).add(fixIndex));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    const userMsg = input.trim();
    setInput("");
    await sendChatMessage(userMsg);
  };

  return (
    <div className={`flex flex-col ${viewMode === "preview" ? "h-[calc(100vh-180px)]" : "h-[calc(100vh-200px)]"}`}>
      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#141414] border border-[#262626] rounded-lg p-0.5">
            {([
              { id: "split", label: "Split View" },
              { id: "chat", label: "Chat Only" },
              { id: "preview", label: "Preview Only" },
            ] as const).map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  viewMode === mode.id
                    ? "bg-blue-600 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFixesCollapsed(!fixesCollapsed)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              !fixesCollapsed ? "bg-amber-600 text-white" : "bg-[#141414] border border-[#262626] text-zinc-400 hover:text-white"
            }`}
          >
            {!fixesCollapsed ? `▼ ${topFixes.length} Fixes` : `${topFixes.length} Fixes`}
          </button>
        </div>
        <Link
          href={`/profiles/${site.profile_id}/sites/${site.id}/editor`}
          className="text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          Open Full Code Editor
        </Link>
        {/* Top Fixes Floating Dropdown */}
        {!fixesCollapsed && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-[#111] border border-[#262626] rounded-lg shadow-2xl shadow-black/50 max-h-[300px] overflow-y-auto">
            <div className="px-3 py-2 border-b border-[#262626] flex items-center justify-between sticky top-0 bg-[#111]">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Top Fixes — Prioritized by Impact</span>
              <button onClick={() => setFixesCollapsed(true)} className="text-zinc-500 hover:text-white text-xs">Close ✕</button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-[#1a1a1a]">
                  <th className="text-left px-3 py-1.5 w-6"></th>
                  <th className="text-left px-2 py-1.5">Fix</th>
                  <th className="text-left px-2 py-1.5 w-20">Category</th>
                  <th className="text-left px-2 py-1.5 w-20">Impact</th>
                  <th className="text-left px-2 py-1.5 w-28">Est. Traffic (90d)</th>
                  <th className="text-left px-2 py-1.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {topFixes.map((fix, i) => (
                  <React.Fragment key={i}>
                    <tr
                      className={`border-b border-[#1a1a1a] hover:bg-[#1a1a1a] cursor-pointer ${expandedFix === i ? "bg-[#1a1a1a]" : ""}`}
                      onClick={() => setExpandedFix(expandedFix === i ? null : i)}
                    >
                      <td className="px-3 py-2 text-zinc-600">{expandedFix === i ? "−" : "+"}</td>
                      <td className="px-2 py-2 text-zinc-300 font-medium">{fix.title}</td>
                      <td className="px-2 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          fix.category === "keywords" ? "bg-blue-900/30 text-blue-400" :
                          fix.category === "content" ? "bg-purple-900/30 text-purple-400" :
                          "bg-red-900/30 text-red-400"
                        }`}>{fix.category}</span>
                      </td>
                      <td className="px-2 py-2">
                        <span className={`text-[10px] font-bold ${
                          fix.impact === "High" ? "text-red-400" :
                          fix.impact.includes("High") ? "text-orange-400" :
                          "text-yellow-400"
                        }`}>{fix.impact}</span>
                      </td>
                      <td className="px-2 py-2 text-green-400 font-mono">{fix.traffic}</td>
                      <td className="px-2 py-2">
                        {fixedIndices.has(i) ? (
                          <span className="text-green-400 text-[10px] font-semibold">✓ Done</span>
                        ) : fixingIndex === i ? (
                          <span className="text-yellow-400 text-[10px] font-semibold animate-pulse">Fixing...</span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); fixNow(i, fix.action); }}
                            disabled={isStreaming}
                            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-[10px] font-semibold px-2 py-0.5 rounded transition-colors"
                            title="Auto-execute this fix in chat"
                          >
                            Fix Now
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedFix === i && (
                      <tr className="bg-[#0d0d0d]">
                        <td></td>
                        <td colSpan={5} className="px-2 py-3 text-zinc-500 text-[11px] leading-relaxed">
                          <div className="mb-1">{fix.details}</div>
                          <div className="text-zinc-400"><span className="text-green-400/70 font-medium">Action:</span> {fix.action}</div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chat (left) + Preview (right) */}
      <div className="flex flex-1 min-h-0 gap-0 border border-[#262626] rounded-lg overflow-hidden">
        {/* Chat Panel */}
        {viewMode !== "preview" && (
        <div className="flex flex-col bg-[#0a0a0a]" style={{ width: viewMode === "chat" ? "100%" : `${chatWidth}%` }}>
          {activeAgent && isStreaming && (
            <div className="flex items-center gap-2 px-3 py-1 text-xs text-zinc-500 border-b border-[#262626]">
              <span>{activeAgent.emoji}</span>
              <span>{activeAgent.name} is responding...</span>
              <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-3 p-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-lg p-3 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-[#141414] border border-[#262626] text-zinc-300"
                  }`}
                >
                  {msg.role === "assistant" && msg.agent && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-zinc-500 font-medium">
                      <span>{msg.agent.emoji}</span>
                      <span>{msg.agent.name}</span>
                    </div>
                  )}
                  {msg.content || (isStreaming && i === messages.length - 1 ? "..." : "")}
                  {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                    <span className="inline-flex gap-1 ml-1">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: "0ms"}} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: "150ms"}} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: "300ms"}} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-[#262626] p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <select value={model} onChange={(e) => setModel(e.target.value)}
                className="bg-[#141414] border border-[#262626] rounded px-2 py-1 text-[10px] text-zinc-400 focus:outline-none focus:border-blue-500">
                <option value="auto">Auto</option>
                <option value="claude-sonnet-4-20250514">Sonnet</option>
                <option value="claude-opus-4-20250514">Opus</option>
                <option value="claude-haiku-4-5-20251001">Haiku</option>
              </select>
              <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}
                className="bg-[#141414] border border-[#262626] rounded px-2 py-1 text-[10px] text-zinc-400 focus:outline-none focus:border-blue-500">
                <option value="">Auto</option>
                <option value="seo">🔍 SEO</option>
                <option value="ai_visibility">🤖 AI</option>
                <option value="design">🎨 Design</option>
                <option value="implementation">⚡ Impl</option>
              </select>
              {activeAgent && !isStreaming && (
                <span className="text-[10px] text-zinc-600">{activeAgent.emoji} {activeAgent.name}</span>
              )}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-1.5">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything or paste a fix..."
                className="flex-1 bg-[#141414] border border-[#262626] rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600"
                disabled={isStreaming} />
              <button type="submit" disabled={isStreaming}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded text-sm font-medium">
                {isStreaming ? "..." : "Send"}
              </button>
            </form>
            {lastFailedMessage && !isStreaming && (
              <button
                onClick={() => { setLastFailedMessage(null); sendChatMessage(lastFailedMessage); }}
                className="text-xs text-amber-400 hover:text-amber-300 mt-1"
              >
                ↻ Retry last message
              </button>
            )}
          </div>
        </div>
        )}

        {/* Resize Handle — only in split mode */}
        {viewMode === "split" && (
        <div
          className="w-1.5 bg-[#1a1a1a] hover:bg-blue-600/50 cursor-col-resize flex-shrink-0 relative group"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = chatWidth;
            const container = e.currentTarget.parentElement;
            const containerWidth = container?.offsetWidth || 1;
            const onMove = (ev: MouseEvent) => {
              const delta = ev.clientX - startX;
              const newPct = Math.max(25, Math.min(75, startWidth + (delta / containerWidth) * 100));
              setChatWidth(newPct);
            };
            const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-zinc-600 group-hover:bg-blue-400 rounded-full" />
        </div>
        )}

        {/* Preview Panel — only in split or preview mode */}
        {viewMode !== "chat" && (
        <PreviewPanel site={site} siteId={siteId} />
        )}
      </div>
    </div>
  );
}

interface AuditRec {
  id: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  fix_action: string;
  impact: string;
  effort: string;
  file_to_edit: string | null;
}

interface AuditResult {
  seo_score: number;
  ai_score: number;
  overall_score: number;
  seo_summary: string;
  ai_summary: string;
  recommendations: AuditRec[];
  generated_at: string;
}

// NOTE: AIAuditTab is currently unused — it was integrated into Command Center.
// Kept for potential future use as a standalone tab.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AIAuditTab({ siteId }: { siteId: string }) {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixedIds, setFixedIds] = useState<Set<string>>(new Set());

  const runAudit = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/ai-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || "Audit failed");
        setIsRunning(false);
        return;
      }
      const data = await res.json();
      setAuditResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection error");
    } finally {
      setIsRunning(false);
    }
  };

  const [fixResults, setFixResults] = useState<Record<string, { status: string; commit_sha?: string; pr_url?: string; error?: string }>>({});

  const executeFix = async (rec: AuditRec) => {
    setFixingId(rec.id);
    try {
      const res = await fetch("/api/audit/execute-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          title: rec.title,
          description: rec.description,
          fix_action: rec.fix_action,
          file_to_edit: rec.file_to_edit,
          category: rec.category,
        }),
      });

      const result = await res.json();

      if (res.ok && result.status === "committed") {
        setFixedIds((prev) => new Set(prev).add(rec.id));
        setFixResults((prev) => ({ ...prev, [rec.id]: result }));
      } else if (result.status === "skipped") {
        setFixResults((prev) => ({ ...prev, [rec.id]: { status: "skipped", error: result.reason } }));
      } else {
        setFixResults((prev) => ({ ...prev, [rec.id]: { status: "error", error: result.error } }));
      }
    } catch (err) {
      setFixResults((prev) => ({ ...prev, [rec.id]: { status: "error", error: err instanceof Error ? err.message : "Failed" } }));
    } finally {
      setFixingId(null);
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const categoryIcon = (c: string) => {
    switch (c) {
      case "seo": return "🔍";
      case "ai_visibility": return "🤖";
      case "technical": return "⚙️";
      case "content": return "📝";
      case "design": return "🎨";
      default: return "📋";
    }
  };

  const effortBadge = (e: string) => {
    switch (e) {
      case "quick": return "⚡ Quick Fix";
      case "moderate": return "🔧 Moderate";
      default: return "🏗️ Significant";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">In-House AI Audit</h3>
          <p className="text-sm text-zinc-500">
            Dual SEO + AI Visibility audit powered by Claude. Generates scored recommendations with 1-click fix execution.
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={isRunning}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-wait text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running Audit...
            </>
          ) : (
            "🔄 Run AI Audit"
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Score Cards */}
      {auditResult && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#141414] border border-[#262626] rounded-lg p-5 text-center">
              <div className="text-3xl font-bold text-blue-400">{auditResult.seo_score}</div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">SEO Score</div>
              <p className="text-xs text-zinc-400 mt-2">{auditResult.seo_summary}</p>
            </div>
            <div className="bg-[#141414] border border-[#262626] rounded-lg p-5 text-center">
              <div className="text-3xl font-bold text-purple-400">{auditResult.ai_score}</div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">AI Visibility Score</div>
              <p className="text-xs text-zinc-400 mt-2">{auditResult.ai_summary}</p>
            </div>
            <div className="bg-[#141414] border border-[#262626] rounded-lg p-5 text-center">
              <div className="text-4xl font-bold text-white">{auditResult.overall_score}</div>
              <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">Overall Score</div>
              <p className="text-xs text-zinc-400 mt-2">
                {auditResult.recommendations.length} recommendations generated
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              Prioritized Recommendations ({auditResult.recommendations.length})
            </h4>
            {auditResult.recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`bg-[#141414] border border-[#262626] rounded-lg p-4 ${fixedIds.has(rec.id) ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{categoryIcon(rec.category)}</span>
                      <span className="text-sm font-medium text-white">{rec.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${priorityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <span className="text-[10px] text-zinc-600">{effortBadge(rec.effort)}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-1">{rec.description}</p>
                    <p className="text-xs text-zinc-500">
                      <span className="text-green-400/70">Fix:</span> {rec.fix_action}
                    </p>
                    {rec.impact && (
                      <p className="text-xs text-emerald-400/60 mt-1">📈 {rec.impact}</p>
                    )}
                    {rec.file_to_edit && (
                      <p className="text-[10px] text-zinc-600 mt-1 font-mono">{rec.file_to_edit}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => executeFix(rec)}
                      disabled={fixingId === rec.id || fixedIds.has(rec.id)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                        fixedIds.has(rec.id)
                          ? "bg-green-600/20 text-green-400 cursor-default"
                          : fixingId === rec.id
                            ? "bg-yellow-600/20 text-yellow-400 cursor-wait animate-pulse"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {fixedIds.has(rec.id) ? "✓ Committed" : fixingId === rec.id ? "Generating fix..." : "Fix & Commit →"}
                    </button>
                    {fixResults[rec.id]?.status === "committed" && (
                      <a
                        href={fixResults[rec.id].pr_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:text-blue-300"
                      >
                        View changes on GitHub →
                      </a>
                    )}
                    {fixResults[rec.id]?.status === "error" && (
                      <span className="text-[10px] text-red-400">{fixResults[rec.id].error}</span>
                    )}
                    {fixResults[rec.id]?.status === "skipped" && (
                      <span className="text-[10px] text-yellow-400">Skipped: {fixResults[rec.id].error}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-zinc-600 text-center">
            Audit generated {new Date(auditResult.generated_at).toLocaleString()} · Powered by Claude Sonnet 4
          </div>
        </>
      )}

      {/* Empty state */}
      {!auditResult && !isRunning && !error && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🔍🤖</div>
          <h4 className="text-lg font-medium text-zinc-300 mb-2">Run Your First AI Audit</h4>
          <p className="text-sm text-zinc-500 max-w-lg mx-auto mb-6">
            Our dual-agent audit analyzes your site from both an SEO and AI Visibility perspective.
            It generates a scored report with prioritized, actionable recommendations — each with a
            1-click fix button that sends the task to our Implementation Agent.
          </p>
          <button
            onClick={runAudit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Run AI Audit Now
          </button>
        </div>
      )}
    </div>
  );
}

function AuditHistoryTab({ siteId }: { siteId: string }) {
  const [audits, setAudits] = useState<
    Array<{ id: string; created_at: string; score: number; issue_count: number; page_count: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);

  useEffect(() => {
    fetch(`/api/audit/history?site_id=${siteId}`)
      .then((res) => res.json())
      .then((data) => {
        setAudits(data.audits || []);
        setLoading(false);
      })
      .catch(() => {
        setAudits([]);
        setLoading(false);
      });
  }, [siteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (audits.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-zinc-300 mb-2">No audit history yet</h3>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">
          No audit history yet. Run your first audit to start tracking progress.
        </p>
      </div>
    );
  }

  const maxScore = Math.max(...audits.map((a) => a.score), 1);

  // Comparison data
  let comparison: { scoreChange: number; addedIssues: number; fixedIssues: number } | null = null;
  if (compareIds && compareIds.length === 2 && compareIds[0] !== compareIds[1]) {
    const older = audits.find((a) => a.id === compareIds[0]);
    const newer = audits.find((a) => a.id === compareIds[1]);
    if (older && newer) {
      const scoreChange = newer.score - older.score;
      const addedIssues = Math.max(0, newer.issue_count - older.issue_count);
      const fixedIssues = Math.max(0, older.issue_count - newer.issue_count);
      comparison = { scoreChange, addedIssues, fixedIssues };
    }
  }

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (!prev) return [id, id];
      if (prev.includes(id)) {
        const remaining = prev.filter((x) => x !== id);
        return remaining.length === 0 ? null : [remaining[0], remaining[0]];
      }
      return [prev[1], id];
    });
  };

  return (
    <div className="space-y-6">
      {/* Score trend chart */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Score Trend</h3>
        <svg viewBox={`0 0 ${audits.length * 60} 120`} className="w-full h-32">
          {audits
            .slice()
            .reverse()
            .map((audit, i) => {
              const barHeight = (audit.score / maxScore) * 100;
              const color =
                audit.score >= 80
                  ? "#22c55e"
                  : audit.score >= 60
                    ? "#f59e0b"
                    : audit.score >= 40
                      ? "#f97316"
                      : "#ef4444";
              return (
                <g key={audit.id}>
                  <rect
                    x={i * 60 + 10}
                    y={110 - barHeight}
                    width="40"
                    height={barHeight}
                    rx="4"
                    fill={color}
                    opacity={compareIds?.includes(audit.id) ? 1 : 0.7}
                  />
                  <text
                    x={i * 60 + 30}
                    y={105 - barHeight}
                    textAnchor="middle"
                    fill="#a1a1aa"
                    fontSize="10"
                  >
                    {audit.score}
                  </text>
                  <text x={i * 60 + 30} y={120} textAnchor="middle" fill="#52525b" fontSize="8">
                    {new Date(audit.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      {/* Comparison panel */}
      {comparison && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-xs text-zinc-500 mb-1">Score Change</div>
            <div
              className={`text-xl font-bold ${comparison.scoreChange >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {comparison.scoreChange >= 0 ? "+" : ""}
              {comparison.scoreChange}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-zinc-500 mb-1">Issues Added</div>
            <div className="text-xl font-bold text-red-400">+{comparison.addedIssues}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-zinc-500 mb-1">Issues Fixed</div>
            <div className="text-xl font-bold text-green-400">-{comparison.fixedIssues}</div>
          </div>
        </div>
      )}

      {/* Audit list */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg divide-y divide-[#262626]">
        <div className="px-4 py-3 grid grid-cols-[auto_1fr_80px_80px_80px_80px] gap-4 items-center text-xs text-zinc-500 font-medium">
          <span>Compare</span>
          <span>Date</span>
          <span className="text-center">Score</span>
          <span className="text-center">Issues</span>
          <span className="text-center">Pages</span>
          <span></span>
        </div>
        {audits.map((audit) => (
          <div
            key={audit.id}
            className="px-4 py-3 grid grid-cols-[auto_1fr_80px_80px_80px_80px] gap-4 items-center hover:bg-[#1a1a1a] transition-colors"
          >
            <input
              type="checkbox"
              checked={compareIds?.includes(audit.id) || false}
              onChange={() => toggleCompare(audit.id)}
              className="rounded border-[#262626] bg-[#1a1a1a] text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <div>
              <div className="text-sm text-zinc-300">
                {new Date(audit.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="text-xs text-zinc-500">
                {new Date(audit.created_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div className="flex justify-center">
              <ScoreRing score={audit.score} size={40} />
            </div>
            <div className="text-center text-sm text-zinc-300">{audit.issue_count}</div>
            <div className="text-center text-sm text-zinc-300">{audit.page_count}</div>
            <button
              onClick={() => {
                window.location.hash = `audit-${audit.id}`;
              }}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentationTab({ siteId }: { siteId: string }) {
  const [subTab, setSubTab] = useState<"howto" | "capabilities" | "methodology" | "styleguide">("howto");

  return (
    <div>
      {/* Sub-tab navigation */}
      <div className="flex gap-0 border-b border-[#262626] mb-6" role="tablist" aria-label="Documentation sub-tabs">
        {[
          { id: "howto" as const, label: "How to Use This App" },
          { id: "capabilities" as const, label: "Capabilities Summary" },
          { id: "methodology" as const, label: "Methodology & Best Practices" },
          { id: "styleguide" as const, label: "Style Guide" },
        ].map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={subTab === t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subTab === t.id
                ? "border-blue-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* How to Use This App */}
      {subTab === "howto" && (
        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed max-w-4xl">
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Getting Started</h3>
            <div className="space-y-3">
              <p>The SEO Command Center is your all-in-one platform for managing SEO, AI visibility, content, and code changes for your website. Here&apos;s how everything works together.</p>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">1. Dashboard Tabs</h3>
            <div className="space-y-3">
              <div className="grid gap-3">
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-blue-400 font-semibold">Overview</span> — SEO score, issue counts, metrics at a glance</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-blue-400 font-semibold">Issues</span> — All SEO problems found during audits, filterable by severity</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-blue-400 font-semibold">AI Visibility</span> — Share of Voice across ChatGPT, Gemini, Perplexity, Google AI Mode</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-blue-400 font-semibold">Keywords</span> — All tracked keywords with position, volume, difficulty, CPC</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-blue-400 font-semibold">Competitors</span> — Competitor domain analysis</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-blue-400 font-semibold">Pages</span> — All audited pages with SEO scores and content metrics</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-blue-400 font-semibold">Cannibalization</span> — Keywords where your own pages compete against each other</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-blue-400 font-semibold">Command Center</span> — AI chat + live preview + top fixes table with 1-click Fix Now</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-blue-400 font-semibold">AI Audit</span> — Run dual SEO + AI Visibility audit with scored recommendations and auto-fix</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-blue-400 font-semibold">Documentation</span> — This tab: How to Use, Capabilities, and Methodology reference</div>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">2. Command Center — Your Control Hub</h3>
            <div className="space-y-3">
              <p>The Command Center combines an AI chat, a live site preview, and a prioritized fixes table in one view.</p>
              <div className="bg-[#0a0a0a] rounded p-3 space-y-2">
                <div><span className="text-green-400 font-semibold">Top Fixes Table</span> — Auto-generated list of highest-impact improvements. Click <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">Fix Now</span> to auto-execute any fix.</div>
                <div><span className="text-green-400 font-semibold">AI Chat (Left)</span> — Ask anything: &quot;What keywords should I target?&quot;, &quot;Improve the meta description for /private-cruises&quot;, &quot;How do I close the gap with Float On?&quot;</div>
                <div><span className="text-green-400 font-semibold">Preview (Right)</span> — Three modes: <span className="text-green-400">Live</span> (production site), <span className="text-yellow-400">Branch</span> (unpublished changes), <span className="text-blue-400">Local</span> (real-time Claude Code edits)</div>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">3. Local Preview + Claude Code Sync</h3>
            <div className="space-y-3">
              <p>When running Claude Code on your desktop, changes sync automatically to this app:</p>
              <ol className="list-decimal list-inside space-y-2 text-zinc-400">
                <li>Claude Code edits a file on your computer</li>
                <li>Vite dev server hot-reloads instantly (localhost:5173)</li>
                <li>Click <span className="text-blue-400">&quot;Local&quot;</span> in the preview panel to see changes in real-time</li>
                <li>Click <span className="text-blue-400">&quot;Show V2 Pages&quot;</span> dropdown to browse all local-only pages</li>
                <li>When ready, click <span className="bg-green-700 text-white text-xs px-1.5 py-0.5 rounded">🚀 Publish Live</span> to deploy</li>
              </ol>
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-3 text-xs text-yellow-400">
                <strong>Requirement:</strong> Run <code className="bg-[#0a0a0a] px-1.5 py-0.5 rounded text-green-400">npx vite --port 5173</code> in the CruiseConcierge folder for Local preview to work.
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">4. Publishing Workflow</h3>
            <div className="space-y-3">
              <p>Changes go through a safe branch workflow — nothing goes live until you explicitly publish:</p>
              <div className="bg-[#0a0a0a] rounded p-3 space-y-2 text-zinc-400">
                <div>1. <span className="text-zinc-200">Make changes</span> — via Claude Code, the Code Editor, or AI Audit auto-fix</div>
                <div>2. <span className="text-zinc-200">Changes go to a branch</span> — never directly to main/production</div>
                <div>3. <span className="text-zinc-200">Preview</span> — see changes in the preview panel (Local or Branch mode)</div>
                <div>4. <span className="text-zinc-200">Publish</span> — click &quot;🚀 Publish Live&quot; or &quot;Publish&quot; on a specific page</div>
                <div>5. <span className="text-zinc-200">Choose</span> — &quot;Replace existing page&quot; or &quot;New URL&quot; with custom slug</div>
                <div>6. <span className="text-zinc-200">Live</span> — branch merges to main, auto-deploys to production</div>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">5. Code Editor</h3>
            <div className="space-y-3">
              <p>Click the purple <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded">Code Editor</span> button for a full development environment:</p>
              <ul className="space-y-1 text-zinc-400">
                <li>• Monaco editor (VS Code) with syntax highlighting</li>
                <li>• GitHub file browser with search</li>
                <li>• AI chat that generates components — click &quot;Apply to Editor&quot; or &quot;Stage File&quot;</li>
                <li>• Quick templates: Pricing Calculator, Photo Gallery, Contact Form, etc.</li>
                <li>• Multi-file batch commit</li>
                <li>• Branch management (create/switch)</li>
                <li>• Live preview panel</li>
                <li>• Deploy button</li>
              </ul>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">6. AI Agents</h3>
            <div className="space-y-3">
              <p>The AI chat automatically routes your request to the right specialist:</p>
              <div className="grid gap-2">
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-xl mr-2">🔍</span><span className="text-blue-400 font-semibold">SEO Specialist</span> — keywords, meta tags, rankings, internal linking, technical SEO</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-xl mr-2">🤖</span><span className="text-purple-400 font-semibold">AI Visibility</span> — Share of Voice, ChatGPT/Gemini/Perplexity mentions, AI content optimization</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-xl mr-2">🎨</span><span className="text-pink-400 font-semibold">Design</span> — UX, layout, Wes McDowell principles, conversion optimization, mobile-first</div>
                <div className="bg-[#0a0a0a] rounded p-3"><span className="text-xl mr-2">⚡</span><span className="text-green-400 font-semibold">Implementation</span> — code changes, file edits, GitHub commits, deployment</div>
              </div>
              <p className="text-zinc-500 text-xs">Model defaults to &quot;Auto&quot; — uses Haiku (cheap) for simple questions, Sonnet (powerful) for complex analysis. You can override in the dropdown.</p>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">7. Fixing SEO Issues (Recommended Fix Workflow)</h3>
            <div className="space-y-3">
              <p>When the audit finds issues or generates recommendations, here&apos;s the fix-and-publish flow:</p>
              <div className="bg-[#0a0a0a] rounded p-3 space-y-2 text-zinc-400">
                <div className="font-semibold text-zinc-200 mb-2">Option A: AI Audit Auto-Fix</div>
                <div>1. <span className="text-zinc-200">Go to Command Center tab</span> or run an <span className="text-blue-400">AI Audit</span></div>
                <div>2. <span className="text-zinc-200">Review recommendations</span> — each shows severity, impact score, and affected pages</div>
                <div>3. <span className="text-zinc-200">Click</span> <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">Fix &amp; Commit</span> — AI generates the code fix and pushes it to your working branch</div>
                <div>4. <span className="text-zinc-200">Preview the change</span> — switch to &quot;Branch&quot; mode in the preview panel to see it live</div>
                <div>5. <span className="text-zinc-200">Publish</span> — click <span className="bg-green-700 text-white text-xs px-1.5 py-0.5 rounded">Publish Live</span> to merge branch → main → auto-deploy</div>
              </div>
              <div className="bg-[#0a0a0a] rounded p-3 space-y-2 text-zinc-400">
                <div className="font-semibold text-zinc-200 mb-2">Option B: Top Fixes Table</div>
                <div>1. <span className="text-zinc-200">Open Command Center tab</span> — the Top Fixes table lists highest-impact improvements</div>
                <div>2. <span className="text-zinc-200">Click</span> <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">Fix Now</span> on any row — the AI agent auto-generates and commits the fix</div>
                <div>3. <span className="text-zinc-200">Check the preview panel</span> to verify the change looks correct</div>
                <div>4. <span className="text-zinc-200">Publish when ready</span></div>
              </div>
              <div className="bg-[#0a0a0a] rounded p-3 space-y-2 text-zinc-400">
                <div className="font-semibold text-zinc-200 mb-2">Option C: AI Visibility Fix Now</div>
                <div>1. <span className="text-zinc-200">Go to AI Visibility tab</span> — browse recommendations and strategic opportunities</div>
                <div>2. <span className="text-zinc-200">Click &quot;Fix Now&quot;</span> on any single item, or <span className="text-zinc-200">check multiple items</span> using the checkboxes</div>
                <div>3. <span className="text-zinc-200">Click &quot;Fix Selected in Command Center&quot;</span> from the floating bar at the bottom</div>
                <div>4. <span className="text-zinc-200">The AI agent receives all selected items</span> and generates the content/code changes</div>
                <div>5. <span className="text-zinc-200">Review and publish</span> when ready</div>
              </div>
              <div className="bg-[#0a0a0a] rounded p-3 space-y-2 text-zinc-400">
                <div className="font-semibold text-zinc-200 mb-2">Option D: Manual Edit via Code Editor</div>
                <div>1. <span className="text-zinc-200">Open Code Editor</span> (purple button in header)</div>
                <div>2. <span className="text-zinc-200">Browse files</span> in the GitHub file tree, or ask the AI to generate code</div>
                <div>3. <span className="text-zinc-200">Edit the file</span> in Monaco editor, or click &quot;Apply to Editor&quot; from AI suggestions</div>
                <div>4. <span className="text-zinc-200">Click &quot;Stage File&quot;</span> then <span className="text-blue-400">&quot;Commit&quot;</span> to push changes to branch</div>
                <div>5. <span className="text-zinc-200">Deploy</span> — click the deploy button or use &quot;Publish Live&quot;</div>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">8. Updating a Page</h3>
            <div className="space-y-3">
              <p>To update content on any page (meta descriptions, FAQ, body copy, etc.):</p>
              <div className="bg-[#0a0a0a] rounded p-3 space-y-2 text-zinc-400">
                <div>1. <span className="text-zinc-200">Identify the page</span> — use Keywords tab, Issues tab, or Pages tab to find what needs improvement</div>
                <div>2. <span className="text-zinc-200">Find the source file</span> — SEO content lives in <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-green-400">server/ssr/pageContent.ts</code> (NEVER in React components)</div>
                <div>3. <span className="text-zinc-200">Edit via Code Editor</span> — open the file, make changes, stage &amp; commit</div>
                <div>4. <span className="text-zinc-200">Or ask the AI</span> — in Command Center, say &quot;Improve the meta description for /private-cruises&quot; and the AI generates the fix</div>
                <div>5. <span className="text-zinc-200">Preview</span> — check Branch or Local mode</div>
                <div>6. <span className="text-zinc-200">Publish</span> — merge to main via Publish Live button</div>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded p-3 text-xs text-yellow-400">
                <strong>Architecture Rule:</strong> SEO content goes in <code>pageContent.ts</code>, JSON-LD schemas go in <code>attached_assets/schema_data/</code>. Never put SEO content in React components — crawlers can&apos;t read it there.
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">9. Publishing V2 Pages</h3>
            <div className="space-y-3">
              <p>V2 pages (luxury redesigns) live on the working branch until published:</p>
              <div className="bg-[#0a0a0a] rounded p-3 space-y-2 text-zinc-400">
                <div>1. <span className="text-zinc-200">Click &quot;Show V2 Pages&quot;</span> dropdown in the preview panel</div>
                <div>2. <span className="text-zinc-200">Preview any V2 page</span> — they load from the branch or local dev server</div>
                <div>3. <span className="text-zinc-200">Click &quot;Publish&quot;</span> on the page you want to go live</div>
                <div>4. <span className="text-zinc-200">Choose deployment mode</span>:</div>
                <div className="pl-4">• <span className="text-green-400">&quot;Replace existing page&quot;</span> — V2 replaces the current version at the same URL</div>
                <div className="pl-4">• <span className="text-blue-400">&quot;New URL&quot;</span> — V2 goes live at a custom slug (e.g., /home-v2 → /home-new)</div>
                <div>5. <span className="text-zinc-200">Confirm</span> — branch merges to main, Netlify auto-deploys</div>
              </div>
              <p className="text-zinc-500 text-xs">Currently 9 V2 pages built: Home, Disco, Bachelor, Bachelorette, Combined, Private, Corporate, Wedding, Birthday</p>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">10. Costs</h3>
            <div className="space-y-3">
              <p>This app uses Anthropic API credits (not your Claude subscription). With Auto model selection:</p>
              <div className="bg-[#0a0a0a] rounded p-3 text-zinc-400">
                <div>• Simple chat messages: ~$0.001 each (Haiku)</div>
                <div>• Complex analysis: ~$0.04 each (Sonnet)</div>
                <div>• AI Audit: ~$0.10-0.15 each</div>
                <div>• Auto-fix execution: ~$0.05-0.10 each</div>
                <div>• <strong className="text-zinc-200">Typical monthly cost: $4-15/month</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Capabilities Summary */}
      {subTab === "capabilities" && (
        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed max-w-4xl">
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Platform Capabilities</h3>
            <p className="text-zinc-400 mb-4">The SEO Command Center replaces multiple tools (SEMRush, Replit, separate dashboards) with one unified platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
              <h4 className="font-semibold text-blue-400 mb-3">🔍 SEO Management</h4>
              <ul className="space-y-1.5 text-zinc-400 text-xs">
                <li>✓ SEMRush data integration (auto-refresh daily at 6 AM)</li>
                <li>✓ 500 keyword tracking with position, volume, KD, CPC</li>
                <li>✓ SEMRush expanded: organic pages, keyword overview, domain history</li>
                <li>✓ 200-page site audit with page-by-page scoring (185 pages live)</li>
                <li>✓ Position distribution chart &amp; movement tracking</li>
                <li>✓ Winners/Losers weekly keyword movement report</li>
                <li>✓ Audit history with run-over-run comparison</li>
                <li>✓ Version history with 1-click revert (20 versions per page)</li>
                <li>✓ Meta description analysis and optimization</li>
                <li>✓ Keyword cannibalization detection with canonical overrides</li>
                <li>✓ 10 competitor tracking with full traffic/keyword data</li>
                <li>✓ Core Web Vitals via PageSpeed API</li>
                <li>✓ 20+ meta descriptions rewritten for CTR optimization</li>
                <li>✓ 22+ AI-extractable FAQ entries on SSR pages</li>
              </ul>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
              <h4 className="font-semibold text-purple-400 mb-3">🤖 AI Visibility</h4>
              <ul className="space-y-1.5 text-zinc-400 text-xs">
                <li>✓ Share of Voice tracking across 4 AI platforms</li>
                <li>✓ Google AI Mode, ChatGPT, Gemini, Perplexity monitoring</li>
                <li>✓ Competitor AI sentiment analysis with trends</li>
                <li>✓ AI strategy reports with actionable insights</li>
                <li>✓ 16-city unbiased visibility queries via Perplexity</li>
                <li>✓ Topic gap identification (59 missing topics found)</li>
                <li>✓ AI-extractable content optimization</li>
                <li>✓ &quot;Fix Now&quot; buttons on every recommendation</li>
                <li>✓ Multi-select + batch fix via Command Center</li>
                <li>✓ Weekly auto-refresh (Mondays 7 AM CT)</li>
              </ul>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
              <h4 className="font-semibold text-green-400 mb-3">⚡ Code Editor & Deployment</h4>
              <ul className="space-y-1.5 text-zinc-400 text-xs">
                <li>✓ Monaco (VS Code) code editor in browser</li>
                <li>✓ GitHub file browser with search</li>
                <li>✓ Read, edit, create files directly on GitHub</li>
                <li>✓ Multi-file batch commit with staging</li>
                <li>✓ Branch management (create, switch)</li>
                <li>✓ AI code generation with &quot;Apply to Editor&quot; + &quot;Stage File&quot;</li>
                <li>✓ Quick templates (pricing calculator, gallery, forms)</li>
                <li>✓ 1-click deploy to Netlify</li>
                <li>✓ Live preview with resizable panels</li>
                <li>✓ Preview source toggle: Live | Branch | Local</li>
                <li>✓ V2 Pages dropdown with Publish dialog (replace/new URL)</li>
                <li>✓ &quot;Audit Page&quot; button in preview pane</li>
                <li>✓ &quot;Publish Live&quot; button with merge-to-main workflow</li>
              </ul>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
              <h4 className="font-semibold text-amber-400 mb-3">🎯 AI Agents</h4>
              <ul className="space-y-1.5 text-zinc-400 text-xs">
                <li>✓ 5 specialist agents + router with auto-routing</li>
                <li>✓ SEO, AI Visibility, Design, Implementation specialists</li>
                <li>✓ 6 context formatters (ai_insights, sentiment, metrics, pages, cannibalization, recs)</li>
                <li>✓ Smart model selection (Auto: Haiku for routine, Sonnet for complex)</li>
                <li>✓ Streaming responses in real-time</li>
                <li>✓ Code generation with Apply/Stage buttons</li>
                <li>✓ AI Audit with 15-25 scored recommendations</li>
                <li>✓ 1-click &quot;Fix &amp; Commit&quot; auto-pushes to GitHub</li>
                <li>✓ Top Fixes table with &quot;Fix Now&quot; auto-execute buttons</li>
                <li>✓ Model selector (Haiku, Sonnet, Opus) + agent picker in Command Center</li>
              </ul>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
              <h4 className="font-semibold text-pink-400 mb-3">🎨 Design System</h4>
              <ul className="space-y-1.5 text-zinc-400 text-xs">
                <li>✓ Concierge luxury design (Cormorant Garamond + Jost)</li>
                <li>✓ Dark/gold color palette with glassmorphism</li>
                <li>✓ Wes McDowell 8 conversion principles</li>
                <li>✓ 9 luxury V2 pages built (Home, Disco, Bach, etc.)</li>
                <li>✓ Mobile responsive with 44px touch targets</li>
                <li>✓ Photo galleries with real party photos</li>
                <li>✓ TikTok video embeds with lazy-load autoplay</li>
                <li>✓ Expandable detail sections (SEO-safe CSS toggle)</li>
              </ul>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
              <h4 className="font-semibold text-cyan-400 mb-3">🔄 Automation</h4>
              <ul className="space-y-1.5 text-zinc-400 text-xs">
                <li>✓ Daily SEMRush refresh (6 AM CT) — 500 keywords, organic pages, domain history</li>
                <li>✓ Daily AI Visibility tracking (7 AM CT)</li>
                <li>✓ Daily recommendation generation (8 AM CT)</li>
                <li>✓ Daily email digest (10 AM CT) via Resend</li>
                <li>✓ Weekly stale recommendation cleanup</li>
                <li>✓ Auto-sync hooks from Claude Code to GitHub (.claude/settings.json)</li>
                <li>✓ Local preview sync with Vite hot reload</li>
                <li>✓ Multi-site support (PPC + Party On Delivery profiles)</li>
                <li>✓ Two-way sync with PPC admin section (/api/seo-sync)</li>
                <li>✓ CORS support for cross-origin PPC admin API calls</li>
              </ul>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
              <h4 className="font-semibold text-orange-400 mb-3">📊 Data & Reporting</h4>
              <ul className="space-y-1.5 text-zinc-400 text-xs">
                <li>✓ 185 pages crawled and scored (96/100 overall)</li>
                <li>✓ 100 keywords loaded from SEMRush (top by traffic)</li>
                <li>✓ Daily automated data refresh via Edge Functions + pg_cron</li>
                <li>✓ Email digest reports via Resend (brian@premierpartycruises.com)</li>
                <li>✓ Position distribution and movement charts</li>
                <li>✓ AI-generated recommendations ranked by impact</li>
                <li>✓ Audit issue tracking with severity badges</li>
                <li>✓ Category breakdown (meta, content, technical, links, social)</li>
              </ul>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Integrations</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "SEMRush", desc: "Keywords, rankings, competitors" },
                { name: "Anthropic Claude", desc: "AI chat, audits, code gen" },
                { name: "GitHub", desc: "File edit, commit, branch, PR" },
                { name: "Netlify", desc: "Deploy, branch previews" },
                { name: "Supabase", desc: "Database, auth, cron jobs" },
                { name: "Perplexity", desc: "AI visibility tracking" },
                { name: "Google PageSpeed", desc: "Core Web Vitals" },
                { name: "Resend", desc: "Email digests" },
              ].map(i => (
                <div key={i.name} className="bg-[#0a0a0a] rounded p-3 text-center">
                  <div className="text-xs font-semibold text-zinc-200">{i.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{i.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Methodology */}
      {subTab === "methodology" && (
        <div className="space-y-6 text-sm text-zinc-300 leading-relaxed max-w-4xl">
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">SEO Methodology</h3>
            <div className="space-y-3 text-zinc-400">
              <p>Our approach combines data from SEMRush with AI-powered analysis to generate actionable recommendations ranked by impact.</p>
              <h4 className="font-semibold text-zinc-200 mt-4">Data Collection</h4>
              <p>SEMRush API pulls domain metrics, organic keywords, competitor data, and backlink profiles daily. The crawler audits every page in your sitemap for technical SEO issues.</p>
              <h4 className="font-semibold text-zinc-200 mt-4">Scoring Algorithm</h4>
              <p>Each page gets a 0-100 score based on: meta tags (title, description, canonical), content depth (word count, headings, FAQ), technical factors (load speed, mobile, schema), and authority signals (backlinks, internal links).</p>
              <h4 className="font-semibold text-zinc-200 mt-4">Impact Estimation</h4>
              <p>Traffic projections use: search volume × CTR improvement curve × current position. Moving from position 20→5 captures ~15% CTR vs ~1% at position 20. Estimates are 90-day projections.</p>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">AI Visibility Methodology</h3>
            <div className="space-y-3 text-zinc-400">
              <p>Share of Voice is measured by querying AI platforms with unbiased prompts from 16 US cities. We track how often each brand is mentioned, recommended, or cited.</p>
              <h4 className="font-semibold text-zinc-200 mt-4">Platforms Tracked</h4>
              <p>Google AI Mode, ChatGPT, Gemini, and Perplexity. Each platform has different extraction patterns — we optimize content structure for all four.</p>
              <h4 className="font-semibold text-zinc-200 mt-4">Content Strategy</h4>
              <p>AI platforms extract direct answers from FAQ-style content: question heading → direct answer first sentence → supporting detail. All AI-extractable content lives in the SSR layer (pageContent.ts) so crawlers and AI bots can read it.</p>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Wes McDowell Design Principles</h3>
            <div className="space-y-2 text-zinc-400">
              <div className="bg-[#0a0a0a] rounded p-3">1. <strong className="text-zinc-200">Message clarity</strong> over design complexity</div>
              <div className="bg-[#0a0a0a] rounded p-3">2. <strong className="text-zinc-200">Hero 5-second test</strong> — visitor knows what you do instantly</div>
              <div className="bg-[#0a0a0a] rounded p-3">3. <strong className="text-zinc-200">One CTA per section</strong> — don&apos;t split attention</div>
              <div className="bg-[#0a0a0a] rounded p-3">4. <strong className="text-zinc-200">Social proof above the fold</strong> — reviews, numbers, logos</div>
              <div className="bg-[#0a0a0a] rounded p-3">5. <strong className="text-zinc-200">Guide the journey</strong> — Problem → Solution → How it works → Proof → CTA</div>
              <div className="bg-[#0a0a0a] rounded p-3">6. <strong className="text-zinc-200">Mobile-first</strong> — 44px touch targets, no hover-only menus</div>
              <div className="bg-[#0a0a0a] rounded p-3">7. <strong className="text-zinc-200">Speed is a feature</strong> — lazy load, code split, optimize images</div>
              <div className="bg-[#0a0a0a] rounded p-3">8. <strong className="text-zinc-200">Video as welcome mat</strong> — hero video backgrounds convert</div>
            </div>
          </div>

          <Link
            href="/methodology"
            target="_blank"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Open Full Methodology Guide →
          </Link>
        </div>
      )}

      {/* Style Guide */}
      {subTab === "styleguide" && <StyleGuidePanel siteId={siteId} />}
    </div>
  );
}

// ─── Style Guide Panel ───────────────────────────────────────────────────
// Reads design_guidelines rows from Supabase for the current site and
// renders them grouped by category with priority badges.
type DesignGuideline = {
  id: string;
  category: string;
  scope: string;
  title: string;
  rule: string;
  rationale: string | null;
  do_examples: string | null;
  dont_examples: string | null;
  priority: number;
  tags: string[];
  updated_at: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  layout: "Layout & Structure",
  typography: "Typography",
  color: "Color & Theme",
  spacing: "Spacing",
  mobile: "Mobile & Responsive",
  component: "Components",
  content: "Content & Messaging",
  accessibility: "Accessibility",
};
const CATEGORY_ORDER = ["layout", "typography", "color", "spacing", "component", "mobile", "content", "accessibility"];

const PRIORITY_STYLE: Record<number, { label: string; cls: string }> = {
  1: { label: "Critical", cls: "bg-red-500/15 text-red-300 border-red-500/30" },
  2: { label: "Strong",   cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  3: { label: "Preference", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
};

function StyleGuidePanel({ siteId }: { siteId: string }) {
  const [rows, setRows] = useState<DesignGuideline[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("design_guidelines")
          .select("id, category, scope, title, rule, rationale, do_examples, dont_examples, priority, tags, updated_at")
          .eq("site_id", siteId)
          .order("priority", { ascending: true })
          .order("category", { ascending: true });
        if (cancelled) return;
        if (error) { setError(error.message); return; }
        setRows((data ?? []) as DesignGuideline[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load style guide");
      }
    })();
    return () => { cancelled = true; };
  }, [siteId]);

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 text-sm text-red-300">
        Failed to load style guide: {error}
      </div>
    );
  }
  if (rows === null) {
    return <div className="text-sm text-zinc-500">Loading style guide…</div>;
  }
  if (rows.length === 0) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 text-sm text-zinc-400 max-w-4xl">
        No design guidelines recorded yet for this site. Add rows to the <code className="text-green-400">design_guidelines</code> table in Supabase.
      </div>
    );
  }

  const grouped = CATEGORY_ORDER
    .map(cat => ({ category: cat, items: rows.filter(r => r.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-6 text-sm text-zinc-300 leading-relaxed max-w-4xl">
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Premier Party Cruises — Design & Content Style Guide</h3>
        <p className="text-zinc-400">
          Authoritative source for how every page, blog, and component on the V2 Netlify site should look, behave, and read.
          These rules are stored in Supabase (<code className="text-green-400">public.design_guidelines</code>) and are the
          reference for Claude Code, the AI Audit, and anyone creating or editing content.
        </p>
        <p className="text-zinc-500 text-xs mt-3">
          {rows.length} rules · updated {new Date(rows[0]?.updated_at ?? Date.now()).toLocaleDateString()}
        </p>
      </div>

      {grouped.map(({ category, items }) => (
        <div key={category} className="bg-[#141414] border border-[#262626] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{CATEGORY_LABELS[category] ?? category}</h3>
          <div className="space-y-4">
            {items.map(r => {
              const p = PRIORITY_STYLE[r.priority] ?? PRIORITY_STYLE[2];
              return (
                <div key={r.id} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${p.cls}`}>{p.label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500">{r.scope}</span>
                    <h4 className="text-sm font-semibold text-white flex-1">{r.title}</h4>
                  </div>
                  <p className="text-zinc-300 mb-2 whitespace-pre-wrap">{r.rule}</p>
                  {r.rationale && (
                    <p className="text-xs text-zinc-500 italic mb-2">
                      <span className="text-zinc-400 font-semibold not-italic">Why: </span>{r.rationale}
                    </p>
                  )}
                  {(r.do_examples || r.dont_examples) && (
                    <div className="grid md:grid-cols-2 gap-2 mt-3">
                      {r.do_examples && (
                        <div className="bg-green-900/10 border border-green-700/20 rounded p-2 text-xs">
                          <div className="text-green-400 font-semibold mb-1">Do</div>
                          <code className="text-green-200 whitespace-pre-wrap break-words">{r.do_examples}</code>
                        </div>
                      )}
                      {r.dont_examples && (
                        <div className="bg-red-900/10 border border-red-700/20 rounded p-2 text-xs">
                          <div className="text-red-400 font-semibold mb-1">Don&apos;t</div>
                          <code className="text-red-200 whitespace-pre-wrap break-words">{r.dont_examples}</code>
                        </div>
                      )}
                    </div>
                  )}
                  {r.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {r.tags.map(t => (
                        <span key={t} className="text-[10px] bg-[#1a1a1a] text-zinc-500 px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const LOCAL_PAGES = [
  { url: "/home-v2", label: "Homepage V2", replaces: "/" },
  { url: "/disco-v2", label: "ATX Disco Cruise V2", replaces: "/atx-disco-cruise" },
  { url: "/bachelor-v2", label: "Bachelor Party V2", replaces: "/bachelor-party-austin" },
  { url: "/bachelorette-v2", label: "Bachelorette Party V2", replaces: "/bachelorette-party-austin" },
  { url: "/combined-bach-v2", label: "Combined Bach V2", replaces: "/combined-bachelor-bachelorette-austin" },
  { url: "/private-cruises-v2", label: "Private Cruises V2", replaces: "/private-cruises" },
  { url: "/corporate-v2", label: "Corporate Events V2", replaces: "/corporate-events" },
  { url: "/wedding-v2", label: "Wedding Parties V2", replaces: "/wedding-parties" },
  { url: "/birthday-v2", label: "Birthday Parties V2", replaces: "/birthday-parties" },
];

function PreviewPanel({ site, siteId }: { site: Site; siteId: string }) {
  const [previewMode, setPreviewMode] = useState<"production" | "branch" | "local">("production");
  const [customUrl, setCustomUrl] = useState("");
  const [iframeKey, setIframeKey] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [showLocalPages, setShowLocalPages] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishSlug, setPublishSlug] = useState("");
  const [publishAction, setPublishAction] = useState<"replace" | "new">("replace");
  const [publishReplacesUrl, setPublishReplacesUrl] = useState("");
  const [currentLocalPage, setCurrentLocalPage] = useState<typeof LOCAL_PAGES[0] | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistory, setVersionHistory] = useState<Array<{ sha: string; message: string; date: string; author: string }>>([]);
  const [versionLoading, setVersionLoading] = useState(false);
  const [revertingSha, setRevertingSha] = useState<string | null>(null);
  const [revertResult, setRevertResult] = useState<{ sha: string; ok: boolean; message: string } | null>(null);

  const fetchVersionHistory = async () => {
    setVersionLoading(true);
    try {
      const res = await fetch(`/api/github/history?site_id=${siteId}&path=server/ssr/pageContent.ts&limit=20`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setVersionHistory(data);
      } else if (res.ok && Array.isArray(data.commits)) {
        setVersionHistory(data.commits);
      } else {
        setVersionHistory([]);
      }
    } catch {
      setVersionHistory([]);
    } finally {
      setVersionLoading(false);
    }
  };

  const handleRevert = async (sha: string) => {
    setRevertingSha(sha);
    setRevertResult(null);
    try {
      const res = await fetch("/api/github/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, path: "server/ssr/pageContent.ts", sha }),
      });
      const data = await res.json();
      if (res.ok) {
        setRevertResult({ sha, ok: true, message: data.message || "Reverted successfully" });
      } else {
        setRevertResult({ sha, ok: false, message: data.error || "Revert failed" });
      }
    } catch (e) {
      setRevertResult({ sha, ok: false, message: e instanceof Error ? e.message : "Revert failed" });
    } finally {
      setRevertingSha(null);
    }
  };

  const relativeTime = (dateStr: string) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const previewUrl = React.useMemo(() => {
    if (previewMode === "local") return customUrl || "http://localhost:5173";
    if (previewMode === "branch") return customUrl || `https://${site.current_working_branch || "seo-auto-fixes"}--${site.netlify_site_id ? "seo-command-center" : "premierpartycruises"}.netlify.app`;
    return site.production_url;
  }, [previewMode, customUrl, site]);

  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [localReachable, setLocalReachable] = useState<boolean | null>(null);

  // Check if localhost is reachable (runs once when switching to local mode)
  React.useEffect(() => {
    if (previewMode !== "local") return;
    const checkLocal = async () => {
      try {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 2000);
        await fetch("http://localhost:5173/", { mode: "no-cors", signal: controller.signal });
        setLocalReachable(true);
      } catch {
        setLocalReachable(false);
      }
    };
    checkLocal();
  }, [previewMode]);

  // For local mode: use proxy to avoid mixed content, or show instructions
  const iframeSrc = previewUrl;

  const handlePublish = async () => {
    if (!confirm("This will merge all branch changes to main and deploy to production. Continue?")) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, action: "merge_and_deploy" }),
      });
      const data = await res.json();
      if (res.ok) {
        setPublishResult(`Published! ${data.pr_url || data.message || "Deploy triggered."}`);
      } else {
        setPublishResult(`Error: ${data.error || "Publish failed"}`);
      }
    } catch (e) {
      setPublishResult(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0e0e0e] min-w-0">
      {/* Preview Header */}
      <div className="border-b border-[#262626] px-2 py-1.5 flex items-center gap-1.5">
        {/* Source Toggle */}
        <div className="flex border border-[#333] rounded overflow-hidden">
          {(["production", "branch", "local"] as const).map(m => (
            <button
              key={m}
              onClick={() => setPreviewMode(m)}
              className={`px-2 py-0.5 text-[9px] font-medium ${previewMode === m ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {m === "production" ? "Live" : m === "branch" ? "Branch" : "Local"}
            </button>
          ))}
        </div>

        {/* URL bar */}
        <input
          type="text"
          value={previewMode === "production" ? site.production_url : customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setIframeKey(k => k + 1)}
          placeholder={previewMode === "local" ? "http://localhost:5173/home-v2" : "Branch deploy URL..."}
          className="flex-1 bg-[#0a0a0a] border border-[#333] rounded px-2 py-0.5 text-[10px] text-zinc-400 font-mono focus:outline-none focus:border-blue-500"
          readOnly={previewMode === "production"}
        />

        {/* Audit This Page */}
        <button
          onClick={async () => {
            const pageUrl = previewMode === "production" ? site.production_url : customUrl;
            if (!pageUrl) return;
            setPublishResult(`Auditing ${pageUrl}...`);
            try {
              const res = await fetch("/api/audit/ai-audit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  site_id: siteId,
                  page_url: pageUrl,
                }),
              });
              const data = await res.json();
              if (res.ok) {
                setPublishResult(`✅ Audit complete! Score: ${data.overall_score}/100 — ${data.recommendations?.length || 0} recommendations. Check the AI Audit tab.`);
              } else {
                setPublishResult(`Audit error: ${data.error}`);
              }
            } catch (e) {
              setPublishResult(`Audit failed: ${e instanceof Error ? e.message : "Unknown"}`);
            }
          }}
          className="px-2 py-0.5 text-[10px] font-medium bg-purple-700 hover:bg-purple-600 text-white rounded transition-colors whitespace-nowrap"
        >
          🔍 Audit Page
        </button>

        {/* Version History */}
        <div className="relative">
          <button
            onClick={() => {
              const next = !showVersionHistory;
              setShowVersionHistory(next);
              if (next) fetchVersionHistory();
            }}
            className="px-2 py-0.5 text-[10px] font-medium bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors whitespace-nowrap"
          >
            Version History
          </button>
          {showVersionHistory && (
            <div className="absolute right-0 top-full mt-1 w-[420px] bg-[#0a0a0a] border border-[#262626] rounded shadow-xl z-50 max-h-[400px] overflow-y-auto">
              <div className="px-3 py-2 border-b border-[#262626] flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-300">Recent Versions (pageContent.ts)</span>
                <button onClick={() => setShowVersionHistory(false)} className="text-zinc-500 hover:text-zinc-300 text-[10px]">✕</button>
              </div>
              {versionLoading ? (
                <div className="px-3 py-4 text-[10px] text-zinc-500 text-center">Loading history...</div>
              ) : versionHistory.length === 0 ? (
                <div className="px-3 py-4 text-[10px] text-zinc-500 text-center">No version history found</div>
              ) : (
                versionHistory.map((commit) => (
                  <div key={commit.sha} className="px-3 py-2 border-b border-[#1a1a1a] hover:bg-[#111] flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-blue-400">{commit.sha.slice(0, 7)}</span>
                        <span className="text-[9px] text-zinc-500">{relativeTime(commit.date)}</span>
                      </div>
                      <div className="text-[10px] text-zinc-300 truncate">{commit.message.length > 60 ? commit.message.slice(0, 60) + "..." : commit.message}</div>
                      <div className="text-[9px] text-zinc-600">{commit.author}</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {revertResult && revertResult.sha === commit.sha ? (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${revertResult.ok ? "text-green-400 bg-green-900/30" : "text-red-400 bg-red-900/30"}`}>
                          {revertResult.ok ? "Reverted" : revertResult.message}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRevert(commit.sha)}
                          disabled={revertingSha === commit.sha}
                          className="text-[9px] px-1.5 py-0.5 bg-orange-700 hover:bg-orange-600 disabled:bg-orange-900 text-white rounded font-medium transition-colors"
                        >
                          {revertingSha === commit.sha ? "..." : "Revert"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Refresh */}
        <button onClick={() => setIframeKey(k => k + 1)} className="text-zinc-500 hover:text-zinc-300 text-xs px-1" title="Refresh preview">↻</button>

        {/* Publish Button */}
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="px-2.5 py-0.5 text-[10px] font-semibold bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white rounded transition-colors whitespace-nowrap"
        >
          {publishing ? "Publishing..." : "🚀 Publish Live"}
        </button>

        {/* Traffic lights */}
        <div className="flex gap-0.5 ml-1">
          <span className="w-2 h-2 rounded-full bg-[#ff5f57]"></span>
          <span className="w-2 h-2 rounded-full bg-[#febc2e]"></span>
          <span className="w-2 h-2 rounded-full bg-[#28c840]"></span>
        </div>
      </div>

      {/* Publish result banner */}
      {publishResult && (
        <div className={`px-3 py-1.5 text-[10px] ${publishResult.startsWith("Error") ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"}`}>
          {publishResult}
          <button onClick={() => setPublishResult(null)} className="ml-2 text-zinc-500 hover:text-zinc-300">✕</button>
        </div>
      )}

      {/* Mode indicator */}
      <div className="px-2 py-0.5 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${previewMode === "production" ? "bg-green-500" : previewMode === "branch" ? "bg-yellow-500" : "bg-blue-500"}`} />
          <span className="text-[9px] text-zinc-600">
            {previewMode === "production" ? "Viewing: Live Production Site" :
             previewMode === "branch" ? "Viewing: Branch Preview (unpublished changes)" :
             "Viewing: Local Dev Server (real-time Claude Code changes)"}
          </span>
        </div>
        {previewMode === "local" && (
          <button
            onClick={() => setShowLocalPages(!showLocalPages)}
            className="text-[9px] text-blue-400 hover:text-blue-300 font-medium"
          >
            {showLocalPages ? "Hide" : "Show"} V2 Pages ({LOCAL_PAGES.length}) ▾
          </button>
        )}
      </div>

      {/* Local Pages Dropdown */}
      {previewMode === "local" && showLocalPages && (
        <div className="border-b border-[#262626] bg-[#0a0a0a] max-h-[200px] overflow-y-auto">
          {LOCAL_PAGES.map((page) => (
            <div
              key={page.url}
              className="flex items-center justify-between px-3 py-1.5 hover:bg-[#1a1a1a] cursor-pointer border-b border-[#111]"
              onClick={() => {
                setCustomUrl(`http://localhost:5173${page.url}`);
                setCurrentLocalPage(page);
                setIframeKey(k => k + 1);
                setShowLocalPages(false);
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-blue-400 font-mono">{page.url}</span>
                <span className="text-[10px] text-zinc-500">{page.label}</span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-700/30 text-yellow-400 border border-yellow-700/50 font-medium leading-none">On Branch</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-600">replaces {page.replaces}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentLocalPage(page);
                    setPublishSlug(page.replaces);
                    setPublishReplacesUrl(page.replaces);
                    setPublishAction("replace");
                    setShowPublishDialog(true);
                  }}
                  className="text-[9px] bg-green-700 hover:bg-green-600 text-white px-1.5 py-0.5 rounded font-medium"
                >
                  Publish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Publish Dialog */}
      {showPublishDialog && currentLocalPage && (
        <div className="border-b border-[#262626] bg-[#111] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">Publish: {currentLocalPage.label}</span>
            <button onClick={() => setShowPublishDialog(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">✕</button>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-zinc-400 font-medium">Should this replace an existing page or be a new URL?</div>
            <div className="flex gap-2">
              <button
                onClick={() => { setPublishAction("replace"); setPublishSlug(currentLocalPage.replaces); }}
                className={`flex-1 px-3 py-2 rounded text-[11px] font-medium border transition-colors ${
                  publishAction === "replace"
                    ? "bg-blue-600/20 border-blue-500 text-blue-300"
                    : "bg-[#0a0a0a] border-[#333] text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <div className="font-semibold">Replace Existing Page</div>
                <div className="text-[9px] mt-0.5 opacity-70">Replaces {currentLocalPage.replaces}</div>
              </button>
              <button
                onClick={() => { setPublishAction("new"); setPublishSlug(currentLocalPage.url); }}
                className={`flex-1 px-3 py-2 rounded text-[11px] font-medium border transition-colors ${
                  publishAction === "new"
                    ? "bg-green-600/20 border-green-500 text-green-300"
                    : "bg-[#0a0a0a] border-[#333] text-zinc-400 hover:border-zinc-500"
                }`}
              >
                <div className="font-semibold">New URL</div>
                <div className="text-[9px] mt-0.5 opacity-70">Keep at {currentLocalPage.url}</div>
              </button>
            </div>

            <div>
              <div className="text-[10px] text-zinc-500 mb-1">Final URL slug:</div>
              <div className="flex gap-2">
                <span className="text-[10px] text-zinc-600 py-1">premierpartycruises.com</span>
                <input
                  type="text"
                  value={publishSlug}
                  onChange={(e) => setPublishSlug(e.target.value)}
                  className="flex-1 bg-[#0a0a0a] border border-[#333] rounded px-2 py-1 text-[11px] text-zinc-300 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {publishAction === "replace" && (
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded px-2 py-1.5 text-[10px] text-yellow-400">
                ⚠️ This will replace the current page at <span className="font-mono">{publishSlug}</span>. The old page content will be overwritten.
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowPublishDialog(false)}
                className="px-3 py-1.5 text-[10px] text-zinc-400 border border-[#333] rounded hover:border-zinc-500"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowPublishDialog(false);
                  setPublishing(true);
                  setPublishResult(`Publishing ${currentLocalPage.label} to ${publishSlug}...`);
                  try {
                    const res = await fetch("/api/publish", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        site_id: siteId,
                        action: "publish_page",
                        source_path: currentLocalPage.url,
                        target_slug: publishSlug,
                        replace_existing: publishAction === "replace",
                      }),
                    });
                    const data = await res.json();
                    setPublishResult(res.ok
                      ? `✅ Published ${currentLocalPage.label} to ${publishSlug}! ${data.message || ""}`
                      : `Error: ${data.error || "Publish failed"}`
                    );
                  } catch (e) {
                    setPublishResult(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
                  } finally {
                    setPublishing(false);
                  }
                }}
                disabled={publishing}
                className="px-4 py-1.5 text-[10px] font-semibold bg-green-700 hover:bg-green-600 disabled:bg-green-900 text-white rounded"
              >
                {publishing ? "Publishing..." : `🚀 Publish to ${publishSlug}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Content */}
      {previewMode === "local" && localReachable === false ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] p-6 text-center">
          <div className="text-3xl mb-3">🔌</div>
          <div className="text-sm font-medium text-zinc-300 mb-2">Local Dev Server Not Running</div>
          <div className="text-xs text-zinc-500 max-w-sm mb-4">
            Start the Vite dev server in your CruiseConcierge folder to see real-time changes from Claude Code:
          </div>
          <code className="text-xs bg-[#1a1a1a] text-green-400 px-3 py-2 rounded font-mono mb-4">
            cd CruiseConcierge && npx vite --port 5173
          </code>
          <button onClick={() => { setLocalReachable(null); setIframeKey(k => k + 1); }} className="text-xs text-blue-400 hover:text-blue-300">
            Retry Connection
          </button>
        </div>
      ) : previewMode === "local" ? (
        <div className="flex-1 flex flex-col">
          {/* Sync bar */}
          <div className="flex items-center justify-between px-2 py-1 bg-[#0d0d0d] border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] text-zinc-500">Live sync with Claude Code desktop</span>
            </div>
            <div className="flex items-center gap-2">
              {lastSynced && <span className="text-[8px] text-zinc-600">Synced: {lastSynced}</span>}
              <button
                onClick={() => {
                  setIframeKey(k => k + 1);
                  setLastSynced(new Date().toLocaleTimeString());
                }}
                className="text-[9px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-900/20"
              >
                ↻ Refresh
              </button>
              <button
                onClick={() => window.open(customUrl || "http://localhost:5173", "_blank")}
                className="text-[9px] text-zinc-400 hover:text-zinc-300 px-1.5 py-0.5 rounded hover:bg-[#1a1a1a]"
              >
                ↗ Open in Tab
              </button>
            </div>
          </div>
          <iframe
            key={iframeKey}
            src={customUrl || "http://localhost:5173"}
            className="flex-1 bg-white"
            title="Local preview"
          />
        </div>
      ) : (
        <iframe
          key={iframeKey}
          src={iframeSrc}
          className="flex-1 bg-white"
          title="Site preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      )}
    </div>
  );
}

function MetricBox({
  label,
  value,
  accent = "white",
  onClick,
}: {
  label: string;
  value: string | number;
  accent?: "white" | "green" | "blue" | "amber" | "red";
  onClick?: () => void;
}) {
  const colors: Record<string, string> = {
    white: "text-white",
    green: "text-green-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  return (
    <div
      className={`bg-[#0a0a0a] border border-[#262626] rounded p-3 ${onClick ? "cursor-pointer hover:border-blue-500/50 hover:bg-[#111] transition-colors" : ""}`}
      onClick={onClick}
      {...(onClick ? { role: "button", "aria-label": `${label}: ${value}. Click to view details.`, tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } } : {})}
    >
      <div className={`text-xl font-bold ${colors[accent]}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}{onClick && <span className="text-[10px] text-blue-400/70 ml-1">Click to view</span>}</div>
    </div>
  );
}

function PageSpeedSection({ siteId, productionUrl }: { siteId: string; productionUrl: string }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");

  async function runPageSpeed() {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/pagespeed/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, strategy }),
      });
      const result = await res.json();
      if (res.ok) setData(result);
      else setData({ error: result.error });
    } catch (e) {
      setData({ error: e instanceof Error ? e.message : "Failed" });
    } finally {
      setLoading(false);
    }
  }

  const scoreColor = (score: number) =>
    score >= 90 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Core Web Vitals</h3>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#333] rounded overflow-hidden">
            {(["mobile", "desktop"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`px-3 py-1 text-xs ${strategy === s ? "bg-blue-600 text-white" : "text-zinc-500"}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={runPageSpeed}
            disabled={loading}
            className="bg-[#141414] border border-[#262626] hover:border-[#404040] text-zinc-300 px-3 py-1 rounded text-xs font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? "Running..." : "Run PageSpeed"}
          </button>
        </div>
      </div>
      {data && !data.error ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3 text-center">
            <div className={`text-2xl font-bold ${scoreColor(data.performance_score as number)}`}>{data.performance_score as number}</div>
            <div className="text-xs text-zinc-500 mt-1">Performance</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3 text-center">
            <div className={`text-2xl font-bold ${scoreColor(data.seo_score as number)}`}>{data.seo_score as number}</div>
            <div className="text-xs text-zinc-500 mt-1">SEO</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3 text-center">
            <div className={`text-2xl font-bold ${scoreColor(data.accessibility_score as number)}`}>{data.accessibility_score as number}</div>
            <div className="text-xs text-zinc-500 mt-1">Accessibility</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3 text-center">
            <div className={`text-2xl font-bold ${scoreColor(data.best_practices_score as number)}`}>{data.best_practices_score as number}</div>
            <div className="text-xs text-zinc-500 mt-1">Best Practices</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3">
            <div className="text-lg font-bold text-white">{data.lcp ? `${((data.lcp as number) / 1000).toFixed(1)}s` : "—"}</div>
            <div className="text-xs text-zinc-500">LCP (target &lt;2.5s)</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3">
            <div className="text-lg font-bold text-white">{data.cls !== undefined ? (data.cls as number).toFixed(3) : "—"}</div>
            <div className="text-xs text-zinc-500">CLS (target &lt;0.1)</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3">
            <div className="text-lg font-bold text-white">{data.tbt ? `${Math.round(data.tbt as number)}ms` : "—"}</div>
            <div className="text-xs text-zinc-500">TBT (target &lt;200ms)</div>
          </div>
          <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3">
            <div className="text-lg font-bold text-white">{data.fcp ? `${((data.fcp as number) / 1000).toFixed(1)}s` : "—"}</div>
            <div className="text-xs text-zinc-500">FCP (target &lt;1.8s)</div>
          </div>
        </div>
      ) : data?.error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2">
          <p className="text-sm text-red-400 font-medium">{String(data.error)}</p>
          <p className="text-xs text-zinc-500">
            To fix: Get a free API key from console.cloud.google.com → PageSpeed Insights API → Create credentials.
            Then add &quot;google_pagespeed_api_key&quot; to the app_config table in Supabase.
          </p>
          <button
            onClick={runPageSpeed}
            className="bg-[#141414] border border-[#262626] hover:border-[#404040] text-zinc-300 px-3 py-1 rounded text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="text-sm text-zinc-500">
          Click &quot;Run PageSpeed&quot; to test your site&apos;s Core Web Vitals and performance scores.
        </div>
      )}
    </div>
  );
}

function calculateImpactScore(k: Keyword): number {
  // Impact score: combination of opportunity size and ease of improvement
  // Higher = more impactful to optimize for
  const volume = k.search_volume || 0;
  const position = k.position || 100;
  const difficulty = k.keyword_difficulty ?? 50;
  const traffic = k.traffic_percent || 0;

  // Volume score (0-30): higher volume = more valuable
  const volumeScore = Math.min(30, (volume / 200) * 30);

  // Position opportunity (0-30): positions 4-20 have most room to improve with realistic effort
  let posScore = 0;
  if (position >= 4 && position <= 10) posScore = 30; // page 1 but not top 3 — easiest wins
  else if (position >= 11 && position <= 20) posScore = 25; // page 2 — high potential
  else if (position >= 2 && position <= 3) posScore = 15; // already top 3, less room
  else if (position === 1) posScore = 5; // already #1, defend
  else if (position >= 21 && position <= 50) posScore = 10; // longer-term plays
  else posScore = 2;

  // Difficulty inverse (0-25): lower difficulty = easier to rank
  const diffScore = Math.max(0, 25 - (difficulty / 4));

  // Current traffic value (0-15): keywords already driving traffic are worth defending
  const trafficScore = Math.min(15, traffic * 3);

  return Math.round(volumeScore + posScore + diffScore + trafficScore);
}

function KeywordsTab({ keywords, onFixNow }: { keywords: Keyword[]; onFixNow?: (prompt: string) => void }) {
  const [filter, setFilter] = useState<"all" | "top10" | "quick-wins" | "most-impactful" | "page2" | "easy-wins" | "pos-range">("all");
  const [posRange, setPosRange] = useState<{min: number; max: number} | null>(null);
  const [search, setSearch] = useState("");

  if (keywords.length === 0) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-8 text-center text-zinc-500">
        No keyword data yet. Connect SEMRush to pull keyword rankings.
      </div>
    );
  }

  let filtered = keywords;
  if (filter === "top10") {
    filtered = keywords.filter((k) => (k.position || 999) <= 10);
  } else if (filter === "quick-wins") {
    filtered = keywords.filter((k) => {
      const p = k.position || 999;
      const d = k.keyword_difficulty ?? 100;
      return p >= 4 && p <= 20 && (k.search_volume || 0) >= 30 && d <= 40;
    }).sort((a, b) => {
      // Sort by difficulty ascending (easiest first), then volume descending
      const dA = a.keyword_difficulty ?? 100;
      const dB = b.keyword_difficulty ?? 100;
      if (dA !== dB) return dA - dB;
      return (b.search_volume || 0) - (a.search_volume || 0);
    });
  } else if (filter === "most-impactful") {
    filtered = [...keywords]
      .map((k) => ({ ...k, _impact: calculateImpactScore(k) }))
      .sort((a, b) => b._impact - a._impact)
      .slice(0, 30);
  } else if (filter === "easy-wins") {
    filtered = keywords.filter((k) => {
      const d = k.keyword_difficulty ?? 100;
      return d <= 15 && (k.search_volume || 0) >= 30;
    }).sort((a, b) => (a.keyword_difficulty ?? 100) - (b.keyword_difficulty ?? 100));
  } else if (filter === "page2") {
    filtered = keywords.filter((k) => {
      const p = k.position || 999;
      return p >= 11 && p <= 20;
    });
  } else if (filter === "pos-range" && posRange) {
    filtered = keywords.filter((k) => {
      const p = k.position || 999;
      return p >= posRange.min && p <= posRange.max;
    });
  }

  if (search) {
    filtered = filtered.filter((k) =>
      k.keyword.toLowerCase().includes(search.toLowerCase()),
    );
  }

  // Summary stats
  const top10Count = keywords.filter((k) => (k.position || 999) <= 10).length;
  const top3Count = keywords.filter((k) => (k.position || 999) <= 3).length;
  const totalVolume = keywords.reduce((sum, k) => sum + (k.search_volume || 0), 0);
  const quickWinsCount = keywords.filter((k) => {
    const p = k.position || 999;
    return p >= 5 && p <= 20 && (k.search_volume || 0) >= 50;
  }).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricBox label="Top 3 rankings" value={top3Count} accent="green" onClick={() => setFilter("top10")} />
        <MetricBox label="Top 10 rankings" value={top10Count} accent="blue" onClick={() => setFilter("top10")} />
        <MetricBox label="Quick win opportunities" value={quickWinsCount} accent="amber" onClick={() => setFilter("quick-wins")} />
        <MetricBox label="Total search volume" value={totalVolume.toLocaleString()} accent="white" />
      </div>

      {/* Position Distribution Chart */}
      {(() => {
        const ranges = [
          { label: "#1-3", min: 1, max: 3, color: "bg-green-500", textColor: "text-green-400" },
          { label: "#4-10", min: 4, max: 10, color: "bg-blue-500", textColor: "text-blue-400" },
          { label: "#11-20", min: 11, max: 20, color: "bg-amber-500", textColor: "text-amber-400" },
          { label: "#21-50", min: 21, max: 50, color: "bg-zinc-500", textColor: "text-zinc-400" },
          { label: "#51+", min: 51, max: Infinity, color: "bg-zinc-600", textColor: "text-zinc-500" },
        ];
        const counts = ranges.map((r) => ({
          ...r,
          count: keywords.filter((k) => {
            const p = k.position || 999;
            return p >= r.min && p <= r.max;
          }).length,
        }));
        const maxCount = Math.max(...counts.map((c) => c.count), 1);
        return (
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Position Distribution</h3>
            <div className="space-y-2">
              {counts.map((r) => {
                const isActive = filter === "pos-range" && posRange?.min === r.min && posRange?.max === (r.max === Infinity ? 999 : r.max);
                return (
                <div key={r.label} className={`flex items-center gap-3 cursor-pointer rounded p-1 -mx-1 transition-colors ${isActive ? "bg-blue-900/30 ring-1 ring-blue-500/50" : "hover:bg-[#1a1a1a]"}`}
                  onClick={() => {
                    if (isActive) { setFilter("all"); setPosRange(null); }
                    else { setPosRange({min: r.min, max: r.max === Infinity ? 999 : r.max}); setFilter("pos-range"); }
                  }}
                >
                  <span className={`text-xs font-mono w-12 text-right ${r.textColor}`}>{r.label}</span>
                  <div className="flex-1 bg-zinc-800 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.color} flex items-center justify-end pr-2 transition-all`}
                      style={{ width: `${Math.max((r.count / maxCount) * 100, r.count > 0 ? 8 : 0)}%` }}
                    >
                      {r.count > 0 && (
                        <span className="text-[10px] font-bold text-white">{r.count}</span>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Winners / Losers Report */}
      {(() => {
        const winners = keywords
          .filter((k) => (k.position_difference ?? 0) > 0)
          .sort((a, b) => (b.position_difference ?? 0) - (a.position_difference ?? 0));
        const losers = keywords
          .filter((k) => (k.position_difference ?? 0) < 0)
          .sort((a, b) => (a.position_difference ?? 0) - (b.position_difference ?? 0));
        const hasMovers = winners.length > 0 || losers.length > 0;
        return (
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Winners & Losers</h3>
            {!hasMovers ? (
              <p className="text-sm text-zinc-500 text-center py-4">
                No position changes detected yet — check back after the next SEMRush refresh
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Winners */}
                <div>
                  <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2">Winners (Improved)</h4>
                  {winners.length === 0 ? (
                    <p className="text-xs text-zinc-500">No improvements this period</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {winners.slice(0, 20).map((k) => (
                        <div key={k.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-green-500/5 border border-green-500/10 cursor-pointer hover:bg-green-500/10 transition-colors"
                          onClick={() => onFixNow?.(`Keyword "${k.keyword}" improved ${k.position_difference} positions to #${k.position} (${(k.search_volume || 0).toLocaleString()} vol). Let's capitalize on this momentum.\n\nRULES: Changes go in server/ssr/pageContent.ts only. Never reduce word count. Use [[token]] internal links.\n\nACTIONS:\n- Analyze what content on ${k.url || '/'} is driving this improvement\n- Add 2-3 more FAQ entries targeting related long-tail keywords\n- Strengthen internal links FROM high-authority pages TO this URL\n- Show exact pageContent.ts changes to push this into top 3`)}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-zinc-300 truncate block">{k.keyword}</span>
                            <span className="text-xs text-zinc-500">Vol: {(k.search_volume || 0).toLocaleString()} · Pos: #{k.position}</span>
                          </div>
                          <span className="text-sm font-bold text-green-400 whitespace-nowrap ml-2">
                            ↑ {k.position_difference} position{(k.position_difference ?? 0) !== 1 ? "s" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Losers */}
                <div>
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Losers (Declined)</h4>
                  {losers.length === 0 ? (
                    <p className="text-xs text-zinc-500">No declines this period</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {losers.slice(0, 20).map((k) => (
                        <div key={k.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-red-500/5 border border-red-500/10 cursor-pointer hover:bg-red-500/10 transition-colors group"
                          onClick={() => onFixNow?.(`URGENT: Keyword "${k.keyword}" dropped ${Math.abs(k.position_difference ?? 0)} positions to #${k.position} (${(k.search_volume || 0).toLocaleString()} vol). Execute a recovery plan NOW.\n\nRULES: Changes go in server/ssr/pageContent.ts only. Never reduce word count. Use [[token]] internal links.\n\nACTIONS:\n- Check if content on ${k.url || '/'} was thinned or if a competitor added better content\n- Expand the page's content section with 200+ additional words targeting this keyword\n- Add 3+ new FAQ entries for this keyword cluster\n- Add internal links from your highest-traffic pages to this URL\n- Show exact pageContent.ts code changes`)}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-zinc-300 truncate block">{k.keyword}</span>
                            <span className="text-xs text-zinc-500">Vol: {(k.search_volume || 0).toLocaleString()} · Pos: #{k.position}</span>
                          </div>
                          <span className="text-sm font-bold text-red-400 whitespace-nowrap ml-2">
                            ↓ {Math.abs(k.position_difference ?? 0)} position{Math.abs(k.position_difference ?? 0) !== 1 ? "s" : ""}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); onFixNow?.(`Fix "${k.keyword}" — dropped to #${k.position}. Expand content on ${k.url || '/'} in pageContent.ts: add 200+ words, 3 FAQ entries, and internal links. Show exact code.`); }}
                            className="text-[10px] font-semibold bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 rounded invisible group-hover:visible ml-2 w-[32px]"
                          >
                            Fix
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div className="flex flex-wrap gap-2 items-center">
        {[
          { id: "all", label: `All (${keywords.length})` },
          { id: "most-impactful", label: `Most Impactful` },
          { id: "quick-wins", label: `Quick Wins` },
          { id: "easy-wins", label: `Easy Wins (Low KD)` },
          { id: "top10", label: `Top 10 (${top10Count})` },
          { id: "page2", label: `Page 2` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as "all" | "top10" | "quick-wins" | "most-impactful" | "page2" | "easy-wins" | "pos-range")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              filter === f.id
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto bg-[#141414] border border-[#262626] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 w-64"
        />
      </div>

      <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#0a0a0a] shadow-[0_1px_0_#262626]">
              <tr className="text-left text-zinc-400 border-b border-[#262626] bg-[#0a0a0a]">
                <th className="p-3 bg-[#0a0a0a]">Keyword</th>
                <th className="p-3 bg-[#0a0a0a]">Position</th>
                <th className="p-3 bg-[#0a0a0a]">Volume</th>
                <th className="p-3 bg-[#0a0a0a]">KD</th>
                <th className="p-3 bg-[#0a0a0a]">Impact</th>
                <th className="p-3 bg-[#0a0a0a]">CPC</th>
                <th className="p-3 bg-[#0a0a0a]">Traffic %</th>
                <th className="p-3 bg-[#0a0a0a]">URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filtered.slice(0, 100).map((k) => {
                const impact = calculateImpactScore(k);
                const kd = k.keyword_difficulty;
                return (
                <tr key={k.id} className="hover:bg-[#1a1a1a] cursor-pointer"
                  onClick={() => onFixNow?.(`Execute SEO improvements for "${k.keyword}" (currently #${k.position}, ${(k.search_volume || 0).toLocaleString()} monthly searches, URL: ${k.url || '/'}).\n\nRULES — follow these exactly:\n1. All SEO content changes go in server/ssr/pageContent.ts — NEVER in React components\n2. Never reduce existing word count — only add or improve\n3. Use [[token]] syntax for internal links (check LINK_CATALOG)\n4. FAQ entries must follow: Question heading → Direct answer first sentence → Supporting detail\n\nACTIONS to take:\n- Strengthen the H1 and introduction for this keyword on the ranking URL\n- Add or improve FAQ entries targeting this keyword and related long-tail variations\n- Add internal links from 3-5 related pages pointing to this URL\n- Ensure meta description includes the keyword naturally\n- Show me the exact code changes needed in pageContent.ts`)}
                >
                  <td className="p-3 font-medium">{k.keyword}</td>
                  <td className="p-3">
                    <span
                      className={`font-bold ${
                        (k.position || 999) <= 3
                          ? "text-green-400"
                          : (k.position || 999) <= 10
                            ? "text-blue-400"
                            : (k.position || 999) <= 20
                              ? "text-amber-400"
                              : "text-zinc-500"
                      }`}
                    >
                      #{k.position}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-300">{(k.search_volume || 0).toLocaleString()}</td>
                  <td className="p-3">
                    {kd !== null && kd !== undefined ? (
                      <span className={`font-medium ${
                        kd <= 15 ? "text-green-400" :
                        kd <= 35 ? "text-blue-400" :
                        kd <= 55 ? "text-amber-400" :
                        "text-red-400"
                      }`}>
                        {kd}%
                      </span>
                    ) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-10 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            impact >= 60 ? "bg-green-500" :
                            impact >= 40 ? "bg-blue-500" :
                            impact >= 20 ? "bg-amber-500" :
                            "bg-zinc-600"
                          }`}
                          style={{ width: `${impact}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        impact >= 60 ? "text-green-400" :
                        impact >= 40 ? "text-blue-400" :
                        "text-zinc-500"
                      }`}>
                        {impact}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-zinc-400">
                    {k.cpc ? `$${Number(k.cpc).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 text-zinc-400">
                    {k.traffic_percent ? `${Number(k.traffic_percent).toFixed(2)}%` : "—"}
                  </td>
                  <td className="p-3 font-mono text-xs text-zinc-500 max-w-xs truncate">
                    {k.url?.replace("https://premierpartycruises.com", "") || "—"}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="p-3 text-center text-xs text-zinc-500 border-t border-[#262626]">
            Showing 100 of {filtered.length} keywords
          </div>
        )}
      </div>
    </div>
  );
}

function AIVisibilityTab({
  siteId,
  aiShareOfVoice,
  aiInsights,
  aiStrategyReports,
  aiCompetitorSentiment,
  onFixNow,
}: {
  siteId: string;
  aiShareOfVoice: AIShareOfVoice[];
  aiInsights: AIInsight[];
  aiStrategyReports: AIStrategyReport[];
  aiCompetitorSentiment: AICompetitorSentiment[];
  onFixNow?: (prompt: string) => void;
}) {
  const [platform, setPlatform] = useState<string>("all");
  const [selectedInsights, setSelectedInsights] = useState<Set<string>>(new Set());
  const [selectedStrategies, setSelectedStrategies] = useState<Set<string>>(new Set());

  const toggleInsight = (id: string) => {
    setSelectedInsights(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleStrategy = (id: string) => {
    setSelectedStrategies(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalSelected = selectedInsights.size + selectedStrategies.size;

  const handleFixSelected = () => {
    if (!onFixNow || totalSelected === 0) return;
    const parts: string[] = [];
    aiInsights.filter(i => selectedInsights.has(i.id)).forEach(i => {
      parts.push(`- ${i.title}: ${i.description}`);
    });
    aiStrategyReports.filter(r => selectedStrategies.has(r.id)).forEach(r => {
      parts.push(`- ${r.title}: ${r.summary}`);
    });
    const prompt = `Please execute these ${totalSelected} AI visibility improvements. For each one, determine what content changes are needed in the SSR layer (pageContent.ts) or schema files, and make the specific changes:\n\n${parts.join("\n")}\n\nBe specific about which files to edit and what content to add or change.`;
    onFixNow(prompt);
    setSelectedInsights(new Set());
    setSelectedStrategies(new Set());
  };

  const handleFixOne = (title: string, description: string) => {
    if (!onFixNow) return;
    const prompt = `Please execute this AI visibility improvement. Determine what content changes are needed and make the specific changes:\n\n**${title}**: ${description}\n\nBe specific about which files to edit and what content to add or change.`;
    onFixNow(prompt);
  };
  const allPlatforms = aiShareOfVoice
    .filter((s) => s.platform === "all")
    .sort((a, b) => (b.share_percent || 0) - (a.share_percent || 0));

  const ownBrand = allPlatforms.find((s) => s.is_own_brand);
  const leader = allPlatforms[0];
  const gap = leader && ownBrand && !leader.is_own_brand
    ? (leader.share_percent || 0) - (ownBrand.share_percent || 0)
    : null;

  // Per-platform data for own brand
  const platforms = ["google_ai_mode", "chatgpt", "perplexity", "gemini"] as const;
  const platformLabels: Record<string, string> = {
    google_ai_mode: "Google AI Mode",
    chatgpt: "ChatGPT",
    perplexity: "Perplexity",
    gemini: "Gemini",
    all: "All Platforms",
  };

  // Get brands for selected platform
  const brandsForPlatform = aiShareOfVoice
    .filter((s) => s.platform === platform)
    .sort((a, b) => (b.share_percent || 0) - (a.share_percent || 0));

  // Max share for bar scaling
  const maxShare = Math.max(...brandsForPlatform.map((b) => b.share_percent || 0), 1);

  // Empty state when no AI data at all
  if (aiShareOfVoice.length === 0 && aiInsights.length === 0 && aiStrategyReports.length === 0 && aiCompetitorSentiment.length === 0) {
    return (
      <div className="space-y-4">
        <SemrushAiRefreshButton siteId={siteId} />
        <SemrushBulkIngest siteId={siteId} />
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-zinc-300 mb-2">No AI Visibility Data Yet</h3>
          <p className="text-sm text-zinc-500 max-w-md mx-auto">
            Drop SEMRush screenshots into the panel above, or wait for the daily tracking run (Share of Voice across ChatGPT, Gemini, Perplexity, Google AI Mode).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SemrushAiRefreshButton siteId={siteId} />
      <SemrushBulkIngest siteId={siteId} />
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/20 border border-blue-800/50 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-400">
            {ownBrand ? `${Number(ownBrand.share_percent).toFixed(1)}%` : "—"}
          </div>
          <div className="text-xs text-zinc-400 mt-1">Your AI Share of Voice</div>
        </div>
        {gap !== null && gap > 0 && (
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
            <div className="text-3xl font-bold text-amber-400">{gap.toFixed(1)}pt</div>
            <div className="text-xs text-zinc-400 mt-1">Gap to #{1} ({leader?.brand})</div>
          </div>
        )}
        {platforms.map((p) => {
          const d = aiShareOfVoice.find((s) => s.platform === p && s.is_own_brand);
          return (
            <div key={p} className="bg-[#141414] border border-[#262626] rounded-lg p-4">
              <div className="text-2xl font-bold text-white">
                {d ? `${Number(d.share_percent).toFixed(0)}%` : "—"}
              </div>
              <div className="text-xs text-zinc-400 mt-1">{platformLabels[p]}</div>
            </div>
          );
        })}
      </div>

      {/* Share of Voice chart */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Share of Voice by Brand</h3>
          <div className="flex gap-1 border border-[#262626] rounded p-0.5">
            {["all", ...platforms].map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  platform === p
                    ? "bg-blue-600 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {platformLabels[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {brandsForPlatform.map((brand) => (
            <div key={brand.id} className="flex items-center gap-3">
              <div className="w-48 text-sm truncate">
                <span className={brand.is_own_brand ? "text-blue-400 font-semibold" : "text-zinc-300"}>
                  {brand.brand}
                </span>
                {brand.is_own_brand && (
                  <span className="ml-1.5 text-[10px] bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded">YOU</span>
                )}
              </div>
              <div className="flex-1 bg-zinc-800 rounded-full h-6 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${
                    brand.is_own_brand
                      ? "bg-gradient-to-r from-blue-600 to-blue-400"
                      : "bg-zinc-600"
                  }`}
                  style={{ width: `${((brand.share_percent || 0) / maxShare) * 100}%` }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">
                  {Number(brand.share_percent).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Visibility Recommendations Table (history, multi-select, Fix Now) */}
      <AIRecommendationsTable insights={aiInsights} onFixNow={onFixNow} />

      {/* Strategy Reports from SEMRush */}
      {aiStrategyReports.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-1">Strategic AI Opportunities</h3>
          <p className="text-xs text-zinc-500 mb-4">Deep analysis from SEMRush Brand Performance with specific action items</p>
          <div className="space-y-4">
            {aiStrategyReports.map((report) => (
              <div key={report.id} className={`bg-[#0a0a0a] border rounded-lg p-4 transition-colors ${
                selectedStrategies.has(report.id) ? "border-blue-500 bg-blue-950/20" : "border-[#262626]"
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedStrategies.has(report.id)}
                    onChange={() => toggleStrategy(report.id)}
                    className="w-4 h-4 mt-1 rounded border-zinc-600 bg-zinc-800 text-blue-500 cursor-pointer shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{report.title}</h4>
                      <div className="flex items-center gap-2 shrink-0">
                        {report.timeframe && (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            report.timeframe === "urgent" ? "bg-red-900/40 text-red-300" :
                            report.timeframe === "medium" ? "bg-amber-900/40 text-amber-300" :
                            "bg-zinc-800 text-zinc-400"
                          }`}>
                            {report.timeframe}
                          </span>
                        )}
                        {onFixNow && (
                          <button
                            onClick={() => handleFixOne(report.title, report.summary + (report.recommendations ? "\n\nAction items:\n" + report.recommendations.join("\n") : ""))}
                            className="text-[10px] font-semibold bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded transition-colors"
                          >
                            Fix Now
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 mb-3">{report.summary}</p>
                    {report.recommendations && report.recommendations.length > 0 && (
                      <div className="space-y-1.5">
                        {report.recommendations.map((rec, i) => (
                          <div key={i} className="flex gap-2 text-sm">
                            <span className="text-blue-400 shrink-0 mt-0.5">-</span>
                            <span className="text-zinc-300">{rec}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitor Sentiment Analysis */}
      {aiCompetitorSentiment.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-1">Competitor Sentiment Analysis</h3>
          <p className="text-xs text-zinc-500 mb-4">How AI platforms perceive each competitor vs you</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-[#262626]">
                  <th className="py-2 pr-4">Brand</th>
                  <th className="py-2 pr-4">Share of Voice</th>
                  <th className="py-2 pr-4">Trend</th>
                  <th className="py-2 pr-4">Favorable Sentiment</th>
                  <th className="py-2 pr-4">Trend</th>
                  <th className="py-2">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {aiCompetitorSentiment.map((cs) => (
                  <tr key={cs.id} className={`hover:bg-[#1a1a1a] ${cs.competitor === "Premier Party Cruises" ? "bg-blue-900/10" : ""}`}>
                    <td className="py-2.5 pr-4">
                      <span className={cs.competitor === "Premier Party Cruises" ? "text-blue-400 font-semibold" : "text-zinc-300"}>
                        {cs.competitor}
                      </span>
                      {cs.competitor === "Premier Party Cruises" && (
                        <span className="ml-1.5 text-[10px] bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded">YOU</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-medium">{cs.share_of_voice ? `${cs.share_of_voice}%` : "—"}</td>
                    <td className="py-2.5 pr-4">
                      <span className={cs.sov_trend === "up" ? "text-green-400" : cs.sov_trend === "down" ? "text-red-400" : "text-zinc-500"}>
                        {cs.sov_trend === "up" ? "↑" : cs.sov_trend === "down" ? "↓" : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={
                        (cs.favorable_sentiment || 0) >= 70 ? "text-green-400 font-medium" :
                        (cs.favorable_sentiment || 0) >= 40 ? "text-amber-400" :
                        "text-red-400"
                      }>
                        {cs.favorable_sentiment ? `${cs.favorable_sentiment}%` : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={cs.sentiment_trend === "up" ? "text-green-400" : cs.sentiment_trend === "down" ? "text-red-400" : "text-zinc-500"}>
                        {cs.sentiment_trend === "up" ? "↑" : cs.sentiment_trend === "down" ? "↓" : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-zinc-500 max-w-xs">{cs.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating action bar for batch fixing */}
      {totalSelected > 0 && onFixNow && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-blue-600 border border-blue-400 rounded-xl shadow-2xl shadow-blue-900/50 px-6 py-3 flex items-center gap-4" role="toolbar" aria-label={`${totalSelected} items selected for fixing`}>
          <span className="text-white text-sm font-medium">
            {totalSelected} item{totalSelected > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={handleFixSelected}
            className="bg-white text-blue-700 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Fix Selected in Command Center
          </button>
          <button
            onClick={() => { setSelectedInsights(new Set()); setSelectedStrategies(new Set()); }}
            className="text-blue-200 hover:text-white text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function CompetitorsTab({
  competitors,
  metrics,
}: {
  competitors: Competitor[];
  metrics: SiteMetrics | null;
}) {
  if (competitors.length === 0) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-8 text-center text-zinc-500">
        No competitor data yet.
      </div>
    );
  }

  const yourTraffic = metrics?.organic_traffic || 0;

  return (
    <div className="space-y-4">
      <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-4 text-sm text-amber-200">
        <strong>Competitive Landscape</strong> — These are domains ranking for the same keywords as you.
        Higher relevance = more keyword overlap. Look at traffic gap (their traffic vs. yours) to identify
        where you&apos;re falling behind.
      </div>

      <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden max-h-[70vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-[#0a0a0a] shadow-[0_1px_0_#262626]">
            <tr className="text-left text-zinc-400 border-b border-[#262626] bg-[#0a0a0a]">
              <th className="p-3 bg-[#0a0a0a]">Competitor</th>
              <th className="p-3 bg-[#0a0a0a]">Relevance</th>
              <th className="p-3 bg-[#0a0a0a]">Common KWs</th>
              <th className="p-3 bg-[#0a0a0a]">Organic KWs</th>
              <th className="p-3 bg-[#0a0a0a]">Traffic/mo</th>
              <th className="p-3 bg-[#0a0a0a]">vs. You</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {competitors.map((c) => {
              const gap = yourTraffic > 0 ? ((c.organic_traffic || 0) / yourTraffic) : 0;
              return (
                <tr key={c.id} className="hover:bg-[#1a1a1a]">
                  <td className="p-3 font-mono">{c.domain}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${(c.relevance || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400">
                        {((c.relevance || 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-zinc-300">{c.common_keywords || 0}</td>
                  <td className="p-3 text-zinc-300">
                    {(c.organic_keywords || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-zinc-300">
                    {(c.organic_traffic || 0).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        gap > 1
                          ? "text-red-400 font-bold"
                          : gap > 0.5
                            ? "text-amber-400"
                            : "text-green-400"
                      }
                    >
                      {gap > 0 ? `${gap.toFixed(1)}x` : "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

