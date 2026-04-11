import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPullRequest, mergePullRequest } from "@/lib/integrations/github";

/**
 * POST /api/publish
 * Body: { fix_session_id }
 *
 * Publishes a fix session:
 * 1. Creates a PR from the working branch
 * 2. Immediately merges it (squash merge)
 * 3. Updates status to 'published'
 * 4. Marks linked issues as 'fixed'
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fix_session_id } = await req.json();
  if (!fix_session_id) {
    return NextResponse.json({ error: "fix_session_id required" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("fix_sessions")
    .select("*, sites(*)")
    .eq("id", fix_session_id)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const site = (session as { sites: Record<string, unknown> }).sites;
  if (!site?.github_token_encrypted || !site?.github_repo_owner || !site?.github_repo_name) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  try {
    // Create PR
    const pr = await createPullRequest(
      site.github_token_encrypted as string,
      site.github_repo_owner as string,
      site.github_repo_name as string,
      session.branch_name,
      (site.github_default_branch as string) || "main",
      `SEO fixes: ${session.name}`,
      session.description || `Published via SEO Command Center on ${new Date().toLocaleDateString()}`,
    );

    // Merge it
    await mergePullRequest(
      site.github_token_encrypted as string,
      site.github_repo_owner as string,
      site.github_repo_name as string,
      pr.number,
    );

    // Update session
    await supabase
      .from("fix_sessions")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        github_pr_number: pr.number,
      })
      .eq("id", fix_session_id);

    // Mark linked issues as fixed
    await supabase
      .from("audit_issues")
      .update({ status: "fixed", fixed_at: new Date().toISOString() })
      .eq("fixed_in_session_id", fix_session_id);

    // Clear working branch on site
    await supabase
      .from("sites")
      .update({ current_working_branch: null })
      .eq("id", session.site_id);

    return NextResponse.json({
      ok: true,
      pr_number: pr.number,
      pr_url: pr.url,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Publish failed" },
      { status: 500 },
    );
  }
}
