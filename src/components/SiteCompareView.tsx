"use client";

/**
 * SiteCompareView — side-by-side audit comparison between two Premier
 * Party Cruises profiles: the production PPC Marketing site
 * (premierpartycruises.com) and the V2 Netlify staging site
 * (premier-party-cruises-v2.netlify.app).
 *
 * What it compares:
 *   • Site metrics — authority, organic keywords, traffic, backlinks, ref domains
 *   • Keyword rankings — per-keyword position delta (marketing vs v2)
 *   • AI visibility — share of voice, sentiment, competitor positioning
 *   • Audit issues — count by severity + category
 *   • Pages — audit page scores + word counts
 *
 * Then an "Analyze & Recommend" button asks Claude to diagnose the gap
 * and produce a prioritized action list specifically for making the V2
 * site beat the production marketing site across the board.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setPendingFix } from "@/components/command-center-context";

type Keyword = {
  id: string;
  site_id: string;
  keyword: string;
  position: number | null;
  search_volume: number | null;
  keyword_difficulty: number | null;
  url: string | null;
  traffic_percent: number | null;
};

type Metrics = {
  authority_score: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  total_backlinks: number | null;
  referring_domains: number | null;
  captured_at: string;
};

type AuditIssue = {
  severity: string;
  category: string;
  title: string;
};

type AuditPage = {
  url: string;
  score: number | null;
  word_count: number | null;
  title: string | null;
};

type AISov = {
  brand: string;
  share_percent: number | null;
  platform: string | null;
  is_own_brand: boolean | null;
};

type SiteBundle = {
  site: { id: string; name: string; domain: string; production_url: string | null };
  metrics: Metrics | null;
  keywords: Keyword[];
  issues: AuditIssue[];
  pages: AuditPage[];
  sov: AISov[];
};

const supabase = createClient();

const MARKETING_ID = "37292000-d661-4238-8ba4-6a53b71c2d07";
const V2_ID = "b935d9f4-13a1-4071-9ec5-b631f4425f77";

export default function SiteCompareView({ currentSiteId }: { currentSiteId: string }) {
  const [marketing, setMarketing] = useState<SiteBundle | null>(null);
  const [v2, setV2] = useState<SiteBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [analysisErr, setAnalysisErr] = useState<string | null>(null);

  const loadSite = useCallback(async (siteId: string): Promise<SiteBundle> => {
    const [siteR, metricsR, kwR, issuesR, pagesR, sovR] = await Promise.all([
      supabase.from("sites").select("id,name,domain,production_url").eq("id", siteId).single(),
      supabase
        .from("site_metrics")
        .select("*")
        .eq("site_id", siteId)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("keywords").select("*").eq("site_id", siteId).limit(500),
      supabase
        .from("audit_issues")
        .select("severity,category,title")
        .eq("site_id", siteId)
        .limit(500),
      supabase
        .from("audit_pages")
        .select("url,score,word_count,title")
        .eq("site_id", siteId)
        .limit(500),
      supabase.from("ai_share_of_voice").select("brand,share_percent,platform,is_own_brand").eq("site_id", siteId).limit(100),
    ]);

    return {
      site: siteR.data as SiteBundle["site"],
      metrics: (metricsR.data as Metrics) || null,
      keywords: (kwR.data as Keyword[]) || [],
      issues: (issuesR.data as AuditIssue[]) || [],
      pages: (pagesR.data as AuditPage[]) || [],
      sov: (sovR.data as AISov[]) || [],
    };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [m, v] = await Promise.all([loadSite(MARKETING_ID), loadSite(V2_ID)]);
        setMarketing(m);
        setV2(v);
      } catch (e: any) {
        setError(e?.message || "Failed to load compare data");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSite]);

  // Per-keyword delta (where both sites have data for the same keyword)
  const keywordDeltas = useMemo(() => {
    if (!marketing || !v2) return [];
    const mMap = new Map<string, Keyword>();
    for (const k of marketing.keywords) {
      const key = k.keyword.toLowerCase().trim();
      if (!mMap.has(key) || (k.position || 999) < (mMap.get(key)?.position || 999))
        mMap.set(key, k);
    }
    const vMap = new Map<string, Keyword>();
    for (const k of v2.keywords) {
      const key = k.keyword.toLowerCase().trim();
      if (!vMap.has(key) || (k.position || 999) < (vMap.get(key)?.position || 999))
        vMap.set(key, k);
    }
    const allKeys = new Set<string>([...mMap.keys(), ...vMap.keys()]);
    const rows = Array.from(allKeys).map((k) => {
      const mK = mMap.get(k);
      const vK = vMap.get(k);
      const mPos = mK?.position ?? null;
      const vPos = vK?.position ?? null;
      const delta =
        mPos != null && vPos != null ? mPos - vPos : vPos != null ? 100 - vPos : mPos != null ? -(100 - mPos) : 0;
      return {
        keyword: k,
        mPos,
        vPos,
        delta,
        volume: mK?.search_volume ?? vK?.search_volume ?? 0,
        url: vK?.url || mK?.url || null,
      };
    });
    // Sort by biggest gap (marketing strongly beating v2) first — these are
    // the keywords v2 needs to improve to match or beat marketing.
    return rows.sort((a, b) => {
      const aGap =
        a.mPos != null && a.vPos != null ? a.vPos - a.mPos : a.mPos == null ? 999 : 0;
      const bGap =
        b.mPos != null && b.vPos != null ? b.vPos - b.mPos : b.mPos == null ? 999 : 0;
      return bGap - aGap || (b.volume - a.volume);
    });
  }, [marketing, v2]);

  async function runAnalysis() {
    if (!marketing || !v2) return;
    setAnalyzing(true);
    setAnalysisErr(null);
    setAnalysis("");
    try {
      // Build a compact summary of both sites for the agent
      const summary = buildAnalysisPrompt(marketing, v2, keywordDeltas);
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: summary }],
          site_id: currentSiteId,
          agent: "main",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Request failed (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let buffer = "";
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
            if (parsed.text) setAnalysis((a) => a + parsed.text);
          } catch {
            /* skip */
          }
        }
      }
    } catch (e: any) {
      setAnalysisErr(e?.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-zinc-500">
        Loading both sites for comparison…
      </div>
    );
  }

  if (error || !marketing || !v2) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-sm text-red-400">
        {error || "One of the sites has no data yet."}
      </div>
    );
  }

  const v2Winning = keywordDeltas.filter((r) => r.vPos && r.mPos && r.vPos < r.mPos).length;
  const mWinning = keywordDeltas.filter((r) => r.vPos && r.mPos && r.vPos > r.mPos).length;
  const v2Only = keywordDeltas.filter((r) => r.vPos != null && r.mPos == null).length;
  const mOnly = keywordDeltas.filter((r) => r.mPos != null && r.vPos == null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
        <h3 className="text-lg font-semibold text-white mb-1">Site Comparison Bridge</h3>
        <p className="text-xs text-zinc-500">
          Production <code className="text-amber-300">premierpartycruises.com</code> vs. staging{" "}
          <code className="text-blue-300">premier-party-cruises-v2.netlify.app</code>. Goal: make V2
          beat Marketing on every keyword before we switch the canonical over.
        </p>
      </div>

      {/* Metrics side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricsCard
          title={marketing.site.name}
          url={marketing.site.production_url || `https://${marketing.site.domain}`}
          metrics={marketing.metrics}
          keywords={marketing.keywords}
          issues={marketing.issues}
          tone="amber"
        />
        <MetricsCard
          title={v2.site.name}
          url={v2.site.production_url || `https://${v2.site.domain}`}
          metrics={v2.metrics}
          keywords={v2.keywords}
          issues={v2.issues}
          tone="blue"
        />
      </div>

      {/* Keyword battle summary */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
        <h4 className="text-sm font-semibold text-white mb-3">
          Keyword Battle — {keywordDeltas.length.toLocaleString()} keywords total
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-center">
          <Stat value={v2Winning} label="V2 winning" tone="green" />
          <Stat value={mWinning} label="Marketing winning" tone="red" />
          <Stat value={v2Only} label="V2 only" tone="blue" />
          <Stat value={mOnly} label="Marketing only (gaps)" tone="amber" />
        </div>

        {/* Top gap rows */}
        <div className="max-h-[50vh] overflow-y-auto border border-[#262626] rounded">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0a0a0a] z-10">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-500 border-b border-[#262626]">
                <th className="px-3 py-2">Keyword</th>
                <th className="px-3 py-2">Volume</th>
                <th className="px-3 py-2">Marketing</th>
                <th className="px-3 py-2">V2</th>
                <th className="px-3 py-2">Gap</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {keywordDeltas.slice(0, 100).map((row) => {
                const wins =
                  row.vPos != null && row.mPos != null ? row.vPos < row.mPos : false;
                const loses =
                  row.vPos != null && row.mPos != null ? row.vPos > row.mPos : false;
                const missing = row.vPos == null && row.mPos != null;
                const newWin = row.vPos != null && row.mPos == null;
                return (
                  <tr
                    key={row.keyword}
                    className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a]"
                  >
                    <td className="px-3 py-2 text-zinc-200">{row.keyword}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {row.volume ? row.volume.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {row.mPos != null ? (
                        <span className="text-amber-300 font-mono">#{row.mPos}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {row.vPos != null ? (
                        <span className="text-blue-300 font-mono">#{row.vPos}</span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {wins && (
                        <span className="text-green-400 font-mono">▲ {row.mPos! - row.vPos!}</span>
                      )}
                      {loses && (
                        <span className="text-red-400 font-mono">▼ {row.vPos! - row.mPos!}</span>
                      )}
                      {missing && (
                        <span className="text-amber-300 text-[10px] uppercase tracking-widest">
                          V2 missing
                        </span>
                      )}
                      {newWin && (
                        <span className="text-blue-300 text-[10px] uppercase tracking-widest">
                          V2 only
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {(loses || missing) && (
                        <button
                          onClick={() =>
                            setPendingFix(
                              buildKeywordFixPrompt(row, v2.pages, marketing.pages),
                              "compare-bridge",
                            )
                          }
                          className="text-xs px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white"
                          title="Route a targeted fix plan to the Design AI agent"
                        >
                          Close gap →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-white">
              AI-powered comparison + action plan
            </h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Claude Opus 4.5 reads both sites&apos; full data and produces a prioritized plan to
              make V2 outrank Marketing on every keyword before we flip the canonical.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium whitespace-nowrap"
          >
            {analyzing ? "Analyzing…" : analysis ? "Re-run analysis" : "Analyze + recommend"}
          </button>
        </div>
        {analysisErr && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2 mb-3">
            {analysisErr}
          </div>
        )}
        {analysis && (
          <div className="bg-[#0a0a0a] border border-[#262626] rounded p-4 text-sm text-zinc-200 whitespace-pre-wrap max-h-[70vh] overflow-y-auto">
            {analysis}
          </div>
        )}
        {!analysis && !analyzing && (
          <div className="text-xs text-zinc-600 italic">
            Click &quot;Analyze + recommend&quot; to get the full gap-closing plan.
          </div>
        )}
      </div>
    </div>
  );
}

// ── UI helpers ─────────────────────────────────────────────────────────

function MetricsCard({
  title,
  url,
  metrics,
  keywords,
  issues,
  tone,
}: {
  title: string;
  url: string;
  metrics: Metrics | null;
  keywords: Keyword[];
  issues: AuditIssue[];
  tone: "amber" | "blue";
}) {
  const border = tone === "amber" ? "border-amber-500/30" : "border-blue-500/30";
  const label = tone === "amber" ? "text-amber-300" : "text-blue-300";
  const top10 = keywords.filter((k) => (k.position || 999) <= 10).length;
  const top3 = keywords.filter((k) => (k.position || 999) <= 3).length;
  const criticals = issues.filter((i) => i.severity === "critical").length;
  const highs = issues.filter((i) => i.severity === "high").length;

  return (
    <div className={`bg-[#141414] border ${border} rounded-lg p-4`}>
      <div className={`text-[10px] uppercase tracking-widest ${label} mb-1`}>{title}</div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-white font-semibold hover:underline block mb-4 truncate"
      >
        {url}
      </a>
      <div className="grid grid-cols-2 gap-2.5 text-sm">
        <MetricRow label="Authority" value={metrics?.authority_score ?? "—"} />
        <MetricRow label="Organic KW" value={(metrics?.organic_keywords || 0).toLocaleString()} />
        <MetricRow label="Organic traffic" value={(metrics?.organic_traffic || 0).toLocaleString()} />
        <MetricRow label="Backlinks" value={(metrics?.total_backlinks || 0).toLocaleString()} />
        <MetricRow label="Ref domains" value={(metrics?.referring_domains || 0).toLocaleString()} />
        <MetricRow label="Tracked KW" value={keywords.length.toLocaleString()} />
        <MetricRow label="Top 10" value={top10} />
        <MetricRow label="Top 3" value={top3} />
        <MetricRow label="Critical" value={criticals} tone={criticals > 0 ? "red" : undefined} />
        <MetricRow label="High pri" value={highs} tone={highs > 0 ? "amber" : undefined} />
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "red" | "amber";
}) {
  const color =
    tone === "red"
      ? "text-red-400"
      : tone === "amber"
        ? "text-amber-300"
        : "text-zinc-200";
  return (
    <div className="flex justify-between items-baseline border-b border-[#1f1f1f] py-1">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-sm font-mono font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "green" | "red" | "blue" | "amber";
}) {
  const colors = {
    green: "text-green-400 bg-green-500/10 border-green-500/30",
    red: "text-red-400 bg-red-500/10 border-red-500/30",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  };
  return (
    <div className={`rounded border p-3 ${colors[tone]}`}>
      <div className="text-2xl font-bold font-mono">{value}</div>
      <div className="text-[10px] uppercase tracking-widest mt-1 opacity-80">{label}</div>
    </div>
  );
}

// ── Prompt builders ────────────────────────────────────────────────────

function buildKeywordFixPrompt(
  row: { keyword: string; mPos: number | null; vPos: number | null; volume: number; url: string | null },
  v2Pages: AuditPage[],
  mPages: AuditPage[],
): string {
  const v2Page = row.url ? v2Pages.find((p) => p.url?.includes(row.url!)) : null;
  const mPage = row.url ? mPages.find((p) => p.url?.includes(row.url!)) : null;

  return `Close the ranking gap on V2 for the keyword "${row.keyword}".

COMPETITIVE CONTEXT:
- Monthly search volume: ${row.volume.toLocaleString()}
- premierpartycruises.com (Marketing): ${row.mPos != null ? `ranks #${row.mPos}` : "not ranking"}
- premier-party-cruises-v2.netlify.app (V2): ${row.vPos != null ? `ranks #${row.vPos}` : "not indexed / not ranking"}
- Target URL: ${row.url || "(pick the best-matching page on V2)"}
- V2 page status: ${v2Page ? `score ${v2Page.score}/100, ${v2Page.word_count} words, title "${v2Page.title}"` : "not crawled yet"}
- Marketing page status: ${mPage ? `score ${mPage.score}/100, ${mPage.word_count} words` : "not crawled"}

GOAL:
Make the V2 page outrank the Marketing page for this keyword. Use the Lovable quote-app brand voice (Austin local, BYOB friendly, Lake Travis expert). Output:
1. Exact file path in CruiseConcierge repo
2. The full updated content (H1, first 150 words, 3-5 FAQ entries, 3+ internal links)
3. Meta description (120-160 chars with the keyword)
4. Schema markup additions if relevant
5. Specific pre-deploy-seo-check.ts run steps
6. At the bottom: "READY_TO_EXECUTE: yes" if we can proceed, or "READY_TO_EXECUTE: no — <reason>" otherwise.`;
}

function buildAnalysisPrompt(
  m: SiteBundle,
  v: SiteBundle,
  deltas: Array<{ keyword: string; mPos: number | null; vPos: number | null; volume: number }>,
): string {
  const topGaps = deltas
    .filter((d) => d.mPos != null && (d.vPos == null || d.vPos > d.mPos))
    .slice(0, 30);

  return `You are the SEO Command Center Orchestrator. I need a gap-closing plan for the V2 Netlify build of Premier Party Cruises. We intend to make V2 outrank the production Marketing site on every meaningful keyword before switching the canonical over to V2.

== MARKETING SITE (production) ==
Domain: ${m.site.domain}
Authority: ${m.metrics?.authority_score ?? "?"}
Organic keywords: ${(m.metrics?.organic_keywords || 0).toLocaleString()}
Organic traffic: ${(m.metrics?.organic_traffic || 0).toLocaleString()}/mo
Backlinks: ${(m.metrics?.total_backlinks || 0).toLocaleString()}
Ref domains: ${(m.metrics?.referring_domains || 0).toLocaleString()}
Tracked keywords (SEMrush): ${m.keywords.length}
Top-10 count: ${m.keywords.filter((k) => (k.position || 999) <= 10).length}
Top-3 count: ${m.keywords.filter((k) => (k.position || 999) <= 3).length}
Audit issues: ${m.issues.length} (${m.issues.filter((i) => i.severity === "critical").length} critical)

== V2 NETLIFY SITE (staging) ==
Domain: ${v.site.domain}
Authority: ${v.metrics?.authority_score ?? "?"}
Organic keywords: ${(v.metrics?.organic_keywords || 0).toLocaleString()}
Organic traffic: ${(v.metrics?.organic_traffic || 0).toLocaleString()}/mo
Backlinks: ${(v.metrics?.total_backlinks || 0).toLocaleString()}
Ref domains: ${(v.metrics?.referring_domains || 0).toLocaleString()}
Tracked keywords (SEMrush): ${v.keywords.length}
Top-10 count: ${v.keywords.filter((k) => (k.position || 999) <= 10).length}
Top-3 count: ${v.keywords.filter((k) => (k.position || 999) <= 3).length}
Audit issues: ${v.issues.length} (${v.issues.filter((i) => i.severity === "critical").length} critical)

== TOP 30 KEYWORD GAPS (Marketing beats V2 or V2 is missing) ==
${topGaps
  .map(
    (g) =>
      `- "${g.keyword}" (${g.volume.toLocaleString()}/mo) — Marketing #${g.mPos}, V2 ${g.vPos != null ? `#${g.vPos}` : "—"}`,
  )
  .join("\n")}

DELIVERABLE:
Produce a PRIORITIZED 2-4 week plan for V2 to beat Marketing. Format:

## Immediate wins (this week)
[3-5 specific tasks with exact file paths, expected rank lift, and estimated effort]

## Medium-term (next 2 weeks)
[5-10 tasks — content expansion, internal linking, schema, AI-visibility plays]

## Structural gaps (1 month+)
[Backlink strategy, cluster architecture, major content plays]

## One-click execute list
[Numbered list of the top 10 changes that the Implementation Agent can ship directly — each with file path + summary. End with "READY_TO_EXECUTE: yes" if we should proceed now.]

Be specific. Reference actual keyword data. Assume I'll hand each item to a specialist subagent for implementation.`;
}
