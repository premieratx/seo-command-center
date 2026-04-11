import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, renderWeeklyDigest } from "@/lib/integrations/email";

/**
 * POST /api/digest/send
 * Body: { user_email: string } (optional - defaults to current user)
 *
 * Generates and emails the weekly digest for the current user.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const to = body.user_email || user.email;
  if (!to) return NextResponse.json({ error: "No email address" }, { status: 400 });

  // Get user's sites
  const { data: sites } = await supabase
    .from("sites")
    .select("*, profiles!inner(user_id)")
    .eq("profiles.user_id", user.id);

  if (!sites || sites.length === 0) {
    return NextResponse.json({ error: "No sites to report on" }, { status: 400 });
  }

  const site = sites[0];

  // Get fresh recommendations
  const { data: recs } = await supabase
    .from("recommendations")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "new")
    .order("priority", { ascending: true })
    .limit(6);

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
