"use client";

// Setup guide shown below each platform dashboard. Kept as a single component
// so the steps stay in sync with the actual env vars read in lib/ads/*.

import { useState } from "react";
import type { AdPlatform } from "@/lib/ads/types";

export default function AdLoopSetup({ platform }: { platform: AdPlatform }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8 bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#141414] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true">📘</span>
          <span className="text-sm font-semibold text-white">
            Getting started — connect {platform === "google" ? "Google Ads" : "Meta Ads"}
          </span>
        </div>
        <span className="text-xs text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="px-4 pb-5 pt-1 text-sm text-zinc-300 space-y-5">
          {platform === "google" ? <GoogleSteps /> : <MetaSteps />}
        </div>
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-blue-500/40 pl-4">
      <div className="text-xs uppercase tracking-widest text-blue-400 mb-0.5">Step {n}</div>
      <div className="text-white font-medium mb-1.5">{title}</div>
      <div className="text-sm text-zinc-400 space-y-2">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function GoogleSteps() {
  return (
    <>
      <p className="text-zinc-400">
        There are two ways to connect. Option A (AdLoop bridge) is recommended — it preserves
        AdLoop&apos;s two-step preview/confirm safety model. Option B (direct REST) is lighter
        but skips AdLoop&apos;s audit log.
      </p>

      <div>
        <div className="text-xs uppercase tracking-widest text-blue-300 mb-2">
          Option A · Run the AdLoop MCP server as an HTTP bridge
        </div>
        <Step n={1} title="Install AdLoop">
          <Code>{`pip install adloop
adloop init      # interactive wizard — picks GA4 property + Ads customer`}</Code>
          <p>
            The wizard auto-discovers your GA4 properties and Google Ads accounts using bundled
            OAuth credentials, then writes <code className="text-green-400">~/.adloop/config.yaml</code>.
          </p>
        </Step>
        <Step n={2} title="Start the HTTP bridge">
          <Code>{`adloop serve --http --port 4545 --token mysecret`}</Code>
          <p>
            Leaves the FastMCP server listening on <code className="text-green-400">http://localhost:4545</code>.
            The bridge exposes the same tools as the MCP surface — just over HTTP so this Next.js
            app can reach them.
          </p>
        </Step>
        <Step n={3} title="Point the dashboard at the bridge">
          <p>Add these to your Netlify env vars (or <code className="text-green-400">.env.local</code> for dev):</p>
          <Code>{`ADLOOP_BRIDGE_URL=http://localhost:4545
ADLOOP_BRIDGE_TOKEN=mysecret`}</Code>
          <p className="text-xs text-zinc-500">
            Restart the dev server · open the Google Ads tab · the banner flips to &ldquo;connected&rdquo; and
            your real campaigns load.
          </p>
        </Step>
      </div>

      <div className="pt-2 border-t border-[#1f1f1f]">
        <div className="text-xs uppercase tracking-widest text-blue-300 mb-2 mt-3">
          Option B · Direct Google Ads REST
        </div>
        <Step n={1} title="Get a Google Ads developer token">
          <p>
            Apply at <a className="text-blue-400 hover:text-blue-300 underline" href="https://ads.google.com/aw/apicenter" target="_blank" rel="noreferrer">Ads &gt; Tools &gt; API Center</a>.
            Start with a <em>test-account</em> token for instant access; apply for Basic/Standard later.
          </p>
        </Step>
        <Step n={2} title="Create an OAuth 2.0 client + refresh token">
          <p>
            Google Cloud Console &gt; APIs &amp; Services &gt; Credentials &gt; Create OAuth client (Desktop).
            Then run the one-liner below to mint a refresh token:
          </p>
          <Code>{`npx google-ads-refresh-token --client-id=XXX --client-secret=YYY`}</Code>
        </Step>
        <Step n={3} title="Paste env vars">
          <Code>{`GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=...
GOOGLE_ADS_CUSTOMER_ID=123-456-7890        # the account you want to report on
GOOGLE_ADS_LOGIN_CUSTOMER_ID=111-222-3333  # MCC account id — optional`}</Code>
        </Step>
      </div>

      <div className="pt-2 border-t border-[#1f1f1f] text-xs text-zinc-500">
        Repo · <a className="text-blue-400 hover:text-blue-300 underline" href="https://github.com/kLOsk/adloop" target="_blank" rel="noreferrer">github.com/kLOsk/adloop</a>
      </div>
    </>
  );
}

function MetaSteps() {
  return (
    <>
      <p className="text-zinc-400">
        Meta uses the Marketing API directly via the Graph endpoint. You need a long-lived
        System User access token with <code className="text-green-400">ads_read</code> and{" "}
        <code className="text-green-400">ads_management</code>.
      </p>

      <Step n={1} title="Create a Business Manager system user">
        <p>
          Business Settings &gt; Users &gt; System users &gt; <em>Add</em>. Pick <em>Admin</em> role, then
          assign the Ad Account with full control.
        </p>
      </Step>

      <Step n={2} title="Generate a System User access token">
        <p>
          Business Settings &gt; System users &gt; <em>Generate new token</em>. Pick your Meta app,
          select scopes: <code className="text-green-400">ads_read</code>,{" "}
          <code className="text-green-400">ads_management</code>,{" "}
          <code className="text-green-400">business_management</code>.
        </p>
        <p className="text-xs text-zinc-500">
          System user tokens are long-lived (no 60-day expiry) — perfect for a backend dashboard.
        </p>
      </Step>

      <Step n={3} title="Find your Ad Account ID">
        <p>
          Ads Manager &gt; top-left account dropdown. The ID looks like{" "}
          <code className="text-green-400">act_1234567890</code> (or just{" "}
          <code className="text-green-400">1234567890</code> — either works).
        </p>
      </Step>

      <Step n={4} title="Paste env vars">
        <Code>{`META_ADS_ACCESS_TOKEN=EAAG...
META_ADS_AD_ACCOUNT_ID=1234567890
META_ADS_API_VERSION=v19.0   # optional — defaults to v19.0`}</Code>
      </Step>

      <div className="pt-2 border-t border-[#1f1f1f] text-xs text-zinc-500">
        Graph API docs ·{" "}
        <a
          className="text-blue-400 hover:text-blue-300 underline"
          href="https://developers.facebook.com/docs/marketing-api/reference/ad-account"
          target="_blank"
          rel="noreferrer"
        >
          developers.facebook.com
        </a>
      </div>
    </>
  );
}
