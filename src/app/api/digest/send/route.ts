import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";
import { sendEmail, renderWeeklyDigest } from "@/lib/integrations/email";

/**
 * POST /api/digest/send
 * Body: { user_email: string } (optional - defaults to current user)
 *
 * Generates and emails the weekly digest for the current user.
 */
export async function POST(req: NextRequest) {
  // Check sync token FIRST (header OR query param) before Supabase which needs cookies
  const syncToken = req.headers.get("x-seo-sync-token") || new URL(req.url).searchParams.get("token");
  const SYNC_TOKEN = process.env.SEO_SYNC_TOKEN || "ppc-seo-sync-2026";
  const hasSyncToken = syncToken === SYNC_TOKEN;

  let user = null;
  if (!hasSyncToken) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // No auth context available
    }
  }

  if (!user && !hasSyncToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const to = body.user_email || user?.email || "ppcaustin@gmail.com";
  if (!to) return NextResponse.json({ error: "No email address" }, { status: 400 });

  // Create Supabase client for data queries
  const supabase = hasSyncToken
    ? createDirectClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    : await createClient();

  // Get sites — if called via cron (no user), get the default PPC site
  let sites;
  if (user) {
    const { data } = await supabase
      .from("sites")
      .select("*, profiles!inner(user_id)")
      .eq("profiles.user_id", user.id);
    sites = data;
  } else {
    const { data } = await supabase
      .from("sites")
      .select("*")
      .eq("id", "37292000-d661-4238-8ba4-6a53b71c2d07");
    sites = data;
  }

  if (!sites || sites.length === 0) {
    return NextResponse.json({ error: "No sites to report on" }, { status: 400 });
  }

  const site = sites[0];

  // Get fresh recommendations
  const recsQuery = supabase
    .from("recommendations")
    .select("*")
    .eq("site_id", site.id)
    .eq("status", "new")
    .order("priority", { ascending: true })
    .limit(6);
  const { data: recs } = await recsQuery;

  // Get recent fixes count
  const { count: fixCount } = await supabase
    .from("fixes")
    .select("*", { count: "exact", head: true })
    .gte("applied_at", new Date(Date.now() - 7 * 86400000).toISOString());

  const html = renderWeeklyDigest({
    userEmail: to,
    siteName: site.name,
    newRecommendations: (recs || []).map((r) => ({
      title: r.title,
      description: r.description,
      category: r.category,
    })),
    recentFixes: fixCount || 0,
    scoreChange: null,
    dashboardUrl: "https://seo-command-center.netlify.app/profiles",
  });

  const result = await sendEmail({
    to,
    subject: `SEO Digest: ${recs?.length || 0} new recommendations for ${site.name}`,
    html,
  });

  return NextResponse.json(result);
}
