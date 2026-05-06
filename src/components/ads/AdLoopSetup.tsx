"use client";

// Detailed setup guide rendered below each platform's dashboard. Two sides
// for Google (Option A: AdLoop bridge / Option B: direct REST), one path
// for Meta. Each side ships with copy-paste env-var blocks, real working
// links, and a live "Test connection" button that pings the configured
// platform and shows pass/fail without a redeploy.

import { useState } from "react";
import type { AdPlatform } from "@/lib/ads/types";

type ConnectionResult = {
  connected: boolean;
  status: "ok" | "missing_env" | "auth_failed" | "api_error";
  detail: string;
  account?: Record<string, string | undefined>;
  env: Record<string, boolean>;
  mode?: "bridge" | "rest" | "none";
};

export default function AdLoopSetup({ platform }: { platform: AdPlatform }) {
  const [open, setOpen] = useState(true);

  return (
    <div id="ad-loop-setup" className="mt-8 bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg scroll-mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#141414] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true">📘</span>
          <span className="text-sm font-semibold text-white">
            Connect {platform === "google" ? "Google Ads" : "Meta Ads"} — step by step
          </span>
        </div>
        <span className="text-xs text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="px-4 pb-5 pt-2 text-sm text-zinc-300 space-y-5">
          <TestConnectionPanel platform={platform} />
          {platform === "google" ? <GoogleSteps /> : <MetaSteps />}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Test connection panel
// ─────────────────────────────────────────────────────────────────────────
function TestConnectionPanel({ platform }: { platform: AdPlatform }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/ads/test-connection?platform=${platform}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult((await res.json()) as ConnectionResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setRunning(false);
    }
  }

  const styleByStatus: Record<ConnectionResult["status"] | "idle", string> = {
    idle: "border-[#262626] bg-[#0a0a0a]",
    ok: "border-green-500/40 bg-green-500/5",
    missing_env: "border-amber-500/40 bg-amber-500/5",
    auth_failed: "border-red-500/40 bg-red-500/5",
    api_error: "border-red-500/40 bg-red-500/5",
  };
  const statusKey = result ? result.status : "idle";

  return (
    <div className={`rounded-lg border p-4 ${styleByStatus[statusKey]}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">
            {result?.connected ? "✅" : result ? "❌" : "🧪"}
          </span>
          <div>
            <div className="text-sm font-semibold text-white">Test connection</div>
            <div className="text-xs text-zinc-400">
              Pings the {platform === "google" ? "Google Ads" : "Meta Marketing"} API once and returns the
              account info or a precise error.
            </div>
          </div>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="text-xs px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium"
        >
          {running ? "Testing…" : result ? "Re-test" : "Test now"}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
          Test request failed: {error}
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-3 text-xs">
          <div
            className={`font-mono text-[11px] whitespace-pre-wrap leading-snug ${
              result.connected ? "text-green-200" : "text-red-200"
            }`}
          >
            {result.detail}
          </div>

          {result.account && Object.keys(result.account).length > 0 && (
            <div className="bg-[#0a0a0a] border border-[#262626] rounded p-2.5 space-y-0.5">
              {Object.entries(result.account)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-[11px]">
                    <span className="text-zinc-500">{k}</span>
                    <span className="text-zinc-200 font-mono">{String(v)}</span>
                  </div>
                ))}
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Env vars detected</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(result.env).map(([k, present]) => (
                <li key={k} className="flex items-center gap-2 text-[11px]">
                  <span className={present ? "text-green-400" : "text-zinc-600"}>
                    {present ? "✓" : "○"}
                  </span>
                  <code className={present ? "text-zinc-200" : "text-zinc-500"}>{k}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Shared building blocks
// ─────────────────────────────────────────────────────────────────────────
function Step({
  n,
  title,
  children,
  estimate,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  estimate?: string;
}) {
  return (
    <div className="border-l-2 border-blue-500/40 pl-4">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="text-xs uppercase tracking-widest text-blue-400">Step {n}</div>
        {estimate && <div className="text-[10px] text-zinc-500">· {estimate}</div>}
      </div>
      <div className="text-white font-medium mb-1.5">{title}</div>
      <div className="text-sm text-zinc-400 space-y-2">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  const text = String(children);
  return (
    <div className="relative group">
      <pre className="bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-[11px] text-green-300 overflow-x-auto whitespace-pre">
        {text}
      </pre>
      <button
        onClick={() => navigator.clipboard?.writeText(text).catch(() => {})}
        className="absolute top-1.5 right-1.5 text-[10px] px-2 py-0.5 rounded border border-[#262626] bg-[#0a0a0a] text-zinc-400 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        Copy
      </button>
    </div>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
    >
      {children} <span aria-hidden="true">↗</span>
    </a>
  );
}

function OptionHeader({
  letter,
  title,
  recommended,
  blurb,
}: {
  letter: string;
  title: string;
  recommended?: boolean;
  blurb: string;
}) {
  return (
    <div className="mb-3 mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-widest text-blue-300">Option {letter}</span>
        <span className="text-base font-semibold text-white">{title}</span>
        {recommended && (
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-green-500/40 bg-green-500/10 text-green-300">
            Recommended
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-500">{blurb}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Google Ads — full walkthrough for both options
// ─────────────────────────────────────────────────────────────────────────
function GoogleSteps() {
  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3 text-xs text-zinc-400">
        <strong className="text-zinc-200">Two ways to connect.</strong> Pick whichever you prefer —
        both render the same dashboard. Option A is the simplest (no extra services to host).
        Option B uses the AdLoop Python MCP server, which adds an audit log and dry-run safety
        guards on top of every mutation.
      </div>

      {/* ── Option A · Direct REST ─────────────────────────────────────── */}
      <div>
        <OptionHeader
          letter="A"
          title="Direct Google Ads REST (~15 min)"
          recommended
          blurb="Talks straight to googleads.googleapis.com from this Next.js app. Zero extra infrastructure."
        />

        <div className="space-y-4">
          <Step n={1} title="Apply for a Google Ads developer token" estimate="~5 min · usually approved instantly for test access">
            <p>
              Open the API Center inside your Google Ads account:
              {" "}
              <ExternalLink href="https://ads.google.com/aw/apicenter">
                ads.google.com → Tools &amp; Settings → API Center
              </ExternalLink>
            </p>
            <ol className="list-decimal list-inside text-zinc-400 space-y-1">
              <li>Click <strong className="text-zinc-200">Apply for token</strong></li>
              <li>For company name / website, use <code className="text-green-400">premierpartycruises.com</code></li>
              <li>For access level, pick <strong className="text-zinc-200">Test account</strong> — it&apos;s instant. (Apply for Basic later if you need more than 15 K ops/day.)</li>
              <li>Copy the token from the dashboard once approved</li>
            </ol>
          </Step>

          <Step n={2} title="Create an OAuth 2.0 client" estimate="~3 min">
            <p>
              <ExternalLink href="https://console.cloud.google.com/apis/credentials">
                Google Cloud Console → APIs &amp; Services → Credentials
              </ExternalLink>
              {" "}— if you don&apos;t already have a project, create one first (any name; the
              project itself is just a billing container).
            </p>
            <ol className="list-decimal list-inside text-zinc-400 space-y-1">
              <li>Click <strong className="text-zinc-200">+ Create credentials → OAuth client ID</strong></li>
              <li>Application type: <strong className="text-zinc-200">Desktop app</strong></li>
              <li>Name it &ldquo;Ad Loop CLI&rdquo; (or anything memorable) → Create</li>
              <li>Copy the <code className="text-green-400">client ID</code> and <code className="text-green-400">client secret</code></li>
            </ol>
            <p className="text-[11px] text-zinc-500">
              Also enable the Google Ads API for the project:
              {" "}
              <ExternalLink href="https://console.cloud.google.com/apis/library/googleads.googleapis.com">
                APIs &amp; Services → Library → Google Ads API → Enable
              </ExternalLink>
            </p>
          </Step>

          <Step n={3} title="Mint a refresh token" estimate="~2 min">
            <p>This one-liner opens a browser, you sign in with the Google account that owns the ad account, and it prints a refresh token to your terminal:</p>
            <Code>{`npx google-ads-refresh-token \\
  --client-id="YOUR_CLIENT_ID" \\
  --client-secret="YOUR_CLIENT_SECRET"`}</Code>
            <p className="text-[11px] text-zinc-500">
              Alternative — if you prefer the official tooling:{" "}
              <ExternalLink href="https://developers.google.com/google-ads/api/docs/oauth/playground">
                OAuth Playground walkthrough
              </ExternalLink>
            </p>
          </Step>

          <Step n={4} title="Find your Customer IDs" estimate="~30 sec">
            <p>
              Sign in to <ExternalLink href="https://ads.google.com/">ads.google.com</ExternalLink> — your customer ID is in the top-right corner like <code className="text-green-400">123-456-7890</code>.
            </p>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li><strong className="text-zinc-200">CUSTOMER_ID</strong>: the ad account you want to report on</li>
              <li><strong className="text-zinc-200">LOGIN_CUSTOMER_ID</strong>: only if that ad account sits under an MCC (manager) — use the MCC&apos;s id; otherwise omit</li>
            </ul>
          </Step>

          <Step n={5} title="Add env vars to Netlify" estimate="~2 min">
            <p>
              Open <ExternalLink href="https://app.netlify.com/sites/seo-command-center/settings/env">Site settings → Environment variables</ExternalLink> and paste:
            </p>
            <Code>{`GOOGLE_ADS_DEVELOPER_TOKEN=<from step 1>
GOOGLE_ADS_CLIENT_ID=<from step 2>
GOOGLE_ADS_CLIENT_SECRET=<from step 2>
GOOGLE_ADS_REFRESH_TOKEN=<from step 3>
GOOGLE_ADS_CUSTOMER_ID=1234567890        # no dashes
GOOGLE_ADS_LOGIN_CUSTOMER_ID=9876543210  # only if you have an MCC, else omit`}</Code>
            <p className="text-[11px] text-zinc-500">
              For local dev: put the same vars in <code className="text-green-400">.env.local</code> at the repo root (gitignored).
            </p>
          </Step>

          <Step n={6} title="Redeploy and test" estimate="~3 min">
            <p>
              Trigger a Netlify deploy (or in Claude Code Desktop run <code className="text-green-400">npx netlify deploy --prod</code>). Then come back to this page and click <strong className="text-zinc-200">Test now</strong> at the top of this panel — green check = you&apos;re live.
            </p>
          </Step>
        </div>
      </div>

      {/* ── Option B · AdLoop bridge ───────────────────────────────────── */}
      <div className="border-t border-[#1f1f1f] pt-5">
        <OptionHeader
          letter="B"
          title="AdLoop MCP server bridge (~10 min, but needs Python)"
          blurb="Uses the kLOsk/adloop Python repo. Adds an audit log and dry-run guards. Requires Python 3.11+ on a host the dashboard can reach."
        />

        <div className="space-y-4">
          <Step n={1} title="Install AdLoop" estimate="~1 min">
            <Code>{`pip install adloop`}</Code>
            <p className="text-[11px] text-zinc-500">
              Source + docs:{" "}
              <ExternalLink href="https://github.com/kLOsk/adloop">github.com/kLOsk/adloop</ExternalLink>
            </p>
          </Step>

          <Step n={2} title="Run the wizard" estimate="~3 min">
            <Code>{`adloop init`}</Code>
            <p>
              Auto-discovers your GA4 properties and Google Ads accounts using bundled OAuth
              credentials, then writes <code className="text-green-400">~/.adloop/config.yaml</code>.
              You can re-run it any time to pick a different account.
            </p>
          </Step>

          <Step n={3} title="Start the HTTP bridge" estimate="~30 sec">
            <Code>{`adloop serve --http --port 4545 --token mysecret`}</Code>
            <p>Leaves the FastMCP server listening on <code className="text-green-400">http://localhost:4545</code>.</p>
            <p className="text-[11px] text-zinc-500">
              Production hosting tip: deploy this on Fly.io / Railway / a tiny VM and use that
              public URL instead of localhost. For local-only use, leave it at localhost while
              you develop.
            </p>
          </Step>

          <Step n={4} title="Add 2 env vars" estimate="~1 min">
            <Code>{`ADLOOP_BRIDGE_URL=http://localhost:4545
ADLOOP_BRIDGE_TOKEN=mysecret`}</Code>
            <p className="text-[11px] text-zinc-500">
              When both Option A and Option B vars are set, the bridge wins. To switch back to
              direct REST, just unset <code className="text-green-400">ADLOOP_BRIDGE_URL</code>.
            </p>
          </Step>

          <Step n={5} title="Restart and test" estimate="~30 sec">
            <p>
              Restart the dev server (or trigger a Netlify deploy), then click <strong className="text-zinc-200">Test now</strong> above.
            </p>
          </Step>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="border-t border-[#1f1f1f] pt-5">
        <div className="text-[10px] uppercase tracking-widest text-blue-300 mb-2">Troubleshooting</div>
        <ul className="space-y-2 text-xs text-zinc-400 list-disc list-inside">
          <li>
            <strong className="text-zinc-200">&ldquo;invalid_grant&rdquo; on the OAuth exchange</strong> — refresh token has been revoked. Re-mint it (Step 3) and update <code className="text-green-400">GOOGLE_ADS_REFRESH_TOKEN</code>.
          </li>
          <li>
            <strong className="text-zinc-200">&ldquo;DEVELOPER_TOKEN_NOT_APPROVED&rdquo;</strong> — your token hasn&apos;t been approved for that customer id. Either use a test account or request Basic Access from the API Center.
          </li>
          <li>
            <strong className="text-zinc-200">&ldquo;USER_PERMISSION_DENIED&rdquo;</strong> — wrong <code className="text-green-400">LOGIN_CUSTOMER_ID</code>. If your ad account is under an MCC, that variable must be the MCC&apos;s id.
          </li>
          <li>
            <strong className="text-zinc-200">Bridge unreachable</strong> — Netlify can&apos;t hit <code className="text-green-400">localhost:4545</code>. Either run the dashboard locally too, or deploy the AdLoop server to a public host.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Meta Ads
// ─────────────────────────────────────────────────────────────────────────
function MetaSteps() {
  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0a] border border-[#262626] rounded p-3 text-xs text-zinc-400">
        <strong className="text-zinc-200">Single path.</strong> Meta uses the Marketing API directly via
        Graph. You need a long-lived <em>System User</em> access token with{" "}
        <code className="text-green-400">ads_read</code> +{" "}
        <code className="text-green-400">ads_management</code>.
      </div>

      <div className="space-y-4">
        <Step n={1} title="Create or claim a Meta app" estimate="~3 min">
          <p>
            <ExternalLink href="https://developers.facebook.com/apps/">
              developers.facebook.com → My Apps
            </ExternalLink>
            {" "}— if you don&apos;t already have one, click <strong className="text-zinc-200">Create app</strong>:
          </p>
          <ol className="list-decimal list-inside text-zinc-400 space-y-1">
            <li>App type: <strong className="text-zinc-200">Business</strong></li>
            <li>Add the <strong className="text-zinc-200">Marketing API</strong> product</li>
            <li>Link it to your Business Manager (so it can request access to your ad account)</li>
          </ol>
        </Step>

        <Step n={2} title="Add a Business Manager system user" estimate="~2 min">
          <p>
            <ExternalLink href="https://business.facebook.com/settings/system-users">
              Business Settings → Users → System users
            </ExternalLink>
          </p>
          <ol className="list-decimal list-inside text-zinc-400 space-y-1">
            <li>Click <strong className="text-zinc-200">Add</strong></li>
            <li>Name: <code className="text-green-400">ad-loop-dashboard</code> · Role: <strong className="text-zinc-200">Admin</strong></li>
            <li>
              On the new user&apos;s page, click <strong className="text-zinc-200">Add Assets</strong> →
              Ad accounts → pick yours → <strong className="text-zinc-200">Full control</strong>
            </li>
          </ol>
        </Step>

        <Step n={3} title="Generate a system user access token" estimate="~1 min">
          <ol className="list-decimal list-inside text-zinc-400 space-y-1">
            <li>On the system user&apos;s page, click <strong className="text-zinc-200">Generate new token</strong></li>
            <li>Pick the Meta app from Step 1</li>
            <li>
              Token expiration: <strong className="text-zinc-200">Never</strong> (system user tokens
              are long-lived — exactly what you want for a backend dashboard)
            </li>
            <li>
              Scopes: check <code className="text-green-400">ads_read</code>,{" "}
              <code className="text-green-400">ads_management</code>,{" "}
              <code className="text-green-400">business_management</code>
            </li>
            <li>Click <strong className="text-zinc-200">Generate</strong> and copy the token</li>
          </ol>
        </Step>

        <Step n={4} title="Find your Ad Account ID" estimate="~30 sec">
          <p>
            <ExternalLink href="https://adsmanager.facebook.com">Ads Manager</ExternalLink> → top-left account dropdown.
            The id looks like <code className="text-green-400">act_1234567890</code> (or just{" "}
            <code className="text-green-400">1234567890</code> — the dashboard accepts both).
          </p>
        </Step>

        <Step n={5} title="Add env vars to Netlify" estimate="~1 min">
          <p>
            Open <ExternalLink href="https://app.netlify.com/sites/seo-command-center/settings/env">Site settings → Environment variables</ExternalLink> and paste:
          </p>
          <Code>{`META_ADS_ACCESS_TOKEN=EAAG...your-token...
META_ADS_AD_ACCOUNT_ID=1234567890
META_ADS_API_VERSION=v19.0   # optional — defaults to v19.0`}</Code>
          <p className="text-[11px] text-zinc-500">
            Reference:{" "}
            <ExternalLink href="https://developers.facebook.com/docs/marketing-api/insights">
              Marketing API · Insights endpoint docs
            </ExternalLink>
          </p>
        </Step>

        <Step n={6} title="Redeploy and test" estimate="~3 min">
          <p>
            Trigger a Netlify deploy, then click <strong className="text-zinc-200">Test now</strong> at the top of this panel.
          </p>
        </Step>
      </div>

      {/* Troubleshooting */}
      <div className="border-t border-[#1f1f1f] pt-5">
        <div className="text-[10px] uppercase tracking-widest text-blue-300 mb-2">Troubleshooting</div>
        <ul className="space-y-2 text-xs text-zinc-400 list-disc list-inside">
          <li>
            <strong className="text-zinc-200">&ldquo;Error validating access token&rdquo;</strong> — token revoked or app removed. Re-generate from Step 3.
          </li>
          <li>
            <strong className="text-zinc-200">&ldquo;(#100) Insufficient permission&rdquo;</strong> — system user missing <code className="text-green-400">ads_management</code> scope or the ad account hasn&apos;t been assigned to it. Re-check Step 2.
          </li>
          <li>
            <strong className="text-zinc-200">Token shorter than 100 chars</strong> — that&apos;s a short-lived token, not a system user one. System user tokens start with <code className="text-green-400">EAAG...</code> and are 200+ chars.
          </li>
        </ul>
      </div>
    </div>
  );
}
