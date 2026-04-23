import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBranchDiff } from "@/lib/integrations/github";
import { corsHeaders, verifySyncToken } from "@/lib/api-auth";
import { getAnthropicKey } from "@/lib/anthropic-key";
import { callClaudeWithFallback, MODEL_CHAIN } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/github/pending-changes?site_id=<uuid>
 *
 * Returns the raw commit list + per-file patches between main and the
 * working branch (seo-fixes-only), PLUS a Claude-generated bullet-point
 * summary of what changed in plain English. Powers the "Pending changes"
 * dropdown next to the flashing Publish Live button.
 *
 * Uses Haiku (cheap + fast) — this is a summary task, not code generation.
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

  const diff = await getBranchDiff(token, owner, repo, base, head);

  if (diff.ahead_by === 0) {
    return NextResponse.json(
      { base, head, ahead_by: 0, summary: null, bullets: [], commits: [], files: [] },
      { headers: CORS },
    );
  }

  // Ask Haiku to produce bullet-point plain-English changes.
  let bullets: string[] = [];
  let summaryError: string | null = null;
  const apiKey = await getAnthropicKey();
  if (apiKey) {
    try {
      const commitsBlock = diff.commits
        .map((c) => `• ${c.sha.slice(0, 7)} — ${c.message}`)
        .join("\n");
      const filesBlock = diff.files
        .map(
          (f) =>
            `### ${f.filename} [${f.status}] +${f.additions}/-${f.deletions}\n${f.patch || "(no patch available)"}`,
        )
        .join("\n\n");

      const prompt = `You are summarizing a set of pending code changes for a non-technical site owner. Explain in plain English what changed and why it matters for their website (SEO / AI visibility / user experience / design).

Return STRICT JSON with this shape: {"bullets": ["...", "...", ...]}

Rules:
- 3–10 short bullets, each one self-contained sentence
- Group related file changes into one bullet (don't list every file)
- Lead with WHAT the user will see/experience, then cite the file briefly
- Mention SEO/AI impact where relevant (new FAQ content, schema, meta, internal links, etc.)
- Never copy code directly. Describe the change in normal English
- Don't include sha hashes or diff notation in the bullets
- If a change is trivial (formatting, typo), say so briefly

COMMITS:
${commitsBlock}

FILE DIFFS (patches truncated):
${filesBlock.slice(0, 60_000)}
`;

      const { response } = await callClaudeWithFallback({
        apiKey,
        models: MODEL_CHAIN.fast,
        body: {
          max_tokens: 1024,
          system:
            "You summarize code diffs for non-technical website owners. Always respond with strict JSON: {\"bullets\": [\"...\", ...]}",
          messages: [{ role: "user", content: prompt }],
        },
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || "";
        // Find the JSON blob; tolerate code fences
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed.bullets)) {
              bullets = parsed.bullets.slice(0, 12).map((b: unknown) => String(b));
            }
          } catch (e) {
            summaryError = `parse: ${e instanceof Error ? e.message : "json"}`;
          }
        }
      } else {
        summaryError = `claude: ${response.status}`;
      }
    } catch (e) {
      summaryError = e instanceof Error ? e.message : "unknown";
    }
  } else {
    summaryError = "no-api-key";
  }

  return NextResponse.json(
    {
      base,
      head,
      ahead_by: diff.ahead_by,
      bullets,
      summary_error: summaryError,
      commits: diff.commits,
      files: diff.files.map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
      })),
    },
    { headers: CORS },
  );
}
