/**
 * GitHub API client using Octokit.
 * Uses per-site github_token_encrypted for auth.
 */
import { Octokit } from "@octokit/rest";

export function octokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

export async function listRepoFiles(
  token: string,
  owner: string,
  repo: string,
  ref = "main",
  path = "",
): Promise<{ name: string; path: string; type: "file" | "dir"; size?: number }[]> {
  const oc = octokit(token);
  const res = await oc.rest.repos.getContent({ owner, repo, path, ref });
  if (!Array.isArray(res.data)) {
    return [{ name: res.data.name, path: res.data.path, type: "file" }];
  }
  return res.data.map((item) => ({
    name: item.name,
    path: item.path,
    type: item.type as "file" | "dir",
    size: item.size,
  }));
}

export async function getFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref = "main",
): Promise<{ content: string; sha: string }> {
  const oc = octokit(token);
  const res = await oc.rest.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(res.data) || res.data.type !== "file") {
    throw new Error("Path is not a file");
  }
  const content = Buffer.from(res.data.content, "base64").toString("utf8");
  return { content, sha: res.data.sha };
}

export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  newBranch: string,
  fromBranch = "main",
): Promise<void> {
  const oc = octokit(token);
  // Get the SHA of the source branch
  const ref = await oc.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${fromBranch}`,
  });
  // Create new branch
  await oc.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${newBranch}`,
    sha: ref.data.object.sha,
  });
}

export async function commitFileChange(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  newContent: string,
  commitMessage: string,
): Promise<{ commit_sha: string }> {
  const oc = octokit(token);
  // Get existing file sha
  let sha: string | undefined;
  try {
    const existing = await oc.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if (!Array.isArray(existing.data) && existing.data.type === "file") {
      sha = existing.data.sha;
    }
  } catch {
    // File doesn't exist yet — will create
  }

  const res = await oc.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: commitMessage,
    content: Buffer.from(newContent, "utf8").toString("base64"),
    branch,
    sha,
  });
  return { commit_sha: res.data.commit.sha! };
}

export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  head: string,
  base: string,
  title: string,
  body: string,
): Promise<{ number: number; url: string }> {
  const oc = octokit(token);
  const res = await oc.rest.pulls.create({ owner, repo, head, base, title, body });
  return { number: res.data.number, url: res.data.html_url };
}

export async function mergePullRequest(
  token: string,
  owner: string,
  repo: string,
  pull_number: number,
): Promise<void> {
  const oc = octokit(token);
  await oc.rest.pulls.merge({ owner, repo, pull_number, merge_method: "squash" });
}

/**
 * Full branch-diff for the "pending changes" dropdown. Returns per-file
 * patch text (truncated) so Claude can summarize it into natural English.
 */
export async function getBranchDiff(
  token: string,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<{
  ahead_by: number;
  commits: Array<{ sha: string; message: string; date: string }>;
  files: Array<{ filename: string; status: string; additions: number; deletions: number; patch?: string }>;
}> {
  const oc = octokit(token);
  try {
    const res = await oc.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${base}...${head}`,
    });
    return {
      ahead_by: res.data.ahead_by || 0,
      commits: (res.data.commits || []).map((c) => ({
        sha: c.sha,
        message: c.commit.message.split("\n")[0].slice(0, 180),
        date: c.commit.author?.date || "",
      })),
      files: (res.data.files || []).map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions || 0,
        deletions: f.deletions || 0,
        patch: f.patch ? f.patch.slice(0, 4000) : undefined,
      })),
    };
  } catch {
    return { ahead_by: 0, commits: [], files: [] };
  }
}

/**
 * Compare two branches and return how far ahead `head` is vs `base`.
 * Powers the flashing Publish button: when seo-fixes-only is ahead of
 * main, the dashboard surfaces unpublished work.
 */
export async function compareBranches(
  token: string,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<{ ahead_by: number; behind_by: number; commits: Array<{ sha: string; message: string; date: string; author: string }>; files_changed: number }> {
  const oc = octokit(token);
  try {
    const res = await oc.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${base}...${head}`,
    });
    return {
      ahead_by: res.data.ahead_by || 0,
      behind_by: res.data.behind_by || 0,
      files_changed: res.data.files?.length || 0,
      commits: (res.data.commits || []).map((c) => ({
        sha: c.sha,
        message: c.commit.message.split("\n")[0].slice(0, 140),
        date: c.commit.author?.date || "",
        author: c.commit.author?.name || "",
      })),
    };
  } catch {
    // Branch probably doesn't exist yet
    return { ahead_by: 0, behind_by: 0, commits: [], files_changed: 0 };
  }
}
