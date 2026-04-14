import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

/**
 * POST /api/pagespeed/run
 * Body: { site_id: string, url?: string, strategy?: "mobile" | "desktop" }
 *
 * Calls Google PageSpeed Insights API.
 * Key resolution: GOOGLE_PAGESPEED_API_KEY env → Supabase app_config
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

  // Get API key: env → Supabase → none (will be rate-limited)
  let key = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!key) {
    const { data: configRow } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "google_pagespeed_api_key")
      .single();
    key = configRow?.value || undefined;
  }

  const auditUrl = targetUrl || site.production_url;
  const psiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  psiUrl.searchParams.set("url", auditUrl);
  psiUrl.searchParams.set("strategy", strategy);
  // Use append for multiple category values (set would overwrite)
  psiUrl.searchParams.append("category", "performance");
  psiUrl.searchParams.append("category", "accessibility");
  psiUrl.searchParams.append("category", "best-practices");
  psiUrl.searchParams.append("category", "seo");
  if (key) psiUrl.searchParams.set("key", key);

  try {
    const res = await fetch(psiUrl.toString(), {
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const text = await res.text();
      // If rate limited, provide helpful error
      if (res.status === 429) {
        return NextResponse.json(
          {
            error: "Google PageSpeed rate limit reached. Add a Google API key to increase limits.",
            detail: "Go to console.cloud.google.com → APIs → PageSpeed Insights API → Create credentials. Then add 'google_pagespeed_api_key' to the Supabase app_config table.",
            status: 429,
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: `PageSpeed API error: ${res.status}`, detail: text },
        { status: 500 },
      );
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
      speed_index: audits["speed-index"]?.numericValue,
      opportunities: Object.entries(audits)
        .filter(([, a]: [string, unknown]) => {
          const audit = a as { score?: number; details?: { type?: string } };
          return (
            audit.score !== null &&
            audit.score !== undefined &&
            audit.score < 0.9 &&
            audit.details?.type === "opportunity"
          );
        })
        .slice(0, 10)
        .map(([id, a]: [string, unknown]) => {
          const audit = a as {
            title?: string;
            description?: string;
            score?: number;
            numericValue?: number;
            details?: { overallSavingsMs?: number };
          };
          return {
            id,
            title: audit.title,
            description: audit.description,
            score: audit.score,
            savings_ms: audit.details?.overallSavingsMs,
          };
        }),
      diagnostics: Object.entries(audits)
        .filter(([, a]: [string, unknown]) => {
          const audit = a as { score?: number; details?: { type?: string } };
          return (
            audit.score !== null &&
            audit.score !== undefined &&
            audit.score < 0.9 &&
            audit.details?.type === "table"
          );
        })
        .slice(0, 5)
        .map(([id, a]: [string, unknown]) => {
          const audit = a as { title?: string; description?: string; score?: number };
          return { id, title: audit.title, score: audit.score };
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
