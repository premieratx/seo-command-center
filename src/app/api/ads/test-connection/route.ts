import { NextRequest, NextResponse } from "next/server";
import { testGoogleAdsConnection } from "@/lib/ads/google";
import { testMetaAdsConnection } from "@/lib/ads/meta";

/**
 * GET /api/ads/test-connection?platform=google|meta
 *
 * Pings the configured ad platform with a low-cost call (Google: SELECT
 * customer.id; Meta: GET /<account>?fields=id,name) and returns a structured
 * verdict so the dashboard can show a green check or a precise error
 * message without forcing a full refresh.
 */
export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform");
  if (platform !== "google" && platform !== "meta") {
    return NextResponse.json(
      { error: "platform=google|meta required" },
      { status: 400 },
    );
  }
  const result =
    platform === "google" ? await testGoogleAdsConnection() : await testMetaAdsConnection();
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
