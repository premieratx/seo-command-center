"use client";

// Claude-powered optimization analysis for the current platform's campaigns.
// Sends the campaign dataset to /api/agent-chat (the same multi-agent router
// the SEO tab uses) and streams recommendations back in three bands:
// what to pause, what to scale, what to rewrite.

import { useState } from "react";
import type { AdPlatform, Campaign, AdMetrics } from "@/lib/ads/types";

interface Props {
  platform: AdPlatform;
  campaigns: Campaign[];
  totals: AdMetrics;
}

const PLATFORM_LABEL = { google: "Google Ads", meta: "Meta Ads" } as const;

function buildPrompt(platform: AdPlatform, campaigns: Campaign[], totals: AdMetrics): string {
  const rows = campaigns
    .map((c) => {
      const m = c.metrics;
      return `- ${c.name} [${c.status}, ${c.channel}${c.daily_budget ? `, $${c.daily_budget}/day` : ""}]  spend=$${m.cost.toFixed(0)} conv=${m.conversions} cpa=${m.cpa > 0 ? "$" + m.cpa.toFixed(0) : "—"} roas=${m.roas > 0 ? m.roas.toFixed(2) + "x" : "—"}`;
    })
    .join("\n");

  return `Analyze this ${PLATFORM_LABEL[platform]} account (last 30 days). Identify what to pause, what to scale, and what to fix. Be concrete and quantitative — reference the specific campaign names and numbers below. Return your answer as three short sections:

## PAUSE
(campaigns wasting spend — bullet each one with the reason and projected monthly savings)

## SCALE
(campaigns over-performing where a budget raise would earn more revenue — bullet each with suggested % increase)

## FIX
(campaigns with potential but broken unit economics — bullet each with the one change that would flip it)

Then end with a single line:
READY_TO_EXECUTE: yes   (if every recommendation above is safe to action as-is)
READY_TO_EXECUTE: no — <reason>   (otherwise)

## ACCOUNT TOTALS (30 days)
Spend $${totals.cost.toFixed(0)} · ${totals.clicks} clicks · ${totals.conversions} conversions · CPA ${totals.cpa > 0 ? "$" + totals.cpa.toFixed(0) : "—"} · ROAS ${totals.roas > 0 ? totals.roas.toFixed(2) + "x" : "—"}

## CAMPAIGNS
${rows}`;
}

export default function AdInsights({ platform, campaigns, totals }: Props) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setResponse("");
    setRunning(true);
    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: buildPrompt(platform, campaigns, totals) }],
          agent: "main",
          model: "auto",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Chat failed (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        for (const ev of events) {
          const line = ev.trim();
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) {
              accumulated += parsed.text;
              setResponse(accumulated);
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mt-6 bg-[#0f0f0f] border border-[#1f1f1f] rounded-lg">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#141414] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true">🤖</span>
          <span className="text-sm font-semibold text-white">AI Insights — Claude analyzes your account</span>
          <span className="text-xs text-zinc-500 ml-2">{campaigns.length} campaigns</span>
        </div>
        <span className="text-xs text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="px-4 pb-5 pt-1 text-sm text-zinc-300 space-y-3">
          <p className="text-xs text-zinc-500">
            Sends the 30-day snapshot above to the orchestrator agent, which returns a
            prioritized pause / scale / fix list. Nothing is changed on your ad account —
            you still approve each action from the campaign table.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={run}
              disabled={running || campaigns.length === 0}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2 rounded transition-colors"
            >
              {running ? "Analyzing…" : response ? "Re-analyze" : "Analyze account"}
            </button>
            {response && !running && (
              <button
                onClick={() => navigator.clipboard.writeText(response)}
                className="text-xs px-3 py-2 rounded bg-[#0a0a0a] border border-[#262626] text-zinc-300 hover:border-zinc-500"
              >
                Copy
              </button>
            )}
          </div>
          {error && (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
              {error}
            </div>
          )}
          {response && (
            <pre className="bg-[#0a0a0a] border border-[#262626] rounded px-3 py-3 text-xs text-zinc-200 whitespace-pre-wrap overflow-x-auto font-sans leading-relaxed">
              {response}
            </pre>
          )}
          {running && !response && (
            <div className="text-xs text-zinc-500 italic animate-pulse">
              Claude is reading your account…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
