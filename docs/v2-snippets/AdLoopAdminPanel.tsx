/**
 * AdLoopAdminPanel — V2 admin component for the cruise site
 * (premieratx/CruiseConcierge repo, not seo-command-center).
 *
 * Drop this file at: client/src/admin/AdLoopAdminPanel.tsx
 * (or wherever your V2 admin panels live).
 *
 * Then mount it inside the existing SEOCommandCenter admin page (or any
 * admin route). It fetches Ad Loop data from the SEO Command Center's
 * /api/seo-sync endpoint with the same x-seo-sync-token header you already
 * use for SEO data — no new auth plumbing needed.
 *
 * ENV VARS REQUIRED ON THE V2 SITE (Netlify or .env):
 *   VITE_SEO_DASHBOARD_URL   → https://seo-command-center.netlify.app
 *   VITE_SEO_SYNC_TOKEN      → same token used for the SEO sync today
 *   VITE_PPC_SITE_ID         → 37292000-d661-4238-8ba4-6a53b71c2d07
 *
 * (Adjust the env-var names if your V2 site uses NEXT_PUBLIC_ / process.env
 * conventions — these are Vite's import.meta.env style, matching the rest
 * of the CruiseConcierge codebase.)
 */

import { useEffect, useMemo, useState } from "react";

const DASHBOARD_URL =
  import.meta.env.VITE_SEO_DASHBOARD_URL || "https://seo-command-center.netlify.app";
const SYNC_TOKEN = import.meta.env.VITE_SEO_SYNC_TOKEN as string;
const SITE_ID =
  (import.meta.env.VITE_PPC_SITE_ID as string) ||
  "37292000-d661-4238-8ba4-6a53b71c2d07";

type AdMetrics = {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
};

type Campaign = {
  id: string;
  platform: "google" | "meta";
  name: string;
  status: string;
  channel: string;
  daily_budget: number | null;
  metrics: AdMetrics;
};

type Overview = {
  totals: { combined: AdMetrics; google: AdMetrics; meta: AdMetrics };
  connected: { google: boolean; meta: boolean };
  counts: {
    google_total: number;
    google_enabled: number;
    meta_total: number;
    meta_enabled: number;
  };
  top_campaigns: Campaign[];
  series: { date: string; google_cost: number; meta_cost: number }[];
  date_range: { start: string; end: string };
};

const fmtMoney = (n: number) =>
  `$${Math.round(n).toLocaleString()}`;
const fmtInt = (n: number) => Math.round(n).toLocaleString();
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtX = (n: number) => (n > 0 ? `${n.toFixed(2)}x` : "—");

async function fetchSync<T>(action: string): Promise<T> {
  const url = `${DASHBOARD_URL}/api/seo-sync?action=${action}&site_id=${SITE_ID}`;
  const res = await fetch(url, {
    headers: { "x-seo-sync-token": SYNC_TOKEN },
  });
  if (!res.ok) throw new Error(`${action} failed: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export default function AdLoopAdminPanel() {
  const [tab, setTab] = useState<"overview" | "google" | "meta">("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [google, setGoogle] = useState<{ campaigns: Campaign[] } | null>(null);
  const [meta, setMeta] = useState<{ campaigns: Campaign[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [o, g, m] = await Promise.all([
          fetchSync<Overview>("ads-overview"),
          fetchSync<{ campaigns: Campaign[] }>("ads-google"),
          fetchSync<{ campaigns: Campaign[] }>("ads-meta"),
        ]);
        if (!cancelled) {
          setOverview(o);
          setGoogle(g);
          setMeta(m);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed");
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
      <div className="p-6 text-sm text-zinc-500">Loading Ad Loop data…</div>
    );
  }
  if (error) {
    return (
      <div className="p-4 m-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
        Couldn&apos;t load Ad Loop: {error}.
        <div className="mt-1 text-xs text-red-600">
          Check that <code>VITE_SEO_SYNC_TOKEN</code> is set and matches the
          token on seo-command-center.
        </div>
      </div>
    );
  }
  if (!overview || !google || !meta) return null;

  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-600">
            Ad Loop · Read-only mirror of the Command Center
          </p>
          <h2 className="text-2xl font-semibold text-zinc-900">
            Ads · Google + Meta
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Live data synced from{" "}
            <a
              href={`${DASHBOARD_URL}/profiles`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline-offset-2 hover:underline"
            >
              seo-command-center
            </a>
            . Edit campaigns over there — this view auto-updates next refresh.
          </p>
        </div>
        <div className="text-xs text-zinc-500 tabular-nums">
          {overview.date_range.start} → {overview.date_range.end}
        </div>
      </header>

      <nav className="flex gap-0 border-b border-zinc-200" role="tablist">
        {(["overview", "google", "meta"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? "border-blue-500 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t === "overview"
              ? "🏠 Overview"
              : t === "google"
                ? "🟢 Google"
                : "🔵 Meta"}
          </button>
        ))}
      </nav>

      {tab === "overview" && <OverviewTab overview={overview} />}
      {tab === "google" && (
        <CampaignTable
          platform="Google"
          campaigns={google.campaigns}
          connected={overview.connected.google}
        />
      )}
      {tab === "meta" && (
        <CampaignTable
          platform="Meta"
          campaigns={meta.campaigns}
          connected={overview.connected.meta}
        />
      )}
    </section>
  );
}

function OverviewTab({ overview }: { overview: Overview }) {
  const t = overview.totals.combined;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Spend · 30d" value={fmtMoney(t.cost)} accent />
        <Kpi label="Impressions" value={fmtInt(t.impressions)} />
        <Kpi label="Clicks" value={fmtInt(t.clicks)} sub={fmtPct(t.ctr)} />
        <Kpi
          label="Conversions"
          value={fmtInt(t.conversions)}
          sub={t.cpa > 0 ? `CPA ${fmtMoney(t.cpa)}` : undefined}
        />
        <Kpi
          label="Revenue"
          value={fmtMoney(t.conversion_value)}
          sub={fmtX(t.roas) + " ROAS"}
        />
        <Kpi
          label="Active campaigns"
          value={`${
            overview.counts.google_enabled + overview.counts.meta_enabled
          }`}
          sub={`${
            overview.counts.google_total + overview.counts.meta_total
          } total`}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <PlatformCard
          name="Google Ads"
          icon="🟢"
          connected={overview.connected.google}
          enabled={overview.counts.google_enabled}
          total={overview.counts.google_total}
          totals={overview.totals.google}
        />
        <PlatformCard
          name="Meta Ads"
          icon="🔵"
          connected={overview.connected.meta}
          enabled={overview.counts.meta_enabled}
          total={overview.counts.meta_total}
          totals={overview.totals.meta}
        />
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 text-sm font-semibold text-zinc-900">
          Top campaigns by spend
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Campaign</th>
              <th className="px-3 py-2 text-left">Platform</th>
              <th className="px-3 py-2 text-right">Spend</th>
              <th className="px-3 py-2 text-right">Conv.</th>
              <th className="px-3 py-2 text-right">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {overview.top_campaigns.map((c) => (
              <tr key={`${c.platform}:${c.id}`}>
                <td className="px-3 py-2 text-zinc-900">{c.name}</td>
                <td className="px-3 py-2 text-zinc-600">
                  {c.platform === "google" ? "🟢 Google" : "🔵 Meta"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                  {fmtMoney(c.metrics.cost)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                  {fmtInt(c.metrics.conversions)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${
                    c.metrics.roas >= 4
                      ? "text-green-700"
                      : c.metrics.roas >= 2
                        ? "text-amber-700"
                        : "text-red-700"
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
  );
}

function CampaignTable({
  platform,
  campaigns,
  connected,
}: {
  platform: string;
  campaigns: Campaign[];
  connected: boolean;
}) {
  const sorted = useMemo(
    () => [...campaigns].sort((a, b) => b.metrics.cost - a.metrics.cost),
    [campaigns],
  );
  const totals = useMemo(() => {
    return sorted.reduce(
      (acc, c) => {
        acc.cost += c.metrics.cost;
        acc.conv += c.metrics.conversions;
        return acc;
      },
      { cost: 0, conv: 0 },
    );
  }, [sorted]);

  return (
    <div className="space-y-3">
      {!connected && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
          {platform} is not connected on the Command Center yet — sample data
          shown below.
        </div>
      )}
      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-900">
            {platform} campaigns ({sorted.length})
          </span>
          <span className="text-xs text-zinc-500 tabular-nums">
            {fmtMoney(totals.cost)} · {fmtInt(totals.conv)} conv
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-3 py-2 text-left">Campaign</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">Spend</th>
              <th className="px-3 py-2 text-right">Clicks</th>
              <th className="px-3 py-2 text-right">CTR</th>
              <th className="px-3 py-2 text-right">Conv.</th>
              <th className="px-3 py-2 text-right">CPA</th>
              <th className="px-3 py-2 text-right">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sorted.map((c) => {
              const m = c.metrics;
              return (
                <tr key={c.id}>
                  <td className="px-3 py-2">
                    <div className="text-zinc-900">{c.name}</div>
                    <div className="text-xs text-zinc-500">
                      {c.channel.replace(/^META_/, "").replace(/_/g, " ")}
                      {c.daily_budget
                        ? ` · ${fmtMoney(c.daily_budget)}/day`
                        : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                        c.status === "ENABLED"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-zinc-100 text-zinc-600 border-zinc-200"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                    {fmtMoney(m.cost)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                    {fmtInt(m.clicks)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                    {fmtPct(m.ctr)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-900">
                    {fmtInt(m.conversions)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                    {m.cpa > 0 ? fmtMoney(m.cpa) : "—"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${
                      m.roas >= 4
                        ? "text-green-700"
                        : m.roas >= 2
                          ? "text-amber-700"
                          : m.roas > 0
                            ? "text-red-700"
                            : "text-zinc-400"
                    }`}
                  >
                    {fmtX(m.roas)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        Read-only mirror — to pause / enable a campaign, use the Ad Loop tab on
        the Command Center.
      </p>
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
        accent
          ? "bg-blue-50 border-blue-200"
          : "bg-white border-zinc-200"
      }`}
    >
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="text-lg font-semibold text-zinc-900 mt-1 tabular-nums">
        {value}
      </div>
      {sub && (
        <div className="text-xs text-zinc-500 mt-0.5 tabular-nums">{sub}</div>
      )}
    </div>
  );
}

function PlatformCard({
  name,
  icon,
  connected,
  enabled,
  total,
  totals,
}: {
  name: string;
  icon: string;
  connected: boolean;
  enabled: number;
  total: number;
  totals: AdMetrics;
}) {
  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span aria-hidden>{icon}</span>
          <div>
            <div className="text-sm font-semibold text-zinc-900">{name}</div>
            <div className="text-xs text-zinc-500">
              {enabled} enabled · {total} total
            </div>
          </div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${
            connected
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {connected ? "Connected" : "Sample"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="bg-zinc-50 rounded p-2 border border-zinc-100">
          <div className="text-[10px] uppercase text-zinc-500">Spend</div>
          <div className="font-semibold text-zinc-900 tabular-nums">
            {fmtMoney(totals.cost)}
          </div>
        </div>
        <div className="bg-zinc-50 rounded p-2 border border-zinc-100">
          <div className="text-[10px] uppercase text-zinc-500">Conv.</div>
          <div className="font-semibold text-zinc-900 tabular-nums">
            {fmtInt(totals.conversions)}
          </div>
        </div>
        <div className="bg-zinc-50 rounded p-2 border border-zinc-100">
          <div className="text-[10px] uppercase text-zinc-500">ROAS</div>
          <div className="font-semibold text-zinc-900 tabular-nums">
            {fmtX(totals.roas)}
          </div>
        </div>
      </div>
    </div>
  );
}
