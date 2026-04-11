import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBranch } from "@/lib/integrations/github";

/**
 * POST /api/fix-session/create
 * Body: { site_id, name, description, issue_ids: string[] }
 *
 * Creates a fix session:
 * 1. Creates a working branch in GitHub
 * 2. Inserts fix_session + fixes rows
 * 3. Returns the session for the UI to show
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { site_id, name, description, issue_ids } = body;
  if (!site_id || !name) {
    return NextResponse.json({ error: "site_id and name required" }, { status: 400 });
  }

  const { data: site } = await supabase.from("sites").select("*").eq("id", site_id).single();
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  // Generate branch name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  const branch_name = `seo-fixes/${date}-${slug}-${Math.random().toString(36).slice(2, 6)}`;

  // Try to create branch if GitHub is connected
  let branchCreated = false;
  if (site.github_token_encrypted && site.github_repo_owner && site.github_repo_name) {
    try {
      await createBranch(
        site.github_token_encrypted,
        site.github_repo_owner,
        site.github_repo_name,
        branch_name,
        site.github_default_branch || "main",
      );
      branchCreated = true;
    } catch (e) {
      console.error("Branch creation failed:", e);
    }
  }

  // Insert fix session
  const { data: session, error: sessionErr } = await supabase
    .from("fix_sessions")
    .insert({
      site_id,
      name,
      description: description || null,
      branch_name,
      status: "draft",
    })
    .select()
    .single();
  if (sessionErr || !session) {
    return NextResponse.json({ error: sessionErr?.message || "Failed to create session" }, { status: 500 });
  }

  // Mark linked issues as in_progress
  if (issue_ids && Array.isArray(issue_ids) && issue_ids.length > 0) {
    await supabase
      .from("audit_issues")
      .update({ status: "in_progress", fixed_in_session_id: session.id })
      .in("id", issue_ids);
  }

  // Update site with current working branch
  await supabase.from("sites").update({ current_working_branch: branch_name }).eq("id", site_id);

  return NextResponse.json({
    session,
    branch_created_on_github: branchCreated,
  });
}
