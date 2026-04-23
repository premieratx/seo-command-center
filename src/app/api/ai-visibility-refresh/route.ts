import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { corsHeaders, verifySyncToken } from "@/lib/api-auth";
import { scrapeAiVisibility, type SurfaceExtract } from "@/lib/semrush-ai-scraper";

/**
 * POST /api/ai-visibility-refresh
 * Body: { site_id: string }
 *
 * One-click "Refresh SEMRush AI Data" — scrapes the 4 AI Visibility
 * surfaces × 4 LLMs on SEMRush via Playwright using a stored session
 * cookie, forwards each extract to /api/ai-visibility-ingest for Claude
 * Opus parsing, and returns aggregate counts.
 *
 * Background-function territory: typical runtime is 90–180s for the full
 * sweep. Set `export const maxDuration = 300;` and deploy as a Netlify
 * background function if needed.
 *
 * See docs/ai-visibility-refresh-pipeline.md for setup instructions.
 */

export const maxDuration = 300;

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const CORS = corsHeaders(req);

  // Auth — session OR sync token (for the cron path)
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !verifySyncToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const body = await req.json().catch(() => ({}));
  const siteId: string | undefined = body.site_id;
  if (!siteId) {
    return NextResponse.json({ error: "site_id required" }, { status: 400, headers: CORS });
  }

  const sessionCookie = process.env.SEMRUSH_SESSION_COOKIE;
  const pid = process.env.SEMRUSH_PID;
  const fid = process.env.SEMRUSH_FID;

  if (!sessionCookie || !pid || !fid) {
    return NextResponse.json(
      {
        error:
          "SEMRush env not configured. Set SEMRUSH_SESSION_COOKIE, SEMRUSH_PID, SEMRUSH_FID. See docs/ai-visibility-refresh-pipeline.md.",
      },
      { status: 400, headers: CORS },
    );
  }

  const startedAt = Date.now();
  let extracts: SurfaceExtract[] = [];
  try {
    extracts = await scrapeAiVisibility({
      sessionCookie,
      pid,
      fid,
      // Default: all surfaces × all LLMs (13 extractions — Questions is cross-LLM)
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: `Scrape failed: ${err instanceof Error ? err.message : String(err)}`,
        hint:
          "Likely cookie expired. Refresh SEMRUSH_SESSION_COOKIE in Netlify env from an authenticated SEMRush session.",
      },
      { status: 502, headers: CORS },
    );
  }

  // Forward each extract to the existing ingest endpoint (Claude Opus parses)
  const origin = req.headers.get("origin") || new URL(req.url).origin;
  const syncToken = process.env.SEO_SYNC_TOKEN;

  let totalSov = 0;
  let totalInsights = 0;
  let totalSentiment = 0;
  const failures: Array<{ surface: string; llm: string; error: string }> = [];

  for (const ex of extracts) {
    try {
      const resp = await fetch(`${origin}/api/ai-visibility-ingest`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(syncToken ? { authorization: `Bearer ${syncToken}` } : {}),
        },
        body: JSON.stringify({
          site_id: siteId,
          raw: `[SEMRush AI Visibility · ${ex.surface} · ${ex.llm} · ${ex.extractedAt}]\n\n${ex.text}`,
        }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        failures.push({ surface: ex.surface, llm: ex.llm, error: t.slice(0, 200) });
        continue;
      }
      const json = await resp.json();
      totalSov += json.share_of_voice ?? 0;
      totalInsights += json.insights ?? 0;
      totalSentiment += json.sentiment ?? 0;
    } catch (err) {
      failures.push({
        surface: ex.surface,
        llm: ex.llm,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json(
    {
      ok: true,
      extracts: extracts.length,
      share_of_voice_rows: totalSov,
      insights_rows: totalInsights,
      sentiment_rows: totalSentiment,
      failed: failures.length,
      failures,
      elapsed_ms: Date.now() - startedAt,
    },
    { headers: CORS },
  );
}
