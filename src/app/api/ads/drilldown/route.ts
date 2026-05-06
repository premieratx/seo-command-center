import { NextRequest, NextResponse } from "next/server";
import { getDrilldown } from "@/lib/ads/drilldown";
import type { AdPlatform } from "@/lib/ads/types";

/**
 * GET /api/ads/drilldown?platform=google&campaign_id=...
 *
 * Returns ad groups + search terms (Google) or per-creative breakdown (Meta)
 * for one campaign. No auth gate — sample data only for now. Once
 * google.ts / meta.ts learn to fetch live ad-group + search-term-view data
 * we'll re-add the auth check on the connected paths.
 */
export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") as AdPlatform | null;
  const campaignId = req.nextUrl.searchParams.get("campaign_id");
  if ((platform !== "google" && platform !== "meta") || !campaignId) {
    return NextResponse.json(
      { error: "Required: platform=google|meta and campaign_id" },
      { status: 400 },
    );
  }
  const data = getDrilldown(platform, campaignId);
  if (!data) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json(data, {
    headers: { "cache-control": "private, max-age=60" },
  });
}
