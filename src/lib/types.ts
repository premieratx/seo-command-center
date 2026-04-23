// Database types matching the Supabase schema

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  profile_id: string;
  name: string;
  domain: string;
  production_url: string;
  github_repo_owner: string | null;
  github_repo_name: string | null;
  github_default_branch: string | null;
  github_token_encrypted: string | null;
  netlify_site_id: string | null;
  netlify_team_slug: string | null;
  current_working_branch: string | null;
  last_audit_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Audit {
  id: string;
  site_id: string;
  status: "pending" | "running" | "complete" | "failed";
  overall_score: number | null;
  total_pages: number | null;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  raw_data: unknown;
  started_at: string;
  completed_at: string | null;
}

export interface AuditIssue {
  id: string;
  audit_id: string;
  site_id: string;
  issue_key: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string | null;
  affected_pages: string[];
  recommended_fix: string | null;
  impact: string | null;
  status: "open" | "in_progress" | "fixed" | "dismissed";
  fixed_at: string | null;
  fixed_in_session_id: string | null;
  created_at: string;
  // Extended fields from the expanded audit algorithm
  priority?: "urgent" | "high" | "medium" | "low" | null;
  effort?: "quick_win" | "moderate" | "heavy" | null;
  impact_score?: number | null;
  target_keywords?: string[] | null;
  applied_commit?: string | null;
  applied_at?: string | null;
}

export interface AuditPage {
  id: string;
  audit_id: string;
  site_id: string;
  url: string;
  page_type: string | null;
  target_keyword: string | null;
  title: string | null;
  h1: string | null;
  meta_description: string | null;
  canonical: string | null;
  word_count: number | null;
  schema_types: string[];
  internal_links_count: number | null;
  has_og_tags: boolean;
  score: number | null;
  raw_data: unknown;
  created_at: string;
}

export interface CannibalizationIssue {
  id: string;
  audit_id: string;
  site_id: string;
  keyword: string;
  intended_page: string;
  competing_pages: { url: string; score: number }[];
  severity: "high" | "medium";
  recommendation: string | null;
  status: "open" | "in_progress" | "fixed" | "dismissed";
  created_at: string;
}

export interface FixSession {
  id: string;
  site_id: string;
  name: string;
  description: string | null;
  branch_name: string;
  status: "draft" | "previewing" | "published" | "abandoned";
  netlify_preview_url: string | null;
  netlify_deploy_id: string | null;
  github_pr_number: number | null;
  created_at: string;
  published_at: string | null;
}

export interface SiteMetrics {
  id: string;
  site_id: string;
  source: string;
  domain_rank: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  organic_cost: number | null;
  adwords_keywords: number | null;
  adwords_traffic: number | null;
  adwords_cost: number | null;
  authority_score: number | null;
  total_backlinks: number | null;
  referring_domains: number | null;
  follow_backlinks: number | null;
  nofollow_backlinks: number | null;
  captured_at: string;
}

export interface Keyword {
  id: string;
  site_id: string;
  keyword: string;
  position: number | null;
  previous_position: number | null;
  position_difference: number | null;
  search_volume: number | null;
  cpc: number | null;
  url: string | null;
  traffic_percent: number | null;
  traffic_cost_percent: number | null;
  competition: number | null;
  number_of_results: number | null;
  trends: string | null;
  keyword_difficulty: number | null;
  serp_features: string | null;
  captured_at: string;
}

export interface Competitor {
  id: string;
  site_id: string;
  domain: string;
  relevance: number | null;
  common_keywords: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  organic_cost: number | null;
  adwords_keywords: number | null;
  captured_at: string;
}

export interface AIShareOfVoice {
  id: string;
  site_id: string;
  platform: string;
  brand: string;
  share_percent: number | null;
  mentions: number | null;
  avg_position: number | null;
  is_own_brand: boolean;
  captured_at: string;
}

export interface AIInsight {
  id: string;
  site_id: string;
  rank_order: number;
  title: string;
  description: string;
  source: string;
  status: string;
  captured_at: string;
  target_keywords?: string[] | null;
  target_pages?: string[] | null;
  source_llm?: string | null;
  source_surface?: string | null;
  priority?: string | null;
  applied_commit?: string | null;
  applied_at?: string | null;
  task_status?: "not_started" | "in_progress" | "complete" | "archived" | null;
}

export interface AIStrategyReport {
  id: string;
  site_id: string;
  title: string;
  summary: string;
  timeframe: string | null;
  recommendations: string[];
  source: string;
  captured_at: string;
}

export interface AICompetitorSentiment {
  id: string;
  site_id: string;
  competitor: string;
  share_of_voice: number | null;
  sov_trend: string | null;
  favorable_sentiment: number | null;
  sentiment_trend: string | null;
  summary: string | null;
  captured_at: string;
}

export interface Recommendation {
  id: string;
  site_id: string;
  user_id: string;
  category: "quick_win" | "content_gap" | "technical" | "cannibalization" | "competitor" | "schema" | "other";
  priority: number;
  title: string;
  description: string | null;
  suggested_action: string | null;
  metadata: Record<string, unknown> | null;
  status: "new" | "viewed" | "dismissed" | "actioned";
  created_at: string;
  viewed_at: string | null;
  dismissed_at: string | null;
  actioned_at: string | null;
}

export interface Fix {
  id: string;
  fix_session_id: string;
  audit_issue_id: string | null;
  file_path: string;
  change_type: "meta_tag" | "content" | "schema" | "redirect" | "other";
  before_content: string | null;
  after_content: string | null;
  applied: boolean;
  applied_at: string | null;
  github_commit_sha: string | null;
  created_at: string;
}
