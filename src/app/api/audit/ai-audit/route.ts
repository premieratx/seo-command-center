import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-seo-sync-token",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * POST /api/audit/ai-audit
 * Body: { site_id: string }
 *
 * Runs dual AI-powered audits:
 * 1. SEO Audit — technical SEO, content quality, meta tags, schema, internal linking
 * 2. AI Visibility Audit — how well content is structured for AI extraction
 *
 * Each generates a score (0-100) and prioritized recommendations with fix actions.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow sync token auth for admin integration
  const syncToken = req.headers.get("x-seo-sync-token");
  const SYNC_TOKEN = process.env.SEO_SYNC_TOKEN || "ppc-seo-sync-2026";
  if (!user && syncToken !== SYNC_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const { site_id } = await req.json();
  if (!site_id) {
    return NextResponse.json({ error: "site_id required" }, { status: 400, headers: CORS_HEADERS });
  }

  // Get API key
  const { data: configRow } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "anthropic_api_key")
    .single();
  const apiKey = configRow?.value || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No Anthropic API key" }, { status: 400, headers: CORS_HEADERS });
  }

  // Gather all site data for the AI to analyze
  const [
    { data: issues },
    { data: pages },
    { data: keywords },
    { data: metrics },
    { data: aiSov },
    { data: aiInsights },
    { data: cannibalization },
  ] = await Promise.all([
    supabase.from("audit_issues").select("*").eq("site_id", site_id).limit(50),
    supabase.from("audit_pages").select("*").eq("site_id", site_id).limit(30),
    supabase.from("keywords").select("*").eq("site_id", site_id).limit(50),
    supabase.from("site_metrics").select("*").eq("site_id", site_id).limit(1),
    supabase.from("ai_share_of_voice").select("*").eq("site_id", site_id).limit(20),
    supabase.from("ai_insights").select("*").eq("site_id", site_id).limit(20),
    supabase.from("cannibalization_issues").select("*").eq("site_id", site_id).limit(10),
  ]);

  // Build context string
  const context = `
SITE DATA SNAPSHOT:
- ${(pages || []).length} pages audited
- ${(issues || []).filter((i: Record<string, unknown>) => i.severity === "critical").length} critical issues
- ${(issues || []).filter((i: Record<string, unknown>) => i.severity === "high").length} high issues
- ${(keywords || []).length} tracked keywords
- ${(cannibalization || []).length} cannibalization conflicts

PAGES:
${(pages || []).map((p: Record<string, unknown>) => `- ${p.url} score:${p.score}/100 words:${p.word_count} title:"${(p.title as string)?.slice(0, 60)}"`).join("\n")}

OPEN ISSUES:
${(issues || []).map((i: Record<string, unknown>) => `- [${(i.severity as string)?.toUpperCase()}] ${i.title} (${i.category})`).join("\n")}

TOP KEYWORDS:
${(keywords || []).slice(0, 20).map((k: Record<string, unknown>) => `- "${k.keyword}" pos:${k.position} vol:${k.search_volume}`).join("\n")}

METRICS:
${metrics && metrics[0] ? `Authority: ${(metrics[0] as Record<string, unknown>).authority_score}, Organic KW: ${(metrics[0] as Record<string, unknown>).organic_keywords}, Traffic: ${(metrics[0] as Record<string, unknown>).organic_traffic}` : "No metrics available"}

AI SHARE OF VOICE:
${(aiSov || []).map((s: Record<string, unknown>) => `- ${s.brand}: ${s.share_percent}% on ${s.platform}${s.is_own_brand ? " (YOU)" : ""}`).join("\n")}

AI INSIGHTS:
${(aiInsights || []).map((i: Record<string, unknown>) => `- ${i.title}: ${(i.description as string)?.slice(0, 100)}`).join("\n")}

CANNIBALIZATION:
${(cannibalization || []).map((c: Record<string, unknown>) => `- "${c.keyword}" intended:${c.intended_page} competing:${JSON.stringify(c.competing_pages)}`).join("\n")}
`;

  // Run both audits in parallel using Claude
  const auditPrompt = `You are a senior SEO consultant and AI visibility expert. Analyze this website data and produce a comprehensive audit.

${context}

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "seo_score": <number 0-100>,
  "ai_score": <number 0-100>,
  "overall_score": <number 0-100>,
  "seo_summary": "<1-2 sentence summary of SEO health>",
  "ai_summary": "<1-2 sentence summary of AI visibility health>",
  "recommendations": [
    {
      "id": "<unique-slug>",
      "category": "seo" | "ai_visibility" | "technical" | "content" | "design",
      "priority": "critical" | "high" | "medium" | "low",
      "title": "<short title>",
      "description": "<what's wrong and why it matters>",
      "fix_action": "<exactly what to do to fix it>",
      "impact": "<estimated impact: e.g. '+5-10% organic traffic'>",
      "effort": "quick" | "moderate" | "significant",
      "file_to_edit": "<file path if applicable, or null>"
    }
  ]
}

Generate 15-25 recommendations sorted by priority (critical first).
Be specific — reference actual page URLs, keywords, and data from the snapshot.
For each recommendation, provide a concrete fix_action that could be executed.
Score generously for things done well but penalize hard for critical gaps.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: auditPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Claude API error: ${response.status}`, detail: errText },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    // Parse the JSON response
    let auditResult;
    try {
      auditResult = JSON.parse(content);
    } catch {
      // Try to extract JSON from the response if it has extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        auditResult = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: "Failed to parse audit response", raw: content.slice(0, 500) },
          { status: 500, headers: CORS_HEADERS }
        );
      }
    }

    // Store audit results in recommendations table
    const recs = auditResult.recommendations || [];
    if (recs.length > 0) {
      // Clear old AI-generated recs
      await supabase
        .from("recommendations")
        .delete()
        .eq("site_id", site_id)
        .eq("category", "ai_audit");

      // Insert new ones
      const recRows = recs.map((r: Record<string, unknown>, i: number) => ({
        site_id,
        category: r.category || "ai_audit",
        priority: r.priority === "critical" ? 1 : r.priority === "high" ? 2 : r.priority === "medium" ? 3 : 4,
        title: r.title,
        description: r.description,
        suggested_action: r.fix_action,
        metadata: {
          impact: r.impact,
          effort: r.effort,
          file_to_edit: r.file_to_edit,
          audit_id: r.id,
          sort_order: i,
        },
        status: "new",
      }));

      await supabase.from("recommendations").insert(recRows);
    }

    return NextResponse.json(
      {
        ...auditResult,
        generated_at: new Date().toISOString(),
        recommendations_count: recs.length,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Audit failed: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
