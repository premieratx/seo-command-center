"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatError } from "@/lib/format-error";

export default function SiteSettingsPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id: profileId, siteId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [githubToken, setGithubToken] = useState("");
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      // 1. Verify there's a live session before doing anything. Supabase's
      // client silently returns a plain-object error if the JWT is expired,
      // which is what caused the original "Error: [object Object]" report —
      // refresh the session first so we catch it here instead of on save.
      const { data: userRes } = await supabase.auth.getUser();
      if (!alive) return;
      if (!userRes.user) {
        setSessionChecked(true);
        return;
      }
      setSessionEmail(userRes.user.email ?? null);
      setSessionChecked(true);

      const { data } = await supabase
        .from("sites")
        .select("github_repo_owner, github_repo_name, github_default_branch, github_token_encrypted")
        .eq("id", siteId)
        .single();
      if (!alive) return;
      if (data) {
        setGithubOwner(data.github_repo_owner || "");
        setGithubRepo(data.github_repo_name || "");
        setGithubBranch(data.github_default_branch || "main");
        setHasToken(!!data.github_token_encrypted);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [siteId, supabase]);

  async function saveSettings() {
    setLoading(true);
    setNotice(null);
    try {
      // Freshness check: if the JWT expired since the page was loaded, bounce
      // to /login instead of hitting PostgREST and getting a cryptic error.
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) {
        setNotice(
          "Error: Your session has expired. Redirecting you to sign in again…"
        );
        setTimeout(() => {
          router.push("/login");
        }, 1500);
        return;
      }

      const updates: Record<string, unknown> = {
        github_repo_owner: githubOwner.trim() || null,
        github_repo_name: githubRepo.trim() || null,
        github_default_branch: githubBranch.trim() || "main",
      };
      if (githubToken.trim()) {
        updates.github_token_encrypted = githubToken.trim();
      }

      // Use .select() so we can tell the difference between "RLS silently
      // updated 0 rows" and a real successful update. Without this, a user
      // who doesn't own the site would see "Settings saved!" but nothing
      // would actually change in the database.
      const { data, error } = await supabase
        .from("sites")
        .update(updates)
        .eq("id", siteId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Update blocked: this site doesn't belong to your profile. If you were recently invited, try signing out and back in to refresh your account."
        );
      }

      setNotice("Settings saved! GitHub connection updated.");
      if (githubToken) {
        setHasToken(true);
        setGithubToken("");
      }
      router.refresh();
    } catch (e) {
      setNotice(`Error: ${formatError(e)}`);
    } finally {
      setLoading(false);
    }
  }

  if (sessionChecked && !sessionEmail) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-semibold mb-2">Sign in required</h1>
        <p className="text-zinc-500 text-sm mb-4">
          Your session has expired. Sign in again to update this site&apos;s
          GitHub connection.
        </p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={`/profiles/${profileId}/sites/${siteId}`}
        className="text-sm text-zinc-500 hover:text-zinc-300 mb-4 inline-block"
      >
        ← Back to dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-2">Site Settings</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Configure GitHub connection for code editing and deployment.
      </p>

      <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 space-y-4">
        <h2 className="font-semibold text-lg">GitHub Repository</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
              Repo Owner
            </label>
            <input
              type="text"
              value={githubOwner}
              onChange={(e) => setGithubOwner(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="premieratx"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
              Repo Name
            </label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="CruiseConcierge"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
            Default Branch
          </label>
          <input
            type="text"
            value={githubBranch}
            onChange={(e) => setGithubBranch(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            placeholder="main"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
            Personal Access Token {hasToken && <span className="text-green-400">(saved)</span>}
          </label>
          <input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500"
            placeholder={hasToken ? "••••••• (leave blank to keep existing)" : "ghp_..."}
          />
          <div className="flex items-center gap-2 mt-2">
            <a
              href={`https://github.com/settings/tokens/new?scopes=repo&description=SEO%20Command%20Center`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Generate new token on GitHub →
            </a>
            <span className="text-xs text-zinc-600">Needs <code className="bg-zinc-800 px-1 rounded">repo</code> scope</span>
          </div>
        </div>

        {notice && (
          <div className={`text-sm rounded-lg p-3 ${
            notice.startsWith("Error") ? "text-red-400 bg-red-900/20 border border-red-900/50" : "text-green-400 bg-green-900/20 border border-green-900/50"
          }`}>
            {notice}
          </div>
        )}

        <button
          onClick={saveSettings}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white py-3 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
