import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { corsHeaders, verifySyncToken } from "@/lib/api-auth";

/**
 * POST /api/ai-visibility-trigger
 * Body: { site_id: string }
 *
 * Triggers a remote Claude Code session (via claude.ai RemoteTrigger) that
 * uses the Chrome MCP connected to the user's claude.ai environment to:
 *   1. Open SEMRush AI Visibility surfaces in the authenticated Chrome tab
 *   2. Switch LLM dropdown for each of 13 surface×LLM combinations
 *   3. Extract page text
 *   4. POST each to /api/ai-visibility-ingest for Claude Opus parsing → Supabase
 *
 * Required env:
 *   ANTHROPIC_TRIGGER_URL    — full POST URL for the trigger run, e.g.
 *                               https://api.anthropic.com/v1/code/triggers/trig_.../run
 *   ANTHROPIC_TRIGGER_TOKEN  — API token with permission to run the trigger
 *                               (generate from claude.ai → Settings → API Keys)
 *
 * Optional env:
 *   AI_VISIBILITY_SITE_ID    — default site_id if body doesn't include one
 *
 * Returns immediately once the trigger is enqueued. The actual scrape runs
 * asynchronously in the remote Claude session and posts back to the ingest
 * endpoint when complete. Poll the AI Visibility tab for the new data.
 *
 * See docs/ai-visibility-refresh-pipeline.md for the one-time claude.ai
 * environment setup (must attach the Chrome MCP connector).
 */
export const maxDuration = 30;

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const CORS = corsHeaders(req);

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !verifySyncToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const body = await req.json().catch(() => ({}));
  const siteId: string | undefined = body.site_id ?? process.env.AI_VISIBILITY_SITE_ID;
  if (!siteId) {
    return NextResponse.json({ error: "site_id required" }, { status: 400, headers: CORS });
  }

  const triggerUrl = process.env.ANTHROPIC_TRIGGER_URL;
  const triggerToken = process.env.ANTHROPIC_TRIGGER_TOKEN;
  if (!triggerUrl || !triggerToken) {
    return NextResponse.json(
      {
        error:
          "Trigger not configured. Set ANTHROPIC_TRIGGER_URL and ANTHROPIC_TRIGGER_TOKEN in Netlify env.",
        hint:
          "See docs/ai-visibility-refresh-pipeline.md — requires a claude.ai Environment with Chrome MCP connector attached.",
      },
      { status: 400, headers: CORS },
    );
  }

  // The prompt embedded in the trigger run — verbose because the remote
  // session starts fresh and has no memory of this app's conventions.
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const syncToken = process.env.SEO_SYNC_TOKEN || "";

  const prompt = `You are the SEMRush AI Visibility scraper for Premier Party Cruises. Proceed fully autonomously — this is a background job, no user confirmation needed.

STEP 1 — Load Chrome MCP tools
Run ToolSearch with query "chrome" and max_results 25 to load all Chrome MCP tool schemas. Verify tabs_context_mcp, navigate, get_page_text, and computer are available. If Chrome MCP is NOT connected in this environment, stop immediately and report: "Chrome MCP not connected to this claude.ai environment. User must attach Chrome extension connector in claude.ai → Environments."

STEP 2 — Open an MCP tab
Call tabs_context_mcp with createIfEmpty: true. Capture the tabId.

STEP 3 — Iterate 13 extractions
Surfaces: narrative-drivers, brand-performance, perception, questions
LLMs: Google AI Mode, ChatGPT, Perplexity, Gemini
For each surface × LLM combination (questions is cross-LLM — hit only once, do not switch LLM):
  a. Navigate to https://www.semrush.com/ai-seo/{surface}/?pid=122198&fid=8797552
  b. Wait 5 seconds for charts to render
  c. If surface is not "questions", switch the LLM dropdown:
     - find() the 'Select provider' combobox, click it (wait 2s)
     - click the LLM option by visible text (wait 5s for re-render)
  d. get_page_text for the tab. If the result contains "Log in" or "Sign in" at top, STOP and report: "Chrome extension not authenticated to SEMRush. User must log in to SEMRush in their Chrome, then click refresh again."
  e. Use Bash or WebFetch to POST the text to ${origin}/api/ai-visibility-ingest:
     Headers: { "Authorization": "Bearer ${syncToken}", "content-type": "application/json" }
     Body: { "site_id": "${siteId}", "raw": "[SEMRush AI Visibility · {surface} · {llm} · {ISO timestamp}]\\n\\n" + extracted_text }
  f. Track the response: count share_of_voice, insights, sentiment rows returned.

STEP 4 — Use browser_batch aggressively
Combine navigate + wait + dropdown click + option click + get_page_text into single browser_batch calls per surface × LLM. This cuts total runtime from ~10 min to ~3 min.

STEP 5 — Final report
When all 13 extractions complete, report to the user in this exact shape:
{
  "status": "complete",
  "extractions": <count>,
  "share_of_voice_rows": <sum>,
  "insights_rows": <sum>,
  "sentiment_rows": <sum>,
  "failures": [ { "surface": "...", "llm": "...", "reason": "..." } ],
  "elapsed_seconds": <number>
}

STEP 6 — Close the MCP tab (optional cleanup)
Call tabs_close_mcp on the tab.`;

  // POST to the trigger's run endpoint.
  const resp = await fetch(triggerUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${triggerToken}`,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json(
      {
        error: `Trigger API error: ${resp.status}`,
        detail: text.slice(0, 500),
      },
      { status: 502, headers: CORS },
    );
  }

  const json = await resp.json();
  return NextResponse.json(
    {
      ok: true,
      trigger_id: json?.trigger?.id || "unknown",
      status: "enqueued",
      message:
        "Remote Claude agent started. Scrape runs in the background (1–3 min) and writes data via the ingest endpoint. Refresh this page in a couple minutes to see new rows.",
    },
    { headers: CORS },
  );
}
