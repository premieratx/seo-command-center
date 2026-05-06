// Drill-down data structures — what you see when you expand a campaign row
// to inspect its ad groups, search terms and creatives.

import type { AdMetrics, AdPlatform } from "./types";

export interface AdGroup {
  id: string;
  name: string;
  status: "ENABLED" | "PAUSED";
  metrics: AdMetrics;
}

// Google Ads search terms (queries triggering Search ads). For Meta this
// slot holds the per-creative breakdown ("post / Reel / Story") instead.
export interface SearchTerm {
  query: string;
  matched_keyword: string | null;
  metrics: AdMetrics;
  // Status — useful for showing if the operator already added it as a
  // negative keyword.
  flagged_negative: boolean;
}

export interface CreativeRow {
  id: string;
  // Headline + description for RSAs; primary text for Meta posts.
  headline: string;
  description: string | null;
  status: "ENABLED" | "PAUSED";
  // Google quality score / Meta quality ranking — null when the platform
  // hasn't computed it yet.
  quality: number | null;
  metrics: AdMetrics;
}

export interface DrilldownPayload {
  platform: AdPlatform;
  campaign_id: string;
  campaign_name: string;
  ad_groups: AdGroup[];
  // Search terms (Google) or per-creative breakdown (Meta) — same column shape.
  search_terms: SearchTerm[];
  creatives: CreativeRow[];
  // True when this is synthetic data because the platform isn't connected.
  is_sample_data: boolean;
}
