import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAdsData, isGoogleAdsConfigured, readGoogleAdsConfig } from "@/lib/ads/google";
import { getMetaAdsData, isMetaAdsConfigured, readMetaAdsConfig } from "@/lib/ads/meta";
import { getTimeSeries } from "@/lib/ads/timeseries";
import { sumMetrics } from "@/lib/ads/sample-data";

/**
 * GET /api/ads/overview
 *
 * Cross-platform Ad Loop summary: combined spend + conversions + ROAS across
 * Google Ads and Meta, plus a 30-day daily trend series. Auth-gates only
 * when at least one platform is live — sample-data mode is public so the
 * /demo/ad-loop preview page works without a Supabase session.
 */
export async function GET() {
  const anyLive =
    isGoogleAdsConfigured(readGoogleAdsConfig()) ||
    isMetaAdsConfigured(readMetaAdsConfig());
  if (anyLive) {
    const ssr = await createClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [google, meta, ts] = await Promise.all([
    getGoogleAdsData(),
    getMetaAdsData(),
    getTimeSeries(),
  ]);

  const combinedCampaigns = [...google.campaigns, ...meta.campaigns];
  const combinedTotals = sumMetrics(combinedCampaigns);

  return NextResponse.json(
    {
      totals: {
        combined: combinedTotals,
        google: google.summary.totals,
        meta: meta.summary.totals,
      },
      connected: {
        google: google.summary.connected,
        meta: meta.summary.connected,
      },
      counts: {
        google_total: google.campaigns.length,
        google_enabled: google.campaigns.filter((c) => c.status === "ENABLED").length,
        meta_total: meta.campaigns.length,
        meta_enabled: meta.campaigns.filter((c) => c.status === "ENABLED").length,
      },
      top_campaigns: [...combinedCampaigns]
        .sort((a, b) => b.metrics.cost - a.metrics.cost)
        .slice(0, 8),
      series: ts.series,
      date_range: google.summary.date_range,
    },
    { headers: { "cache-control": "private, max-age=60" } },
  );
}
