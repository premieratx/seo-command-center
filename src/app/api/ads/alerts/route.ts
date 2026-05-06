import { NextResponse } from "next/server";
import { getGoogleAdsData } from "@/lib/ads/google";
import { getMetaAdsData } from "@/lib/ads/meta";
import { detectAlerts } from "@/lib/ads/alerts";

/**
 * GET /api/ads/alerts
 *
 * Cross-platform Ad Loop alerts — waste, ROAS drops, creative fatigue,
 * scale opportunities. No auth gate (sample data when unconfigured); auth
 * follows the same rule as /api/ads/overview if/when we add it.
 */
export async function GET() {
  const [google, meta] = await Promise.all([getGoogleAdsData(), getMetaAdsData()]);
  const alerts = detectAlerts([...google.campaigns, ...meta.campaigns]);
  return NextResponse.json(
    {
      alerts,
      summary: {
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === "critical").length,
        warning: alerts.filter((a) => a.severity === "warning").length,
        info: alerts.filter((a) => a.severity === "info").length,
        estimated_monthly_savings: alerts
          .filter((a) => a.monthly_dollar_impact < 0)
          .reduce((s, a) => s + Math.abs(a.monthly_dollar_impact), 0),
        estimated_monthly_upside: alerts
          .filter((a) => a.monthly_dollar_impact > 0)
          .reduce((s, a) => s + a.monthly_dollar_impact, 0),
      },
    },
    { headers: { "cache-control": "private, max-age=60" } },
  );
}
