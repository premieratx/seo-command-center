"use client";

/**
 * AnalyticsPane — Business Command Center overview dashboard.
 *
 * Pulls live data from the PPC Booking Supabase project
 * (tgambsdjfwgoohkqopns) — the SAME project that powers the cruise
 * site's quote flow + lead/customer dashboards, so numbers here match
 * what operations sees elsewhere. No Replit data source.
 *
 * Panels:
 *   • Leads — total, last 30d, by source, by party type
 *   • Bookings — total, revenue, average ticket
 *   • Abandoned — recoverable carts
 *   • Engagement — session count, top pages (last 7d)
 */
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tgambsdjfwgoohkqopns.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYW1ic2RqZndnb29oa3FvcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDYzMDUsImV4cCI6MjA3NDkyMjMwNX0.xRGHgSXJsMkxO5KV-Uh7TvLPGd8MnbYrBdKi-QNUMh4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Stat = { label: string; value: string | number; hint?: string };

function nfmt(n: number) {
  return n.toLocaleString("en-US");
}
function $fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function AnalyticsPane() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    totalLeads: number;
    leads30d: number;
    leadsByPartyType: { party_type: string | null; count: number }[];
    leadsBySource: { source_type: string | null; count: number }[];
    totalBookings: number;
    bookings30d: number;
    revenueCents: number;
    abandoned: number;
    sessions7d: number;
    engagement7d: number;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        // Route through the dashboard-stats edge function (runs with
        // service-role so it bypasses RLS on leads + abandoned_bookings).
        // Returns aggregates only — no PII rows leak back to the client.
        const { data, error } = await supabase.functions.invoke("dashboard-stats");
        if (error) throw error;
        if (!alive) return;
        setData({
          totalLeads: data.totalLeads ?? 0,
          leads30d: data.leads30d ?? 0,
          leadsByPartyType: (data.byPartyType || []).map((r: any) => ({
            party_type: r.key,
            count: r.count,
          })),
          leadsBySource: (data.bySource || []).map((r: any) => ({
            source_type: r.key,
            count: r.count,
          })),
          totalBookings: data.totalBookings ?? 0,
          bookings30d: data.bookings30d ?? 0,
          revenueCents: Math.round((data.revenue ?? 0) * 100),
          abandoned: data.abandoned ?? 0,
          sessions7d: data.sessions7d ?? 0,
          engagement7d: data.engagement7d ?? 0,
        });
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load analytics");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  const primary: Stat[] = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Leads (all-time)", value: nfmt(data.totalLeads), hint: `${nfmt(data.leads30d)} in last 30d` },
      { label: "Bookings", value: nfmt(data.totalBookings), hint: `${nfmt(data.bookings30d)} in last 30d` },
      { label: "Revenue booked", value: $fmt(data.revenueCents / 100), hint: "All-time (cents/100)" },
      { label: "Abandoned quotes", value: nfmt(data.abandoned), hint: "Recovery opportunities" },
      { label: "Sessions (7d)", value: nfmt(data.sessions7d) },
      { label: "Engagement events (7d)", value: nfmt(data.engagement7d) },
    ];
  }, [data]);

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white mb-1">Overview</h3>
        <p className="text-xs text-zinc-500">
          Live from Supabase <code className="text-green-400">tgambsdjfwgoohkqopns</code> — the same project powering the quote flow and customer dashboards.
        </p>
      </div>

      {loading && <div className="text-sm text-zinc-500 py-10 text-center">Loading…</div>}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {primary.map((s) => (
              <div key={s.label} className="bg-[#141414] border border-[#262626] rounded-lg p-4">
                <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">{s.label}</div>
                <div className="text-2xl font-semibold text-white">{s.value}</div>
                {s.hint && <div className="text-xs text-zinc-500 mt-0.5">{s.hint}</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Leads by party type (top 8)">
              <BarList
                items={data.leadsByPartyType.map((r) => ({
                  label: formatPartyType(r.party_type),
                  value: r.count,
                }))}
                total={data.leadsByPartyType.reduce((s, r) => s + r.count, 0)}
              />
            </Card>
            <Card title="Leads by source (top 8)">
              <BarList
                items={data.leadsBySource.map((r) => ({
                  label: r.source_type || "direct",
                  value: r.count,
                }))}
                total={data.leadsBySource.reduce((s, r) => s + r.count, 0)}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg">
      <div className="px-4 py-2.5 border-b border-[#262626] text-sm font-semibold text-white">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function BarList({ items, total }: { items: { label: string; value: number }[]; total: number }) {
  if (items.length === 0) return <div className="text-xs text-zinc-500">No data.</div>;
  const max = Math.max(...items.map((i) => i.value));
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-zinc-300 truncate pr-2">{i.label}</span>
            <span className="text-zinc-400 tabular-nums">
              {nfmt(i.value)}{" "}
              <span className="text-zinc-600">({Math.round((i.value / (total || 1)) * 100)}%)</span>
            </span>
          </div>
          <div className="h-1.5 bg-[#0a0a0a] rounded overflow-hidden">
            <div
              className="h-full bg-blue-500/80"
              style={{ width: `${(i.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatPartyType(s: string | null): string {
  if (!s) return "Unspecified";
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
