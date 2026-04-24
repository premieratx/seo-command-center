"use client";

// Combined Google + Meta overview. One KPI strip, one 30-day spend chart,
// one cross-platform top-campaigns leaderboard.
//
// We lean on the project's existing `recharts` dependency (used elsewhere
// for SOV charts) so we don't add a new chart library just for this tab.

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdMetrics, Campaign } from "@/lib/ads/types";
import type { DayPoint } from "@/lib/ads/timeseries";

interface OverviewResponse {
  totals: { combined: AdMetrics; google: AdMetrics; meta: AdMetrics };
  connected: { google: boolean; meta: boolean };
  counts: {
    google_total: number;
    google_enabled: number;
    meta_total: number;
    meta_enabled: number;
  };
  top_campaigns: Campaign[];
  series: DayPoint[];
  date_range: { start: string; end: string };
}

const fmtMoney = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtInt = (n: number) => Math.round(n).toLocaleString();
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtX = (n: number) => (n > 0 ? `${n.toFixed(2)}x` : "—");

export default function AdOverview({
  onJumpTo,
}: {
  onJumpTo: (platform: "google" | "meta") => void;
}) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ads/overview", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as OverviewResponse;
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
  }, []);

  const chartData = useMemo(
    () =>
      (data?.series || []).map((d) => ({
        date: d.date.slice(5), // MM-DD
        Google: d.google_cost,
        Meta: d.meta_cost,
      })),
    [data],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-zinc-500">
        Loading Ad Loop overview…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-sm text-red-300">
        Failed to load overview: {error || "no data"}
      </div>
    );
  }

  const { totals, connected, counts, top_campaigns, date_range } = data;
  const neitherConnected = !connected.google && !connected.meta;

  return (
    <div className="space-y-6">
      {neitherConnected && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm text-amber-200 flex items-start gap-3">
          <span aria-hidden="true" className="text-lg">⚙️</span>
          <div className="flex-1">
            <div className="font-semibold">Showing sample data</div>
            <div className="text-xs text-amber-300/80 mt-0.5">
              Neither Google nor Meta is connected yet. Open either sub-tab and expand
              &ldquo;Getting started&rdquo; for the 3-step setup.
            </div>
          </div>
        </div>
      )}

      {/* Combined KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Combined Spend · 30d" value={fmtMoney(totals.combined.cost)} accent />
        <Kpi label="Impressions" value={fmtInt(totals.combined.impressions)} />
        <Kpi label="Clicks" value={fmtInt(totals.combined.clicks)} sub={fmtPct(totals.combined.ctr)} />
        <Kpi
          label="Conversions"
          value={fmtInt(totals.combined.conversions)}
          sub={totals.combined.cpa > 0 ? `CPA ${fmtMoney(totals.combined.cpa)}` : undefined}
        />
        <Kpi
          label="Revenue"
          value={fmtMoney(totals.combined.conversion_value)}
          sub={fmtX(totals.combined.roas) + " ROAS"}
        />
        <Kpi
          label="Active campaigns"
          value={`${counts.google_enabled + counts.meta_enabled}`}
          sub={`${counts.google_total + counts.meta_total} total`}
        />
      </div>

      {/* Platform split + date range */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-3">
        <PlatformCard
          title="Google Ads"
          icon="🟢"
          connected={connected.google}
          enabled={counts.google_enabled}
          total={counts.google_total}
          totals={totals.google}
          onOpen={() => onJumpTo("google")}
        />
        <PlatformCard
          title="Meta Ads"
          icon="🔵"
          connected={connected.meta}
          enabled={counts.meta_enabled}
          total={counts.meta_total}
          totals={totals.meta}
          onOpen={() => onJumpTo("meta")}
        />
      </div>

      {/* Spend trend chart */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold text-white">Daily spend · last 30 days</div>
            <div className="text-xs text-zinc-500">
              {date_range.start} → {date_range.end}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-zinc-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" /> Google
            </span>
            <span className="inline-flex items-center gap-1.5 text-zinc-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#a855f7]" /> Meta
            </span>
          </div>
        </div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mSpend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                tickFormatter={(v: number) => `$${Math.round(v)}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid #262626",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number) => fmtMoney(v)}
              />
              <Legend wrapperStyle={{ display: "none" }} />
              <Area
                type="monotone"
                dataKey="Google"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gSpend)"
              />
              <Area
                type="monotone"
                dataKey="Meta"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#mSpend)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top campaigns leaderboard */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#262626] flex items-center justify-between">
          <div className="text-sm font-semibold text-white">Top campaigns by spend · cross-platform</div>
          <div className="text-xs text-zinc-500">Top 8 of {counts.google_total + counts.meta_total}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0f0f0f] border-b border-[#262626] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Campaign</th>
                <th className="px-3 py-3 text-left font-semibold">Platform</th>
                <th className="px-3 py-3 text-right font-semibold">Spend</th>
                <th className="px-3 py-3 text-right font-semibold">Conv.</th>
                <th className="px-3 py-3 text-right font-semibold">CPA</th>
                <th className="px-3 py-3 text-right font-semibold">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {top_campaigns.map((c) => (
                <tr key={`${c.platform}:${c.id}`}>
                  <td className="px-4 py-3 text-zinc-100">{c.name}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => onJumpTo(c.platform)}
                      className="text-xs text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
                    >
                      {c.platform === "google" ? "🟢 Google" : "🔵 Meta"}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right text-zinc-100 tabular-nums">
                    {fmtMoney(c.metrics.cost)}
                  </td>
                  <td className="px-3 py-3 text-right text-zinc-300 tabular-nums">
                    {fmtInt(c.metrics.conversions)}
                  </td>
                  <td className="px-3 py-3 text-right text-zinc-300 tabular-nums">
                    {c.metrics.cpa > 0 ? fmtMoney(c.metrics.cpa) : "—"}
                  </td>
                  <td
                    className={`px-3 py-3 text-right tabular-nums ${
                      c.metrics.roas >= 4
                        ? "text-green-300"
                        : c.metrics.roas >= 2
                          ? "text-amber-300"
                          : c.metrics.roas > 0
                            ? "text-red-300"
                            : "text-zinc-500"
                    }`}
                  >
                    {fmtX(c.metrics.roas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`border rounded-lg p-3 ${
        accent ? "bg-blue-500/10 border-blue-500/40" : "bg-[#141414] border-[#262626]"
      }`}
    >
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="text-lg font-semibold text-white mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">{sub}</div>}
    </div>
  );
}

function PlatformCard({
  title,
  icon,
  connected,
  enabled,
  total,
  totals,
  onOpen,
}: {
  title: string;
  icon: string;
  connected: boolean;
  enabled: number;
  total: number;
  totals: AdMetrics;
  onOpen: () => void;
}) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">{icon}</span>
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="text-xs text-zinc-500">
              {enabled} enabled · {total} total
            </div>
          </div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${
            connected
              ? "bg-green-500/15 text-green-300 border-green-500/30"
              : "bg-amber-500/15 text-amber-300 border-amber-500/30"
          }`}
        >
          {connected ? "Connected" : "Sample"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Mini label="Spend" value={fmtMoney(totals.cost)} />
        <Mini label="Conv." value={fmtInt(totals.conversions)} />
        <Mini label="ROAS" value={fmtX(totals.roas)} />
      </div>
      <button
        onClick={onOpen}
        className="mt-3 w-full text-xs px-3 py-2 rounded bg-[#0a0a0a] border border-[#262626] text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
      >
        Open {title} →
      </button>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-sm text-white font-semibold tabular-nums">{value}</div>
    </div>
  );
}
