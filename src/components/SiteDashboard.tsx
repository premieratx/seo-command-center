"use client";

import { useState } from "react";
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
} from "@/lib/types";

type Tab =
  | "overview"
  | "issues"
  | "ai_visibility"
  | "keywords"
  | "competitors"
  | "pages"
  | "cannibalization"
  | "command"
  | "preview"
  | "methodology";

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
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    { id: "issues", label: "Issues", count: issues.length },
    { id: "ai_visibility", label: "AI Visibility", count: aiShareOfVoice.filter((s) => s.platform === "all").length },
    { id: "keywords", label: "Keywords", count: keywords.length },
    { id: "competitors", label: "Competitors", count: competitors.length },
    { id: "pages", label: "Pages", count: pages.length },
    { id: "cannibalization", label: "Cannibalization", count: cannibalization.length },
    { id: "preview", label: "Preview" },
    { id: "command", label: "Command Center" },
    { id: "methodology" as Tab, label: "Methodology" },
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
            <button
              onClick={refreshSemrush}
              disabled={loading !== null}
              className="bg-[#141414] border border-[#262626] hover:border-[#404040] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading === "semrush" ? "Refreshing..." : "Refresh SEMRush"}
            </button>
            <button
              onClick={runAudit}
              disabled={loading !== null}
              className="bg-[#141414] border border-[#262626] hover:border-[#404040] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading === "audit" ? "Running..." : "Run New Audit"}
            </button>
            <Link
              href={`/profiles/${site.profile_id}/sites/${site.id}/fix-session/new`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Start Fix Session
            </Link>
          </div>
        </div>
        {notice && (
          <div className="mt-4 bg-blue-900/20 border border-blue-800/50 rounded-lg px-4 py-3 text-sm text-blue-200">
            {notice}
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#262626] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
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
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab audit={audit} issues={issues} pages={pages} metrics={metrics} />
      )}
      {activeTab === "issues" && <IssuesTab issues={issues} />}
      {activeTab === "ai_visibility" && (
        <AIVisibilityTab aiShareOfVoice={aiShareOfVoice} aiInsights={aiInsights} />
      )}
      {activeTab === "keywords" && <KeywordsTab keywords={keywords} />}
      {activeTab === "competitors" && <CompetitorsTab competitors={competitors} metrics={metrics} />}
      {activeTab === "pages" && <PagesTab pages={pages} />}
      {activeTab === "cannibalization" && (
        <CannibalizationTab cannibalization={cannibalization} />
      )}
      {activeTab === "preview" && <PreviewTab site={site} />}
      {activeTab === "command" && <CommandTab issues={issues} pages={pages} />}
      {activeTab === "methodology" && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Methodology & Best Practices</h3>
          <p className="text-sm text-zinc-400 mb-4">
            How we collect data, analyze it, and make optimization decisions. Covers SEMRush measurement
            science, our impact scoring algorithm, SEO best practices, AI visibility optimization, and
            Wes McDowell&apos;s web design principles.
          </p>
          <Link
            href="/methodology"
            target="_blank"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Open Full Methodology Guide →
          </Link>
        </div>
      )}
    </div>
  );
}

function OverviewTab({
  audit,
  issues,
  pages,
  metrics,
}: {
  audit: Audit | null;
  issues: AuditIssue[];
  pages: AuditPage[];
  metrics: SiteMetrics | null;
}) {
  if (!audit) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-12 text-center">
        <div className="text-zinc-500 mb-4">No audit has been run yet for this site.</div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          Run First Audit
        </button>
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
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 flex flex-col items-center">
          <ScoreRing score={audit.overall_score || 0} />
          <p className="text-sm text-zinc-400 mt-2">Overall SEO Score</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <div className="text-3xl font-bold text-red-400">{audit.critical_issues}</div>
          <p className="text-sm text-zinc-400">Critical Issues</p>
          <div className="text-2xl font-bold text-amber-400 mt-2">{audit.high_issues}</div>
          <p className="text-sm text-zinc-400">High Priority</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <div className="text-3xl font-bold text-white">{audit.total_pages || 0}</div>
          <p className="text-sm text-zinc-400">Total Pages</p>
          <div className="mt-2 text-xs text-zinc-500">
            {pages.length} analyzed in detail
          </div>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-400">{issues.length}</div>
          <p className="text-sm text-zinc-400">Total Issues</p>
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
    </div>
  );
}

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
        </div>
      )}
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-[#262626]">
              <th className="pb-2 pr-4">Page</th>
              <th className="pb-2 pr-4">Score</th>
              <th className="pb-2 pr-4">Words</th>
              <th className="pb-2 pr-4">Meta Desc</th>
              <th className="pb-2 pr-4">Canonical</th>
              <th className="pb-2 pr-4">OG Tags</th>
              <th className="pb-2 pr-4">Schema</th>
              <th className="pb-2">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {sorted.map((page) => (
              <tr key={page.id} className="hover:bg-[#141414]">
                <td className="py-3 pr-4">
                  <div className="font-mono text-xs">{page.url}</div>
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

function PreviewTab({ site }: { site: Site }) {
  const [iframeUrl, setIframeUrl] = useState(site.production_url);
  const [urlInput, setUrlInput] = useState(site.production_url);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [iframeKey, setIframeKey] = useState(0);

  const viewportWidths = { desktop: "100%", tablet: "768px", mobile: "375px" };

  function navigateTo(url: string) {
    let target = url;
    if (!target.startsWith("http")) {
      target = `${site.production_url.replace(/\/$/, "")}${target.startsWith("/") ? "" : "/"}${target}`;
    }
    setIframeUrl(target);
    setUrlInput(target);
    setIframeKey((k) => k + 1);
  }

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigateTo(urlInput);
  }

  const quickLinks = [
    { label: "Home", path: "/" },
    { label: "Disco Cruise", path: "/atx-disco-cruise" },
    { label: "Bachelor", path: "/bachelor-party-austin" },
    { label: "Bachelorette", path: "/bachelorette-party-austin" },
    { label: "Private", path: "/private-cruises" },
    { label: "Pricing", path: "/pricing" },
    { label: "Blog", path: "/blogs" },
    { label: "Contact", path: "/contact" },
  ];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-3">
        <div className="flex items-center gap-3 mb-2">
          {/* Back / Forward / Refresh */}
          <div className="flex gap-1">
            <button
              onClick={() => { setIframeUrl(site.production_url); setUrlInput(site.production_url); setIframeKey((k) => k + 1); }}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 text-xs"
              title="Go to homepage"
            >
              Home
            </button>
            <button
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 text-xs"
              title="Reload"
            >
              Reload
            </button>
          </div>

          {/* URL bar */}
          <form onSubmit={handleUrlSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded text-xs"
            >
              Go
            </button>
          </form>

          {/* Viewport toggles */}
          <div className="flex gap-1 border border-[#262626] rounded p-0.5">
            {(["desktop", "tablet", "mobile"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewport(v)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  viewport === v
                    ? "bg-blue-600 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {v === "desktop" ? "Desktop" : v === "tablet" ? "Tablet" : "Mobile"}
              </button>
            ))}
          </div>
        </div>

        {/* Quick navigation links */}
        <div className="flex gap-1.5 flex-wrap">
          {quickLinks.map((link) => (
            <button
              key={link.path}
              onClick={() =>
                navigateTo(`${site.production_url.replace(/\/$/, "")}${link.path}`)
              }
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                iframeUrl.includes(link.path) && (link.path !== "/" || iframeUrl === site.production_url || iframeUrl === site.production_url + "/")
                  ? "bg-blue-900/40 text-blue-300 border border-blue-800/50"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* GitHub repo info */}
      {site.github_repo_owner && site.github_repo_name && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 px-1">
          <span>Repo:</span>
          <a
            href={`https://github.com/${site.github_repo_owner}/${site.github_repo_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-blue-400 hover:text-blue-300"
          >
            {site.github_repo_owner}/{site.github_repo_name}
          </a>
          <span className="text-zinc-600">|</span>
          <span>Branch: {site.github_default_branch || "main"}</span>
          {site.current_working_branch && (
            <>
              <span className="text-zinc-600">|</span>
              <span className="text-amber-400">Working: {site.current_working_branch}</span>
            </>
          )}
        </div>
      )}

      {/* Browser frame */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
        <div className="border-b border-[#262626] px-4 py-2 flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]"></span>
          <span className="ml-3 font-mono truncate flex-1">{iframeUrl}</span>
          <span className="text-zinc-600">
            {viewport === "desktop" ? "1440px" : viewport === "tablet" ? "768px" : "375px"}
          </span>
        </div>
        <div
          className="flex justify-center bg-zinc-900 overflow-auto"
          style={{ minHeight: "700px" }}
        >
          <iframe
            key={iframeKey}
            src={iframeUrl}
            style={{
              width: viewportWidths[viewport],
              maxWidth: "100%",
              height: "700px",
              border: viewport !== "desktop" ? "1px solid #333" : "none",
              borderRadius: viewport !== "desktop" ? "8px" : "0",
              boxShadow:
                viewport !== "desktop"
                  ? "0 0 40px rgba(0,0,0,0.5)"
                  : "none",
            }}
            className="bg-white"
            title="Site preview"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}

function CommandTab({ issues, pages }: { issues: AuditIssue[]; pages: AuditPage[] }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
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
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setTimeout(() => {
      const response = generateResponse(userMsg, issues, pages);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    }, 500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg p-4 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-[#141414] border border-[#262626] text-zinc-300"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t border-[#262626]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question or give an instruction..."
          className="flex-1 bg-[#141414] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MetricBox({
  label,
  value,
  accent = "white",
}: {
  label: string;
  value: string | number;
  accent?: "white" | "green" | "blue" | "amber" | "red";
}) {
  const colors: Record<string, string> = {
    white: "text-white",
    green: "text-green-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  return (
    <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3">
      <div className={`text-xl font-bold ${colors[accent]}`}>{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
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

function KeywordsTab({ keywords }: { keywords: Keyword[] }) {
  const [filter, setFilter] = useState<"all" | "top10" | "quick-wins" | "most-impactful" | "page2" | "easy-wins">("all");
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
        <MetricBox label="Top 3 rankings" value={top3Count} accent="green" />
        <MetricBox label="Top 10 rankings" value={top10Count} accent="blue" />
        <MetricBox label="Quick win opportunities" value={quickWinsCount} accent="amber" />
        <MetricBox label="Total search volume" value={totalVolume.toLocaleString()} accent="white" />
      </div>

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
            onClick={() => setFilter(f.id as "all" | "top10" | "quick-wins" | "most-impactful" | "page2" | "easy-wins")}
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-[#262626] bg-[#0a0a0a]">
                <th className="p-3">Keyword</th>
                <th className="p-3">Position</th>
                <th className="p-3">Volume</th>
                <th className="p-3">KD</th>
                <th className="p-3">Impact</th>
                <th className="p-3">CPC</th>
                <th className="p-3">Traffic %</th>
                <th className="p-3">URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filtered.slice(0, 100).map((k) => {
                const impact = calculateImpactScore(k);
                const kd = k.keyword_difficulty;
                return (
                <tr key={k.id} className="hover:bg-[#1a1a1a]">
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
  aiShareOfVoice,
  aiInsights,
}: {
  aiShareOfVoice: AIShareOfVoice[];
  aiInsights: AIInsight[];
}) {
  const [platform, setPlatform] = useState<string>("all");
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

  return (
    <div className="space-y-4">
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

      {/* AI Strategy Insights */}
      {aiInsights.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-1">AI Strategy Recommendations</h3>
          <p className="text-xs text-zinc-500 mb-4">From SEMRush AI analysis — actionable steps to increase your AI Share of Voice</p>
          <div className="space-y-3">
            {aiInsights.map((insight) => (
              <div
                key={insight.id}
                className="flex gap-4 bg-[#0a0a0a] border border-[#262626] rounded-lg p-4"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-900/40 text-blue-400 flex items-center justify-center text-sm font-bold">
                  {insight.rank_order}
                </div>
                <div>
                  <div className="font-semibold text-white">{insight.title}</div>
                  <div className="text-sm text-zinc-400 mt-1">{insight.description}</div>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      insight.status === "done" ? "bg-green-900/40 text-green-300" :
                      insight.status === "in_progress" ? "bg-blue-900/40 text-blue-300" :
                      "bg-zinc-800 text-zinc-400"
                    }`}>
                      {insight.status === "done" ? "Done" : insight.status === "in_progress" ? "In Progress" : "To Do"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

      <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-[#262626] bg-[#0a0a0a]">
              <th className="p-3">Competitor</th>
              <th className="p-3">Relevance</th>
              <th className="p-3">Common KWs</th>
              <th className="p-3">Organic KWs</th>
              <th className="p-3">Traffic/mo</th>
              <th className="p-3">vs. You</th>
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

function generateResponse(query: string, issues: AuditIssue[], pages: AuditPage[]): string {
  const q = query.toLowerCase();
  if (q.includes("worst") && q.includes("score")) {
    const worst = [...pages].sort((a, b) => (a.score || 0) - (b.score || 0)).slice(0, 5);
    return `The 5 pages with the lowest SEO scores:\n\n${worst
      .map((p, i) => `${i + 1}. ${p.url} \u2014 Score: ${p.score}/100 (${p.word_count} words)`)
      .join("\n")}`;
  }
  if (q.includes("fix first") || q.includes("priority")) {
    const critical = issues.filter((i) => i.severity === "critical");
    return `${critical.length} critical issues to fix first:\n\n${critical
      .map((i) => `\u2022 ${i.title}`)
      .join("\n")}`;
  }
  return `I have ${issues.length} issues and ${pages.length} pages loaded. Try: "What should I fix first?", "What are the worst scoring pages?", or "Generate meta descriptions for service pages".`;
}
