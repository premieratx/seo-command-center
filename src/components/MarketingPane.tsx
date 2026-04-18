"use client";

/**
 * MarketingPane — Affiliates + Promo Codes management.
 *
 * Two sub-tabs:
 *   1. Affiliates — list/create/edit affiliates + their codes, track
 *      clicks, conversions, commissions
 *   2. Promo Codes — list/create/edit promo codes with optional tiered
 *      values (tier 2 + tier 3 kick in at configurable dates)
 *
 * Data lives in Supabase public.affiliates / affiliate_codes /
 * affiliate_clicks / affiliate_conversions / promo_codes. The tables
 * are empty today (infrastructure ready, waiting for first entries),
 * so this UI serves the create flow too.
 */
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://tgambsdjfwgoohkqopns.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYW1ic2RqZndnb29oa3FvcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDYzMDUsImV4cCI6MjA3NDkyMjMwNX0.xRGHgSXJsMkxO5KV-Uh7TvLPGd8MnbYrBdKi-QNUMh4",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export default function MarketingPane() {
  const [sub, setSub] = useState<"affiliates" | "codes">("affiliates");

  return (
    <div>
      <div className="flex gap-0 border-b border-[#262626] mb-5" role="tablist">
        <button
          role="tab"
          aria-selected={sub === "affiliates"}
          onClick={() => setSub("affiliates")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            sub === "affiliates"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Affiliates
        </button>
        <button
          role="tab"
          aria-selected={sub === "codes"}
          onClick={() => setSub("codes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            sub === "codes"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Promo Codes
        </button>
      </div>

      {sub === "affiliates" ? <AffiliatesList /> : <PromoCodesList />}
    </div>
  );
}

// ─── Affiliates ──────────────────────────────────────────────────────────
type Affiliate = {
  id: string;
  affiliate_code: string | null;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  commission_rate: number | null;
  status: string | null;
  total_earnings: number | null;
  available_balance: number | null;
  total_paid_out: number | null;
  notes: string | null;
  created_at: string;
};

function AffiliatesList() {
  const [rows, setRows] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("affiliates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as Affiliate[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-white">Affiliates ({rows.length})</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Partners who drive leads to the site. Click tracking fires from{" "}
            <code className="text-green-400">affiliate_clicks</code>, conversions
            write to <code className="text-green-400">affiliate_conversions</code>.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          {showForm ? "Cancel" : "+ New affiliate"}
        </button>
      </div>

      {showForm && <AffiliateForm onSaved={() => { setShowForm(false); load(); }} />}

      {loading && <div className="text-sm text-zinc-500 py-6 text-center">Loading…</div>}
      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">{error}</div>}

      {!loading && rows.length === 0 && !showForm && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg py-12 text-center">
          <p className="text-sm text-zinc-400 mb-3">No affiliates yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Create your first
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto bg-[#141414] border border-[#262626] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0a0a] border-b border-[#262626]">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-500">
                <th className="px-3 py-2">Affiliate</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Contact</th>
                <th className="px-3 py-2 text-right">Commission</th>
                <th className="px-3 py-2 text-right">Earned</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#262626] hover:bg-[#1a1a1a]">
                  <td className="px-3 py-2.5">
                    <div className="text-white font-medium">{r.company_name || "—"}</div>
                    <div className="text-xs text-zinc-500">{r.contact_name}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <code className="text-green-400 text-xs">{r.affiliate_code || "—"}</code>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300 text-xs">
                    <div>{r.email}</div>
                    <div className="text-zinc-500">{r.phone}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-white tabular-nums">
                    {r.commission_rate != null ? `${(r.commission_rate * 100).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-white tabular-nums">
                    ${(r.total_earnings || 0).toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-widest ${
                        r.status === "active"
                          ? "bg-green-500/15 text-green-400 border border-green-500/30"
                          : "bg-zinc-500/15 text-zinc-400 border border-zinc-500/30"
                      }`}
                    >
                      {r.status || "pending"}
                    </span>
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

function AffiliateForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    affiliate_code: "",
    commission_rate: "0.10",
    status: "active",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const payload = {
      ...form,
      commission_rate: parseFloat(form.commission_rate) || 0,
      affiliate_code: form.affiliate_code.trim().toUpperCase() || null,
    };
    const { error } = await supabase.from("affiliates").insert(payload);
    setSubmitting(false);
    if (error) setErr(error.message);
    else onSaved();
  }

  return (
    <form onSubmit={submit} className="bg-[#141414] border border-[#262626] rounded-lg p-4 mb-4">
      <h4 className="text-sm font-semibold text-white mb-3">New affiliate</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Company" value={form.company_name} onChange={(v) => setForm({ ...form, company_name: v })} required />
        <Field label="Contact name" value={form.contact_name} onChange={(v) => setForm({ ...form, contact_name: v })} required />
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Affiliate code (UPPERCASE)" value={form.affiliate_code} onChange={(v) => setForm({ ...form, affiliate_code: v })} />
        <Field label="Commission rate (0–1, e.g. 0.10 = 10%)" value={form.commission_rate} onChange={(v) => setForm({ ...form, commission_rate: v })} />
      </div>
      <div className="mt-3">
        <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
        />
      </div>
      {err && <div className="text-xs text-red-400 mt-2">{err}</div>}
      <div className="mt-3 flex justify-end">
        <button
          disabled={submitting}
          className="text-sm px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium"
        >
          {submitting ? "Creating…" : "Create affiliate"}
        </button>
      </div>
    </form>
  );
}

// ─── Promo codes ─────────────────────────────────────────────────────────
type PromoCode = {
  id: string;
  code: string;
  type: string;
  value: number;
  tier_2_value: number | null;
  tier_2_starts_at: string | null;
  tier_3_value: number | null;
  tier_3_starts_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

function PromoCodesList() {
  const [rows, setRows] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as PromoCode[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(row: PromoCode) {
    const { error } = await supabase
      .from("promo_codes")
      .update({ active: !row.active, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (!error) load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-white">Promo codes ({rows.length})</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Optional tiered discounts: set{" "}
            <code className="text-green-400">tier_2_starts_at</code> to auto-switch
            to a lower discount as the event approaches (e.g., early-bird vs. walk-up).
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          {showForm ? "Cancel" : "+ New code"}
        </button>
      </div>

      {showForm && <PromoCodeForm onSaved={() => { setShowForm(false); load(); }} />}

      {loading && <div className="text-sm text-zinc-500 py-6 text-center">Loading…</div>}
      {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">{error}</div>}

      {!loading && rows.length === 0 && !showForm && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg py-12 text-center">
          <p className="text-sm text-zinc-400 mb-3">No promo codes yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Create your first
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto bg-[#141414] border border-[#262626] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0a0a] border-b border-[#262626]">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-500">
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2 text-right">Value</th>
                <th className="px-3 py-2 text-right">Usage</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#262626] hover:bg-[#1a1a1a]">
                  <td className="px-3 py-2.5">
                    <code className="text-green-400 font-mono">{r.code}</code>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300 text-xs uppercase">{r.type}</td>
                  <td className="px-3 py-2.5 text-right text-white tabular-nums">
                    {r.type === "percent" ? `${(r.value * 100).toFixed(0)}%` : `$${r.value.toFixed(2)}`}
                    {r.tier_2_value != null && (
                      <div className="text-[10px] text-amber-400 mt-0.5">
                        T2: {r.type === "percent" ? `${(r.tier_2_value * 100).toFixed(0)}%` : `$${r.tier_2_value.toFixed(2)}`}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-zinc-300 tabular-nums">
                    {r.usage_count}
                    {r.usage_limit != null && <span className="text-zinc-600"> / {r.usage_limit}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-400 text-xs">
                    {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => toggleActive(r)}
                      className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-widest border transition-colors ${
                        r.active
                          ? "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/20"
                          : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/20"
                      }`}
                    >
                      {r.active ? "active" : "disabled"}
                    </button>
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

function PromoCodeForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({
    code: "",
    type: "percent",
    value: "0.10",
    tier_2_value: "",
    tier_2_starts_at: "",
    tier_3_value: "",
    tier_3_starts_at: "",
    usage_limit: "",
    expires_at: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const payload: any = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: parseFloat(form.value) || 0,
      active: true,
      usage_count: 0,
    };
    if (form.tier_2_value) payload.tier_2_value = parseFloat(form.tier_2_value);
    if (form.tier_2_starts_at) payload.tier_2_starts_at = form.tier_2_starts_at;
    if (form.tier_3_value) payload.tier_3_value = parseFloat(form.tier_3_value);
    if (form.tier_3_starts_at) payload.tier_3_starts_at = form.tier_3_starts_at;
    if (form.usage_limit) payload.usage_limit = parseInt(form.usage_limit, 10);
    if (form.expires_at) payload.expires_at = form.expires_at;

    const { error } = await supabase.from("promo_codes").insert(payload);
    setSubmitting(false);
    if (error) setErr(error.message);
    else onSaved();
  }

  return (
    <form onSubmit={submit} className="bg-[#141414] border border-[#262626] rounded-lg p-4 mb-4">
      <h4 className="text-sm font-semibold text-white mb-3">New promo code</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Code (UPPER)" value={form.code} onChange={(v) => setForm({ ...form, code: v })} required />
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
          >
            <option value="percent">percent (0.10 = 10%)</option>
            <option value="fixed">fixed ($ off)</option>
          </select>
        </div>
        <Field label="Value" value={form.value} onChange={(v) => setForm({ ...form, value: v })} required />
        <Field label="Tier-2 value (optional)" value={form.tier_2_value} onChange={(v) => setForm({ ...form, tier_2_value: v })} />
        <Field label="Tier-2 starts at" type="datetime-local" value={form.tier_2_starts_at} onChange={(v) => setForm({ ...form, tier_2_starts_at: v })} />
        <Field label="Tier-3 value (optional)" value={form.tier_3_value} onChange={(v) => setForm({ ...form, tier_3_value: v })} />
        <Field label="Tier-3 starts at" type="datetime-local" value={form.tier_3_starts_at} onChange={(v) => setForm({ ...form, tier_3_starts_at: v })} />
        <Field label="Usage limit (optional)" value={form.usage_limit} onChange={(v) => setForm({ ...form, usage_limit: v })} />
        <Field label="Expires at (optional)" type="datetime-local" value={form.expires_at} onChange={(v) => setForm({ ...form, expires_at: v })} />
      </div>
      {err && <div className="text-xs text-red-400 mt-2">{err}</div>}
      <div className="mt-3 flex justify-end">
        <button
          disabled={submitting}
          className="text-sm px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium"
        >
          {submitting ? "Creating…" : "Create code"}
        </button>
      </div>
    </form>
  );
}

// ─── Shared ────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}
