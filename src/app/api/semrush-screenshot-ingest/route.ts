import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAnthropicKey } from "@/lib/anthropic-key";
import { corsHeaders, verifySyncToken } from "@/lib/api-auth";

export const maxDuration = 300;

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * POST /api/semrush-screenshot-ingest
 *
 * The "no-API-credits" path. Accepts one or more SEMrush dashboard
 * screenshots (base64 PNG/JPEG), feeds them to Claude Opus 4.5 with vision,
 * extracts every metric the user can see, and writes structured rows to:
 *
 *   • public.keywords                 (organic keyword + position rows)
 *   • public.site_metrics             (authority / traffic / backlinks snapshot)
 *   • public.ai_share_of_voice        (AI Visibility / SoV breakdown)
 *   • public.ai_insights              (recommendations / opportunities)
 *   • public.ai_competitor_sentiment  (AI competitor positioning)
 *
 * Designed to be called by EITHER:
 *   (a) a logged-in dashboard user who pastes a screenshot into the UI,
 *   (b) the daily claude.ai remote trigger that opens SEMrush in the
 *       user's Chrome via computer-use, screenshots each tab, and POSTs
 *       them here using the SYNC_TOKEN env var.
 *
 * Body: {
 *   site_id: string,
 *   screenshots: Array<{ source: string, base64: string, mime?: string }>,
 *   note?: string  // optional context, e.g. "Position Tracking Apr 19"
 * }
 */
export async function POST(req: NextRequest) {
  const CORS = corsHeaders(req);

  // Auth — session OR sync token (the cron path uses the token)
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !verifySyncToken(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const body = await req.json();
  const siteId: string | undefined = body.site_id;
  const screenshots: Array<{ source: string; base64: string; mime?: string }> | undefined =
    body.screenshots;
  const note: string = body.note || "";

  if (!siteId || !Array.isArray(screenshots) || screenshots.length === 0) {
    return NextResponse.json(
      { error: "site_id and screenshots[] required" },
      { status: 400, headers: CORS },
    );
  }

  const apiKey = await getAnthropicKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 400, headers: CORS },
    );
  }

  // Build a Vision message: instruction + each screenshot inline.
  // Anthropic's Vision API accepts up to ~20MB of image per request.
  const sys = `You are a SEMrush dashboard parser. The user is uploading one or more screenshots from their SEMrush account because they don't have API credits. Each screenshot may show:

  • Position Tracking — keywords table with position, change, search volume, URL
  • Organic Research — top keywords by traffic
  • AI Visibility / Share of Voice — brand percentage breakdowns by platform
  • AI Overview citations — which sources AI engines cite
  • Competitor analysis — competitor domains with overlap counts
  • Domain Overview — authority score, traffic, backlinks, ref domains
  • Site Audit — error/warning/notice counts, specific issues
  • Recommendations — AI suggestions for content / technical fixes

Extract EVERYTHING you can read. Return ONLY a single JSON object with this exact shape (omit arrays you can't populate, don't invent data):

{
  "keywords": [
    { "keyword": "...", "position": 4, "previous_position": 6, "search_volume": 320, "keyword_difficulty": 18, "cpc": 1.25, "url": "/atx-disco-cruise", "traffic_percent": 0.5 }
  ],
  "site_metrics": {
    "authority_score": 28,
    "organic_keywords": 1390,
    "organic_traffic": 677,
    "total_backlinks": 4200,
    "referring_domains": 325
  },
  "share_of_voice": [
    { "brand": "Premier Party Cruises", "share_percent": 17, "platform": "ChatGPT", "is_own_brand": true }
  ],
  "insights": [
    { "title": "...", "description": "...", "category": "share_of_voice|sentiment|topic|source|opportunity|technical|content", "rank_order": 1 }
  ],
  "sentiment": [
    { "competitor": "Float On", "share_of_voice": 27, "favorable_sentiment": 30, "summary": "..." }
  ]
}

Brand notes:
  • PPC = Premier Party Cruises = the user's own brand (is_own_brand: true)
  • Known competitors: Float On, ATX Party Boats, Tide Up, Lone Star, Big Tex, VIP Marina

OUTPUT RULES:
  • JSON only. No prose, no markdown fences, no commentary.
  • If a field isn't visible leave it null.
  • Cap keyword extraction at 200 rows per screenshot (top by traffic if more).
  • Do not hallucinate. If the screenshot is unreadable, return { "keywords": [], "site_metrics": null, ... }.`;

  const visionContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: `${note ? `Context: ${note}\n\n` : ""}Parse each screenshot below and return the combined structured data.`,
    },
  ];
  for (const s of screenshots.slice(0, 8)) {
    // Anthropic limits to ~20 images per request, we cap at 8 to keep tokens sane
    visionContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: s.mime || "image/png",
        data: s.base64,
      },
    });
    visionContent.push({
      type: "text",
      text: `^ from: ${s.source}`,
    });
  }

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-7",
      max_tokens: 8000,
      system: sys,
      messages: [{ role: "user", content: visionContent }],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    return NextResponse.json(
      { error: `Vision parse failed: ${txt.slice(0, 400)}` },
      { status: 502, headers: CORS },
    );
  }

  const out = await resp.json();
  const raw: string = out?.content?.[0]?.text || "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return NextResponse.json(
      { error: "Vision returned non-JSON", raw: raw.slice(0, 500) },
      { status: 500, headers: CORS },
    );
  }

  let parsed: {
    keywords?: Array<Record<string, unknown>>;
    site_metrics?: Record<string, unknown> | null;
    share_of_voice?: Array<Record<string, unknown>>;
    insights?: Array<Record<string, unknown>>;
    sentiment?: Array<Record<string, unknown>>;
  };
  try {
    parsed = JSON.parse(match[0]);
  } catch (e) {
    return NextResponse.json(
      {
        error: `JSON parse error: ${e instanceof Error ? e.message : String(e)}`,
        raw: raw.slice(0, 500),
      },
      { status: 500, headers: CORS },
    );
  }

  const db = createServiceClient();
  let kwCount = 0;
  let metricsWritten = false;
  let sovCount = 0;
  let insightCount = 0;
  let sentimentCount = 0;

  // Keywords — replace existing for this site so we don't accumulate dupes
  if (parsed.keywords?.length) {
    await db.from("keywords").delete().eq("site_id", siteId);
    const rows = parsed.keywords.map((k) => ({
      site_id: siteId,
      keyword: String(k.keyword || "").slice(0, 500),
      position: numOrNull(k.position),
      previous_position: numOrNull(k.previous_position),
      position_difference:
        numOrNull(k.previous_position) != null && numOrNull(k.position) != null
          ? (k.previous_position as number) - (k.position as number)
          : null,
      search_volume: numOrNull(k.search_volume),
      keyword_difficulty: numOrNull(k.keyword_difficulty),
      cpc: numOrNull(k.cpc),
      url: typeof k.url === "string" ? k.url : null,
      traffic_percent: numOrNull(k.traffic_percent),
      captured_at: new Date().toISOString(),
    }));
    // Insert in chunks of 100 to avoid request size limits
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      const { error } = await db.from("keywords").insert(chunk);
      if (!error) kwCount += chunk.length;
    }
  }

  if (parsed.site_metrics) {
    const m = parsed.site_metrics;
    const { error } = await db.from("site_metrics").insert({
      site_id: siteId,
      source: "semrush_vision",
      authority_score: numOrNull(m.authority_score),
      organic_keywords: numOrNull(m.organic_keywords),
      organic_traffic: numOrNull(m.organic_traffic),
      total_backlinks: numOrNull(m.total_backlinks),
      referring_domains: numOrNull(m.referring_domains),
      captured_at: new Date().toISOString(),
    });
    metricsWritten = !error;
  }

  if (parsed.share_of_voice?.length) {
    const rows = parsed.share_of_voice.map((r) => ({
      site_id: siteId,
      brand: String(r.brand || "").slice(0, 200),
      share_percent: numOrNull(r.share_percent),
      platform: typeof r.platform === "string" ? r.platform : null,
      is_own_brand: !!r.is_own_brand,
      captured_at: new Date().toISOString(),
    }));
    const { error } = await db.from("ai_share_of_voice").insert(rows);
    if (!error) sovCount = rows.length;
  }

  if (parsed.insights?.length) {
    const rows = parsed.insights.map((r, i) => ({
      site_id: siteId,
      title: String(r.title || "").slice(0, 500),
      description: typeof r.description === "string" ? r.description : null,
      category: typeof r.category === "string" ? r.category : "general",
      rank_order: numOrNull(r.rank_order) ?? i + 1,
    }));
    const { error } = await db.from("ai_insights").insert(rows);
    if (!error) insightCount = rows.length;
  }

  if (parsed.sentiment?.length) {
    const rows = parsed.sentiment.map((r) => ({
      site_id: siteId,
      competitor: String(r.competitor || "").slice(0, 200),
      share_of_voice: numOrNull(r.share_of_voice),
      favorable_sentiment: numOrNull(r.favorable_sentiment),
      summary: typeof r.summary === "string" ? r.summary : null,
      captured_at: new Date().toISOString(),
    }));
    const { error } = await db.from("ai_competitor_sentiment").insert(rows);
    if (!error) sentimentCount = rows.length;
  }

  return NextResponse.json(
    {
      ok: true,
      keywords: kwCount,
      site_metrics: metricsWritten,
      share_of_voice: sovCount,
      insights: insightCount,
      sentiment: sentimentCount,
    },
    { headers: CORS },
  );
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[, %]/g, ""));
  return Number.isFinite(n) ? n : null;
}
