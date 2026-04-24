"use client";

// Ad Loop tab — top-level pane with Overview, Google Ads and Meta Ads
// sub-tabs.
//
// Overview shows the combined picture; each platform sub-tab has its own
// dashboard + AI Insights panel. Routing between sub-tabs is local state —
// the Overview's "Open Google Ads →" buttons flip `sub` directly.

import { useState } from "react";
import AdDashboard from "./AdDashboard";
import AdLoopSetup from "./AdLoopSetup";
import AdOverview from "./AdOverview";
import type { AdPlatform } from "@/lib/ads/types";

type Sub = "overview" | AdPlatform;

const SUBTABS: { id: Sub; label: string; icon: string; blurb: string }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "🏠",
    blurb:
      "Combined Google + Meta snapshot — 30-day spend, conversions, ROAS, daily trend chart, and top-spending campaigns across both platforms.",
  },
  {
    id: "google",
    label: "Google Ads",
    icon: "🟢",
    blurb:
      "Live spend, clicks, conversions, CPA and ROAS for every Google Ads campaign — Search, Performance Max, Display and Video. Pause / enable with a two-step preview-and-confirm.",
  },
  {
    id: "meta",
    label: "Meta Ads",
    icon: "🔵",
    blurb:
      "Unified view of your Meta ad account — Advantage+, Feed, Reels, Stories. Same safety model as Google: preview every mutation before it hits Meta.",
  },
];

export default function AdLoopPane() {
  const [sub, setSub] = useState<Sub>("overview");
  const active = SUBTABS.find((s) => s.id === sub)!;

  return (
    <div>
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-blue-400 mb-2">
            Ad Loop · Google + Meta
          </p>
          <h2 className="text-2xl font-semibold text-white">{active.label}</h2>
          <p className="mt-1 text-sm text-zinc-400 max-w-3xl">{active.blurb}</p>
        </div>
      </div>

      <div className="flex gap-0 border-b border-[#262626] mb-6" role="tablist" aria-label="Ad Loop platform">
        {SUBTABS.map((s) => {
          const isActive = sub === s.id;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setSub(s.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-2 ${
                isActive
                  ? "border-blue-500 text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span aria-hidden="true">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {sub === "overview" ? (
        <AdOverview onJumpTo={(p) => setSub(p)} />
      ) : (
        <>
          <AdDashboard platform={sub} />
          <AdLoopSetup platform={sub} />
        </>
      )}
    </div>
  );
}
