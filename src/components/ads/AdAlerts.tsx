"use client";

// Alerts panel rendered on the Overview sub-tab. Reads /api/ads/alerts and
// shows a ranked list of issues with one-click "Pause / Fix" handoffs into
// the platform sub-tabs.

import { useEffect, useState } from "react";
import type { AdAlert, AlertSeverity } from "@/lib/ads/alerts";
import type { AdPlatform } from "@/lib/ads/types";

interface AlertResponse {
  alerts: AdAlert[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    estimated_monthly_savings: number;
    estimated_monthly_upside: number;
  };
}

const fmtMoney = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const SEV_STYLE: Record<AlertSeverity, { bg: string; text: string; border: string; chip: string }> = {
  critical: {
    bg: "bg-red-500/5",
    text: "text-red-200",
    border: "border-red-500/40",
    chip: "bg-red-500/15 text-red-300 border-red-500/30",
  },
  warning: {
    bg: "bg-amber-500/5",
    text: "text-amber-200",
    border: "border-amber-500/30",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  info: {
    bg: "bg-blue-500/5",
    text: "text-blue-200",
    border: "border-blue-500/30",
    chip: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
};

export default function AdAlerts({ onJumpTo }: { onJumpTo: (platform: AdPlatform) => void }) {
  const [data, setData] = useState<AlertResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/ads/alerts", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!cancelled) setData((await res.json()) as AlertResponse);
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

  if (loading) {
    return (
      <div className="bg-white border border-zinc-200 rounded-lg p-4 text-xs text-zinc-500">
        Scanning campaigns for alerts…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-xs text-red-300">
        Couldn&apos;t load alerts: {error || "no data"}
      </div>
    );
  }

  const { alerts, summary } = data;

  if (alerts.length === 0) {
    return (
      <div className="bg-green-500/5 border border-green-500/30 rounded-lg p-4 text-sm text-green-200">
        ✅ No alerts — accounts look healthy. Re-scan as data updates.
      </div>
    );
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-zinc-200 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
            <span aria-hidden="true">⚠️</span> Alerts ·{" "}
            <span className="text-red-300">{summary.critical}</span>{" "}
            <span className="text-zinc-500 font-normal">critical</span>{" "}
            <span className="mx-1 text-zinc-400">·</span>
            <span className="text-amber-300">{summary.warning}</span>{" "}
            <span className="text-zinc-500 font-normal">warning</span>{" "}
            <span className="mx-1 text-zinc-400">·</span>
            <span className="text-blue-300">{summary.info}</span>{" "}
            <span className="text-zinc-500 font-normal">opportunities</span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            Auto-detected from the 30-day snapshot — waste, ROAS drops, creative fatigue, scale gaps.
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {summary.estimated_monthly_savings > 0 && (
            <span className="text-red-300">
              Save ~{fmtMoney(summary.estimated_monthly_savings)}/mo
            </span>
          )}
          {summary.estimated_monthly_upside > 0 && (
            <span className="text-green-300">
              + {fmtMoney(summary.estimated_monthly_upside)}/mo upside
            </span>
          )}
        </div>
      </div>
      <ul className="divide-y divide-zinc-100">
        {alerts.map((a) => {
          const style = SEV_STYLE[a.severity];
          return (
            <li key={a.id} className={`px-5 py-4 ${style.bg}`}>
              <div className="flex items-start gap-3">
                <span
                  className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${style.chip}`}
                >
                  {a.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-zinc-500">
                      {a.platform === "google" ? "🟢 Google" : "🔵 Meta"}
                    </span>
                    <span className="text-xs text-zinc-300 truncate">{a.campaign_name}</span>
                  </div>
                  <div className={`text-sm font-medium ${style.text}`}>{a.title}</div>
                  <div className="text-xs text-zinc-400 mt-1">{a.detail}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.monthly_dollar_impact !== 0 && (
                    <span
                      className={`text-xs tabular-nums ${
                        a.monthly_dollar_impact < 0 ? "text-red-300" : "text-green-300"
                      }`}
                    >
                      {a.monthly_dollar_impact < 0 ? "-" : "+"}
                      {fmtMoney(Math.abs(a.monthly_dollar_impact))}/mo
                    </span>
                  )}
                  <button
                    onClick={() => onJumpTo(a.platform)}
                    className="text-xs px-3 py-1.5 rounded bg-zinc-50 border border-zinc-200 text-zinc-300 hover:border-zinc-500 hover:text-zinc-900 whitespace-nowrap"
                  >
                    Open →
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
