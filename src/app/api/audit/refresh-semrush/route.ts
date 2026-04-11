import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getDomainMetrics,
  getOrganicKeywords,
  getCompetitors,
  getBacklinksOverview,
} from "@/lib/integrations/semrush";

export const maxDuration = 120;

/**
 * POST /api/audit/refresh-semrush
 * Body: { site_id: string }
 *
 * Refreshes SEMRush data for a site: metrics, keywords, competitors, backlinks.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { site_id } = await req.json();
  if (!site_id) return NextResponse.json({ error: "site_id required" }, { status: 400 });

  const { data: site } = await supabase.from("sites").select("*").eq("id", site_id).single();
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const domain = site.domain;

  try {
    const [metrics, backlinks, keywords, competitors] = await Promise.all([
      getDomainMetrics(domain),
      getBacklinksOverview(domain),
      getOrganicKeywords(domain, 200),
      getCompetitors(domain, 10),
    ]);

    // Insert new metrics snapshot
    await supabase.from("site_metrics").insert({
      site_id,
      source: "semrush",
      ...metrics,
      ...backlinks,
    });

    // Replace keywords (delete old, insert new)
    await supabase.from("keywords").delete().eq("site_id", site_id);
    if (keywords.length > 0) {
      const chunks = [];
      for (let i = 0; i < keywords.length; i += 50) {
        chunks.push(keywords.slice(i, i + 50));
      }
      for (const chunk of chunks) {
        await supabase.from("keywords").insert(
          chunk.map((k) => ({ site_id, ...k })),
        );
      }
    }

    // Replace competitors
    await supabase.from("competitors").delete().eq("site_id", site_id);
    if (competitors.length > 0) {
      await supabase.from("competitors").insert(
        competitors.map((c) => ({ site_id, ...c })),
      );
    }

    return NextResponse.json({
      ok: true,
      keywords: keywords.length,
      competitors: competitors.length,
      metrics: metrics ? true : false,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "SEMRush refresh failed" },
      { status: 500 },
    );
  }
}
