// Google Ads API adapter.
//
// Three integration paths, picked by env vars:
//
//   1. ADLOOP_BRIDGE_URL       → HTTP bridge in front of the adloop MCP server
//                                (`adloop serve --http`). Preferred — preserves
//                                the dry-run/preview/confirm safety workflow.
//   2. GOOGLE_ADS_*            → Direct Google Ads REST v17 calls (dev token
//                                + OAuth refresh). No preview workflow — we
//                                gate writes behind our own confirm modal.
//   3. (neither set)           → Sample data so the dashboard still renders.
//
// Read-only GAQL queries are constructed here. Writes go through action.ts.

import type { Campaign, AdLoopResponse } from "./types";
import { SAMPLE_GOOGLE_CAMPAIGNS, sumMetrics } from "./sample-data";

export interface GoogleAdsConfig {
  bridgeUrl?: string;
  bridgeToken?: string;
  developerToken?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  loginCustomerId?: string;
  customerId?: string;
}

export function readGoogleAdsConfig(): GoogleAdsConfig {
  return {
    bridgeUrl: process.env.ADLOOP_BRIDGE_URL,
    bridgeToken: process.env.ADLOOP_BRIDGE_TOKEN,
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    clientId: process.env.GOOGLE_ADS_CLIENT_ID,
    clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
    customerId: process.env.GOOGLE_ADS_CUSTOMER_ID,
  };
}

export function isGoogleAdsConfigured(c: GoogleAdsConfig): boolean {
  if (c.bridgeUrl) return true;
  return Boolean(
    c.developerToken && c.clientId && c.clientSecret && c.refreshToken && c.customerId,
  );
}

async function bridgeFetch(path: string, init?: RequestInit): Promise<unknown> {
  const cfg = readGoogleAdsConfig();
  if (!cfg.bridgeUrl) throw new Error("adloop bridge not configured");
  const url = `${cfg.bridgeUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(cfg.bridgeToken ? { authorization: `Bearer ${cfg.bridgeToken}` } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`adloop bridge ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchOAuthAccessToken(c: GoogleAdsConfig): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId!,
      client_secret: c.clientSecret!,
      refresh_token: c.refreshToken!,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`google oauth ${res.status}`);
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

interface GAQLRow {
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    startDate?: string;
    endDate?: string;
    biddingStrategyType?: string;
  };
  campaignBudget?: { amountMicros?: string };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
    conversionsValue?: number;
  };
}

async function fetchCampaignsViaREST(c: GoogleAdsConfig): Promise<Campaign[]> {
  const accessToken = await fetchOAuthAccessToken(c);
  const customerId = c.customerId!.replace(/-/g, "");
  const url = `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:search`;
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.start_date,
      campaign.end_date,
      campaign.bidding_strategy_type,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.cost_micros DESC
    LIMIT 200
  `;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "developer-token": c.developerToken!,
      ...(c.loginCustomerId
        ? { "login-customer-id": c.loginCustomerId.replace(/-/g, "") }
        : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`google ads ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { results?: GAQLRow[] };
  return (json.results || []).map((row) => {
    const impressions = Number(row.metrics?.impressions || 0);
    const clicks = Number(row.metrics?.clicks || 0);
    const cost = Number(row.metrics?.costMicros || 0) / 1_000_000;
    const conversions = Number(row.metrics?.conversions || 0);
    const conversion_value = Number(row.metrics?.conversionsValue || 0);
    return {
      id: String(row.campaign?.id || ""),
      platform: "google" as const,
      name: row.campaign?.name || "(unnamed)",
      status: (row.campaign?.status as Campaign["status"]) || "ENABLED",
      channel: (row.campaign?.advertisingChannelType as Campaign["channel"]) || "OTHER",
      daily_budget: row.campaignBudget?.amountMicros
        ? Number(row.campaignBudget.amountMicros) / 1_000_000
        : null,
      bidding_strategy: row.campaign?.biddingStrategyType || null,
      start_date: row.campaign?.startDate || null,
      end_date: row.campaign?.endDate || null,
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
}

export async function getGoogleAdsData(): Promise<AdLoopResponse> {
  const cfg = readGoogleAdsConfig();
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  const dateRange = {
    start: start.toISOString().slice(0, 10),
    end: today.toISOString().slice(0, 10),
  };

  if (!isGoogleAdsConfigured(cfg)) {
    const campaigns = SAMPLE_GOOGLE_CAMPAIGNS;
    return {
      summary: {
        platform: "google",
        connected: false,
        setup_hint:
          "Set ADLOOP_BRIDGE_URL, or GOOGLE_ADS_DEVELOPER_TOKEN + OAuth creds, to connect live data.",
        date_range: dateRange,
        totals: sumMetrics(campaigns),
        is_sample_data: true,
      },
      campaigns,
    };
  }

  try {
    const campaigns = cfg.bridgeUrl
      ? ((await bridgeFetch("/google/campaigns")) as Campaign[])
      : await fetchCampaignsViaREST(cfg);
    return {
      summary: {
        platform: "google",
        connected: true,
        date_range: dateRange,
        totals: sumMetrics(campaigns),
        is_sample_data: false,
      },
      campaigns,
    };
  } catch (err) {
    // Surface the error via sample data + a readable hint — the dashboard
    // renders the setup banner so the operator can fix the config without
    // losing the UI.
    const campaigns = SAMPLE_GOOGLE_CAMPAIGNS;
    return {
      summary: {
        platform: "google",
        connected: false,
        setup_hint: `Google Ads error: ${err instanceof Error ? err.message : String(err)}`,
        date_range: dateRange,
        totals: sumMetrics(campaigns),
        is_sample_data: true,
      },
      campaigns,
    };
  }
}

export async function mutateGoogleCampaign(
  campaignId: string,
  action: "pause" | "enable" | "remove",
  dryRun: boolean,
): Promise<{ ok: boolean; preview: string; applied: boolean; error?: string }> {
  const cfg = readGoogleAdsConfig();
  const targetStatus =
    action === "pause" ? "PAUSED" : action === "enable" ? "ENABLED" : "REMOVED";
  const preview = `Google Ads · campaign ${campaignId} → ${targetStatus}`;

  if (!isGoogleAdsConfigured(cfg)) {
    return { ok: false, preview, applied: false, error: "Not configured — set env vars first." };
  }
  if (dryRun) return { ok: true, preview, applied: false };

  try {
    if (cfg.bridgeUrl) {
      await bridgeFetch("/google/campaigns/mutate", {
        method: "POST",
        body: JSON.stringify({ campaign_id: campaignId, action, confirm: true }),
      });
      return { ok: true, preview, applied: true };
    }
    const accessToken = await fetchOAuthAccessToken(cfg);
    const customerId = cfg.customerId!.replace(/-/g, "");
    const url = `https://googleads.googleapis.com/v17/customers/${customerId}/campaigns:mutate`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "developer-token": cfg.developerToken!,
        ...(cfg.loginCustomerId
          ? { "login-customer-id": cfg.loginCustomerId.replace(/-/g, "") }
          : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        operations: [
          {
            update: {
              resourceName: `customers/${customerId}/campaigns/${campaignId}`,
              status: targetStatus,
            },
            updateMask: "status",
          },
        ],
      }),
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
