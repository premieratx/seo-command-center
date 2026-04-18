"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatError } from "@/lib/format-error";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Public sign-up is disabled. Accounts are created by admin invite only —
  // invited users receive an email link that logs them in and prompts them
  // to set a password.

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/profiles");
      router.refresh();
    } catch (err) {
      setError(formatError(err) || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Business Command Center</h1>
          <p className="text-zinc-500 text-sm">
            SEO · Design · CRM · Quotes · Stats · Promos · Blog · Chatbot · Users · Docs — one console.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#141414] border border-[#262626] rounded-lg p-6 space-y-4"
        >
          <div className="text-center mb-4">
            <div className="text-sm font-semibold text-white mb-1">Sign in</div>
            <div className="text-xs text-zinc-500">
              Invite-only. Contact your admin for access.
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white py-3 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
