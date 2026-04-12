import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET/POST /api/seo-sync
 *
 * Public API for the PPC admin site to read/write SEO data from the shared
 * Supabase database. Authenticated via a shared API token stored in app_config.
 *
 * GET ?action=pages&site_id=...     → List all audit pages with SEO scores
 * GET ?action=overview&site_id=...  → SEO overview stats
 * GET ?action=keywords&site_id=...  → All keywords from SEMRush
 * GET ?action=issues&site_id=...    → All audit issues
 * POST { action: "update_page", site_id, url, updates } → Update page meta
 * POST { action: "update_issue", issue_id, status }      → Update issue status
 */

const SYNC_TOKEN = process.env.SEO_SYNC_TOKEN || "ppc-seo-sync-2026";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function checkAuth(req: NextRequest): boolean {
  const token = req.headers.get("x-seo-sync-token") || req.nextUrl.searchParams.get("token");
  return token === SYNC_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get("action");
  const siteId = req.nextUrl.searchParams.get("site_id") || "37292000-d661-4238-8ba4-6a53b71c2d07";

  const supabase = createServiceClient();

  switch (action) {
    case "pages": {
      const { data } = await supabase
        .from("audit_pages")
        .select("*")
        .eq("site_id", siteId)
        .order("score", { ascending: true });
      return NextResponse.json(data || []);
    }

    case "overview": {
      const [auditRes, issuesRes, metricsRes] = await Promise.all([
        supabase
          .from("audits")
          .select("*")
          .eq("site_id", siteId)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("audit_issues")
          .select("severity, status")
          .eq("site_id", siteId),
        supabase
          .from("site_metrics")
          .select("*")
          .eq("site_id", siteId)
          .order("captured_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const issues = issuesRes.data || [];
      const audit = auditRes.data;
      const metrics = metricsRes.data;

      return NextResponse.json({
        totalPages: audit?.total_pages || 0,
        averageScore: audit?.overall_score || 0,
        highPriorityIssues: issues.filter((i) => i.severity === "critical" || i.severity === "high").length,
        pagesNeedingOptimization: issues.filter((i) => i.status === "open").length,
        lastAnalyzed: audit?.completed_at,
        metrics: metrics
          ? {
              authority_score: metrics.authority_score,
              organic_keywords: metrics.organic_keywords,
              organic_traffic: metrics.organic_traffic,
              total_backlinks: metrics.total_backlinks,
              referring_domains: metrics.referring_domains,
            }
          : null,
      });
    }

    case "keywords": {
      const { data } = await supabase
        .from("keywords")
        .select("keyword, position, search_volume, keyword_difficulty, cpc, url, traffic_percent, competition")
        .eq("site_id", siteId)
        .order("traffic_percent", { ascending: false, nullsFirst: false })
        .limit(300);

      // Transform to match PPC admin's expected format
      return NextResponse.json({
        allKeywords: (data || []).map((k) => ({
          keyword: k.keyword,
          position: k.position,
          volume: k.search_volume,
          kd: k.keyword_difficulty,
          visibility: k.traffic_percent,
          intent: "commercial",
          category: "General",
          priority: (k.position || 999) <= 10 ? "high" : (k.position || 999) <= 20 ? "medium" : "low",
          cpc: k.cpc,
        })),
        stats: {
          totalKeywords: (data || []).length,
          highPriority: (data || []).filter((k) => (k.position || 999) <= 10).length,
          totalVolume: (data || []).reduce((sum, k) => sum + (k.search_volume || 0), 0),
          categories: 1,
          lastUpdated: new Date().toISOString(),
        },
        categories: ["General"],
      });
    }

    case "issues": {
      const { data } = await supabase
        .from("audit_issues")
        .select("*")
        .eq("site_id", siteId)
        .order("severity", { ascending: true });
      return NextResponse.json(data || []);
    }

    case "recommendations": {
      const { data } = await supabase
        .from("recommendations")
        .select("*")
        .eq("site_id", siteId)
        .eq("status", "new")
        .order("priority", { ascending: true })
        .limit(20);
      return NextResponse.json(data || []);
    }

    case "ai-visibility": {
      const [sovRes, insightsRes, strategyRes] = await Promise.all([
        supabase
          .from("ai_share_of_voice")
          .select("*")
          .eq("site_id", siteId)
          .order("captured_at", { ascending: false })
          .limit(20),
        supabase
          .from("ai_insights")
          .select("*")
          .eq("site_id", siteId)
          .order("rank_order", { ascending: true }),
        supabase
          .from("ai_strategy_reports")
          .select("*")
          .eq("site_id", siteId)
          .order("captured_at", { ascending: false }),
      ]);
      return NextResponse.json({
        share_of_voice: sovRes.data || [],
        insights: insightsRes.data || [],
        strategy_reports: strategyRes.data || [],
      });
    }

    default:
      return NextResponse.json(
        { error: "Unknown action. Use: pages, overview, keywords, issues, recommendations, ai-visibility" },
        { status: 400 },
      );
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action, site_id = "37292000-d661-4238-8ba4-6a53b71c2d07" } = body;

  const supabase = createServiceClient();

  switch (action) {
    case "update_page": {
      const { url, updates } = body;
      if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

      // Find the page and update it
      const { data, error } = await supabase
        .from("audit_pages")
        .update({
          title: updates.metaTitle || updates.title,
          meta_description: updates.metaDescription || updates.meta_description,
          h1: updates.h1,
          target_keyword: updates.focusKeyword || updates.target_keyword,
        })
        .eq("site_id", site_id)
        .eq("url", url)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ updated: data });
    }

    case "update_issue": {
      const { issue_id, status } = body;
      if (!issue_id || !status) {
        return NextResponse.json({ error: "issue_id and status required" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("audit_issues")
        .update({ status, fixed_at: status === "fixed" ? new Date().toISOString() : null })
        .eq("id", issue_id)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ updated: data });
    }

    case "dismiss_recommendation": {
      const { recommendation_id } = body;
      if (!recommendation_id) {
        return NextResponse.json({ error: "recommendation_id required" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("recommendations")
        .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
        .eq("id", recommendation_id)
        .select();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ updated: data });
    }

    default:
      return NextResponse.json(
        { error: "Unknown action. Use: update_page, update_issue, dismiss_recommendation" },
        { status: 400 },
      );
  }
}
