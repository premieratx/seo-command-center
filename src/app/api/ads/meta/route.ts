import { NextResponse } from "next/server";
import { getMetaAdsData, isMetaAdsConfigured, readMetaAdsConfig } from "@/lib/ads/meta";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/ads/meta
 *
 * Returns the Meta Ads dashboard payload. Same auth model as
 * /api/ads/google — the gate is relaxed for sample-data mode and re-enabled
 * the moment a live token is configured.
 */
export async function GET() {
  if (isMetaAdsConfigured(readMetaAdsConfig())) {
    const ssr = await createClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getMetaAdsData();
  return NextResponse.json(data, {
    headers: { "cache-control": "private, max-age=60" },
  });
}
