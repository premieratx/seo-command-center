import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAnthropicKey } from "@/lib/anthropic-key";
import { corsHeaders, verifySyncToken } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * POST /api/ai-visibility-ingest
 *
 * Two ingest modes:
 *
 *   1. Structured JSON (fast path) — caller posts
 *      { share_of_voice: [...], insights: [...], sentiment: [...] }
 *      and we upsert directly. Used when the daily cron has already
 *      parsed the SEMrush screenshot via Claude Vision.
 *
 *   2. Raw text/CSV (Claude path) — caller posts { raw: "..." } and we
 *      run it through Claude Opus to extract the structured rows, then
 *      upsert. Used by the manual paste-in widget on the Compare view.
 *
 * In both cases the data lands in:
 *   - public.ai_share_of_voice (one row per brand × platform)
 *   - public.ai_insights        (one row per recommendation)
 *   - public.ai_competitor_sentiment (one row per competitor)
 *
 * Authenticates either via Supabase session OR the sync token (so the
 * scheduled remote trigger can call this without a logged-in user).
 */
export async function POST(req: NextRequest) {
  const CORS = corsHeaders(req);

  // Auth — session OR sync token
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !verifySyncToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const body = await req.json();
  const siteId: string | undefined = body.site_id;
  if (!siteId) {
    return NextResponse.json(
      { error: "site_id required" },
      { status: 400, headers: CORS },
    );
  }

  let payload: {
    share_of_voice?: Array<{
      brand: string;
      share_percent?: number | null;
      platform?: string | null;
      is_own_brand?: boolean | null;
    }>;
    insights?: Array<{
      title: string;
      description?: string | null;
      category?: string | null;
      rank_order?: number | null;
      target_keywords?: string[] | null;
      target_pages?: string[] | null;
      source_llm?: string | null;
      source_surface?: string | null;
      priority?: string | null;
    }>;
    sentiment?: Array<{
      competitor: string;
      share_of_voice?: number | null;
      favorable_sentiment?: number | null;
      summary?: string | null;
    }>;
  } = {};

  if (body.share_of_voice || body.insights || body.sentiment) {
    payload = body;
  } else if (typeof body.raw === "string" && body.raw.trim()) {
    // Claude parses pasted text → structured JSON
    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 400, headers: CORS },
      );
    }
    const sys = `You are a SEMrush AI-Visibility ingest parser. The user pastes raw text from SEMrush — could be CSV, JSON, screenshots transcribed to text, or free-form notes. Your job: extract three structured arrays.

Return ONLY a single JSON object with this exact shape (omit arrays you can't populate):

{
  "share_of_voice": [
    { "brand": "Premier Party Cruises", "share_percent": 17, "platform": "ChatGPT", "is_own_brand": true }
  ],
  "insights": [
    {
      "title": "Short imperative recommendation (under 70 chars)",
      "description": "2-4 sentence actionable description of what to change and why",
      "category": "share_of_voice|sentiment|topic|source|opportunity",
      "rank_order": 1,
      "target_keywords": ["lake travis party boat pricing", "austin bachelor party cost"],
      "target_pages": ["/pricing-v2", "/atx-disco-cruise", "/bachelor-party-austin"],
      "source_llm": "chatgpt|google_ai_mode|perplexity|gemini|all",
      "source_surface": "narrative_drivers|brand_performance|perception|questions",
      "priority": "urgent|short|medium"
    }
  ],
  "sentiment": [
    { "competitor": "Float On", "share_of_voice": 27, "favorable_sentiment": 30, "summary": "..." }
  ]
}

CRITICAL: For the insights array, produce up to 20 specific, actionable recommendations — the concrete edits to make to the V2 site based on the scraped data. Each MUST include:
  • title: short imperative ("Add pricing transparency to homepage hero", not "Pricing")
  • description: what to change + why (reference the data point if possible)
  • target_keywords: 2-5 keywords this recommendation targets (the AI queries the fix would help rank for)
  • target_pages: specific URLs on the site that would be edited (e.g., "/atx-disco-cruise", "/pricing-v2", "/compare-austin-party-boats", "/bachelor-party-austin"). Pick real V2 page paths.
  • source_llm: which LLM this recommendation came from (infer from surrounding text — "Google AI Mode", "ChatGPT", "Perplexity", "Gemini", or "all" for cross-LLM)
  • source_surface: which SEMrush tab it came from
  • priority: "urgent" (fixed this week), "short" (this month), "medium" (quarter)

PPC = Premier Party Cruises = the user's own brand (is_own_brand: true). Competitors include Float On, ATX Party Boats, Tide Up, Lone Star, Big Tex, VIP Marina, Just For Fun. Platforms include ChatGPT, Google AI Mode, Gemini, Perplexity, Claude. If a number is missing leave it null. Output ONLY the JSON, no prose, no fences.`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 4000,
        system: sys,
        messages: [{ role: "user", content: body.raw.slice(0, 20000) }],
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return NextResponse.json(
        { error: `Claude parse failed: ${txt.slice(0, 400)}` },
        { status: 502, headers: CORS },
      );
    }
    const out = await resp.json();
    const raw = out?.content?.[0]?.text || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        { error: "Parser returned non-JSON", raw: raw.slice(0, 500) },
        { status: 500, headers: CORS },
      );
    }
    try {
      payload = JSON.parse(match[0]);
    } catch (e) {
      return NextResponse.json(
        { error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}` },
        { status: 500, headers: CORS },
      );
    }
  } else {
    return NextResponse.json(
      { error: "Provide either { share_of_voice, insights, sentiment } or { raw }" },
      { status: 400, headers: CORS },
    );
  }

  const db = createServiceClient();
  let sovCount = 0;
  let insightCount = 0;
  let sentimentCount = 0;

  if (payload.share_of_voice?.length) {
    const rows = payload.share_of_voice.map((r) => ({
      site_id: siteId,
      brand: r.brand,
      share_percent: r.share_percent ?? null,
      platform: r.platform ?? null,
      is_own_brand: r.is_own_brand ?? false,
      captured_at: new Date().toISOString(),
    }));
    const { error } = await db.from("ai_share_of_voice").insert(rows);
    if (!error) sovCount = rows.length;
  }

  if (payload.insights?.length) {
    const rows = payload.insights.map((r, i) => ({
      site_id: siteId,
      title: r.title,
      description: r.description ?? null,
      source: r.category ?? "general",
      rank_order: r.rank_order ?? i + 1,
      target_keywords: r.target_keywords ?? [],
      target_pages: r.target_pages ?? [],
      source_llm: r.source_llm ?? null,
      source_surface: r.source_surface ?? null,
      priority: r.priority ?? null,
      status: "pending",
      captured_at: new Date().toISOString(),
    }));
    const { error } = await db.from("ai_insights").insert(rows);
    if (!error) insightCount = rows.length;
  }

  if (payload.sentiment?.length) {
    const rows = payload.sentiment.map((r) => ({
      site_id: siteId,
      competitor: r.competitor,
      share_of_voice: r.share_of_voice ?? null,
      favorable_sentiment: r.favorable_sentiment ?? null,
      summary: r.summary ?? null,
      captured_at: new Date().toISOString(),
    }));
    const { error } = await db.from("ai_competitor_sentiment").insert(rows);
    if (!error) sentimentCount = rows.length;
  }

  return NextResponse.json(
    {
      ok: true,
      share_of_voice: sovCount,
      insights: insightCount,
      sentiment: sentimentCount,
    },
    { headers: CORS },
  );
}
