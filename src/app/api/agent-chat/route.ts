import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AGENTS, routeByKeywords } from "@/lib/agents/definitions";
import { corsHeaders, verifySyncToken } from "@/lib/api-auth";
import { getAnthropicKey } from "@/lib/anthropic-key";
import { resolveModelChain } from "@/lib/models";
import {
  getFileContent,
  commitFileChange,
  createBranch,
  listRepoFiles,
  compareBranches,
} from "@/lib/integrations/github";

export const maxDuration = 300;

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * POST /api/agent-chat
 * Body: { messages: [{role, content}], model?: string, site_id: string, agent?: string }
 *
 * Multi-agent chat with REAL TOOL USE. Claude can:
 *   - read_file(path)            → read any file from the connected repo
 *   - list_files(path)           → list a directory on the working branch
 *   - edit_file(path, content,
 *     commit_message)            → COMMIT a change to seo-fixes-only
 *   - branch_status()            → see what's unpublished
 *
 * All commits go to the site's `current_working_branch` (defaults to
 * `seo-fixes-only`). Nothing touches main — the user presses "Publish Live"
 * in the Preview panel to merge.
 *
 * Streams SSE: {agent}, {text}, {tool_use: {name, input}},
 * {tool_result: {name, ok, summary}}, [DONE]. The existing frontend parses
 * {text} already; tool events render as status pills.
 */

type Msg = { role: "user" | "assistant"; content: unknown };

const WORKING_BRANCH_DEFAULT = "seo-fixes-only";

const TOOLS = [
  {
    name: "read_file",
    description:
      "Read a file from the connected GitHub repo on the working branch. Use this BEFORE editing so you see the current content and don't overwrite unrelated code.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Repo-relative file path, e.g. server/ssr/pageContent.ts" },
      },
      required: ["path"],
    },
  },
  {
    name: "list_files",
    description:
      "List files in a directory on the working branch. Useful for discovering file names before reading.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Repo-relative directory path. Empty string lists repo root." },
      },
      required: ["path"],
    },
  },
  {
    name: "edit_file",
    description:
      "Edit and COMMIT a file to the working branch (seo-fixes-only by default). Provide the FULL new file content — not a diff. After editing, the user can review in the Preview panel and click Publish Live to merge. USE THIS when the user asks you to make an actual change.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Repo-relative file path" },
        content: { type: "string", description: "The COMPLETE new file content to write" },
        commit_message: {
          type: "string",
          description:
            "One-line commit message describing the change, 10–90 chars. No trailing period.",
        },
      },
      required: ["path", "content", "commit_message"],
    },
  },
  {
    name: "branch_status",
    description:
      "Check how many commits the working branch is ahead of main and which files changed. Use before suggesting Publish.",
    input_schema: { type: "object", properties: {} },
  },
];

export async function POST(req: NextRequest) {
  const CORS_HEADERS = corsHeaders(req);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthed = !!user || verifySyncToken(req);
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const body = await req.json();
  const { messages, model: requestedModel, site_id, agent: requestedAgent, session_id } = body;
  if (!site_id) {
    return NextResponse.json({ error: "site_id required" }, { status: 400, headers: CORS_HEADERS });
  }

  const apiKey = await getAnthropicKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Anthropic API key configured. Set ANTHROPIC_API_KEY env var." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Route to the agent(s) whose domain matches the request.
  let agentIds: string[] = [];
  if (requestedAgent && AGENTS[requestedAgent]) agentIds = [requestedAgent];
  else {
    const lastUserMsg =
      messages.filter((m: Msg) => m.role === "user").pop()?.content?.toString() || "";
    agentIds = routeByKeywords(lastUserMsg);
  }

  const lastUserMsg =
    messages.filter((m: Msg) => m.role === "user").pop()?.content?.toString() || "";
  const modelChain = resolveModelChain(requestedModel, lastUserMsg, messages.length);

  const primaryAgent = AGENTS[agentIds[0]] || AGENTS.seo;

  // Agent-specific DB context
  let contextBlock = "";
  if (primaryAgent.contextKeys.length > 0) {
    const contextParts: string[] = [];
    for (const key of primaryAgent.contextKeys) {
      try {
        const limit = key === "keywords" ? 100 : key === "audit_issues" ? 50 : key === "audit_pages" ? 30 : 20;
        const { data } = await supabase.from(key).select("*").eq("site_id", site_id).limit(limit);
        if (data && data.length > 0) contextParts.push(`\n${key.toUpperCase()}: ${data.length} records`);
      } catch {
        /* skip */
      }
    }
    contextBlock = contextParts.join("\n");
  }

  const { data: site } = await supabase.from("sites").select("*").eq("id", site_id).single();
  const token: string | null = site?.github_token_encrypted || null;
  const owner: string | null = site?.github_repo_owner || null;
  const repo: string | null = site?.github_repo_name || null;
  const baseBranch: string = site?.github_default_branch || "main";
  const workingBranch: string = site?.current_working_branch || WORKING_BRANCH_DEFAULT;

  const siteInfo = site
    ? `\nSITE: ${site.domain} | GitHub: ${owner}/${repo} | Base: ${baseBranch} | Working branch: ${workingBranch}`
    : "";

  const toolInstructions = token
    ? `
═══ TOOL USE ═══
You have real tools wired to the ${owner}/${repo} repo:
  • read_file(path) — read any file from branch "${workingBranch}"
  • list_files(path) — list a directory
  • edit_file(path, content, commit_message) — COMMIT to branch "${workingBranch}"
  • branch_status() — see what's unpublished

When the user asks you to make a change, DO IT:
  1. read_file the target so you see current content
  2. edit_file with the full updated content + a clear commit message
  3. After your edits, call branch_status to confirm commits landed
  4. Tell the user the change is live on the working branch and instruct them to click "Publish Live" in the Preview panel to merge to ${baseBranch}

NEVER claim you "cannot push code" — the tools above work. Use them.
Always preserve SEO-critical content per the orchestrator rules.
`
    : `
NOTE: GitHub isn't connected for this site — you can plan changes but cannot execute them until the user adds a GitHub token in Settings.`;

  const fullSystemPrompt = `${primaryAgent.systemPrompt}${siteInfo}${contextBlock}${toolInstructions}

${agentIds.length > 1 ? `Note: This request also involves: ${agentIds.slice(1).map((id) => AGENTS[id]?.name || id).join(", ")}.` : ""}`;

  // Conversation messages in Anthropic format. We'll mutate this across the
  // tool-use loop, appending assistant turns and tool_result user turns.
  const convoMessages: Array<{ role: "user" | "assistant"; content: unknown }> = messages.map(
    (m: Msg) => ({ role: m.role, content: m.content }),
  );

  // Persist the user's message if a session_id was provided, and auto-title
  // the session on its first message so the sidebar shows something useful.
  if (session_id) {
    const userMsg = messages.filter((m: Msg) => m.role === "user").pop();
    const userText = typeof userMsg?.content === "string" ? userMsg.content : "";
    if (userText) {
      await supabase.from("chat_messages").insert({
        session_id,
        role: "user",
        content: userText.slice(0, 16_000),
      });
    }
    // If session still has default title, derive one from the first user msg
    try {
      const { data: s } = await supabase
        .from("chat_sessions")
        .select("title, recommendation_id")
        .eq("id", session_id)
        .single();
      if (s && (s.title === "New chat" || !s.title) && userText) {
        const derived = userText.replace(/\s+/g, " ").slice(0, 90).trim();
        await supabase.from("chat_sessions").update({ title: derived || "New chat" }).eq("id", session_id);
      }
      // Mark the linked recommendation as in_progress the first time the user
      // engages with it. Completion happens via the "Mark complete" button.
      if (s?.recommendation_id) {
        await supabase
          .from("ai_insights")
          .update({ task_status: "in_progress" })
          .eq("id", s.recommendation_id)
          .eq("task_status", "not_started");
      }
    } catch {
      /* ignore title derivation failures */
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      // Accumulator for persisting the assistant turn at stream end
      let assistantText = "";
      const assistantMeta: Array<Record<string, unknown>> = [];

      emit({
        agent: { id: primaryAgent.id, name: primaryAgent.name, emoji: primaryAgent.emoji },
      });

      let turn = 0;
      const MAX_TURNS = 6; // hard cap to prevent runaway loops
      const commits: Array<{ path: string; sha: string; message: string }> = [];

      while (turn < MAX_TURNS) {
        turn += 1;

        // Non-streaming call per turn — simpler than managing streaming tool_use
        // blocks. We chunk the returned text ourselves so the UI still feels
        // responsive.
        let data: Record<string, unknown> | null = null;
        let modelUsed = modelChain[0];
        let lastErr: { status: number; body: string } | null = null;

        for (const m of modelChain) {
          const r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: m,
              max_tokens: 8192,
              system: fullSystemPrompt,
              tools: token ? TOOLS : undefined,
              messages: convoMessages,
            }),
          });
          if (r.ok) {
            data = await r.json();
            modelUsed = m;
            break;
          }
          if (r.status === 404) continue; // sunset model, try next
          lastErr = { status: r.status, body: (await r.text()).slice(0, 500) };
          break;
        }

        if (!data) {
          emit({
            error: `Claude API error: ${lastErr?.status ?? "chain exhausted"}`,
            detail: lastErr?.body,
            model_chain: modelChain,
          });
          emit({ text: `\n\n⚠️ Claude API error (${lastErr?.status ?? "chain exhausted"}). Check ANTHROPIC_API_KEY.` });
          break;
        }

        const contentBlocks = (data.content as Array<Record<string, unknown>>) || [];
        const stopReason = data.stop_reason as string;

        // Stream out every text/tool_use block as it appears in the response
        const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
        for (const block of contentBlocks) {
          if (block.type === "text") {
            const t = String(block.text || "");
            assistantText += t;
            // Chunk text for UI responsiveness
            for (let i = 0; i < t.length; i += 64) {
              emit({ text: t.slice(i, i + 64) });
            }
          } else if (block.type === "tool_use") {
            const tu = {
              id: String(block.id),
              name: String(block.name),
              input: (block.input as Record<string, unknown>) || {},
            };
            toolUses.push(tu);
            assistantMeta.push({ tool_use: { name: tu.name, input: redactToolInput(tu.name, tu.input) } });
            emit({
              tool_use: {
                id: tu.id,
                name: tu.name,
                input: redactToolInput(tu.name, tu.input),
              },
            });
          }
        }

        // Add the assistant turn (with tool_use blocks) into the convo
        convoMessages.push({ role: "assistant", content: contentBlocks });

        if (stopReason !== "tool_use" || toolUses.length === 0) break;

        // Execute each tool call, feed results back as the next user turn
        const toolResultBlocks: Array<{ type: string; tool_use_id: string; content: string; is_error?: boolean }> = [];
        for (const tu of toolUses) {
          const { ok, summary, payload } = await runTool(tu.name, tu.input, {
            token,
            owner,
            repo,
            baseBranch,
            workingBranch,
            commits,
          });
          emit({
            tool_result: { id: tu.id, name: tu.name, ok, summary },
          });
          toolResultBlocks.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: payload,
            is_error: !ok,
          });
        }

        // The tool_result blocks go as a new user turn per Anthropic's API
        convoMessages.push({ role: "user", content: toolResultBlocks });
      }

      if (commits.length > 0) {
        emit({ commits });
        const closer = `\n\n✅ **${commits.length} commit${commits.length > 1 ? "s" : ""} pushed to \`${workingBranch}\`.** Review in the Preview panel (switch to "Branch" mode) and click **Publish Live** when you're ready to merge to \`${baseBranch}\`.`;
        assistantText += closer;
        emit({ text: closer });
        emit({ prompt_mark_complete: true });
      }

      // Persist the full assistant turn so it reloads after page refresh.
      if (session_id && assistantText) {
        try {
          await supabase.from("chat_messages").insert({
            session_id,
            role: "assistant",
            content: assistantText.slice(0, 64_000),
            agent: { id: primaryAgent.id, name: primaryAgent.name, emoji: primaryAgent.emoji },
            metadata: { tool_events: assistantMeta, commits },
          });
          // Bump session updated_at so the sidebar re-sorts this to the top
          await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", session_id);
        } catch {
          /* best effort */
        }
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...CORS_HEADERS,
    },
  });
}

/**
 * Execute a tool call against the connected GitHub repo.
 * Returns a short status summary (for UI pills) + the full payload Claude
 * should see (as a plain string — Anthropic wraps it in tool_result).
 */
async function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: {
    token: string | null;
    owner: string | null;
    repo: string | null;
    baseBranch: string;
    workingBranch: string;
    commits: Array<{ path: string; sha: string; message: string }>;
  },
): Promise<{ ok: boolean; summary: string; payload: string }> {
  const { token, owner, repo, baseBranch, workingBranch } = ctx;
  if (!token || !owner || !repo) {
    return {
      ok: false,
      summary: "GitHub not connected",
      payload: "Error: this site has no GitHub credentials. Tell the user to add them in Settings.",
    };
  }

  try {
    if (name === "read_file") {
      const path = String(input.path || "");
      if (!path) return errResult("path required");
      let file;
      try {
        file = await getFileContent(token, owner, repo, path, workingBranch);
      } catch {
        file = await getFileContent(token, owner, repo, path, baseBranch);
      }
      const content = file.content;
      // Cap context injection so huge files don't blow max_tokens
      const capped = content.length > 50_000 ? content.slice(0, 50_000) + "\n\n// [file truncated at 50kb for context]" : content;
      return {
        ok: true,
        summary: `read ${path} (${content.length} chars)`,
        payload: capped,
      };
    }

    if (name === "list_files") {
      const path = String(input.path ?? "");
      const items = await listRepoFiles(token, owner, repo, workingBranch, path);
      return {
        ok: true,
        summary: `listed ${path || "root"} (${items.length} items)`,
        payload: items.map((f) => `${f.type === "dir" ? "[DIR] " : ""}${f.path}`).join("\n"),
      };
    }

    if (name === "edit_file") {
      const path = String(input.path || "");
      const content = String(input.content || "");
      const commit_message = String(input.commit_message || `Update ${path}`).slice(0, 120);
      if (!path || !content) return errResult("path and content required");

      // Ensure working branch exists
      try {
        await createBranch(token, owner, repo, workingBranch, baseBranch);
      } catch {
        /* already exists */
      }

      const { commit_sha } = await commitFileChange(
        token,
        owner,
        repo,
        workingBranch,
        path,
        content,
        commit_message,
      );
      ctx.commits.push({ path, sha: commit_sha, message: commit_message });
      return {
        ok: true,
        summary: `✅ committed ${path} → ${workingBranch} (${commit_sha.slice(0, 7)})`,
        payload: `Committed successfully. path=${path} sha=${commit_sha} branch=${workingBranch}. The change is now on the working branch and can be previewed before publishing.`,
      };
    }

    if (name === "branch_status") {
      const s = await compareBranches(token, owner, repo, baseBranch, workingBranch);
      return {
        ok: true,
        summary: `${s.ahead_by} ahead · ${s.files_changed} files`,
        payload: `ahead_by=${s.ahead_by} behind_by=${s.behind_by} files_changed=${s.files_changed}\nCommits:\n${s.commits.map((c) => `- ${c.sha.slice(0, 7)} ${c.message}`).join("\n")}`,
      };
    }

    return errResult(`unknown tool: ${name}`);
  } catch (e) {
    return errResult(e instanceof Error ? e.message : String(e));
  }
}

function errResult(msg: string) {
  return { ok: false, summary: `error: ${msg}`, payload: `Error: ${msg}` };
}

/** Keep tool_use events light — strip huge `content` payloads from the UI event. */
function redactToolInput(name: string, input: Record<string, unknown>): Record<string, unknown> {
  if (name === "edit_file" && typeof input.content === "string") {
    const c = input.content as string;
    return { ...input, content: `[${c.length} chars]` };
  }
  return input;
}
