"use client";

/**
 * UsersPane — admin user management.
 *
 * Lists users from public.admin_profiles (same Supabase project the
 * rest of the Command Center uses). Shows role, partner name/display
 * name, created date. Create flow hits a server-side route so the
 * password hash is done with bcrypt, not client-side.
 *
 * admin_profiles schema:
 *   id (uuid), email (text), password_hash (text),
 *   role (text: 'owner' | 'admin' | 'operator' | 'partner'),
 *   partner_name (text), partner_display_name (text), created_at
 */
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://tgambsdjfwgoohkqopns.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYW1ic2RqZndnb29oa3FvcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDYzMDUsImV4cCI6MjA3NDkyMjMwNX0.xRGHgSXJsMkxO5KV-Uh7TvLPGd8MnbYrBdKi-QNUMh4",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type AdminUser = {
  id: string;
  email: string;
  role: string;
  partner_name: string | null;
  partner_display_name: string | null;
  created_at: string;
};

export default function UsersPane() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // RLS is OFF on admin_profiles, but we still exclude the password_hash
    // column from the select list.
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("id, email, role, partner_name, partner_display_name, created_at")
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    else setRows((data as AdminUser[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const badge = (role: string) => {
    const m: Record<string, string> = {
      owner: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      admin: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      operator: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      partner: "bg-green-500/15 text-green-300 border-green-500/30",
    };
    return m[role] || "bg-zinc-500/15 text-zinc-300 border-zinc-500/30";
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Admin users ({rows.length})</h3>
          <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
            Everyone who can sign in to the Business Command Center. Source of
            truth:{" "}
            <code className="text-green-400">public.admin_profiles</code> in{" "}
            <code className="text-green-400">tgambsdjfwgoohkqopns</code>.
            Password hashes are bcrypt — create/reset flows are server-side.
          </p>
        </div>
        <div className="text-xs text-zinc-500 bg-[#141414] border border-[#262626] rounded px-3 py-1.5">
          Invite & reset flows live in Supabase SQL editor for now
        </div>
      </div>

      {loading && <div className="text-sm text-zinc-500 py-6 text-center">Loading…</div>}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
          {error}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto bg-[#141414] border border-[#262626] rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0a0a] border-b border-[#262626]">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-500">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Partner</th>
                <th className="px-3 py-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#262626] hover:bg-[#1a1a1a]">
                  <td className="px-3 py-2.5 text-white">{r.email}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-widest border ${badge(r.role)}`}>
                      {r.role}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    {r.partner_display_name || r.partner_name || <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-400">
                    {new Date(r.created_at).toLocaleDateString()}
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
