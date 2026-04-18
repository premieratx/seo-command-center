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
        const now = new Date();
        const d30 = new Date(now);
        d30.setDate(d30.getDate() - 30);
        const d7 = new Date(now);
        d7.setDate(d7.getDate() - 7);
        const iso30 = d30.toISOString();
        const iso7 = d7.toISOString();

        const [
          leadsAll,
          leads30,
          leadsByType,
          leadsBySrc,
          bookingsAll,
          bookings30,
          bookingsRevenue,
          abandoned,
          sessions7d,
          engagement7d,
        ] = await Promise.all([
          supabase.from("leads").select("*", { head: true, count: "exact" }),
          supabase.from("leads").select("*", { head: true, count: "exact" }).gte("created_at", iso30),
          supabase.rpc("count_leads_by_party_type").then(
            (r) => r.error ? null : r.data,
            () => null,
          ),
          supabase.rpc("count_leads_by_source").then(
            (r) => r.error ? null : r.data,
            () => null,
          ),
          supabase.from("bookings").select("*", { head: true, count: "exact" }),
          supabase.from("bookings").select("*", { head: true, count: "exact" }).gte("created_at", iso30),
          supabase.from("bookings").select("total_cents"),
          supabase.from("abandoned_bookings").select("*", { head: true, count: "exact" }),
          supabase.from("engagement_sessions").select("*", { head: true, count: "exact" }).gte("created_at", iso7),
          supabase.from("engagement_events").select("*", { head: true, count: "exact" }).gte("created_at", iso7),
        ]);

        // RPC fallbacks — if the count_* functions aren't defined, group client-side.
        let byType = (leadsByType as any) as { party_type: string; count: number }[] | null;
        if (!byType) {
          const { data } = await supabase.from("leads").select("party_type").limit(3000);
          const map = new Map<string, number>();
          (data || []).forEach((r: any) => {
            const k = r.party_type || "unspecified";
            map.set(k, (map.get(k) || 0) + 1);
          });
          byType = Array.from(map.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([party_type, count]) => ({ party_type, count }));
        }
        let bySource = (leadsBySrc as any) as { source_type: string; count: number }[] | null;
        if (!bySource) {
          const { data } = await supabase.from("leads").select("source_type").limit(3000);
          const map = new Map<string, number>();
          (data || []).forEach((r: any) => {
            const k = r.source_type || "direct";
            map.set(k, (map.get(k) || 0) + 1);
          });
          bySource = Array.from(map.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([source_type, count]) => ({ source_type, count }));
        }

        const revenueCents = (bookingsRevenue.data || []).reduce(
          (sum: number, r: any) => sum + (r.total_cents || 0),
          0,
        );

        if (!alive) return;
        setData({
          totalLeads: leadsAll.count || 0,
          leads30d: leads30.count || 0,
          leadsByPartyType: byType,
          leadsBySource: bySource,
          totalBookings: bookingsAll.count || 0,
          bookings30d: bookings30.count || 0,
          revenueCents,
          abandoned: abandoned.count || 0,
          sessions7d: sessions7d.count || 0,
          engagement7d: engagement7d.count || 0,
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
