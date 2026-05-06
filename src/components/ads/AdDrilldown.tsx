"use client";

// Inline drill-down panel rendered when a campaign row is expanded. Three
// stacked sections: ad groups, search terms (Google) / creatives (Meta).
// Hits /api/ads/drilldown lazily — only loads once per expansion.

import { useEffect, useState } from "react";
import type { AdPlatform } from "@/lib/ads/types";
import type { DrilldownPayload } from "@/lib/ads/drilldown-types";

const fmtMoney = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtInt = (n: number) => Math.round(n).toLocaleString();
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtX = (n: number) => (n > 0 ? `${n.toFixed(2)}x` : "—");

interface Props {
  platform: AdPlatform;
  campaignId: string;
  onAddNegative?: (query: string) => void;
}

export default function AdDrilldown({ platform, campaignId, onAddNegative }: Props) {
  const [data, setData] = useState<DrilldownPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/ads/drilldown?platform=${platform}&campaign_id=${encodeURIComponent(campaignId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as DrilldownPayload;
        if (!cancelled) setData(body);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platform, campaignId]);

  if (loading) {
    return (
      <div className="px-6 py-4 text-xs text-zinc-500 italic animate-pulse">
        Loading ad groups…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="px-6 py-4 text-xs text-red-300">Drill-down failed: {error || "no data"}</div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] border-t border-[#1f1f1f] px-6 py-5 space-y-5">
      {/* Ad groups */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-blue-300 mb-2">Ad groups</div>
        <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead className="text-zinc-500 bg-[#141414]">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Group</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Spend</th>
                <th className="px-3 py-2 text-right font-semibold">Clicks</th>
                <th className="px-3 py-2 text-right font-semibold">CTR</th>
                <th className="px-3 py-2 text-right font-semibold">Conv.</th>
                <th className="px-3 py-2 text-right font-semibold">CPA</th>
                <th className="px-3 py-2 text-right font-semibold">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {data.ad_groups.map((g) => (
                <tr key={g.id}>
                  <td className="px-3 py-2 text-zinc-100">{g.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                        g.status === "ENABLED"
                          ? "bg-green-500/10 text-green-300 border-green-500/30"
                          : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                      }`}
                    >
                      {g.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-100 tabular-nums">
                    {fmtMoney(g.metrics.cost)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                    {fmtInt(g.metrics.clicks)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                    {fmtPct(g.metrics.ctr)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-100 tabular-nums">
                    {fmtInt(g.metrics.conversions)}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                    {g.metrics.cpa > 0 ? fmtMoney(g.metrics.cpa) : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      g.metrics.roas >= 4
                        ? "text-green-300"
                        : g.metrics.roas >= 2
                          ? "text-amber-300"
                          : g.metrics.roas > 0
                            ? "text-red-300"
                            : "text-zinc-500"
                    }`}
                  >
                    {fmtX(g.metrics.roas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Search terms (Google only) */}
      {platform === "google" && data.search_terms.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-blue-300 mb-2">
            Top search terms
            <span className="ml-2 normal-case tracking-normal text-zinc-500">
              · queries that triggered your ads
            </span>
          </div>
          <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="text-zinc-500 bg-[#141414]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Query</th>
                  <th className="px-3 py-2 text-left font-semibold">Matched keyword</th>
                  <th className="px-3 py-2 text-right font-semibold">Spend</th>
                  <th className="px-3 py-2 text-right font-semibold">Clicks</th>
                  <th className="px-3 py-2 text-right font-semibold">Conv.</th>
                  <th className="px-3 py-2 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {data.search_terms.map((t) => (
                  <tr key={t.query} className={t.flagged_negative ? "bg-red-500/5" : ""}>
                    <td className="px-3 py-2">
                      <span className="text-zinc-100 font-mono">{t.query}</span>
                      {t.flagged_negative && (
                        <span className="ml-2 text-[9px] uppercase tracking-wider text-red-300 bg-red-500/10 border border-red-500/30 rounded px-1.5 py-0.5">
                          irrelevant
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-400 italic">
                      {t.matched_keyword || "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                      {fmtMoney(t.metrics.cost)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">
                      {fmtInt(t.metrics.clicks)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-100 tabular-nums">
                      {fmtInt(t.metrics.conversions)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => onAddNegative?.(t.query)}
                        className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-300 hover:border-amber-500/60 hover:text-amber-200"
                        title="Add as negative keyword"
                      >
                        + Negative
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Creatives / Ads */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-blue-300 mb-2">
          {platform === "google" ? "Responsive search ads" : "Creatives"}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {data.creatives.map((c) => (
            <div key={c.id} className="bg-[#0f0f0f] border border-[#1f1f1f] rounded p-3 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    c.status === "ENABLED"
                      ? "bg-green-500/10 text-green-300 border-green-500/30"
                      : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30"
                  }`}
                >
                  {c.status}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {platform === "google" ? "QS" : "Quality"}{" "}
                  <span className={c.quality !== null && c.quality >= 7 ? "text-green-300" : "text-zinc-300"}>
                    {c.quality ?? "—"}
                  </span>
                </span>
              </div>
              <div className="text-zinc-100 font-medium leading-snug mb-1">{c.headline}</div>
              {c.description && (
                <div className="text-zinc-500 text-[11px] mb-2">{c.description}</div>
              )}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 border-t border-[#1f1f1f] pt-2 tabular-nums">
                <span>{fmtMoney(c.metrics.cost)}</span>
                <span>{fmtPct(c.metrics.ctr)} CTR</span>
                <span>{fmtInt(c.metrics.conversions)} conv</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.is_sample_data && (
        <div className="text-[10px] text-zinc-500 italic">
          Sample drill-down — wires to live ad-group + search-term-view queries once
          credentials are connected.
        </div>
      )}
    </div>
  );
}
