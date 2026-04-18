"use client";

/**
 * CRMPane — in-tab CRM with Leads + Customers sub-tabs.
 *
 * Replaces the old iframe-embedded lead-dashboard / customer-dashboard pages
 * with a native UI that talks directly to the PPC Booking Supabase project
 * (tgambsdjfwgoohkqopns — same project AnalyticsPane uses).
 *
 * Data sources:
 *   Leads      → public.leads (via admin-list-leads edge fn for RLS bypass)
 *   Customers  → derived from public.bookings (grouped by email)
 *
 * Features:
 *   • Free-text search across name / email / phone / party type / boat
 *   • Sortable columns (click header to toggle)
 *   • Status + date-range filters
 *   • Click a lead/customer row to open a detail drawer
 *   • Export visible rows as CSV
 */
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// PPC Booking project — same connection AnalyticsPane uses.
const SUPABASE_URL = "https://tgambsdjfwgoohkqopns.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYW1ic2RqZndnb29oa3FvcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDYzMDUsImV4cCI6MjA3NDkyMjMwNX0.xRGHgSXJsMkxO5KV-Uh7TvLPGd8MnbYrBdKi-QNUMh4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Lead = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  party_type: string | null;
  event_date: string | null;
  group_size: number | null;
  source_type: string | null;
  source_url: string | null;
  status: string | null;
  quote_total: number | null;
  cruise_type: string | null;
  boat_tier: string | null;
  notes: string | null;
};

type Booking = {
  id: string;
  created_at: string;
  customer: { name?: string; email?: string; phone?: string } | null;
  time_slot: {
    start_at?: string;
    end_at?: string;
    boat?: { name?: string };
    experience?: { type?: string; name?: string };
  } | null;
  headcount: number | null;
  amount: number | null;
  status: string | null;
};

type CRMSubTab = "leads" | "customers";

export default function CRMPane() {
  const [sub, setSub] = useState<CRMSubTab>("leads");

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-[#262626] mb-5" role="tablist">
        {[
          { id: "leads" as const, label: "Leads", icon: "📥" },
          { id: "customers" as const, label: "Customers", icon: "🤝" },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={sub === t.id}
            onClick={() => setSub(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
              sub === t.id
                ? "border-blue-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {sub === "leads" ? <LeadsPane /> : <CustomersPane />}
    </div>
  );
}

// ── Leads ───────────────────────────────────────────────────────────────
function LeadsPane() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"created_at" | "event_date" | "quote_total" | "name">("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Prefer the admin-list-leads edge fn (service-role RLS bypass).
        // Fall back to direct table query if the fn isn't available.
        const fn = await supabase.functions.invoke("admin-list-leads");
        if (fn.error || (fn.data as any)?.error) {
          // Fallback: anon read (works if RLS is permissive)
          const { data, error } = await supabase
            .from("leads")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1000);
          if (error) throw error;
          setLeads((data as Lead[]) || []);
        } else {
          const rows = ((fn.data as any)?.leads || (fn.data as any)?.data || fn.data) as Lead[];
          setLeads(rows || []);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load leads");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statuses = useMemo(() => {
    const s = new Set<string>();
    for (const l of leads) if (l.status) s.add(l.status);
    return Array.from(s).sort();
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = leads;
    if (q) {
      out = out.filter((l) => {
        const hay = [
          l.first_name,
          l.last_name,
          l.email,
          l.phone,
          l.party_type,
          l.source_type,
          l.source_url,
          l.boat_tier,
          l.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (statusFilter !== "all") out = out.filter((l) => l.status === statusFilter);
    out = [...out].sort((a, b) => {
      let va: any, vb: any;
      if (sortBy === "name") {
        va = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
        vb = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
      } else if (sortBy === "quote_total") {
        va = a.quote_total || 0;
        vb = b.quote_total || 0;
      } else if (sortBy === "event_date") {
        va = a.event_date || "";
        vb = b.event_date || "";
      } else {
        va = a.created_at || "";
        vb = b.created_at || "";
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return out;
  }, [leads, search, statusFilter, sortBy, sortAsc]);

  function toggleSort(key: typeof sortBy) {
    if (sortBy === key) setSortAsc((a) => !a);
    else {
      setSortBy(key);
      setSortAsc(key === "name");
    }
  }

  function exportCsv() {
    const rows = filtered.map((l) => ({
      created_at: l.created_at,
      name: `${l.first_name || ""} ${l.last_name || ""}`.trim(),
      email: l.email || "",
      phone: l.phone || "",
      event_date: l.event_date || "",
      party_type: l.party_type || "",
      group_size: l.group_size || "",
      boat_tier: l.boat_tier || "",
      cruise_type: l.cruise_type || "",
      quote_total: l.quote_total || "",
      source_type: l.source_type || "",
      source_url: l.source_url || "",
      status: l.status || "",
    }));
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const v = (r as any)[h];
            const s = v == null ? "" : String(v);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-white">
            Leads ({filtered.length} of {leads.length})
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Inbound quote requests from every source — embedded quote flow, chat, blog CTAs, affiliate
            referrals. Click a row to inspect.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, source…"
            className="w-64 bg-[#0a0a0a] border border-[#262626] rounded px-3 py-1.5 text-sm text-white placeholder:text-zinc-600"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={exportCsv}
            className="text-xs px-3 py-1.5 rounded bg-[#141414] border border-[#262626] text-zinc-300 hover:border-zinc-500"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-zinc-500 py-6 text-center">Loading leads…</div>}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3 mb-3">
          {error}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg py-12 text-center text-sm text-zinc-500">
          No leads match your search.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#0a0a0a] shadow-[0_1px_0_#262626]">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-400">
                <Th onClick={() => toggleSort("created_at")} active={sortBy === "created_at"} asc={sortAsc}>
                  Received
                </Th>
                <Th onClick={() => toggleSort("name")} active={sortBy === "name"} asc={sortAsc}>
                  Name
                </Th>
                <th className="px-3 py-2 bg-[#0a0a0a]">Contact</th>
                <th className="px-3 py-2 bg-[#0a0a0a]">Party</th>
                <Th onClick={() => toggleSort("event_date")} active={sortBy === "event_date"} asc={sortAsc}>
                  Event Date
                </Th>
                <th className="px-3 py-2 bg-[#0a0a0a]">Boat</th>
                <Th onClick={() => toggleSort("quote_total")} active={sortBy === "quote_total"} asc={sortAsc}>
                  Quote $
                </Th>
                <th className="px-3 py-2 bg-[#0a0a0a]">Source</th>
                <th className="px-3 py-2 bg-[#0a0a0a]">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelected(l)}
                  className="border-b border-[#262626] hover:bg-[#1a1a1a] cursor-pointer"
                >
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-white font-medium">
                      {`${l.first_name || ""} ${l.last_name || ""}`.trim() || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    <div>{l.email || "—"}</div>
                    <div className="text-zinc-500">{l.phone || ""}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-300">
                    {l.party_type || "—"}
                    {l.group_size ? (
                      <span className="text-zinc-500"> · {l.group_size}g</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-300">
                    {l.event_date ? new Date(l.event_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-400">{l.boat_tier || l.cruise_type || "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {l.quote_total
                      ? `$${Number(l.quote_total).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-500 truncate max-w-[140px]">
                    {l.source_type || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={l.status || "new"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <LeadDrawer lead={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── Customers (derived from bookings) ───────────────────────────────────
function CustomersPane() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"ltv" | "last_cruise" | "bookings" | "name">("last_cruise");
  const [sortAsc, setSortAsc] = useState(false);
  const [experienceFilter, setExperienceFilter] = useState<"all" | "disco" | "private">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const fn = await supabase.functions.invoke("admin-list-bookings");
        if (fn.error || (fn.data as any)?.error) {
          const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(2000);
          if (error) throw error;
          setBookings((data as Booking[]) || []);
        } else {
          const rows = ((fn.data as any)?.bookings || (fn.data as any)?.data || fn.data) as Booking[];
          setBookings(rows || []);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Group bookings into customer rows
  const customers = useMemo(() => {
    const byEmail = new Map<
      string,
      {
        email: string;
        name: string;
        phone: string;
        bookingCount: number;
        ltv: number;
        lastCruise: string | null;
        experiences: Set<string>;
        bookings: Booking[];
      }
    >();
    for (const b of bookings) {
      const email = b.customer?.email?.trim().toLowerCase() || "__nocontact__";
      const current = byEmail.get(email) || {
        email,
        name: b.customer?.name || "Guest",
        phone: b.customer?.phone || "",
        bookingCount: 0,
        ltv: 0,
        lastCruise: null,
        experiences: new Set<string>(),
        bookings: [],
      };
      current.bookingCount++;
      current.ltv += Number(b.amount) || 0;
      const start = b.time_slot?.start_at || null;
      if (start && (!current.lastCruise || start > current.lastCruise)) {
        current.lastCruise = start;
      }
      if (b.time_slot?.experience?.type) current.experiences.add(b.time_slot.experience.type);
      current.bookings.push(b);
      byEmail.set(email, current);
    }
    return Array.from(byEmail.values());
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = customers;
    if (q) out = out.filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q));
    if (experienceFilter !== "all") {
      out = out.filter((c) =>
        experienceFilter === "disco"
          ? c.experiences.has("disco_cruise") || c.experiences.has("disco")
          : !c.experiences.has("disco_cruise") && !c.experiences.has("disco"),
      );
    }
    out = [...out].sort((a, b) => {
      let va: any, vb: any;
      switch (sortBy) {
        case "name":
          va = a.name.toLowerCase();
          vb = b.name.toLowerCase();
          break;
        case "bookings":
          va = a.bookingCount;
          vb = b.bookingCount;
          break;
        case "ltv":
          va = a.ltv;
          vb = b.ltv;
          break;
        default:
          va = a.lastCruise || "";
          vb = b.lastCruise || "";
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return out;
  }, [customers, search, sortBy, sortAsc, experienceFilter]);

  function toggleSort(key: typeof sortBy) {
    if (sortBy === key) setSortAsc((a) => !a);
    else {
      setSortBy(key);
      setSortAsc(key === "name");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-white">
            Customers ({filtered.length} of {customers.length})
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Grouped from{" "}
            <span className="text-zinc-300">{bookings.length.toLocaleString()}</span> bookings. Repeat
            customers are grouped by email.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-64 bg-[#0a0a0a] border border-[#262626] rounded px-3 py-1.5 text-sm text-white placeholder:text-zinc-600"
          />
          <select
            value={experienceFilter}
            onChange={(e) => setExperienceFilter(e.target.value as typeof experienceFilter)}
            className="bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1.5 text-sm text-white"
          >
            <option value="all">All experiences</option>
            <option value="disco">ATX Disco Cruise</option>
            <option value="private">Private Charters</option>
          </select>
        </div>
      </div>

      {loading && <div className="text-sm text-zinc-500 py-6 text-center">Loading customers…</div>}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3 mb-3">
          {error}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#0a0a0a] shadow-[0_1px_0_#262626]">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-400">
                <Th onClick={() => toggleSort("name")} active={sortBy === "name"} asc={sortAsc}>
                  Customer
                </Th>
                <th className="px-3 py-2 bg-[#0a0a0a]">Contact</th>
                <Th onClick={() => toggleSort("bookings")} active={sortBy === "bookings"} asc={sortAsc}>
                  Bookings
                </Th>
                <Th onClick={() => toggleSort("ltv")} active={sortBy === "ltv"} asc={sortAsc}>
                  Lifetime $
                </Th>
                <Th
                  onClick={() => toggleSort("last_cruise")}
                  active={sortBy === "last_cruise"}
                  asc={sortAsc}
                >
                  Last Cruise
                </Th>
                <th className="px-3 py-2 bg-[#0a0a0a]">Experience Mix</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.email} className="border-b border-[#262626] hover:bg-[#1a1a1a]">
                  <td className="px-3 py-2">
                    <div className="text-white font-medium">{c.name}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    <div>{c.email === "__nocontact__" ? "—" : c.email}</div>
                    <div className="text-zinc-500">{c.phone}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-300">
                    {c.bookingCount}
                    {c.bookingCount > 1 && (
                      <span className="ml-1.5 text-[10px] bg-green-500/15 text-green-300 border border-green-500/30 rounded px-1.5 py-0.5">
                        REPEAT
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-zinc-200">
                    ${Number(c.ltv).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {c.lastCruise ? new Date(c.lastCruise).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {Array.from(c.experiences)
                      .map((t) => (t === "disco_cruise" ? "Disco" : "Private"))
                      .join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function Th({
  children,
  onClick,
  active,
  asc,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  asc?: boolean;
}) {
  return (
    <th
      className="px-3 py-2 bg-[#0a0a0a] cursor-pointer select-none hover:text-white"
      onClick={onClick}
    >
      <span className={active ? "text-white" : ""}>
        {children}
        {active && <span className="ml-1 text-[10px]">{asc ? "▲" : "▼"}</span>}
      </span>
    </th>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls = s.includes("won") || s.includes("booked")
    ? "bg-green-500/15 text-green-300 border-green-500/30"
    : s.includes("lost") || s.includes("dead")
      ? "bg-red-500/15 text-red-300 border-red-500/30"
      : s.includes("quote") || s.includes("follow")
        ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
        : "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-widest border ${cls}`}>
      {status}
    </span>
  );
}

function LeadDrawer({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-[#141414] border-l border-[#262626] h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">
            {`${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Lead"}
          </h4>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>
        <dl className="text-sm space-y-2.5">
          {[
            ["Email", lead.email],
            ["Phone", lead.phone],
            ["Received", lead.created_at ? new Date(lead.created_at).toLocaleString() : null],
            ["Event date", lead.event_date ? new Date(lead.event_date).toLocaleDateString() : null],
            ["Party type", lead.party_type],
            ["Group size", lead.group_size],
            ["Cruise type", lead.cruise_type],
            ["Boat tier", lead.boat_tier],
            ["Quote total", lead.quote_total ? `$${Number(lead.quote_total).toLocaleString()}` : null],
            ["Source", lead.source_type],
            ["Source URL", lead.source_url],
            ["Status", lead.status],
          ].map(([k, v]) =>
            v ? (
              <div key={k as string} className="flex justify-between gap-3 text-xs border-b border-[#1f1f1f] pb-2">
                <dt className="text-zinc-500 shrink-0">{k}</dt>
                <dd className="text-zinc-200 text-right break-words">{String(v)}</dd>
              </div>
            ) : null,
          )}
          {lead.notes && (
            <div className="mt-4">
              <dt className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Notes</dt>
              <dd className="text-sm text-zinc-200 whitespace-pre-wrap bg-[#0a0a0a] border border-[#262626] rounded p-3">
                {lead.notes}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
