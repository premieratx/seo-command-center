import { NextResponse } from "next/server";
import { getGoogleAdsData } from "@/lib/ads/google";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ads/google
 *
 * Returns the Google Ads dashboard payload: 30-day summary + per-campaign
 * rows. Falls back to sample data when credentials aren't configured so the
 * dashboard renders cleanly on first load.
 */
export async function GET() {
  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getGoogleAdsData();
  return NextResponse.json(data, {
    headers: { "cache-control": "private, max-age=60" },
  });
}
