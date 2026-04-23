"use client";

import { useState } from "react";

/**
 * "Refresh SEMRush AI Data" button.
 *
 * Two scrape modes:
 *   1. Automated (server-side) — POST /api/ai-visibility-refresh →
 *      Playwright with stored SEMRUSH_SESSION_COOKIE → Claude Opus parses →
 *      Supabase. Runs fully unattended once env is set up.
 *   2. Via Chrome (manual) — opens the 4 SEMRush AI Visibility surfaces
 *      in your authenticated Chrome tabs with instructions to screenshot
 *      each view and drop into the Bulk Ingest widget below. Works on
 *      the live site today without any server-side setup.
 *
 * See docs/ai-visibility-refresh-pipeline.md for environment configuration.
 */
const SEMRUSH_SURFACES: Array<{ label: string; path: string }> = [
  { label: "Narrative Drivers", path: "/ai-seo/narrative-drivers/" },
  { label: "Brand Performance", path: "/ai-seo/brand-performance/" },
  { label: "Perception", path: "/ai-seo/perception/" },
  { label: "Questions", path: "/ai-seo/questions/" },
];

function openSemrushInChrome() {
  // Opens each AI Visibility surface in a new tab. The user's authenticated
  // SEMRush session is used (no cookies transmitted server-side). If the
  // user's Claude Chrome extension is installed and listening, it can scrape
  // each tab directly. Otherwise the user screenshots each surface and drops
  // into the Bulk Ingest widget below.
  const base =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "https://www.semrush.com"
      : "https://www.semrush.com";
  // Pull pid/fid from env-injected build-time constants, or fall back to the
  // PPC defaults (same IDs shown in the extract metadata).
  const pid = process.env.NEXT_PUBLIC_SEMRUSH_PID || "122198";
  const fid = process.env.NEXT_PUBLIC_SEMRUSH_FID || "8797552";

  for (const s of SEMRUSH_SURFACES) {
    const url = `${base}${s.path}?pid=${pid}&fid=${fid}`;
    window.open(url, `_blank_${s.path}`, "noopener,noreferrer");
  }
}

type Mode = "agent" | "server";

export default function SemrushAiRefreshButton({ siteId }: { siteId: string }) {
  const [mode, setMode] = useState<Mode>("agent");
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<{
    extracts?: number;
    sov?: number;
    insights?: number;
    sentiment?: number;
    failed?: number;
    elapsed?: number;
    error?: string;
    hint?: string;
    message?: string;
  }>({});

  const run = async () => {
    setState("running");
    setResult({});
    const endpoint =
      mode === "agent" ? "/api/ai-visibility-trigger" : "/api/ai-visibility-refresh";
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setState("error");
        setResult({ error: json?.error, hint: json?.hint || json?.detail });
        return;
      }
      setState("done");
      if (mode === "agent") {
        setResult({ message: json.message });
      } else {
        setResult({
          extracts: json.extracts,
          sov: json.share_of_voice_rows,
          insights: json.insights_rows,
          sentiment: json.sentiment_rows,
          failed: json.failed,
          elapsed: json.elapsed_ms,
        });
      }
    } catch (err) {
      setState("error");
      setResult({ error: err instanceof Error ? err.message : String(err) });
    }
  };

  const modeCopy =
    mode === "agent"
      ? "Triggers a remote Claude Code agent (via the SEMRush Agent env on claude.ai). The agent opens SEMRush in its connected Chrome tab, iterates all 13 surface×LLM combinations, and posts extracted text through the Claude Opus parser into Supabase. Runs in the background, 1–3 min."
      : "Runs Playwright server-side on Netlify with a stored SEMRush session cookie. Same scrape, no Chrome involved. Requires one-time env setup (SEMRUSH_SESSION_COOKIE + deps).";

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold text-base text-white">Refresh SEMRush AI Data</h3>
            <div className="flex gap-0.5 bg-[#0a0a0a] border border-[#262626] rounded p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setMode("agent")}
                className={`px-2 py-0.5 rounded transition-colors ${mode === "agent" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Agent (Chrome)
              </button>
              <button
                type="button"
                onClick={() => setMode("server")}
                className={`px-2 py-0.5 rounded transition-colors ${mode === "server" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                Server (Playwright)
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">{modeCopy}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={run}
            disabled={state === "running"}
            className={`text-sm rounded px-4 py-2 font-medium whitespace-nowrap transition-colors ${
              state === "running"
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {state === "running"
              ? mode === "agent"
                ? "Dispatching…"
                : "Refreshing…"
              : "↻ Refresh"}
          </button>
          <button
            type="button"
            onClick={openSemrushInChrome}
            className="text-xs text-zinc-400 hover:text-blue-400 underline underline-offset-4 transition-colors whitespace-nowrap"
            title="Opens all 4 SEMRush AI Visibility surfaces in your authenticated Chrome tabs for manual screenshot + Bulk Ingest."
          >
            or open in Chrome &rarr;
          </button>
        </div>
      </div>

      {state === "running" && (
        <div className="mt-3 text-xs text-blue-300 flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          {mode === "agent"
            ? "Dispatching remote Claude agent. The agent will scrape SEMRush in the background (1–3 min) and post data via the ingest endpoint. Safe to leave this tab — refresh in a couple minutes."
            : "Scraping SEMRush AI Visibility surfaces. This takes 1–3 minutes — safe to leave the tab."}
        </div>
      )}

      {state === "done" && mode === "agent" && (
        <div className="mt-3 text-xs text-emerald-400 space-y-1">
          <div className="font-medium">✓ Remote agent dispatched</div>
          <div className="text-zinc-400 leading-relaxed">{result.message}</div>
          <div className="text-zinc-500">Refresh this page in 2–3 minutes to see the new data below.</div>
        </div>
      )}

      {state === "done" && mode === "server" && (
        <div className="mt-3 text-xs text-emerald-400 space-y-1">
          <div className="font-medium">✓ Refresh complete in {Math.round((result.elapsed ?? 0) / 1000)}s</div>
          <div className="text-zinc-400 flex flex-wrap gap-x-4 gap-y-1">
            <span>{result.extracts} surfaces scraped</span>
            <span>{result.sov} SoV rows</span>
            <span>{result.insights} insights</span>
            <span>{result.sentiment} sentiment rows</span>
            {(result.failed ?? 0) > 0 && (
              <span className="text-amber-400">{result.failed} failed</span>
            )}
          </div>
          <div className="text-zinc-500">Refresh the page to see the new data below.</div>
        </div>
      )}

      {state === "error" && (
        <div className="mt-3 text-xs text-red-400 space-y-2">
          <div className="font-medium">✗ Refresh failed</div>
          {result.error && <div className="text-zinc-400">{result.error}</div>}
          {result.hint && <div className="text-amber-400 leading-relaxed">{result.hint}</div>}

          {mode === "agent" &&
            result.error &&
            /Chrome MCP not connected|extension|authenticated/i.test(result.error + (result.hint || "")) && (
              <div className="border border-amber-900/40 bg-amber-900/10 rounded p-2.5 text-amber-200 leading-relaxed">
                <div className="font-semibold mb-1">Fix: Enable Chrome extension + retry</div>
                <ol className="list-decimal list-inside space-y-1 text-[11px]">
                  <li>
                    Open your Claude Chrome extension — confirm the icon shows &ldquo;Connected.&rdquo; If
                    not, click the icon and sign in.
                  </li>
                  <li>
                    In Chrome, make sure <strong>semrush.com</strong> is logged in (any SEMRush page). The
                    agent reuses your cookie.
                  </li>
                  <li>Click &ldquo;↻ Refresh&rdquo; again.</li>
                </ol>
              </div>
            )}

          <div className="pt-1">
            <button
              type="button"
              onClick={openSemrushInChrome}
              className="inline-block bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] text-zinc-200 rounded px-3 py-1.5 text-xs transition-colors"
            >
              Open SEMRush in Chrome →
            </button>
            <div className="text-zinc-500 text-[11px] leading-relaxed mt-1.5">
              Fallback: opens all 4 surfaces in your logged-in Chrome. Screenshot each and drop into the
              Bulk Ingest panel below.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
