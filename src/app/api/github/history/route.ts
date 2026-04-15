import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Octokit } from "@octokit/rest";

/**
 * GET /api/github/history?site_id=...&path=...&limit=30
 *
 * Returns commit history for a file (up to 30 days) for version revert.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const siteId = url.searchParams.get("site_id");
  const filePath = url.searchParams.get("path");
  const limit = parseInt(url.searchParams.get("limit") || "30");

  if (!siteId) return NextResponse.json({ error: "site_id required" }, { status: 400 });

  const { data: site } = await supabase.from("sites").select("*").eq("id", siteId).single();
  if (!site || !site.github_token_encrypted || !site.github_repo_owner || !site.github_repo_name) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  const oc = new Octokit({ auth: site.github_token_encrypted as string });

  try {
    // Get commit history for a specific file or the whole repo
    const params: Record<string, unknown> = {
      owner: site.github_repo_owner as string,
      repo: site.github_repo_name as string,
      per_page: Math.min(limit, 100),
      since: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    if (filePath) {
      params.path = filePath;
    }

    const { data: commits } = await oc.rest.repos.listCommits(params as Parameters<typeof oc.rest.repos.listCommits>[0]);

    const history = commits.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      date: c.commit.author?.date || c.commit.committer?.date,
      author: c.commit.author?.name || c.author?.login || "unknown",
      url: c.html_url,
    }));

    return NextResponse.json({ commits: history });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/github/history
 * Body: { site_id, path, sha }
 *
 * Reverts a file to a specific commit SHA.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { site_id, path, sha } = await req.json();
  if (!site_id || !path || !sha) {
    return NextResponse.json({ error: "site_id, path, and sha required" }, { status: 400 });
  }

  const { data: site } = await supabase.from("sites").select("*").eq("id", site_id).single();
  if (!site || !site.github_token_encrypted || !site.github_repo_owner || !site.github_repo_name) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  const oc = new Octokit({ auth: site.github_token_encrypted as string });
  const owner = site.github_repo_owner as string;
  const repo = site.github_repo_name as string;
  const branch = (site.current_working_branch as string) || "main";

  try {
    // Get file content at the specified SHA
    const { data: fileData } = await oc.rest.repos.getContent({
      owner, repo, path, ref: sha,
    });

    if (Array.isArray(fileData) || fileData.type !== "file") {
      return NextResponse.json({ error: "Path is not a file" }, { status: 400 });
    }

    const oldContent = Buffer.from(fileData.content, "base64").toString("utf8");

    // Get current file SHA on the branch
    const { data: currentFile } = await oc.rest.repos.getContent({
      owner, repo, path, ref: branch,
    });
    const currentSha = !Array.isArray(currentFile) ? currentFile.sha : undefined;

    // Commit the reverted content
    const { data: commit } = await oc.rest.repos.createOrUpdateFileContents({
      owner, repo, path, branch,
      message: `Revert ${path} to version from ${sha.slice(0, 7)}`,
      content: Buffer.from(oldContent).toString("base64"),
      sha: currentSha,
    });

    return NextResponse.json({
      status: "reverted",
      commit_sha: commit.commit.sha,
      reverted_to: sha,
      file: path,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Revert failed" },
      { status: 500 }
    );
  }
}
