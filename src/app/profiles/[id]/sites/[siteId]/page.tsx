import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { SiteDashboard } from "@/components/SiteDashboard";
import type {
  Site,
  Audit,
  AuditIssue,
  AuditPage,
  CannibalizationIssue,
  SiteMetrics,
  Keyword,
  Competitor,
  AIShareOfVoice,
  AIInsight,
} from "@/lib/types";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { siteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: site } = await supabase
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .single<Site>();

  if (!site) notFound();

  const [auditRes, metricsRes, keywordsRes, competitorsRes, sovRes, insightsRes] =
    await Promise.all([
      supabase
        .from("audits")
        .select("*")
        .eq("site_id", siteId)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle<Audit>(),
      supabase
        .from("site_metrics")
        .select("*")
        .eq("site_id", siteId)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle<SiteMetrics>(),
      supabase
        .from("keywords")
        .select("*")
        .eq("site_id", siteId)
        .order("traffic_percent", { ascending: false, nullsFirst: false })
        .limit(500),
      supabase
        .from("competitors")
        .select("*")
        .eq("site_id", siteId)
        .order("relevance", { ascending: false }),
      supabase
        .from("ai_share_of_voice")
        .select("*")
        .eq("site_id", siteId)
        .order("captured_at", { ascending: false })
        .limit(50),
      supabase
        .from("ai_insights")
        .select("*")
        .eq("site_id", siteId)
        .order("rank_order", { ascending: true }),
    ]);

  const audit = auditRes.data;
  const metrics = metricsRes.data;

  let issues: AuditIssue[] = [];
  let pages: AuditPage[] = [];
  let cannibalization: CannibalizationIssue[] = [];

  if (audit) {
    const [issuesRes, pagesRes, cannibalizationRes] = await Promise.all([
      supabase.from("audit_issues").select("*").eq("audit_id", audit.id),
      supabase.from("audit_pages").select("*").eq("audit_id", audit.id),
      supabase.from("cannibalization_issues").select("*").eq("audit_id", audit.id),
    ]);
    issues = (issuesRes.data as AuditIssue[]) || [];
    pages = (pagesRes.data as AuditPage[]) || [];
    cannibalization = (cannibalizationRes.data as CannibalizationIssue[]) || [];
  }

  return (
    <AppShell user={user}>
      <SiteDashboard
        site={site}
        audit={audit}
        issues={issues}
        pages={pages}
        cannibalization={cannibalization}
        metrics={metrics}
        keywords={(keywordsRes.data as Keyword[]) || []}
        competitors={(competitorsRes.data as Competitor[]) || []}
        aiShareOfVoice={(sovRes.data as AIShareOfVoice[]) || []}
        aiInsights={(insightsRes.data as AIInsight[]) || []}
      />
    </AppShell>
  );
}
