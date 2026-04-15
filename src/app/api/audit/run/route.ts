import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crawlPage, fetchSitemapUrls, scorePage } from "@/lib/integrations/crawler";

export const maxDuration = 300; // 5 min max

/**
 * POST /api/audit/run
 * Body: { site_id: string }
 *
 * Crawls the site, creates an audit record, writes pages + issues to the DB.
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

  // Create audit record
  const { data: audit, error: auditErr } = await supabase
    .from("audits")
    .insert({ site_id, status: "running" })
    .select()
    .single();
  if (auditErr || !audit) {
    return NextResponse.json({ error: auditErr?.message || "Failed to create audit" }, { status: 500 });
  }

  // Fetch sitemap URLs (up to 200 for full site audit)
  const sitemapUrl = `${site.production_url.replace(/\/$/, "")}/sitemap.xml`;
  const urls = await fetchSitemapUrls(sitemapUrl, 200);

  // Fall back to homepage only if no sitemap
  const urlsToAudit = urls.length > 0 ? urls.map((u) => u.loc) : [site.production_url];

  let critical = 0;
  let high = 0;
  let medium = 0;
  const pagesData = [];
  const issueDedupe = new Map<string, { severity: string; count: number; pages: string[] }>();

  const baseDomain = new URL(site.production_url).hostname;

  for (const url of urlsToAudit) {
    try {
      const page = await crawlPage(url, baseDomain);
      const { score, issues } = scorePage(page);

      pagesData.push({
        audit_id: audit.id,
        site_id,
        url: new URL(url).pathname,
        title: page.title,
        h1: page.h1,
        meta_description: page.meta_description,
        canonical: page.canonical,
        word_count: page.word_count,
        schema_types: page.schema_types,
        internal_links_count: page.internal_links,
        has_og_tags: page.has_og_tags,
        score,
      });

      // Dedupe common issues
      for (const issue of issues) {
        const severity =
          issue.includes("Missing title") || issue.includes("Missing H1") ? "critical" :
          issue.includes("Missing canonical") || issue.includes("Missing meta description") || issue.includes("Missing Open Graph") ? "high" :
          "medium";
        if (!issueDedupe.has(issue)) {
          issueDedupe.set(issue, { severity, count: 0, pages: [] });
        }
        const e = issueDedupe.get(issue)!;
        e.count++;
        e.pages.push(new URL(url).pathname);
      }
    } catch (e) {
      console.error("Crawl error for", url, e);
    }
  }

  // Insert pages
  if (pagesData.length > 0) {
    await supabase.from("audit_pages").insert(pagesData);
  }

  // Insert deduped issues
  const issueRows = [];
  for (const [title, data] of issueDedupe) {
    if (data.severity === "critical") critical++;
    else if (data.severity === "high") high++;
    else medium++;

    issueRows.push({
      audit_id: audit.id,
      site_id,
      issue_key: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      severity: data.severity,
      category: title.includes("schema") ? "Structured Data" :
                title.includes("meta") || title.includes("title") || title.includes("canonical") ? "Meta Tags" :
                title.includes("H1") || title.includes("headings") ? "On-Page SEO" :
                title.includes("content") || title.includes("word") ? "Content" :
                title.includes("image") ? "Images" :
                "Technical SEO",
      title: `${title} on ${data.count} page${data.count > 1 ? "s" : ""}`,
      description: `Found ${data.count} page(s) with this issue during the live crawl.`,
      affected_pages: data.pages.slice(0, 20),
      recommended_fix: "Auto-generated from crawl — use the fix session workflow to apply changes.",
      impact: data.severity === "critical" ? "High" : data.severity === "high" ? "Medium-High" : "Medium",
      status: "open",
    });
  }
  if (issueRows.length > 0) {
    await supabase.from("audit_issues").insert(issueRows);
  }

  // Overall score = average of page scores
  const avgScore =
    pagesData.length > 0
      ? Math.round(pagesData.reduce((a, b) => a + (b.score || 0), 0) / pagesData.length)
      : 0;

  // Update audit
  await supabase
    .from("audits")
    .update({
      status: "complete",
      overall_score: avgScore,
      total_pages: urlsToAudit.length,
      critical_issues: critical,
      high_issues: high,
      medium_issues: medium,
      completed_at: new Date().toISOString(),
    })
    .eq("id", audit.id);

  await supabase.from("sites").update({ last_audit_at: new Date().toISOString() }).eq("id", site_id);

  return NextResponse.json({
    audit_id: audit.id,
    score: avgScore,
    pages_crawled: pagesData.length,
    issues: issueRows.length,
  });
}
