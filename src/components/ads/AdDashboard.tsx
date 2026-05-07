"use client";

// Single dashboard component for Google Ads + Meta Ads. The only thing that
// differs between platforms is the API endpoint + a handful of labels, so one
// component handles both — called twice from AdLoopPane (one per sub-tab).
//
// Features:
//   - Summary KPIs + status filter + sort + manual refresh
//   - Per-campaign rows with inline expand → drill-down (ad groups, search
//     terms, creatives) via /api/ads/drilldown
//   - Multi-select checkboxes + floating bulk action bar (pause / enable many
//     campaigns behind a single confirm)
//   - Two-step preview-and-confirm modal for every mutation
//   - AI Insights panel (Claude analyzes the 30-day snapshot)

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdLoopResponse, AdPlatform, Campaign, AdMetrics } from "@/lib/ads/types";
import AdInsights from "./AdInsights";
import AdDrilldown from "./AdDrilldown";

const PLATFORM_LABEL: Record<AdPlatform, string> = {
  google: "Google Ads",
  meta: "Meta Ads",
};

function fmtMoney(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtDecimal(n: number, digits = 2): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}
function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

interface PendingAction {
  // Single-row action (existing flow)
  campaign?: Campaign;
  // Bulk action (new flow)
  campaigns?: Campaign[];
  action: "pause" | "enable";
  preview?: string;
}

export default function AdDashboard({ platform }: { platform: AdPlatform }) {
  const [data, setData] = useState<AdLoopResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "ENABLED" | "PAUSED">("all");
  const [sortKey, setSortKey] = useState<keyof AdMetrics>("cost");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionRunning, setActionRunning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  // Reset selection + expansion when platform changes (Google ⇄ Meta).
  useEffect(() => {
    setSelected(new Set());
    setExpandedId(null);
  }, [platform]);

  const filteredCampaigns = useMemo(() => {
    if (!data) return [];
    let rows = data.campaigns.slice();
    if (statusFilter !== "all") rows = rows.filter((c) => c.status === statusFilter);
    rows.sort((a, b) => (b.metrics[sortKey] as number) - (a.metrics[sortKey] as number));
    return rows;
  }, [data, statusFilter, sortKey]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      if (prev.size === filteredCampaigns.length) return new Set();
      return new Set(filteredCampaigns.map((c) => c.id));
    });
  }

  async function requestAction(args: { campaign?: Campaign; campaigns?: Campaign[]; action: "pause" | "enable" }) {
    setActionError(null);
    setActionRunning(true);
    try {
      // Preview path differs slightly. For a single campaign we hit the
      // existing /api/ads/action endpoint with dry_run; for bulk we just
      // synthesise the preview locally — each individual confirm goes
      // through the action endpoint when applied.
      if (args.campaign) {
        const res = await fetch("/api/ads/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            platform,
            campaign_id: args.campaign.id,
            action: args.action,
            dry_run: true,
          }),
        });
        const body = (await res.json()) as { ok: boolean; preview: string; error?: string };
        if (!body.ok && body.error) setActionError(body.error);
        setPendingAction({ campaign: args.campaign, action: args.action, preview: body.preview });
      } else if (args.campaigns) {
        const target = args.action === "pause" ? "PAUSED" : "ENABLED";
        const lines = args.campaigns.map((c) => `${platform === "google" ? "Google" : "Meta"} · ${c.name} → ${target}`);
        setPendingAction({
          campaigns: args.campaigns,
          action: args.action,
          preview: lines.join("\n"),
        });
      }
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
      const targets = pendingAction.campaigns ?? (pendingAction.campaign ? [pendingAction.campaign] : []);
      const results: { id: string; ok: boolean; error?: string }[] = [];
      for (const c of targets) {
        const res = await fetch("/api/ads/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            platform,
            campaign_id: c.id,
            action: pendingAction.action,
            dry_run: false,
          }),
        });
        const body = (await res.json()) as { ok: boolean; applied?: boolean; error?: string };
        results.push({ id: c.id, ok: Boolean(body.ok && body.applied), error: body.error });
      }
      const failures = results.filter((r) => !r.ok);
      if (failures.length > 0) {
        setActionError(
          `${failures.length} of ${results.length} failed: ${failures
            .map((f) => f.error || "unknown")
            .slice(0, 2)
            .join("; ")}`,
        );
        return;
      }
      setPendingAction(null);
      setSelected(new Set());
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
  const allChecked =
    filteredCampaigns.length > 0 && selected.size === filteredCampaigns.length;
  const someChecked = selected.size > 0;
  const selectedCampaigns = filteredCampaigns.filter((c) => selected.has(c.id));
  const selectedSpend = selectedCampaigns.reduce((s, c) => s + c.metrics.cost, 0);
  const selectedAllEnabled = selectedCampaigns.length > 0 && selectedCampaigns.every((c) => c.status === "ENABLED");
  const selectedAllPaused = selectedCampaigns.length > 0 && selectedCampaigns.every((c) => c.status === "PAUSED");

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
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <a
                  href="#ad-loop-setup"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("ad-loop-setup")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="text-xs px-3 py-1.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-100 hover:bg-amber-500/25"
                >
                  📘 Show setup instructions
                </a>
                <a
                  href="https://github.com/kLOsk/adloop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 rounded border border-amber-500/30 text-amber-200/80 hover:text-amber-100 hover:border-amber-500/50"
                >
                  AdLoop repo ↗
                </a>
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
          sub={
            summary.totals.conversion_value > 0 ? fmtMoney(summary.totals.conversion_value) : undefined
          }
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
                  : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {s === "all"
                ? `All (${campaigns.length})`
                : s === "ENABLED"
                  ? `Enabled (${enabledCount})`
                  : `Paused (${pausedCount})`}
            </button>
          ))}
          <span className="text-zinc-400 mx-1">·</span>
          <span className="text-zinc-500">Sort by</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as keyof AdMetrics)}
            className="bg-white border border-zinc-200 rounded px-2 py-1 text-zinc-900"
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
            className="ml-2 px-2.5 py-1 rounded bg-white border border-zinc-200 text-zinc-300 hover:border-zinc-500"
          >
            ⟳ Refresh
          </button>
        </div>
      </div>

      {/* Campaign table */}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 border-b border-zinc-200">
              <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-3 font-semibold w-8">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked && !allChecked;
                    }}
                    onChange={toggleAll}
                    className="accent-blue-500"
                  />
                </th>
                <th className="px-3 py-3 font-semibold w-6"></th>
                <th className="px-3 py-3 font-semibold">Campaign</th>
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
            <tbody className="divide-y divide-zinc-100">
              {filteredCampaigns.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-zinc-500">
                    No campaigns match.
                  </td>
                </tr>
              )}
              {filteredCampaigns.map((c) => {
                const m = c.metrics;
                const isEnabled = c.status === "ENABLED";
                const isExpanded = expandedId === c.id;
                const isSelected = selected.has(c.id);
                return (
                  <RowFragment key={c.id}>
                    <tr
                      className={`hover:bg-zinc-50 transition-colors ${
                        isSelected ? "bg-blue-500/5" : ""
                      }`}
                    >
                      <td className="px-3 py-3 align-top">
                        <input
                          type="checkbox"
                          aria-label={`Select ${c.name}`}
                          checked={isSelected}
                          onChange={() => toggleRow(c.id)}
                          className="accent-blue-500"
                        />
                      </td>
                      <td className="px-3 py-3 align-top">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                          aria-expanded={isExpanded}
                          className="w-5 h-5 inline-flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-400"
                        >
                          <span aria-hidden="true">{isExpanded ? "▾" : "▸"}</span>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.id)}
                          className="text-left"
                        >
                          <div className="text-zinc-100 font-medium hover:text-zinc-900">{c.name}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {c.channel.replace(/^META_/, "").replace(/_/g, " ")}
                            {c.daily_budget ? ` · ${fmtMoney(c.daily_budget)}/day` : ""}
                            {c.bidding_strategy ? ` · ${c.bidding_strategy}` : ""}
                            {c.objective ? ` · ${c.objective.replace("OUTCOME_", "")}` : ""}
                          </div>
                        </button>
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
                      <td className="px-3 py-3 text-right text-zinc-100 tabular-nums">
                        {fmtMoney(m.cost)}
                      </td>
                      <td className="px-3 py-3 text-right text-zinc-300 tabular-nums">
                        {fmtInt(m.clicks)}
                      </td>
                      <td className="px-3 py-3 text-right text-zinc-300 tabular-nums">
                        {fmtPct(m.ctr)}
                      </td>
                      <td className="px-3 py-3 text-right text-zinc-300 tabular-nums">
                        ${fmtDecimal(m.cpc, 2)}
                      </td>
                      <td className="px-3 py-3 text-right text-zinc-100 tabular-nums">
                        {fmtInt(m.conversions)}
                      </td>
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
                          onClick={() =>
                            requestAction({ campaign: c, action: isEnabled ? "pause" : "enable" })
                          }
                          disabled={actionRunning}
                          className={`text-xs px-2.5 py-1 rounded border transition-colors disabled:opacity-50 ${
                            isEnabled
                              ? "border-zinc-300 text-zinc-300 hover:border-amber-500/60 hover:text-amber-200"
                              : "border-green-500/40 text-green-300 hover:border-green-400 hover:text-green-200"
                          }`}
                        >
                          {isEnabled ? "Pause" : "Enable"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={12} className="p-0">
                          <AdDrilldown platform={platform} campaignId={c.id} />
                        </td>
                      </tr>
                    )}
                  </RowFragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk action floating bar */}
      {someChecked && (
        <div
          className="sticky bottom-4 z-20 mx-auto max-w-3xl bg-white border border-blue-500/40 rounded-lg shadow-2xl shadow-blue-500/10 px-4 py-3 flex items-center justify-between gap-3"
          role="region"
          aria-label="Bulk actions"
        >
          <div className="text-sm">
            <span className="text-zinc-900 font-semibold">
              {selected.size} selected
            </span>
            <span className="text-zinc-500 ml-2">
              · {fmtMoney(selectedSpend)} combined 30-day spend
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs px-3 py-2 rounded bg-zinc-50 border border-zinc-200 text-zinc-300 hover:border-zinc-500"
            >
              Clear
            </button>
            <button
              disabled={!selectedAllPaused || actionRunning}
              onClick={() =>
                requestAction({ campaigns: selectedCampaigns, action: "enable" })
              }
              className="text-xs px-3 py-2 rounded border border-green-500/40 text-green-300 hover:border-green-400 hover:text-green-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title={selectedAllPaused ? "Enable all selected" : "Mixed statuses — enable only when all selected are paused"}
            >
              Enable {selected.size}
            </button>
            <button
              disabled={!selectedAllEnabled || actionRunning}
              onClick={() =>
                requestAction({ campaigns: selectedCampaigns, action: "pause" })
              }
              className="text-xs px-3 py-2 rounded border border-amber-500/40 text-amber-200 hover:border-amber-400 disabled:opacity-30 disabled:cursor-not-allowed"
              title={selectedAllEnabled ? "Pause all selected" : "Mixed statuses — pause only when all selected are enabled"}
            >
              Pause {selected.size}
            </button>
          </div>
        </div>
      )}

      {/* AI Insights — Claude analyzes the 30-day snapshot */}
      <AdInsights platform={platform} campaigns={campaigns} totals={summary.totals} />

      {/* Confirm modal — handles both single + bulk */}
      {pendingAction && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-zinc-200 rounded-lg p-5 max-w-lg w-full">
            <div className="text-xs uppercase tracking-widest text-blue-400 mb-2">
              Step 2 of 2 · Confirm
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">
              {pendingAction.action === "pause" ? "Pause" : "Enable"}{" "}
              {pendingAction.campaigns
                ? `${pendingAction.campaigns.length} campaigns?`
                : "campaign?"}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              {pendingAction.campaign?.name ||
                (pendingAction.campaigns &&
                  `Across ${PLATFORM_LABEL[platform]} — ${pendingAction.campaigns.length} mutations will be applied sequentially.`)}
            </p>
            {pendingAction.preview && (
              <pre className="mt-3 bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-xs text-green-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
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
                className="text-xs px-3 py-2 rounded bg-zinc-50 border border-zinc-200 text-zinc-300 hover:border-zinc-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={actionRunning || !summary.connected}
                className="text-xs px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                title={!summary.connected ? "Connect the API first" : undefined}
              >
                {actionRunning
                  ? "Applying…"
                  : summary.connected
                    ? "Confirm & apply"
                    : "Connect API first"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small helper so we can return two <tr>s per campaign without React keying
// warnings — fragments don't accept refs, but they do accept keys via the
// long form, which we use one level up.
function RowFragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="text-lg font-semibold text-zinc-900 mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">{sub}</div>}
    </div>
  );
}
