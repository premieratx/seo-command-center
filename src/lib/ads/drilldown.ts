// Drill-down data builder. Given a campaign id + platform, returns ad
// groups, search terms / creatives and ad copy. Currently emits realistic
// synthetic data driven from the campaign's name keywords; once the live
// REST adapters in google.ts / meta.ts are extended with GAQL ad_group +
// search_term_view + ad_group_ad queries, the same component swaps over
// without UI changes.

import type { AdPlatform, AdMetrics } from "./types";
import type {
  AdGroup,
  CreativeRow,
  DrilldownPayload,
  SearchTerm,
} from "./drilldown-types";
import { SAMPLE_GOOGLE_CAMPAIGNS, SAMPLE_META_CAMPAIGNS } from "./sample-data";

function metrics(
  impressions: number,
  clicks: number,
  cost: number,
  conversions: number,
  conversion_value: number,
): AdMetrics {
  return {
    impressions,
    clicks,
    cost,
    conversions,
    conversion_value,
    ctr: impressions > 0 ? clicks / impressions : 0,
    cpc: clicks > 0 ? cost / clicks : 0,
    cpa: conversions > 0 ? cost / conversions : 0,
    roas: cost > 0 ? conversion_value / cost : 0,
  };
}

// Pseudo-random but deterministic, seeded by string. Same campaign id always
// produces the same drill-down — important so refresh doesn't shuffle data.
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h = (h ^= h >>> 16) >>> 0;
    return h / 4294967296;
  };
}

// Pick keyword roots from the campaign name to make the synthetic search
// terms feel domain-relevant.
function keywordRoots(campaignName: string): string[] {
  const tokens = campaignName
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(
      (t) =>
        t.length > 2 &&
        !["the", "and", "for", "search", "video", "feed", "reels", "stories", "ads"].includes(t),
    );
  return tokens.length > 0 ? tokens : ["austin", "boat", "party"];
}

const META_NAMES = ["Reel A", "Reel B", "Carousel A", "Static A", "Static B", "Story A"];
const META_HEADLINES = [
  "The Lake Travis party boat experience guests rave about",
  "Bachelorette weekends, made effortless",
  "Lake Travis sunset cruises starting at $850",
  "Why Austin picks Premier — fleet of 4, 4.9★ rating",
  "Corporate offsites with a captain, BYOB, no surprises",
];

function buildAdGroups(name: string, total: AdMetrics, rand: () => number): AdGroup[] {
  const roots = keywordRoots(name);
  const segments = Math.min(4, Math.max(2, roots.length));
  const labels = roots.slice(0, segments).map((r) => r.charAt(0).toUpperCase() + r.slice(1));
  // Distribute totals across ad groups using random weights, leading group
  // takes ~50% by convention.
  const weights = labels.map((_, i) => (i === 0 ? 0.5 : 0.5 / (segments - 1)) * (0.85 + rand() * 0.3));
  const wsum = weights.reduce((a, b) => a + b, 0);
  return labels.map((label, i) => {
    const f = weights[i] / wsum;
    return {
      id: `${name.replace(/\s+/g, "-")}-ag-${i + 1}`,
      name: `${label} · keyword group`,
      status: rand() > 0.85 ? "PAUSED" : "ENABLED",
      metrics: metrics(
        Math.round(total.impressions * f),
        Math.round(total.clicks * f),
        Math.round(total.cost * f * 100) / 100,
        Math.round(total.conversions * f),
        Math.round(total.conversion_value * f),
      ),
    };
  });
}

function buildSearchTerms(
  platform: AdPlatform,
  name: string,
  total: AdMetrics,
  rand: () => number,
): SearchTerm[] {
  if (platform === "meta") {
    // Meta gets per-creative-format rows, not search terms — return [] and
    // rely on the creatives column instead.
    return [];
  }
  const roots = keywordRoots(name);
  const seedQueries: string[] = [];
  for (const r of roots) {
    seedQueries.push(`${r} austin`);
    seedQueries.push(`best ${r}`);
    seedQueries.push(`${r} rental`);
    seedQueries.push(`${r} near me`);
  }
  // Toss in a couple of clearly off-target queries so the operator has
  // something to mark as negative.
  seedQueries.push("rent a boat to buy");
  seedQueries.push(`${roots[0]} jobs`);
  return seedQueries.slice(0, 8).map((query, i) => {
    const f = 0.3 / (i + 1) + rand() * 0.04;
    const flagged = i >= 6;
    return {
      query,
      matched_keyword: flagged ? null : roots[0] || null,
      flagged_negative: flagged,
      metrics: metrics(
        Math.round(total.impressions * f),
        Math.round(total.clicks * f),
        Math.round(total.cost * f * 100) / 100,
        flagged ? 0 : Math.max(0, Math.round(total.conversions * f * 0.6)),
        flagged ? 0 : Math.round(total.conversion_value * f * 0.6),
      ),
    };
  });
}

function buildCreatives(
  platform: AdPlatform,
  name: string,
  total: AdMetrics,
  rand: () => number,
): CreativeRow[] {
  const roots = keywordRoots(name);
  const headlines = platform === "google"
    ? [
        `${roots[0]?.charAt(0).toUpperCase()}${roots[0]?.slice(1) || ""} on Lake Travis · 4 boats`,
        `Premier Party Cruises — 4.9★ · BYOB · Anderson Mill Marina`,
        `Book today, captain included, fleet of 4 — see availability`,
      ]
    : META_HEADLINES.slice(0, 3);
  const descriptions = platform === "google"
    ? [
        "Anderson Mill Marina · 25 min from downtown · BYOB · captains licensed",
        "From $200/hr · 4-hour minimum · Day Tripper to Clever Girl",
        null,
      ]
    : ["Sponsored", null, null];

  return headlines.map((h, i) => {
    const labels = platform === "google" ? `Ad ${i + 1}` : META_NAMES[i] || `Creative ${i + 1}`;
    const f = 0.4 - i * 0.1 + rand() * 0.05;
    const status: "ENABLED" | "PAUSED" = i === headlines.length - 1 ? "PAUSED" : "ENABLED";
    return {
      id: `${labels.toLowerCase().replace(/\s+/g, "-")}-${i}`,
      headline: h,
      description: descriptions[i],
      status,
      quality: platform === "google" ? Math.round(7 + rand() * 3) : Math.round(60 + rand() * 35),
      metrics: metrics(
        Math.round(total.impressions * f),
        Math.round(total.clicks * f),
        Math.round(total.cost * f * 100) / 100,
        Math.round(total.conversions * f),
        Math.round(total.conversion_value * f),
      ),
    };
  });
}

export function getDrilldown(platform: AdPlatform, campaignId: string): DrilldownPayload | null {
  const pool = platform === "google" ? SAMPLE_GOOGLE_CAMPAIGNS : SAMPLE_META_CAMPAIGNS;
  const campaign = pool.find((c) => c.id === campaignId);
  if (!campaign) return null;

  const rand = seeded(`${platform}:${campaignId}`);
  return {
    platform,
    campaign_id: campaignId,
    campaign_name: campaign.name,
    ad_groups: buildAdGroups(campaign.name, campaign.metrics, rand),
    search_terms: buildSearchTerms(platform, campaign.name, campaign.metrics, rand),
    creatives: buildCreatives(platform, campaign.name, campaign.metrics, rand),
    is_sample_data: true,
  };
}
