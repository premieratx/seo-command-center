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

      {/* ────────────────────────────────────────────────────────────
          PUBLICATION & DOMAIN SWITCH
          Reference docs that live alongside the site config so the
          operator can find the cutover playbook + publish workflow
          without leaving the Command Center. Static content; mirrors
          CruiseConcierge/CUTOVER.md but written for the operator
          rather than the engineer.
          ──────────────────────────────────────────────────────── */}
      <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 mt-6">
        <h2 className="font-semibold text-lg mb-1">Publication & Domain Switch</h2>
        <p className="text-zinc-500 text-sm mb-4">
          How edits ship to the live site, and how to flip
          <code className="bg-zinc-800 px-1 mx-1 rounded text-xs">premierpartycruises.com</code>
          from Replit to the V2 Netlify deploy when ready.
        </p>

        {/* PUBLICATION FLOW */}
        <details open className="mb-4">
          <summary className="cursor-pointer font-medium text-sm text-zinc-200 hover:text-white py-2">
            Publication flow (how Publish Now works)
          </summary>
          <div className="text-sm text-zinc-400 leading-relaxed space-y-2 pl-1 pt-2">
            <p>
              Every edit you accept in the Command Center stages into the
              <code className="bg-zinc-800 px-1 mx-1 rounded text-xs">staged_edits</code>
              table on Supabase. Nothing is live until you click <strong>Publish Now</strong>.
            </p>
            <p>When you click Publish Now:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>The Edge Function bundles every staged edit into one git commit on the
                <code className="bg-zinc-800 px-1 mx-1 rounded text-xs">seo-fixes-only</code> branch
                of the GitHub repo configured above.</li>
              <li>That single commit pushes to GitHub, which triggers <strong>one</strong> Netlify build.</li>
              <li>The build runs <code className="bg-zinc-800 px-1 mx-1 rounded text-xs">scripts/generate-seo-files.mjs</code> (sitemap, robots.txt, llms.txt, BreadcrumbList JSON-LD, per-route prerender) and ships to
                <code className="bg-zinc-800 px-1 mx-1 rounded text-xs">premier-party-cruises-v2.netlify.app</code>.</li>
              <li>Build typically completes in 3–5 minutes. Sitemap auto-pings Google + Bing on completion.</li>
            </ol>
            <p className="text-amber-300/90 bg-amber-900/10 border border-amber-900/40 rounded p-2 text-xs mt-2">
              ⚠️ <strong>Default branch is <code>seo-fixes-only</code>, NOT <code>main</code>.</strong>
              The <code>main</code> branch is the legacy Replit production deploy. Hands-off unless explicitly requested.
            </p>
          </div>
        </details>

        {/* CUTOVER PLAYBOOK */}
        <details className="mb-4">
          <summary className="cursor-pointer font-medium text-sm text-zinc-200 hover:text-white py-2">
            Domain switch playbook (V2 → premierpartycruises.com)
          </summary>
          <div className="text-sm text-zinc-400 leading-relaxed space-y-3 pl-1 pt-2">
            <p>
              V2 currently lives at
              <code className="bg-zinc-800 px-1 mx-1 rounded text-xs">premier-party-cruises-v2.netlify.app</code>.
              These steps flip apex DNS so V2 becomes the canonical
              <code className="bg-zinc-800 px-1 mx-1 rounded text-xs">premierpartycruises.com</code>.
              <strong className="text-zinc-200"> Fully reversible</strong> — DNS revert restores everything within minutes.
            </p>

            <div className="border border-[#262626] rounded p-3 bg-[#0a0a0a]">
              <p className="text-zinc-200 font-medium mb-2 text-xs uppercase tracking-wide">Step 1 — Pre-flight (engineering)</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Create CNAME <code className="bg-zinc-800 px-1 rounded">api.premierpartycruises.com → &lt;replit-host&gt;.replit.app</code></li>
                <li>Verify <code className="bg-zinc-800 px-1 rounded">curl https://api.premierpartycruises.com/api/health</code> returns 200</li>
                <li>Flip <code className="bg-zinc-800 px-1 rounded">[[redirects]] /api/*</code> in <code>netlify.toml</code> to point at <code>api.premierpartycruises.com</code></li>
                <li>Flip <code className="bg-zinc-800 px-1 rounded">LIVE_HOST</code> in <code>scripts/generate-seo-files.mjs</code> to <code>https://api.premierpartycruises.com</code></li>
                <li>Commit + push these 2 changes to <code>seo-fixes-only</code> BEFORE flipping DNS</li>
              </ul>
            </div>

            <div className="border border-[#262626] rounded p-3 bg-[#0a0a0a]">
              <p className="text-zinc-200 font-medium mb-2 text-xs uppercase tracking-wide">Step 2 — Add domain in Netlify</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Netlify → Site settings → Domains → Add <code className="bg-zinc-800 px-1 rounded">premierpartycruises.com</code> as primary custom domain</li>
                <li>Netlify auto-provisions Let&apos;s Encrypt covering <code>apex</code> + <code>www</code> (this is what clears the 3 infra-only Semrush errors)</li>
                <li>Wait for green checks on both domains</li>
              </ul>
            </div>

            <div className="border border-[#262626] rounded p-3 bg-[#0a0a0a]">
              <p className="text-zinc-200 font-medium mb-2 text-xs uppercase tracking-wide">Step 3 — Flip DNS</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>In your DNS host: point apex + <code>www</code> at Netlify per their on-screen instructions</li>
                <li>Either ALIAS/ANAME apex → <code className="bg-zinc-800 px-1 rounded">apex-loadbalancer.netlify.com</code>, or 4 A records to Netlify IPs</li>
                <li>Wait for DNS propagation (5–60 min). Verify with <code className="bg-zinc-800 px-1 rounded">dig premierpartycruises.com</code></li>
              </ul>
            </div>

            <div className="border border-[#262626] rounded p-3 bg-[#0a0a0a]">
              <p className="text-zinc-200 font-medium mb-2 text-xs uppercase tracking-wide">Step 4 — Post-cutover verification</p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><code className="bg-zinc-800 px-1 rounded">curl -I https://premierpartycruises.com/</code> returns 200 from Netlify (look for <code>x-nf-request-id</code>)</li>
                <li>Sitemap + canonical agreement: <code>/sitemap.xml</code> URLs match each page&apos;s <code>&lt;link rel=&quot;canonical&quot;&gt;</code></li>
                <li>Backend smoke test: book a test charter, post a chat message, submit a lead form. All <code>/api/*</code> calls hit <code>api.*</code> subdomain</li>
                <li>Re-run Semrush audit pointing at <code>premierpartycruises.com</code> — the 3 infra items (4XX/cert/SNI) should auto-clear</li>
                <li>Re-run Lighthouse mobile — confirm LCP &lt;2.5s, TBT &lt;200ms still hold on the new domain</li>
              </ul>
            </div>

            <p className="text-zinc-300 text-xs mt-3">
              <strong>What does NOT need to change:</strong>
              <code className="bg-zinc-800 px-1 mx-1 rounded">SITE_HOST</code>,
              <code className="bg-zinc-800 px-1 mx-1 rounded">CANONICAL_HOST</code>, sitemap entries,
              canonical link tags, og:url, BreadcrumbList JSON-LD —
              all auto-flip via <code className="bg-zinc-800 px-1 rounded">process.env.URL</code> when Netlify&apos;s primary domain changes.
            </p>
            <p className="text-zinc-300 text-xs">
              <strong>Rollback:</strong> revert DNS to point at Replit. The Netlify deploy stays running at the netlify.app subdomain unchanged.
            </p>
            <p className="text-blue-400 text-xs mt-3">
              Full engineering version of this playbook lives in the repo at
              <code className="bg-zinc-800 px-1 mx-1 rounded">CUTOVER.md</code>.
            </p>
          </div>
        </details>

        {/* SLUG ALIGNMENT */}
        <details className="mb-2">
          <summary className="cursor-pointer font-medium text-sm text-zinc-200 hover:text-white py-2">
            Slug alignment (V2 vs Replit)
          </summary>
          <div className="text-sm text-zinc-400 leading-relaxed space-y-2 pl-1 pt-2">
            <p>
              Every V2 page slug matches the Replit production slug 1:1 — the build-time prerender literally fetches each Replit URL at the same path and rewrites the HTML. So once DNS flips, every external link to a Replit URL still resolves at the same path on the V2 deploy.
            </p>
            <p>
              The <strong>new V2-only</strong> pages added through the Command Center work flow are NEW slugs not present on Replit. After cutover those slugs continue working unchanged at <code className="bg-zinc-800 px-1 mx-1 rounded">premierpartycruises.com</code>. AI citations and external links built against the V2 deploy survive cutover.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
