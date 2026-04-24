// Daily spend + conversions series for the last 30 days, per platform. Used
// by the Overview sub-tab's trend chart. When live credentials aren't
// configured we synthesise a deterministic series from the sample campaigns
// so the chart still renders something reasonable.

import type { AdPlatform, Campaign } from "./types";
import { SAMPLE_GOOGLE_CAMPAIGNS, SAMPLE_META_CAMPAIGNS } from "./sample-data";
import { isGoogleAdsConfigured, readGoogleAdsConfig } from "./google";
import { isMetaAdsConfigured, readMetaAdsConfig } from "./meta";

export interface DayPoint {
  date: string; // yyyy-mm-dd
  google_cost: number;
  google_conversions: number;
  meta_cost: number;
  meta_conversions: number;
}

function last30Dates(): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

// Deterministic-but-wavy synthesiser. Seeded by day index so the chart is
// stable across refreshes — important for demos. Scales each campaign's
// lifetime totals across 30 days with a gentle weekly pattern.
function synthesiseSeries(platform: AdPlatform, campaigns: Campaign[]): DayPoint[] {
  const dates = last30Dates();
  const totalCost = campaigns.reduce((s, c) => s + c.metrics.cost, 0);
  const totalConv = campaigns.reduce((s, c) => s + c.metrics.conversions, 0);

  // weekly shape — weekends lighter for B2B-ish, heavier on Thu/Fri
  const weights = [0.9, 0.95, 1.0, 1.1, 1.15, 1.05, 0.85]; // Sun..Sat
  const costBias = dates.map((d, i) => {
    const dow = new Date(d).getUTCDay();
    const wiggle = 1 + 0.08 * Math.sin(i * 1.3);
    return weights[dow] * wiggle;
  });
  const sumBias = costBias.reduce((a, b) => a + b, 0);

  return dates.map((date, i) => {
    const costFraction = costBias[i] / sumBias;
    const platformCost = totalCost * costFraction;
    const platformConv = Math.round(totalConv * costFraction);
    return {
      date,
      google_cost: platform === "google" ? Math.round(platformCost * 100) / 100 : 0,
      google_conversions: platform === "google" ? platformConv : 0,
      meta_cost: platform === "meta" ? Math.round(platformCost * 100) / 100 : 0,
      meta_conversions: platform === "meta" ? platformConv : 0,
    };
  });
}

export async function getTimeSeries(): Promise<{
  series: DayPoint[];
  connected: { google: boolean; meta: boolean };
}> {
  const googleConnected = isGoogleAdsConfigured(readGoogleAdsConfig());
  const metaConnected = isMetaAdsConfigured(readMetaAdsConfig());

  // For now we always use the synthetic series — live daily breakdown
  // requires separate GAQL (segments.date) + insights time_increment=1 calls
  // that we'll wire in once the primary REST path is battle-tested. The
  // 30-day totals shown in the KPI strip still come from the live APIs.
  const g = synthesiseSeries("google", SAMPLE_GOOGLE_CAMPAIGNS);
  const m = synthesiseSeries("meta", SAMPLE_META_CAMPAIGNS);

  const merged: DayPoint[] = g.map((gd, i) => ({
    date: gd.date,
    google_cost: gd.google_cost,
    google_conversions: gd.google_conversions,
    meta_cost: m[i].meta_cost,
    meta_conversions: m[i].meta_conversions,
  }));

  return {
    series: merged,
    connected: { google: googleConnected, meta: metaConnected },
  };
}
