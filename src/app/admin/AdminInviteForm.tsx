"use client";

import { useState } from "react";
import { formatError } from "@/lib/format-error";

export function AdminInviteForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setNotice({
        kind: "ok",
        text: `Invite sent to ${email.trim()}. They'll get a sign-in email.`,
      });
      setEmail("");
    } catch (err) {
      setNotice({ kind: "err", text: formatError(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="their-email@company.com"
          className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Sending…" : "Send Invite"}
        </button>
      </div>
      {notice && (
        <div
          className={`text-sm rounded-lg p-3 border ${
            notice.kind === "ok"
              ? "text-green-400 bg-green-900/20 border-green-900/50"
              : "text-red-400 bg-red-900/20 border-red-900/50"
          }`}
        >
          {notice.text}
        </div>
      )}
    </form>
  );
}
