import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicKey } from "@/lib/anthropic-key";

export const maxDuration = 300;

/**
 * POST /api/chat
 * Body: { messages: [{role, content}], model?: string, site_id: string }
 *
 * Streams a response from Claude API with SEO context injected.
 * The AI has access to the site's audit data, keywords, and can
 * generate code changes that get committed to the repo.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { messages, model = "claude-sonnet-4-20250514", site_id } = body;

  // Resolve Anthropic key: env var preferred, service-role fallback for app_config.
  // After the RLS tightening, the authenticated role cannot read this key directly.
  const apiKey = await getAnthropicKey();
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "No Anthropic API key configured. Set ANTHROPIC_API_KEY env var.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Get site context for the system prompt
  let siteContext = "";
  if (site_id) {
    const [siteRes, metricsRes, issuesRes, kwRes] = await Promise.all([
      supabase.from("sites").select("*").eq("id", site_id).single(),
      supabase
        .from("site_metrics")
        .select("*")
        .eq("site_id", site_id)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("audit_issues")
        .select("title, severity, status, category")
        .eq("site_id", site_id)
        .eq("status", "open")
        .order("severity", { ascending: true })
        .limit(20),
      supabase
        .from("keywords")
        .select("keyword, position, search_volume, keyword_difficulty")
        .eq("site_id", site_id)
        .order("traffic_percent", { ascending: false, nullsFirst: false })
        .limit(30),
    ]);

    const site = siteRes.data;
    const metrics = metricsRes.data;
    const issues = issuesRes.data || [];
    const keywords = kwRes.data || [];

    if (site) {
      siteContext = `
SITE CONTEXT:
- Domain: ${site.domain}
- Production URL: ${site.production_url}
- GitHub: ${site.github_repo_owner}/${site.github_repo_name} (branch: ${site.github_default_branch || "main"})
${metrics ? `
SEMRUSH METRICS:
- Authority Score: ${metrics.authority_score}
- Organic Keywords: ${metrics.organic_keywords}
- Organic Traffic: ${metrics.organic_traffic}/mo
- Backlinks: ${metrics.total_backlinks}
- Referring Domains: ${metrics.referring_domains}
` : ""}
OPEN ISSUES (${issues.length}):
${issues.map((i: { severity: string; title: string; category: string }) => `- [${i.severity.toUpperCase()}] ${i.title} (${i.category})`).join("\n")}

TOP KEYWORDS:
${keywords.map((k: { keyword: string; position: number | null; search_volume: number | null; keyword_difficulty: number | null }) => `- "${k.keyword}" pos:${k.position} vol:${k.search_volume} KD:${k.keyword_difficulty || "?"}%`).join("\n")}
`;
    }
  }

  const systemPrompt = `You are an expert SEO engineer, AI visibility optimizer, and web developer working inside the SEO Command Center. You have deep knowledge of:
- Technical SEO (meta tags, schema, Core Web Vitals, crawlability)
- AI visibility optimization (how to get recommended by ChatGPT, Gemini, Perplexity)
- Content optimization (keyword density, E-E-A-T, heading structure)
- Web design (Wes McDowell principles, conversion optimization)
- Next.js/React/TypeScript development

When the user asks you to make changes to the website:
1. Explain what you'll change and why
2. Show the actual code changes (before → after)
3. Ask for approval before applying

When analyzing SEO issues:
1. Be specific — reference actual pages, keywords, and data
2. Prioritize by impact (use the impact score formula: volume + position opportunity + difficulty ease + traffic value)
3. Always tie recommendations back to business outcomes (more bookings, higher revenue)

You speak directly and confidently. No fluff. Data-driven decisions.
${siteContext}`;

  // Call Claude API directly with streaming
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return new Response(
      JSON.stringify({ error: `Claude API error: ${response.status}`, detail: errText }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Stream the response back
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
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
              // skip unparseable
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
    },
  });
}
