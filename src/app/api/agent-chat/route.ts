import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AGENTS, routeByKeywords } from "@/lib/agents/definitions";

export const maxDuration = 300;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-seo-sync-token",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

const DEFAULT_SITE_ID = "37292000-d661-4238-8ba4-6a53b71c2d07";

/**
 * POST /api/agent-chat
 * Body: { messages: [{role, content}], model?: string, site_id?: string, agent?: string }
 *
 * Multi-agent chat system. If no agent specified, routes to the correct specialist.
 * Injects agent-specific context from the database.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow admin integration via sync token
  const syncToken = req.headers.get("x-seo-sync-token");
  const SYNC_TOKEN = process.env.SEO_SYNC_TOKEN || "ppc-seo-sync-2026";
  const isAuthed = !!user || syncToken === SYNC_TOKEN;

  const body = await req.json();
  const {
    messages,
    model: requestedModel,
    site_id = DEFAULT_SITE_ID,
    agent: requestedAgent,
  } = body;

  // Get API key
  const { data: configRow } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "anthropic_api_key")
    .single();
  const apiKey = configRow?.value || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No Anthropic API key configured. Check Supabase app_config table." }, { status: 400, headers: CORS_HEADERS });
  }

  // Determine which agent(s) to use
  let agentIds: string[] = [];
  if (requestedAgent && AGENTS[requestedAgent]) {
    agentIds = [requestedAgent];
  } else {
    // Use keyword routing (fast, no LLM call needed)
    const lastUserMsg = messages.filter((m: { role: string }) => m.role === "user").pop()?.content || "";
    agentIds = routeByKeywords(lastUserMsg);
  }

  // Smart model selection — use Haiku for simple/routine tasks, Sonnet for complex
  // User can override by explicitly selecting a model in the UI
  let model = requestedModel;
  if (!model || model === "auto") {
    const lastUserMsg = messages.filter((m: { role: string }) => m.role === "user").pop()?.content || "";
    const msgLen = lastUserMsg.length;
    const conversationLen = messages.length;

    // Patterns that need Sonnet (complex analysis, strategy, multi-step)
    const complexPatterns = [
      /analyz|analysis|strateg|audit|compare|competitor|recommend|priorit|plan|design|architect/i,
      /write.*content|create.*page|build.*component|generate.*code|refactor/i,
      /why.*should|what.*best|how.*improv|evaluate|assess|review.*all/i,
      /top\s*\d+|rank|score|gap|opportunit/i,
      /fix.*all|update.*all|change.*every/i,
    ];
    const isComplex = complexPatterns.some(p => p.test(lastUserMsg)) || msgLen > 300 || conversationLen > 6;

    model = isComplex ? "claude-sonnet-4-20250514" : "claude-haiku-3-5-20241022";
  }

  // Get the primary agent
  const primaryAgent = AGENTS[agentIds[0]] || AGENTS.seo;

  // Build context from database based on agent's needs
  let contextBlock = "";
  if (primaryAgent.contextKeys.length > 0 && site_id) {
    const contextParts: string[] = [];

    for (const key of primaryAgent.contextKeys) {
      try {
        const { data } = await supabase
          .from(key)
          .select("*")
          .eq("site_id", site_id)
          .limit(key === "keywords" ? 100 : key === "audit_issues" ? 50 : key === "audit_pages" ? 30 : 20);

        if (data && data.length > 0) {
          if (key === "keywords") {
            contextParts.push(
              `\nTOP KEYWORDS (${data.length}):\n` +
                data
                  .map(
                    (k: Record<string, unknown>) =>
                      `- "${k.keyword}" pos:${k.position} vol:${k.search_volume} KD:${k.keyword_difficulty || "?"}%`,
                  )
                  .join("\n"),
            );
          } else if (key === "audit_issues") {
            contextParts.push(
              `\nOPEN ISSUES (${data.length}):\n` +
                data
                  .map(
                    (i: Record<string, unknown>) =>
                      `- [${(i.severity as string).toUpperCase()}] ${i.title} (${i.category}) — ${i.status}`,
                  )
                  .join("\n"),
            );
          } else if (key === "ai_share_of_voice") {
            contextParts.push(
              `\nAI SHARE OF VOICE:\n` +
                data
                  .map(
                    (s: Record<string, unknown>) =>
                      `- ${s.brand}: ${s.share_percent}% on ${s.platform}${s.is_own_brand ? " (YOU)" : ""}`,
                  )
                  .join("\n"),
            );
          } else if (key === "ai_strategy_reports") {
            contextParts.push(
              `\nAI STRATEGY REPORTS:\n` +
                data
                  .map(
                    (r: Record<string, unknown>) =>
                      `- [${r.timeframe}] ${r.title}: ${(r.summary as string)?.slice(0, 200)}`,
                  )
                  .join("\n"),
            );
          } else if (key === "ai_insights") {
            contextParts.push(
              `\nAI INSIGHTS (${data.length}):\n` +
                data
                  .map(
                    (i: Record<string, unknown>) =>
                      `- [${i.category || "general"}] ${i.title}: ${(i.description as string)?.slice(0, 150)}`,
                  )
                  .join("\n"),
            );
          } else if (key === "ai_competitor_sentiment") {
            contextParts.push(
              `\nCOMPETITOR SENTIMENT:\n` +
                data
                  .map(
                    (c: Record<string, unknown>) =>
                      `- ${c.competitor}: ${c.sentiment} (${c.mention_count} mentions) — ${(c.summary as string)?.slice(0, 100)}`,
                  )
                  .join("\n"),
            );
          } else if (key === "site_metrics") {
            contextParts.push(
              `\nSITE METRICS:\n` +
                data
                  .map(
                    (m: Record<string, unknown>) =>
                      `- Authority: ${m.authority_score} | Organic KW: ${m.organic_keywords} | Traffic: ${m.organic_traffic} | Backlinks: ${m.total_backlinks} | Ref Domains: ${m.referring_domains}`,
                  )
                  .join("\n"),
            );
          } else if (key === "audit_pages") {
            contextParts.push(
              `\nAUDIT PAGES (${data.length}):\n` +
                data
                  .map(
                    (p: Record<string, unknown>) =>
                      `- ${p.url} score:${p.score}/100 words:${p.word_count} title:"${(p.title as string)?.slice(0, 50)}"`,
                  )
                  .join("\n"),
            );
          } else if (key === "cannibalization_issues") {
            contextParts.push(
              `\nCANNIBALIZATION (${data.length}):\n` +
                data
                  .map(
                    (c: Record<string, unknown>) =>
                      `- "${c.keyword}" conflicts: ${c.conflicting_urls} — ${c.recommendation}`,
                  )
                  .join("\n"),
            );
          } else if (key === "recommendations") {
            contextParts.push(
              `\nPENDING RECOMMENDATIONS (${data.length}):\n` +
                data
                  .map(
                    (r: Record<string, unknown>) =>
                      `- [${r.priority || "medium"}] ${r.title}: ${(r.description as string)?.slice(0, 150)}`,
                  )
                  .join("\n"),
            );
          } else {
            contextParts.push(`\n${key.toUpperCase()} (${data.length} records loaded)`);
          }
        }
      } catch {
        // skip failed context loads
      }
    }

    contextBlock = contextParts.join("\n");
  }

  // Also get site info
  const { data: site } = await supabase.from("sites").select("*").eq("id", site_id).single();
  const siteInfo = site
    ? `\nSITE: ${site.domain} | GitHub: ${site.github_repo_owner}/${site.github_repo_name} | Branch: ${site.github_default_branch}`
    : "";

  const fullSystemPrompt = `${primaryAgent.systemPrompt}${siteInfo}${contextBlock}

${agentIds.length > 1 ? `\nNote: This request also involves: ${agentIds.slice(1).map((id) => AGENTS[id]?.name || id).join(", ")}. Address their domain if relevant.` : ""}`;

  // Call Claude API with streaming
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: fullSystemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json(
      {
        error: `Claude API error: ${response.status}`,
        detail: errText,
        agent: primaryAgent.id,
      },
      { status: 500 },
    );
  }

  // Stream response with agent metadata header
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send agent info as first event
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ agent: { id: primaryAgent.id, name: primaryAgent.name, emoji: primaryAgent.emoji } })}\n\n`,
        ),
      );

      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`),
                );
              }
            } catch {
              // skip
            }
          }
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
