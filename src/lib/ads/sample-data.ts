// Sample data used when the dashboard is opened without Google Ads / Meta
// credentials configured. Lets the operator see exactly what the dashboard
// looks like before wiring up the real APIs, and gives the AI agents
// something to reason about during demos.

import type { Campaign, AdMetrics } from "./types";

function roll(
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

export const SAMPLE_GOOGLE_CAMPAIGNS: Campaign[] = [
  {
    id: "sample-g-1",
    platform: "google",
    name: "Search · Bachelorette Party Austin",
    status: "ENABLED",
    channel: "SEARCH",
    daily_budget: 75,
    bidding_strategy: "Maximize Conversions (tCPA $45)",
    metrics: roll(48210, 1842, 2184.5, 62, 18720),
    start_date: "2026-03-01",
    end_date: null,
  },
  {
    id: "sample-g-2",
    platform: "google",
    name: "Search · Lake Travis Party Boat",
    status: "ENABLED",
    channel: "SEARCH",
    daily_budget: 50,
    bidding_strategy: "Maximize Clicks (max CPC $4.20)",
    metrics: roll(32011, 1107, 1420.3, 38, 11240),
    start_date: "2026-02-12",
    end_date: null,
  },
  {
    id: "sample-g-3",
    platform: "google",
    name: "PMax · Private Cruises (Summer 2026)",
    status: "ENABLED",
    channel: "PERFORMANCE_MAX",
    daily_budget: 120,
    bidding_strategy: "Maximize Conversion Value (tROAS 400%)",
    metrics: roll(184220, 2481, 3612.9, 94, 32180),
    start_date: "2026-04-01",
    end_date: null,
  },
  {
    id: "sample-g-4",
    platform: "google",
    name: "Search · Bachelor Party Austin",
    status: "PAUSED",
    channel: "SEARCH",
    daily_budget: 40,
    bidding_strategy: "Maximize Conversions",
    metrics: roll(12010, 412, 612.1, 9, 2880),
    start_date: "2026-01-22",
    end_date: null,
  },
  {
    id: "sample-g-5",
    platform: "google",
    name: "Video · Disco Cruise Brand Awareness",
    status: "ENABLED",
    channel: "VIDEO",
    daily_budget: 30,
    bidding_strategy: "Maximum CPV",
    metrics: roll(92481, 481, 412.5, 4, 1240),
    start_date: "2026-03-18",
    end_date: null,
  },
];

export const SAMPLE_META_CAMPAIGNS: Campaign[] = [
  {
    id: "sample-m-1",
    platform: "meta",
    name: "Advantage+ Shopping · Bachelorette Weekends",
    status: "ENABLED",
    channel: "META_ADVANTAGE_PLUS",
    daily_budget: 90,
    objective: "OUTCOME_SALES",
    metrics: roll(214012, 4820, 2210.8, 58, 17400),
    start_date: "2026-03-05",
    end_date: null,
  },
  {
    id: "sample-m-2",
    platform: "meta",
    name: "Reels · Disco Cruise Social Proof",
    status: "ENABLED",
    channel: "META_REELS",
    daily_budget: 45,
    objective: "OUTCOME_AWARENESS",
    metrics: roll(321450, 8214, 1104.2, 21, 6300),
    start_date: "2026-03-20",
    end_date: null,
  },
  {
    id: "sample-m-3",
    platform: "meta",
    name: "Feed · Corporate Team Building Retargeting",
    status: "ENABLED",
    channel: "META_FEED",
    daily_budget: 60,
    objective: "OUTCOME_LEADS",
    metrics: roll(48210, 1820, 812.4, 34, 10200),
    start_date: "2026-02-28",
    end_date: null,
  },
  {
    id: "sample-m-4",
    platform: "meta",
    name: "Stories · Private Cruise Inquiries",
    status: "PAUSED",
    channel: "META_STORIES",
    daily_budget: 25,
    objective: "OUTCOME_LEADS",
    metrics: roll(12048, 321, 212.1, 4, 1200),
    start_date: "2026-01-15",
    end_date: null,
  },
];

export function sumMetrics(items: Campaign[]): AdMetrics {
  const acc = items.reduce(
    (a, c) => {
      a.impressions += c.metrics.impressions;
      a.clicks += c.metrics.clicks;
      a.cost += c.metrics.cost;
      a.conversions += c.metrics.conversions;
      a.conversion_value += c.metrics.conversion_value;
      return a;
    },
    {
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      conversion_value: 0,
    },
  );
  return {
    ...acc,
    ctr: acc.impressions > 0 ? acc.clicks / acc.impressions : 0,
    cpc: acc.clicks > 0 ? acc.cost / acc.clicks : 0,
    cpa: acc.conversions > 0 ? acc.cost / acc.conversions : 0,
    roas: acc.cost > 0 ? acc.conversion_value / acc.cost : 0,
  };
}
