import { NextResponse } from "next/server";
import { getGoogleAdsData, isGoogleAdsConfigured, readGoogleAdsConfig } from "@/lib/ads/google";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ads/google
 *
 * Returns the Google Ads dashboard payload: 30-day summary + per-campaign
 * rows. Falls back to sample data when credentials aren't configured.
 *
 * Auth gate is relaxed when the platform is unconfigured (sample data only,
 * nothing sensitive). Once env vars wire up a live account, this route
 * requires a Supabase session — the same protection covering /api/ads/action.
 */
export async function GET() {
  if (isGoogleAdsConfigured(readGoogleAdsConfig())) {
    const ssr = await createClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getGoogleAdsData();
  return NextResponse.json(data, {
    headers: { "cache-control": "private, max-age=60" },
  });
}
