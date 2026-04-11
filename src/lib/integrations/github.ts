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
