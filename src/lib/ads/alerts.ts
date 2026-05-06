// Heuristic alerts engine. Pure-function — given a list of campaigns it
// returns a ranked list of issues to address. Used by AdAlerts and is also
// a perfect target for the agent-chat tools (so Claude can call
// `list_ad_alerts` and reason over the same shape humans see in the UI).

import type { Campaign, AdPlatform } from "./types";

export type AlertSeverity = "critical" | "warning" | "info";

export interface AdAlert {
  id: string;
  severity: AlertSeverity;
  category:
    | "waste"
    | "roas_drop"
    | "low_volume"
    | "budget_exhaust"
    | "creative_fatigue"
    | "opportunity";
  platform: AdPlatform;
  campaign_id: string;
  campaign_name: string;
  title: string;
  detail: string;
  // Suggested next action — fed straight into the bulk-action / Insights flow.
  suggested_action: "pause" | "scale" | "fix_targeting" | "rotate_creative" | "raise_budget" | null;
  // Estimated impact in dollars per month — negative for waste, positive for upside.
  monthly_dollar_impact: number;
}

export interface AlertsConfig {
  // Spend over this with zero conversions = critical waste
  waste_min_spend: number;
  // ROAS below this with non-trivial spend = warning
  poor_roas_threshold: number;
  // Daily budget % consumed in last 7 days that means we're consistently hitting cap
  daily_pacing_threshold: number;
  // CTR below this on Search/Performance Max = creative fatigue
  fatigue_ctr_threshold: number;
  // Min spend ($) before any alert is even considered (filter out new tests)
  min_spend_for_alerts: number;
}

export const DEFAULT_ALERT_CONFIG: AlertsConfig = {
  waste_min_spend: 100,
  poor_roas_threshold: 2,
  daily_pacing_threshold: 0.95,
  fatigue_ctr_threshold: 0.005,
  min_spend_for_alerts: 50,
};

export function detectAlerts(campaigns: Campaign[], cfg = DEFAULT_ALERT_CONFIG): AdAlert[] {
  const out: AdAlert[] = [];

  for (const c of campaigns) {
    const m = c.metrics;
    if (m.cost < cfg.min_spend_for_alerts) continue;

    // 1. WASTE — money in, no conversions out
    if (m.cost >= cfg.waste_min_spend && m.conversions === 0) {
      out.push({
        id: `waste:${c.platform}:${c.id}`,
        severity: "critical",
        category: "waste",
        platform: c.platform,
        campaign_id: c.id,
        campaign_name: c.name,
        title: `Burning $${m.cost.toFixed(0)} with zero conversions`,
        detail:
          c.status === "ENABLED"
            ? `Currently active — ${c.daily_budget ? `$${c.daily_budget}/day budget. ` : ""}Pausing immediately stops the bleed.`
            : `Already paused — keep it that way and move budget to a winning campaign.`,
        suggested_action: c.status === "ENABLED" ? "pause" : null,
        monthly_dollar_impact: -((m.cost / 30) * 30),
      });
      continue;
    }

    // 2. POOR ROAS — money in, weak return
    if (m.cost >= cfg.waste_min_spend && m.roas > 0 && m.roas < cfg.poor_roas_threshold) {
      out.push({
        id: `roas:${c.platform}:${c.id}`,
        severity: m.roas < 1 ? "critical" : "warning",
        category: "roas_drop",
        platform: c.platform,
        campaign_id: c.id,
        campaign_name: c.name,
        title: `ROAS ${m.roas.toFixed(2)}x · below ${cfg.poor_roas_threshold}x target`,
        detail:
          m.roas < 1
            ? `Spending more than it earns. Pause or fix targeting + creatives before next billing cycle.`
            : `Profitable but weak. Tighten audience, refresh ad copy, or shift budget to higher-ROAS campaigns.`,
        suggested_action: m.roas < 1 ? "pause" : "fix_targeting",
        monthly_dollar_impact: -((m.cost - m.conversion_value) / 30) * 30,
      });
    }

    // 3. CREATIVE FATIGUE — high impressions, low CTR
    if (m.impressions > 50_000 && m.ctr < cfg.fatigue_ctr_threshold && m.cost >= cfg.waste_min_spend) {
      out.push({
        id: `fatigue:${c.platform}:${c.id}`,
        severity: "warning",
        category: "creative_fatigue",
        platform: c.platform,
        campaign_id: c.id,
        campaign_name: c.name,
        title: `CTR ${(m.ctr * 100).toFixed(2)}% on ${m.impressions.toLocaleString()} impressions`,
        detail: `Creatives have lost audience attention. Rotate in 2-3 fresh ad variants this week.`,
        suggested_action: "rotate_creative",
        monthly_dollar_impact: -m.cost * 0.15,
      });
    }

    // 4. SCALE OPPORTUNITY — high ROAS + likely budget-capped
    if (m.cost >= cfg.waste_min_spend && m.roas >= 4 && c.daily_budget && m.cost / 30 >= c.daily_budget * cfg.daily_pacing_threshold) {
      out.push({
        id: `scale:${c.platform}:${c.id}`,
        severity: "info",
        category: "opportunity",
        platform: c.platform,
        campaign_id: c.id,
        campaign_name: c.name,
        title: `ROAS ${m.roas.toFixed(2)}x · likely budget-capped`,
        detail: `Daily spend is averaging ${((m.cost / 30 / c.daily_budget) * 100).toFixed(0)}% of the $${c.daily_budget} cap. A 30-50% raise typically yields proportional revenue.`,
        suggested_action: "raise_budget",
        monthly_dollar_impact: m.conversion_value * 0.4,
      });
    }
  }

  // Sort: critical first, then by absolute dollar impact descending.
  const sevRank: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  out.sort((a, b) => {
    if (sevRank[a.severity] !== sevRank[b.severity]) return sevRank[a.severity] - sevRank[b.severity];
    return Math.abs(b.monthly_dollar_impact) - Math.abs(a.monthly_dollar_impact);
  });

  return out;
}
