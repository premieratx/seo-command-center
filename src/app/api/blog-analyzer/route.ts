import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { corsHeaders, verifySyncToken } from "@/lib/api-auth";

export const maxDuration = 300;

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * POST /api/blog-analyzer
 *
 * Runs a rule-based SEO analysis over every blog post for the given site
 * and persists one blog_audits row per post. Can be triggered manually
 * (authenticated dashboard user) or from pg_cron via the sync token.
 *
 * Body: { site_id: string }
 *
 * For each post we compute:
 *   • score       0-100 composite
 *   • word_count  (stripped markdown)
 *   • tracked_kw_hits  count of tracked keywords appearing in the body
 *   • top_issues      failing checklist items
 *   • recommendations [{title, impact, effort, fix_prompt}]
 *   • quick_wins      3 easiest actions
 *   • high_impact     3 biggest-lift rewrites
 */
export async function POST(req: NextRequest) {
  const CORS = corsHeaders(req);
  const body = await req.json().catch(() => ({}));
  const siteId: string | undefined = body.site_id;
  if (!siteId) {
    return NextResponse.json(
      { error: "site_id required" },
      { status: 400, headers: CORS },
    );
  }

  // Auth: either a logged-in dashboard user OR the sync token (for cron)
  const supabaseForAuth = await createServerClient();
  const {
    data: { user },
  } = await supabaseForAuth.auth.getUser();
  const isAuthed = !!user || verifySyncToken(req);
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  // Use service client to bypass RLS for the bulk write
  const db = createServiceClient();

  // 1. Load posts + tracked keywords in parallel
  const [postsResult, kwResult] = await Promise.all([
    db.from("blog_posts").select("*").eq("site_id", siteId).limit(500),
    db
      .from("keywords")
      .select("keyword, search_volume, position, keyword_difficulty, url")
      .eq("site_id", siteId)
      .limit(500),
  ]);

  if (postsResult.error) {
    return NextResponse.json(
      { error: postsResult.error.message },
      { status: 500, headers: CORS },
    );
  }
  const posts = postsResult.data || [];
  const keywords = kwResult.data || [];

  const audits: Array<Record<string, unknown>> = [];
  for (const p of posts) {
    const analysis = analyzePost(p, keywords);
    audits.push({
      post_id: p.id,
      site_id: siteId,
      score: analysis.score,
      word_count: analysis.wordCount,
      tracked_kw_hits: analysis.trackedHits,
      top_issues: analysis.topIssues,
      recommendations: analysis.recommendations,
      quick_wins: analysis.quickWins,
      high_impact: analysis.highImpact,
      analyzer_version: "v1",
    });
  }

  if (!audits.length) {
    return NextResponse.json(
      { ok: true, analyzed: 0, message: "No posts to analyze" },
      { headers: CORS },
    );
  }

  const { error: insertError } = await db.from("blog_audits").insert(audits);
  if (insertError) {
    return NextResponse.json(
      { error: `Failed to save audits: ${insertError.message}` },
      { status: 500, headers: CORS },
    );
  }

  const avgScore = Math.round(
    audits.reduce((s, a) => s + ((a.score as number) || 0), 0) / audits.length,
  );

  return NextResponse.json(
    {
      ok: true,
      analyzed: audits.length,
      site_id: siteId,
      avg_score: avgScore,
      analyzer_version: "v1",
    },
    { headers: CORS },
  );
}

// ── Analysis ────────────────────────────────────────────────────────────

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string | null;
  hero_image_url: string | null;
  tags: string[] | null;
  target_keyword: string | null;
  status: string;
  source: string;
};

type KwRow = {
  keyword: string;
  search_volume: number | null;
  position: number | null;
  keyword_difficulty: number | null;
  url: string | null;
};

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[>#*_~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function analyzePost(post: PostRow, keywords: KwRow[]) {
  const body = post.body_md || "";
  const text = stripMarkdown(body).toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const haystack = `${post.title} ${post.excerpt || ""} ${text}`.toLowerCase();

  const h1Match = body.match(/^\s*#\s+(.+)$/m);
  const h1 = h1Match ? h1Match[1].trim() : null;
  const internalLinks =
    (body.match(/\[[^\]]+\]\(\/[^)]+\)/g) || []).length +
    (body.match(/\[[^\]]+\]\(https?:\/\/(?:www\.)?premierpartycruises\.com[^)]*\)/gi) || []).length;

  // Keyword matching
  const matched: KwRow[] = [];
  const unmatched: KwRow[] = [];
  for (const k of keywords) {
    const kw = (k.keyword || "").toLowerCase().trim();
    if (!kw) continue;
    const re = new RegExp(
      `\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i",
    );
    if (re.test(haystack)) matched.push(k);
    else unmatched.push(k);
  }

  // Sort unmatched by "closest to ranking" (position 4-30) + volume
  unmatched.sort((a, b) => {
    const aPrio = a.position && a.position >= 4 && a.position <= 30 ? 1 : 0;
    const bPrio = b.position && b.position >= 4 && b.position <= 30 ? 1 : 0;
    if (aPrio !== bPrio) return bPrio - aPrio;
    return (b.search_volume || 0) - (a.search_volume || 0);
  });

  const checklist = [
    { label: "Title length (30–70 chars)", ok: post.title.length >= 30 && post.title.length <= 70 },
    {
      label: "Excerpt length (120–160 chars)",
      ok: (post.excerpt || "").length >= 120 && (post.excerpt || "").length <= 160,
    },
    { label: "Slug kebab-case", ok: !!post.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) },
    { label: "Hero image set", ok: !!post.hero_image_url },
    { label: "H1 in body", ok: !!h1 },
    { label: "Word count ≥ 1000", ok: wordCount >= 1000 },
    { label: "≥ 3 internal links", ok: internalLinks >= 3 },
    { label: "≥ 1 tag", ok: (post.tags || []).length >= 1 },
    { label: "Targets ≥ 1 tracked keyword", ok: matched.length >= 1 },
  ];

  const passed = checklist.filter((c) => c.ok).length;
  const base = Math.round((passed / checklist.length) * 100);
  const lengthBonus = wordCount >= 1500 ? 0 : wordCount >= 1000 ? -5 : wordCount >= 500 ? -15 : -25;
  const keywordBonus = Math.min(matched.length, 5) * 3;
  const score = Math.max(0, Math.min(100, base + lengthBonus + keywordBonus));

  const topIssues = checklist.filter((c) => !c.ok).slice(0, 5).map((c) => c.label);

  // Recommendations — paired with a pre-built Fix-this prompt
  const recommendations: Array<{
    title: string;
    impact: "high" | "medium" | "low";
    effort: "quick" | "medium" | "deep";
    fix_prompt: string;
  }> = [];

  if (wordCount < 1000) {
    recommendations.push({
      title: `Expand to ${wordCount < 500 ? "1,500+" : "1,500+"} words`,
      impact: "high",
      effort: wordCount < 300 ? "deep" : "medium",
      fix_prompt: `Expand the blog post at /blog/${post.slug} ("${post.title}") from ${wordCount} to at least 1,500 words. Add: 3 new H2 sections, a FAQ section with 5 Q&As, a "How we booked our first 100 cruises" section with specific details, and 3 more internal links. Keep the PPC brand voice.`,
    });
  }
  if (!h1) {
    recommendations.push({
      title: "Add H1 heading to body",
      impact: "high",
      effort: "quick",
      fix_prompt: `Add an H1 heading to /blog/${post.slug}. Current title is "${post.title}" — use that as the H1 and place it as the first line of body_md.`,
    });
  }
  if (!matched.length && unmatched.length) {
    const top = unmatched.slice(0, 3).map((k) => k.keyword);
    recommendations.push({
      title: `Target high-opportunity keyword: "${top[0]}"`,
      impact: "high",
      effort: "medium",
      fix_prompt: `The blog post /blog/${post.slug} ("${post.title}") doesn't mention any of our tracked keywords yet. Rewrite the first paragraph and add a FAQ entry to naturally include: ${top.join(", ")}. Pull the highest-volume one into the H1 if it fits.`,
    });
  }
  if (internalLinks < 3) {
    recommendations.push({
      title: `Add ${3 - internalLinks} internal link(s)`,
      impact: "medium",
      effort: "quick",
      fix_prompt: `Add ${3 - internalLinks} internal links to /blog/${post.slug}. Link to /quote (CTA), /pricing, /atx-disco-cruise, and/or 2 related blog posts. Use [anchor text](/path) markdown format.`,
    });
  }
  if ((post.excerpt || "").length < 120 || (post.excerpt || "").length > 160) {
    recommendations.push({
      title: "Fix meta description length (120–160 chars)",
      impact: "medium",
      effort: "quick",
      fix_prompt: `Update the excerpt (meta description) for /blog/${post.slug} to be 120–160 characters. Current length: ${(post.excerpt || "").length}. Include the primary keyword "${post.target_keyword || unmatched[0]?.keyword || post.title}".`,
    });
  }
  if (!post.hero_image_url) {
    recommendations.push({
      title: "Add hero image",
      impact: "low",
      effort: "quick",
      fix_prompt: `Set a hero_image_url on /blog/${post.slug}. Pick a relevant photo from our gallery or /attached_assets/ — prefer an image matching the post topic ("${post.title}").`,
    });
  }

  const quickWins = recommendations.filter((r) => r.effort === "quick").slice(0, 3);
  const highImpact = recommendations.filter((r) => r.impact === "high").slice(0, 3);

  return {
    score,
    wordCount,
    trackedHits: matched.length,
    topIssues,
    recommendations,
    quickWins,
    highImpact,
  };
}
