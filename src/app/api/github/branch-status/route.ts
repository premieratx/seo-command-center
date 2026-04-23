import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { compareBranches } from "@/lib/integrations/github";
import { corsHeaders, verifySyncToken } from "@/lib/api-auth";

/**
 * GET /api/github/branch-status?site_id=<uuid>
 *
 * Tells the UI whether the Command Center's working branch (seo-fixes-only
 * by default) is ahead of main. Drives the flashing Publish button.
 */
export async function GET(req: NextRequest) {
  const CORS = corsHeaders(req);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !verifySyncToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const url = new URL(req.url);
  const siteId = url.searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id required" }, { status: 400, headers: CORS });

  const { data: site } = await supabase.from("sites").select("*").eq("id", siteId).single();
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404, headers: CORS });

  const token = site.github_token_encrypted;
  const owner = site.github_repo_owner;
  const repo = site.github_repo_name;
  const base = site.github_default_branch || "main";
  const head = site.current_working_branch || "seo-fixes-only";

  if (!token || !owner || !repo) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400, headers: CORS });
  }

  const status = await compareBranches(token, owner, repo, base, head);
  const prUrl = `https://github.com/${owner}/${repo}/compare/${base}...${head}`;

  return NextResponse.json(
    {
      base,
      head,
      ...status,
      has_unpublished_changes: status.ahead_by > 0,
      pr_url: prUrl,
    },
    { headers: CORS },
  );
}
