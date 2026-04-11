import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listRepoFiles, getFileContent } from "@/lib/integrations/github";

/**
 * GET /api/github/files?site_id=...&path=...
 * Lists files in the site's connected repo, or returns file content.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const site_id = req.nextUrl.searchParams.get("site_id");
  const path = req.nextUrl.searchParams.get("path") || "";
  const mode = req.nextUrl.searchParams.get("mode") || "list";
  if (!site_id) return NextResponse.json({ error: "site_id required" }, { status: 400 });

  const { data: site } = await supabase.from("sites").select("*").eq("id", site_id).single();
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  if (!site.github_token_encrypted || !site.github_repo_owner || !site.github_repo_name) {
    return NextResponse.json({ error: "GitHub not connected for this site" }, { status: 400 });
  }

  try {
    if (mode === "content") {
      const data = await getFileContent(
        site.github_token_encrypted,
        site.github_repo_owner,
        site.github_repo_name,
        path,
        site.github_default_branch || "main",
      );
      return NextResponse.json(data);
    }
    const files = await listRepoFiles(
      site.github_token_encrypted,
      site.github_repo_owner,
      site.github_repo_name,
      site.github_default_branch || "main",
      path,
    );
    return NextResponse.json({ files });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GitHub API error" },
      { status: 500 },
    );
  }
}
