import { NextResponse } from "next/server";
import { getMetaAdsData } from "@/lib/ads/meta";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ads/meta
 *
 * Returns the Meta Ads dashboard payload: 30-day summary + per-campaign
 * rows. Same contract as /api/ads/google so one dashboard component handles
 * both platforms.
 */
export async function GET() {
  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getMetaAdsData();
  return NextResponse.json(data, {
    headers: { "cache-control": "private, max-age=60" },
  });
}
