import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

/**
 * POST /api/pagespeed/run
 * Body: { site_id: string, url?: string, strategy?: "mobile" | "desktop" }
 *
 * Calls Google PageSpeed Insights API. No API key needed for basic usage
 * (rate-limited), but supports GOOGLE_PAGESPEED_API_KEY for higher limits.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { site_id, url: targetUrl, strategy = "mobile" } = await req.json();
  if (!site_id) return NextResponse.json({ error: "site_id required" }, { status: 400 });

  const { data: site } = await supabase.from("sites").select("*").eq("id", site_id).single();
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const auditUrl = targetUrl || site.production_url;
  const key = process.env.GOOGLE_PAGESPEED_API_KEY;
  const psiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  psiUrl.searchParams.set("url", auditUrl);
  psiUrl.searchParams.set("strategy", strategy);
  psiUrl.searchParams.set("category", "performance");
  psiUrl.searchParams.set("category", "accessibility");
  psiUrl.searchParams.set("category", "best-practices");
  psiUrl.searchParams.set("category", "seo");
  if (key) psiUrl.searchParams.set("key", key);

  try {
    const res = await fetch(psiUrl.toString(), {
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `PageSpeed API error: ${res.status}`, detail: text }, { status: 500 });
    }
    const data = await res.json();
    const lighthouse = data.lighthouseResult;
    const audits = lighthouse?.audits || {};

    const result = {
      url: auditUrl,
      strategy,
      performance_score: Math.round((lighthouse?.categories?.performance?.score || 0) * 100),
      accessibility_score: Math.round((lighthouse?.categories?.accessibility?.score || 0) * 100),
      best_practices_score: Math.round((lighthouse?.categories?.["best-practices"]?.score || 0) * 100),
      seo_score: Math.round((lighthouse?.categories?.seo?.score || 0) * 100),
      lcp: audits["largest-contentful-paint"]?.numericValue,
      cls: audits["cumulative-layout-shift"]?.numericValue,
      inp: audits["interaction-to-next-paint"]?.numericValue,
      fcp: audits["first-contentful-paint"]?.numericValue,
      ttfb: audits["server-response-time"]?.numericValue,
      tbt: audits["total-blocking-time"]?.numericValue,
      opportunities: Object.entries(audits)
        .filter(([, a]: [string, unknown]) => {
          const audit = a as { score?: number; title?: string };
          return audit.score !== null && audit.score !== undefined && audit.score < 0.9;
        })
        .slice(0, 10)
        .map(([id, a]: [string, unknown]) => {
          const audit = a as { title?: string; description?: string; score?: number };
          return { id, title: audit.title, description: audit.description, score: audit.score };
        }),
    };

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PageSpeed failed" },
      { status: 500 },
    );
  }
}
