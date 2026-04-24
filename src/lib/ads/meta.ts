// Meta Marketing API adapter.
//
// Uses the Graph API v19.0 with a long-lived access token. Keeps parity with
// the Google adapter so the dashboard consumes a uniform shape.

import type { Campaign, AdLoopResponse } from "./types";
import { SAMPLE_META_CAMPAIGNS, sumMetrics } from "./sample-data";

export interface MetaAdsConfig {
  accessToken?: string;
  adAccountId?: string; // with or without the "act_" prefix
  apiVersion?: string;
}

export function readMetaAdsConfig(): MetaAdsConfig {
  return {
    accessToken: process.env.META_ADS_ACCESS_TOKEN,
    adAccountId: process.env.META_ADS_AD_ACCOUNT_ID,
    apiVersion: process.env.META_ADS_API_VERSION || "v19.0",
  };
}

export function isMetaAdsConfigured(c: MetaAdsConfig): boolean {
  return Boolean(c.accessToken && c.adAccountId);
}

function normalizeAccountId(id: string): string {
  return id.startsWith("act_") ? id : `act_${id}`;
}

interface MetaCampaignRow {
  id: string;
  name: string;
  status?: string;
  objective?: string;
  daily_budget?: string;
  start_time?: string;
  end_time?: string | null;
}

interface MetaInsightRow {
  campaign_id?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

export async function getMetaAdsData(): Promise<AdLoopResponse> {
  const cfg = readMetaAdsConfig();
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  const dateRange = {
    start: start.toISOString().slice(0, 10),
    end: today.toISOString().slice(0, 10),
  };

  if (!isMetaAdsConfigured(cfg)) {
    const campaigns = SAMPLE_META_CAMPAIGNS;
    return {
      summary: {
        platform: "meta",
        connected: false,
        setup_hint:
          "Set META_ADS_ACCESS_TOKEN and META_ADS_AD_ACCOUNT_ID to connect your Ad Account.",
        date_range: dateRange,
        totals: sumMetrics(campaigns),
        is_sample_data: true,
      },
      campaigns,
    };
  }

  try {
    const accountId = normalizeAccountId(cfg.adAccountId!);
    const base = `https://graph.facebook.com/${cfg.apiVersion}/${accountId}`;

    const [campaignsRes, insightsRes] = await Promise.all([
      fetch(
        `${base}/campaigns?fields=id,name,status,objective,daily_budget,start_time,end_time&limit=200&access_token=${encodeURIComponent(cfg.accessToken!)}`,
        { cache: "no-store" },
      ),
      fetch(
        `${base}/insights?level=campaign&date_preset=last_30d&fields=campaign_id,impressions,clicks,spend,actions,action_values&limit=500&access_token=${encodeURIComponent(cfg.accessToken!)}`,
        { cache: "no-store" },
      ),
    ]);
    if (!campaignsRes.ok)
      throw new Error(`meta campaigns ${campaignsRes.status}: ${await campaignsRes.text()}`);
    if (!insightsRes.ok)
      throw new Error(`meta insights ${insightsRes.status}: ${await insightsRes.text()}`);

    const campaignsJson = (await campaignsRes.json()) as { data: MetaCampaignRow[] };
    const insightsJson = (await insightsRes.json()) as { data: MetaInsightRow[] };

    const insightsByCampaign = new Map<string, MetaInsightRow>();
    for (const row of insightsJson.data || []) {
      if (row.campaign_id) insightsByCampaign.set(row.campaign_id, row);
    }

    const campaigns: Campaign[] = (campaignsJson.data || []).map((c) => {
      const ins = insightsByCampaign.get(c.id);
      const impressions = Number(ins?.impressions || 0);
      const clicks = Number(ins?.clicks || 0);
      const cost = Number(ins?.spend || 0);
      // Meta reports "purchase" conversions via the actions array. We pick
      // purchase / complete_registration / lead as the primary conversion
      // signal, and sum value from action_values for the same action types.
      const conversionTypes = new Set(["purchase", "lead", "complete_registration"]);
      const conversions = (ins?.actions || [])
        .filter((a) => conversionTypes.has(a.action_type))
        .reduce((sum, a) => sum + Number(a.value || 0), 0);
      const conversion_value = (ins?.action_values || [])
        .filter((a) => conversionTypes.has(a.action_type))
        .reduce((sum, a) => sum + Number(a.value || 0), 0);

      return {
        id: c.id,
        platform: "meta",
        name: c.name,
        status: (c.status as Campaign["status"]) || "ENABLED",
        channel: "META_FEED",
        daily_budget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        objective: c.objective || null,
        start_date: c.start_time ? c.start_time.slice(0, 10) : null,
        end_date: c.end_time ? c.end_time.slice(0, 10) : null,
        metrics: {
          impressions,
          clicks,
          cost,
          conversions,
          conversion_value,
          ctr: impressions > 0 ? clicks / impressions : 0,
          cpc: clicks > 0 ? cost / clicks : 0,
          cpa: conversions > 0 ? cost / conversions : 0,
          roas: cost > 0 ? conversion_value / cost : 0,
        },
      };
    });

    return {
      summary: {
        platform: "meta",
        connected: true,
        date_range: dateRange,
        totals: sumMetrics(campaigns),
        is_sample_data: false,
      },
      campaigns,
    };
  } catch (err) {
    const campaigns = SAMPLE_META_CAMPAIGNS;
    return {
      summary: {
        platform: "meta",
        connected: false,
        setup_hint: `Meta Ads error: ${err instanceof Error ? err.message : String(err)}`,
        date_range: dateRange,
        totals: sumMetrics(campaigns),
        is_sample_data: true,
      },
      campaigns,
    };
  }
}

export async function mutateMetaCampaign(
  campaignId: string,
  action: "pause" | "enable" | "remove",
  dryRun: boolean,
): Promise<{ ok: boolean; preview: string; applied: boolean; error?: string }> {
  const cfg = readMetaAdsConfig();
  const targetStatus =
    action === "pause" ? "PAUSED" : action === "enable" ? "ACTIVE" : "DELETED";
  const preview = `Meta Ads · campaign ${campaignId} → ${targetStatus}`;

  if (!isMetaAdsConfigured(cfg)) {
    return { ok: false, preview, applied: false, error: "Not configured — set env vars first." };
  }
  if (dryRun) return { ok: true, preview, applied: false };

  try {
    const url = `https://graph.facebook.com/${cfg.apiVersion}/${campaignId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: targetStatus, access_token: cfg.accessToken }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, preview, applied: false, error: `${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true, preview, applied: true };
  } catch (err) {
    return {
      ok: false,
      preview,
      applied: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
