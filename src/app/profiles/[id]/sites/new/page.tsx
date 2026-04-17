"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatError } from "@/lib/format-error";

export default function NewSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: profileId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [productionUrl, setProductionUrl] = useState("");
  const [githubRepoOwner, setGithubRepoOwner] = useState("");
  const [githubRepoName, setGithubRepoName] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [githubToken, setGithubToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Freshness check: surfacing a stale JWT up front gives a clear error
      // instead of the cryptic PostgREST failure that used to render as
      // "Error: [object Object]" and block users silently.
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) {
        setError("Your session has expired. Please sign in again.");
        setTimeout(() => router.push("/login"), 1500);
        return;
      }

      const { data, error } = await supabase
        .from("sites")
        .insert({
          profile_id: profileId,
          name: name.trim(),
          domain: domain.trim(),
          production_url: productionUrl.trim(),
          github_repo_owner: githubRepoOwner.trim() || null,
          github_repo_name: githubRepoName.trim() || null,
          github_default_branch: githubBranch.trim() || "main",
          github_token_encrypted: githubToken.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error(
          "Could not create site — this profile may not belong to your account."
        );
      }
      router.push(`/profiles/${profileId}/sites/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(formatError(err) || "Failed to create site");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={`/profiles/${profileId}`}
        className="text-sm text-zinc-500 hover:text-zinc-300 mb-4 inline-block"
      >
        ← Back to profile
      </Link>
      <h1 className="text-2xl font-bold mb-2">Connect a Site</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Add a website to this profile. Connect a GitHub repo to enable automatic
        SEO fixes and branch previews.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 space-y-4">
          <h2 className="font-semibold mb-2">Site Details</h2>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
              Site Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Main marketing site"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
              Domain *
            </label>
            <input
              type="text"
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="premierpartycruises.com"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
              Production URL *
            </label>
            <input
              type="url"
              required
              value={productionUrl}
              onChange={(e) => setProductionUrl(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
              placeholder="https://premierpartycruises.com"
            />
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 space-y-4">
          <div>
            <h2 className="font-semibold mb-1">GitHub Repository</h2>
            <p className="text-xs text-zinc-500 mb-3">
              Optional but required to make automatic fixes. Create a{" "}
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=SEO%20Command%20Center"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                GitHub personal access token
              </a>{" "}
              with <code className="text-xs bg-zinc-800 px-1">repo</code> scope.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
                Repo Owner
              </label>
              <input
                type="text"
                value={githubRepoOwner}
                onChange={(e) => setGithubRepoOwner(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                placeholder="brianhill"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
                Repo Name
              </label>
              <input
                type="text"
                value={githubRepoName}
                onChange={(e) => setGithubRepoName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                placeholder="ppc-website"
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
              Personal Access Token
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500"
              placeholder="ghp_..."
            />
            <p className="text-xs text-zinc-600 mt-1">
              Stored encrypted in the database. Never exposed in the UI after save.
            </p>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim() || !domain.trim() || !productionUrl.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white py-3 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Creating..." : "Connect Site"}
        </button>
      </form>
    </div>
  );
}
