import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AGENTS, routeByKeywords } from "@/lib/agents/definitions";
import { corsHeaders, verifySyncToken } from "@/lib/api-auth";
import { getAnthropicKey } from "@/lib/anthropic-key";
import { resolveModelChain } from "@/lib/models";
import { budgetFor, extraAnthropicHeaders } from "@/lib/context-budget";
import { compactMessages } from "@/lib/compact";
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
      "Read a file from the connected GitHub repo on the working branch. Returns a window of up to 1200 lines or 32kb — for large files, call repeatedly with start_line to page through. ALWAYS read before you edit so you don't overwrite unrelated code.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Repo-relative file path, e.g. server/ssr/pageContent.ts" },
        start_line: {
          type: "number",
          description: "1-indexed line to start reading from. Default 1. Use the tail hint from a prior read to resume.",
        },
        max_lines: {
          type: "number",
          description: "Max lines to return in this chunk (50–2000). Default 1200. Pair with start_line to window through big files.",
        },
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

  // Detect slash commands in the latest user turn. These don't round-trip
  // to Claude — they execute locally and stream the result back as an
  // assistant message so the UX feels like Claude Code.
  const latestUser = messages.filter((m: Msg) => m.role === "user").pop();
  const latestText =
    typeof latestUser?.content === "string" ? latestUser.content.trim() : "";
  const slashCommand = latestText.startsWith("/")
    ? latestText.split(/\s+/)[0].slice(1).toLowerCase()
    : null;

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

      // ─── Slash command handling ────────────────────────────────────────
      if (slashCommand === "compact") {
        // Pop the slash-command message itself so it doesn't appear in history
        const history = convoMessages.slice(0, -1);
        const { messages: compacted, summary, droppedCount } = await compactMessages({
          apiKey,
          messages: history as Array<{ role: "user" | "assistant"; content: unknown }>,
        });
        // Replace in-memory convo; persist to DB so refresh keeps the compaction
        if (session_id) {
          try {
            await supabase.from("chat_messages").delete().eq("session_id", session_id);
            for (const m of compacted) {
              await supabase.from("chat_messages").insert({
                session_id,
                role: m.role,
                content:
                  typeof m.content === "string"
                    ? m.content
                    : JSON.stringify(m.content),
              });
            }
          } catch {
            /* best effort */
          }
        }
        const msg = `🗜️ **Compacted** — ${droppedCount} earlier turn${droppedCount === 1 ? "" : "s"} condensed. Conversation continues.\n\n${summary}\n\n## Next Steps\n- [ ] Pick up where we left off — what should we work on next?\n\nNEXT_MODE: done`;
        for (let i = 0; i < msg.length; i += 64) emit({ text: msg.slice(i, i + 64) });
        emit({ compacted: { dropped: droppedCount } });
        if (session_id) {
          await supabase.from("chat_messages").insert({
            session_id,
            role: "assistant",
            content: msg,
            agent: { id: primaryAgent.id, name: primaryAgent.name, emoji: primaryAgent.emoji },
            metadata: { slash_command: "compact", dropped: droppedCount },
          });
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      if (slashCommand === "help") {
        const helpText = `**Slash commands**\n- \`/compact\` — summarize earlier turns to free context\n- \`/help\` — this message\n\n**Tools the agent uses**\n- read/list/edit files on \`${workingBranch}\`\n- check branch status + unpublished changes\n\n**Tips**\n- Attach files with 📎 to pass them to the agent\n- Click **Proceed** on Next Steps to auto-continue\n- Refresh the page anytime — your session persists\n\n## Next Steps\n- [ ] Ask the agent to make a change on the site\n\nNEXT_MODE: done`;
        for (let i = 0; i < helpText.length; i += 64) emit({ text: helpText.slice(i, i + 64) });
        if (session_id) {
          await supabase.from("chat_messages").insert({
            session_id,
            role: "assistant",
            content: helpText,
            agent: { id: primaryAgent.id, name: primaryAgent.name, emoji: primaryAgent.emoji },
            metadata: { slash_command: "help" },
          });
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      // ─── Auto-compact if we're about to blow the context window ────────
      {
        const b = budgetFor(modelChain[0], convoMessages, fullSystemPrompt);
        if (b.needsCompaction) {
          emit({ text: `🗜️ Context at ${(b.pct * 100).toFixed(0)}% — auto-compacting older turns…\n\n` });
          const { messages: compacted, droppedCount } = await compactMessages({
            apiKey,
            messages: convoMessages as Array<{ role: "user" | "assistant"; content: unknown }>,
          });
          convoMessages.length = 0;
          convoMessages.push(...compacted);
          if (session_id) {
            try {
              await supabase.from("chat_messages").delete().eq("session_id", session_id);
              for (const m of compacted) {
                await supabase.from("chat_messages").insert({
                  session_id,
                  role: m.role,
                  content:
                    typeof m.content === "string" ? m.content : JSON.stringify(m.content),
                });
              }
            } catch {
              /* best effort */
            }
          }
          emit({ compacted: { dropped: droppedCount, auto: true } });
        }
        emit({
          context: {
            model: modelChain[0],
            used: b.used,
            budget: b.budget,
            pct: Math.min(1, b.used / b.budget),
          },
        });
      }

      let turn = 0;
      const MAX_TURNS = 6; // hard cap to prevent runaway loops
      const commits: Array<{ path: string; sha: string; message: string }> = [];

      // Heartbeat keeps the SSE connection warm through Netlify's edge proxy.
      // Without it, silent periods while Claude or GitHub are thinking can
      // trigger a "network error" on the client after ~30s. Emits SSE
      // comment lines (`: ping`) every 8s that the browser's EventSource
      // / fetch reader ignores but keeps the socket alive.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 8_000);

      let loopError: Error | null = null;
      try {

      while (turn < MAX_TURNS) {
        turn += 1;

        // Mid-loop compaction: after tool calls inject a lot of file content,
        // we can cross the context threshold even though we started under it.
        // Check before every turn and compact if needed so the request always
        // fits the model's window.
        {
          const bInner = budgetFor(modelChain[0], convoMessages, fullSystemPrompt);
          if (bInner.needsCompaction && convoMessages.length > 4) {
            emit({ text: `\n🗜️ Auto-compacting mid-task (${(bInner.pct * 100).toFixed(0)}% full)…\n\n` });
            const { messages: compacted, droppedCount } = await compactMessages({
              apiKey,
              messages: convoMessages as Array<{ role: "user" | "assistant"; content: unknown }>,
              keepRecent: 4,
            });
            convoMessages.length = 0;
            convoMessages.push(...compacted);
            emit({ compacted: { dropped: droppedCount, auto: true } });
            const b2 = budgetFor(modelChain[0], convoMessages, fullSystemPrompt);
            emit({ context: { model: modelChain[0], used: b2.used, budget: b2.budget, pct: b2.used / b2.budget } });
          }
        }

        // Non-streaming call per turn — simpler than managing streaming tool_use
        // blocks. We chunk the returned text ourselves so the UI still feels
        // responsive.
        let data: Record<string, unknown> | null = null;
        let modelUsed = modelChain[0];
        let lastErr: { status: number; body: string } | null = null;

        for (const m of modelChain) {
          // Retry transient network errors (Anthropic 529 overloaded, aborted
          // socket, etc.) once with a 2-second backoff before moving on to
          // the next model in the chain.
          let r: Response | null = null;
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              r = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": apiKey,
                  "anthropic-version": "2023-06-01",
                  ...extraAnthropicHeaders(m),
                },
                body: JSON.stringify({
                  model: m,
                  max_tokens: 8192,
                  system: fullSystemPrompt,
                  tools: token ? TOOLS : undefined,
                  messages: convoMessages,
                }),
              });
              // Retry on 429/529 (rate limit / overloaded) only
              if (r.ok || (r.status !== 429 && r.status !== 529)) break;
              await new Promise((res) => setTimeout(res, 2000));
            } catch (e) {
              // Network error — retry once
              emit({ text: `\n… retrying (${e instanceof Error ? e.message : "net"})\n` });
              await new Promise((res) => setTimeout(res, 2000));
              if (attempt === 1) throw e;
            }
          }
          if (!r) continue;
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

      } catch (e) {
        loopError = e instanceof Error ? e : new Error(String(e));
        emit({ error: `Loop error: ${loopError.message}` });
        emit({ text: `\n\n⚠️ Internal error: ${loopError.message}. Type /compact and try again, or /help.` });
      } finally {
        clearInterval(heartbeat);
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
      const startLine = typeof input.start_line === "number" ? Math.max(1, input.start_line) : 1;
      const maxLines = typeof input.max_lines === "number" ? Math.min(2000, Math.max(50, input.max_lines)) : 1200;
      let file;
      try {
        file = await getFileContent(token, owner, repo, path, workingBranch);
      } catch {
        file = await getFileContent(token, owner, repo, path, baseBranch);
      }
      const content = file.content;
      const allLines = content.split("\n");
      const totalLines = allLines.length;
      // Enforce a LINE-based window so the agent can page through huge files
      // without ever dumping hundreds of KB into context. Pair with a hard
      // 32kb char cap on what we return so a single read stays ≈ 8k tokens.
      const slice = allLines.slice(startLine - 1, startLine - 1 + maxLines).join("\n");
      const cappedByChars = slice.length > 32_000 ? slice.slice(0, 32_000) + "\n\n// [truncated at 32kb — use read_file with start_line to continue]" : slice;
      const endLine = Math.min(totalLines, startLine - 1 + maxLines);
      const tail =
        endLine < totalLines
          ? `\n\n// [file continues — ${totalLines - endLine} more lines. Call read_file again with start_line=${endLine + 1} for the next chunk.]`
          : "";
      return {
        ok: true,
        summary: `read ${path} lines ${startLine}-${endLine}/${totalLines}`,
        payload: `File: ${path}\nLines: ${startLine}–${endLine} of ${totalLines}\n\n${cappedByChars}${tail}`,
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
