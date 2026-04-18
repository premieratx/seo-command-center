import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicKey } from "@/lib/anthropic-key";
import { corsHeaders } from "@/lib/api-auth";

export const maxDuration = 300;

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * POST /api/blog-writer
 *
 * Generates a new blog post draft grounded in the site's tracked keyword
 * set (SEMrush data) and existing blog titles. Returns a JSON object with
 *   { slug, title, excerpt, body_md, hero_image_url, tags }
 * ready to persist into public.blog_posts or feed into the BlogEditor.
 */
export async function POST(req: NextRequest) {
  const CORS = corsHeaders(req);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const apiKey = await getAnthropicKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured." },
      { status: 400, headers: CORS },
    );
  }

  const {
    topic,
    primary_keyword,
    secondary_keywords = [],
    target_words = 1800,
    tone = "polished",
    intent = "informational",
    site_id,
  } = await req.json();

  if (!topic || !site_id) {
    return NextResponse.json(
      { error: "topic and site_id required" },
      { status: 400, headers: CORS },
    );
  }

  // Context: existing blog titles (to avoid duplication) + top tracked keywords
  const [{ data: posts }, { data: kws }] = await Promise.all([
    supabase
      .from("blog_posts")
      .select("slug, title, target_keyword")
      .eq("site_id", site_id)
      .limit(200),
    supabase
      .from("keywords")
      .select("keyword, search_volume, position, url")
      .eq("site_id", site_id)
      .order("search_volume", { ascending: false, nullsFirst: false })
      .limit(80),
  ]);

  const existingTitles = (posts || [])
    .map((p) => `- ${p.title} (/blog/${p.slug})`)
    .join("\n");
  const topKwList = (kws || [])
    .map(
      (k) =>
        `- ${k.keyword} — ${(k.search_volume || 0).toLocaleString()}/mo${
          k.position ? `, currently #${k.position}` : ""
        }`,
    )
    .join("\n");

  const systemPrompt = `You are the in-house SEO content writer for Premier Party Cruises (PPC), a Lake Travis party boat charter company operating out of Anderson Mill Marina in Austin, Texas since 2009.

BRAND VOICE
• Warm, confident, local-expert. Not corporate, not salesy.
• Uses "we" for PPC. First-person plural.
• Austin-native references (Hill Country, 6th Street, Rainey Street, South Congress, ACL, SXSW, UT, Lake Travis, Anderson Mill, Oasis, Mansfield Dam).
• Mentions BYOB-friendly charter policies, Party On Delivery (sister company for dock drop-offs), coolers + Bluetooth audio included, licensed captain.
• Pricing notes: use "starting at $X" never absolute. Meeseeks boat = "Irony pricing" internal joke — external copy just says "Meeseeks · The Irony" or "our mid-size boat".
• Boats: Day Tripper (1-14), Meeseeks · The Irony (15-30), Clever Girl (31-75).
• ATX Disco Cruise = per-person ticketed public sailing on Clever Girl (Fri/Sat Mar-Oct), bach parties only.
• Never invent prices, stats, or customer quotes. Use ranges or "typical" language.

SEO REQUIREMENTS
• Target length: ~${target_words} words. Hit it within ±15%.
• Primary keyword goes in H1, first 100 words, meta description (excerpt), URL slug, and 3-5 times organically in body.
• Secondary keywords appear naturally 1-3 times each — do NOT stuff.
• 4-7 H2 sections, plus a "Frequently Asked Questions" H2 with 5 Q&As.
• Include 3-5 internal links in [text](/path) format pointing at relevant existing PPC pages (/quote, /pricing, /atx-disco-cruise, /bachelor-party-austin, /corporate-events, /private-cruises, or existing blog slugs).
• End with a CTA paragraph pointing to /quote.
• Markdown only. No frontmatter, no triple-dash blocks.

TONE
${tone === "casual" ? "Casual, fun, conversational. Contractions welcome. Short sentences. Can use 'y'all'." : tone === "educational" ? "Educational how-to voice. Checklists, numbered steps, clear structure. Teach-first." : "Polished brand voice — confident, editorial, SEO-tuned. Avoids slang. No fluff."}

INTENT: ${intent}

EXISTING BLOG TITLES (do NOT duplicate — write something unique):
${existingTitles}

TOP TRACKED KEYWORDS FOR THIS SITE (for inspiration):
${topKwList}

OUTPUT FORMAT (strict JSON, no prose, no markdown fence):
{
  "slug": "kebab-case-from-title",
  "title": "Engaging H1 with primary keyword",
  "excerpt": "120-160 char meta description with primary keyword",
  "tags": ["tag1", "tag2", "tag3"],
  "hero_image_url": "",
  "body_md": "# Title\\n\\nFull markdown body..."
}`;

  const userPrompt = `Write a new blog post.

Topic: ${topic}
Primary keyword: ${primary_keyword || "(author's choice — pick the most relevant tracked keyword for this topic)"}
Secondary keywords: ${secondary_keywords.length ? secondary_keywords.join(", ") : "(author's choice)"}
Target length: ${target_words} words`;

  // Call Anthropic
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json(
      { error: `Anthropic API error (${resp.status}): ${text.slice(0, 500)}` },
      { status: 502, headers: CORS },
    );
  }

  const payload = await resp.json();
  const raw =
    payload?.content?.[0]?.text || payload?.completion || JSON.stringify(payload);

  // Extract JSON block — model sometimes wraps in ```json ... ```
  const jsonMatch =
    raw.match(/```json\s*([\s\S]*?)\s*```/i) ||
    raw.match(/```\s*([\s\S]*?)\s*```/) ||
    raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json(
      { error: "Model returned non-JSON output", raw: raw.slice(0, 1200) },
      { status: 500, headers: CORS },
    );
  }

  return NextResponse.json(parsed, { headers: CORS });
}
