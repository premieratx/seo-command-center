// Shared types for the Ad Loop dashboard (Google Ads + Meta Ads).
//
// Both platforms are normalised into the same shape so a single dashboard
// component can render either, and so the AI agents ("optimize this
// campaign") can reason across them without branching on platform.

export type AdPlatform = "google" | "meta";

export type CampaignStatus = "ENABLED" | "PAUSED" | "REMOVED" | "ENDED";

export type CampaignChannel =
  // Google
  | "SEARCH"
  | "PERFORMANCE_MAX"
  | "DISPLAY"
  | "VIDEO"
  | "SHOPPING"
  | "DEMAND_GEN"
  // Meta
  | "META_FEED"
  | "META_REELS"
  | "META_STORIES"
  | "META_ADVANTAGE_PLUS"
  | "META_MESSENGER"
  // Misc
  | "OTHER";

export interface AdMetrics {
  impressions: number;
  clicks: number;
  cost: number; // dollars
  conversions: number;
  conversion_value: number; // dollars
  ctr: number; // 0-1
  cpc: number; // dollars
  cpa: number; // dollars, Infinity-safe (null when 0 conv)
  roas: number; // x, null when 0 cost
}

export interface Campaign {
  id: string;
  platform: AdPlatform;
  name: string;
  status: CampaignStatus;
  channel: CampaignChannel;
  daily_budget: number | null; // dollars
  metrics: AdMetrics;
  // Google-specific niceties
  bidding_strategy?: string | null;
  // Meta-specific niceties
  objective?: string | null;
  // Human-readable timestamps
  start_date?: string | null;
  end_date?: string | null;
}

export interface AdLoopSummary {
  platform: AdPlatform;
  connected: boolean;
  // Present when connected === false so the UI can show setup guidance
  setup_hint?: string;
  date_range: { start: string; end: string };
  totals: AdMetrics;
  // When connected === false we still return sample data so the UI renders.
  is_sample_data: boolean;
}

export interface AdLoopResponse {
  summary: AdLoopSummary;
  campaigns: Campaign[];
}

export interface AdLoopAction {
  platform: AdPlatform;
  campaign_id: string;
  action: "pause" | "enable" | "remove";
  // Two-step write workflow per AdLoop's safety model:
  //   1. dry_run: true  → returns a preview diff, no write
  //   2. dry_run: false → commits the change (requires a prior preview)
  dry_run: boolean;
}
