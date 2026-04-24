"use client";

// Single dashboard component for Google Ads + Meta Ads. The only thing that
// differs between platforms is the API endpoint + a handful of labels, so one
// component handles both — called twice from AdLoopPane (one per sub-tab).

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdLoopResponse, AdPlatform, Campaign, AdMetrics } from "@/lib/ads/types";

const PLATFORM_LABEL: Record<AdPlatform, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
};

function fmtMoney(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtDecimal(n: number, digits = 2): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

export default function AdDashboard({ platform }: { platform: AdPlatform }) {
  const [data, setData] = useState<AdLoopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "ENABLED" | "PAUSED">("all");
  const [sortKey, setSortKey] = useState<keyof AdMetrics>("cost");
  const [pendingAction, setPendingAction] = useState<{
    campaign: Campaign;
    action: "pause" | "enable";
    preview?: string;
  } | null>(null);
  const [actionRunning, setActionRunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ads/${platform}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as AdLoopResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredCampaigns = useMemo(() => {
    if (!data) return [];
    let rows = data.campaigns.slice();
    if (statusFilter !== "all") rows = rows.filter((c) => c.status === statusFilter);
    rows.sort((a, b) => (b.metrics[sortKey] as number) - (a.metrics[sortKey] as number));
    return rows;
  }, [data, statusFilter, sortKey]);

  async function requestAction(campaign: Campaign, action: "pause" | "enable") {
    setActionError(null);
    setActionRunning(true);
    try {
      const res = await fetch("/api/ads/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          platform,
          campaign_id: campaign.id,
          action,
          dry_run: true,
        }),
      });
      const body = (await res.json()) as { ok: boolean; preview: string; error?: string };
      if (!body.ok && body.error) {
        setActionError(body.error);
      }
      setPendingAction({ campaign, action, preview: body.preview });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setActionRunning(false);
    }
  }

  async function confirmAction() {
    if (!pendingAction) return;
    setActionRunning(true);
    setActionError(null);
    try {
      const res = await fetch("/api/ads/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          platform,
          campaign_id: pendingAction.campaign.id,
          action: pendingAction.action,
          dry_run: false,
        }),
      });
      const body = (await res.json()) as { ok: boolean; applied?: boolean; error?: string };
      if (!body.ok || !body.applied) {
        setActionError(body.error || "Apply failed");
        return;
      }
      setPendingAction(null);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setActionRunning(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-zinc-500">
        Loading {PLATFORM_LABEL[platform]}…
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-sm text-red-300">
        Failed to load {PLATFORM_LABEL[platform]}: {error}
        <button onClick={load} className="ml-3 underline hover:text-red-200">
          Retry
        </button>
      </div>
    );
  }
  if (!data) return null;

  const { summary, campaigns } = data;
  const enabledCount = campaigns.filter((c) => c.status === "ENABLED").length;
  const pausedCount = campaigns.filter((c) => c.status === "PAUSED").length;

  return (
    <div className="space-y-6">
      {/* Connection banner */}
      {!summary.connected && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-sm text-amber-200">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="text-lg">⚙️</span>
            <div className="flex-1 space-y-1.5">
              <div className="font-semibold">
                {PLATFORM_LABEL[platform]} is not connected — showing sample data
              </div>
              <div className="text-xs text-amber-300/90">{summary.setup_hint}</div>
              <div className="text-xs text-amber-300/70 pt-1">
                Scroll down to the <span className="font-semibold">Getting started</span> section
                for setup instructions.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Spend · 30d" value={fmtMoney(summary.totals.cost)} />
        <Kpi label="Impressions" value={fmtInt(summary.totals.impressions)} />
        <Kpi label="Clicks" value={fmtInt(summary.totals.clicks)} />
        <Kpi label="CTR" value={fmtPct(summary.totals.ctr)} />
        <Kpi
          label="Conversions"
          value={fmtInt(summary.totals.conversions)}
          sub={summary.totals.cpa > 0 ? `CPA ${fmtMoney(summary.totals.cpa)}` : undefined}
        />
        <Kpi
          label="ROAS"
          value={summary.totals.roas > 0 ? `${fmtDecimal(summary.totals.roas, 2)}x` : "—"}
          sub={summary.totals.conversion_value > 0 ? fmtMoney(summary.totals.conversion_value) : undefined}
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500">Status</span>
          {(["all", "ENABLED", "PAUSED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded border text-xs transition-colors ${
                statusFilter === s
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-200"
                  : "bg-[#141414] border-[#262626] text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {s === "all" ? `All (${campaigns.length})` : s === "ENABLED" ? `Enabled (${enabledCount})` : `Paused (${pausedCount})`}
            </button>
          ))}
          <span className="text-zinc-600 mx-1">·</span>
          <span className="text-zinc-500">Sort by</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as keyof AdMetrics)}
            className="bg-[#141414] border border-[#262626] rounded px-2 py-1 text-white"
          >
            <option value="cost">Spend</option>
            <option value="conversions">Conversions</option>
            <option value="clicks">Clicks</option>
            <option value="impressions">Impressions</option>
            <option value="ctr">CTR</option>
            <option value="roas">ROAS</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {summary.date_range.start} → {summary.date_range.end}
          <button
            onClick={load}
            className="ml-2 px-2.5 py-1 rounded bg-[#141414] border border-[#262626] text-zinc-300 hover:border-zinc-500"
          >
            ⟳ Refresh
          </button>
        </div>
      </div>

      {/* Campaign table */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#0f0f0f] border-b border-[#262626]">
              <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3 font-semibold">Campaign</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 font-semibold text-right">Spend</th>
                <th className="px-3 py-3 font-semibold text-right">Clicks</th>
                <th className="px-3 py-3 font-semibold text-right">CTR</th>
                <th className="px-3 py-3 font-semibold text-right">CPC</th>
                <th className="px-3 py-3 font-semibold text-right">Conv.</th>
                <th className="px-3 py-3 font-semibold text-right">CPA</th>
                <th className="px-3 py-3 font-semibold text-right">ROAS</th>
                <th className="px-3 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {filteredCampaigns.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">
                    No campaigns match.
                  </td>
                </tr>
              )}
              {filteredCampaigns.map((c) => {
                const m = c.metrics;
                const isEnabled = c.status === "ENABLED";
                return (
                  <tr key={c.id} className="hover:bg-[#181818] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-zinc-100 font-medium">{c.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {c.channel.replace(/^META_/, "").replace(/_/g, " ")}
                        {c.daily_budget ? ` · ${fmtMoney(c.daily_budget)}/day` : ""}
                        {c.bidding_strategy ? ` · ${c.bidding_strategy}` : ""}
                        {c.objective ? ` · ${c.objective.replace("OUTCOME_", "")}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                          isEnabled
                            ? "bg-green-500/15 text-green-300 border border-green-500/30"
                            : c.status === "PAUSED"
                              ? "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30"
                              : "bg-red-500/15 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-zinc-100 tabular-nums">{fmtMoney(m.cost)}</td>
                    <td className="px-3 py-3 text-right text-zinc-300 tabular-nums">{fmtInt(m.clicks)}</td>
                    <td className="px-3 py-3 text-right text-zinc-300 tabular-nums">{fmtPct(m.ctr)}</td>
                    <td className="px-3 py-3 text-right text-zinc-300 tabular-nums">${fmtDecimal(m.cpc, 2)}</td>
                    <td className="px-3 py-3 text-right text-zinc-100 tabular-nums">{fmtInt(m.conversions)}</td>
                    <td className="px-3 py-3 text-right text-zinc-300 tabular-nums">
                      {m.cpa > 0 ? fmtMoney(m.cpa) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span
                        className={
                          m.roas >= 4
                            ? "text-green-300"
                            : m.roas >= 2
                              ? "text-amber-300"
                              : m.roas > 0
                                ? "text-red-300"
                                : "text-zinc-500"
                        }
                      >
                        {m.roas > 0 ? `${fmtDecimal(m.roas, 2)}x` : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => requestAction(c, isEnabled ? "pause" : "enable")}
                        disabled={actionRunning}
                        className={`text-xs px-2.5 py-1 rounded border transition-colors disabled:opacity-50 ${
                          isEnabled
                            ? "border-zinc-600 text-zinc-300 hover:border-amber-500/60 hover:text-amber-200"
                            : "border-green-500/40 text-green-300 hover:border-green-400 hover:text-green-200"
                        }`}
                      >
                        {isEnabled ? "Pause" : "Enable"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm modal — AdLoop's preview-then-confirm safety model */}
      {pendingAction && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-5 max-w-md w-full">
            <div className="text-xs uppercase tracking-widest text-blue-400 mb-2">
              Step 2 of 2 · Confirm
            </div>
            <h3 className="text-lg font-semibold text-white">
              {pendingAction.action === "pause" ? "Pause campaign?" : "Enable campaign?"}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">{pendingAction.campaign.name}</p>
            {pendingAction.preview && (
              <pre className="mt-3 bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-xs text-green-300 whitespace-pre-wrap">
                {pendingAction.preview}
              </pre>
            )}
            {actionError && (
              <div className="mt-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
                {actionError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setPendingAction(null);
                  setActionError(null);
                }}
                className="text-xs px-3 py-2 rounded bg-[#0a0a0a] border border-[#262626] text-zinc-300 hover:border-zinc-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={actionRunning || !summary.connected}
                className="text-xs px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                title={!summary.connected ? "Connect the API first" : undefined}
              >
                {actionRunning ? "Applying…" : summary.connected ? "Confirm & apply" : "Connect API first"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="text-lg font-semibold text-white mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">{sub}</div>}
    </div>
  );
}
