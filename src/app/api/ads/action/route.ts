import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mutateGoogleCampaign } from "@/lib/ads/google";
import { mutateMetaCampaign } from "@/lib/ads/meta";
import type { AdLoopAction } from "@/lib/ads/types";

/**
 * POST /api/ads/action
 *
 * Pause / enable / remove a campaign on Google Ads or Meta.
 *
 * Body: { platform, campaign_id, action, dry_run }
 *
 * AdLoop safety model — every write is two-step:
 *   1. dry_run:true  → returns a preview diff, does NOT call the ad platform
 *   2. dry_run:false → commits the change. Should only be sent after the
 *      operator has reviewed the preview from step 1.
 */
export async function POST(req: NextRequest) {
  const ssr = await createClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Partial<AdLoopAction>;
  const { platform, campaign_id, action, dry_run } = body;
  if (
    (platform !== "google" && platform !== "meta") ||
    typeof campaign_id !== "string" ||
    !campaign_id ||
    (action !== "pause" && action !== "enable" && action !== "remove")
  ) {
    return NextResponse.json(
      { error: "Invalid body — expected { platform, campaign_id, action, dry_run }" },
      { status: 400 },
    );
  }

  const mutate = platform === "google" ? mutateGoogleCampaign : mutateMetaCampaign;
  const result = await mutate(campaign_id, action, dry_run !== false);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
