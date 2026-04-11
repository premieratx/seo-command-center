import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { commitFileChange } from "@/lib/integrations/github";

/**
 * POST /api/fix-session/apply
 * Body: { fix_session_id, fixes: Array<{file_path, before_content, after_content, change_type, audit_issue_id?, commit_message}> }
 *
 * Applies each fix: commits to the working branch, records the fix row.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fix_session_id, fixes } = body;
  if (!fix_session_id || !Array.isArray(fixes)) {
    return NextResponse.json({ error: "fix_session_id and fixes[] required" }, { status: 400 });
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

  const results: Array<{ file_path: string; ok: boolean; error?: string; commit_sha?: string }> = [];

  for (const fix of fixes) {
    try {
      const { commit_sha } = await commitFileChange(
        site.github_token_encrypted as string,
        site.github_repo_owner as string,
        site.github_repo_name as string,
        session.branch_name,
        fix.file_path,
        fix.after_content,
        fix.commit_message || `SEO fix: ${fix.file_path}`,
      );

      // Record the fix
      await supabase.from("fixes").insert({
        fix_session_id,
        audit_issue_id: fix.audit_issue_id || null,
        file_path: fix.file_path,
        change_type: fix.change_type || "other",
        before_content: fix.before_content || null,
        after_content: fix.after_content,
        applied: true,
        applied_at: new Date().toISOString(),
        github_commit_sha: commit_sha,
      });

      results.push({ file_path: fix.file_path, ok: true, commit_sha });
    } catch (e) {
      results.push({
        file_path: fix.file_path,
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  // Update session status
  const allOk = results.every((r) => r.ok);
  await supabase
    .from("fix_sessions")
    .update({ status: allOk ? "previewing" : "draft" })
    .eq("id", fix_session_id);

  return NextResponse.json({ results, applied: results.filter((r) => r.ok).length });
}
