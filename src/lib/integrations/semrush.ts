/**
 * SEMRush API client.
 * Key resolution: process.env.SEMRUSH_API_KEY → Supabase app_config table
 * Docs: https://developer.semrush.com/api/
 */

import { createClient } from "@/lib/supabase/server";

const BASE = "https://api.semrush.com";

let _cachedKey: string | null = null;

async function getSemrushKey(): Promise<string> {
  // 1. Check env var first
  if (process.env.SEMRUSH_API_KEY) return process.env.SEMRUSH_API_KEY;

  // 2. Use cached key if available
  if (_cachedKey) return _cachedKey;

  // 3. Fall back to Supabase app_config
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "semrush_api_key")
      .single();
    if (data?.value) {
      _cachedKey = data.value;
      return data.value;
    }
  } catch {
    // fall through
  }

  throw new Error("SEMRUSH_API_KEY not set — add to .env.local or Supabase app_config");
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(";");
  return lines.slice(1).map((line) => {
    const values = line.split(";");
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
}

function toInt(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function toFloat(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

export interface DomainMetrics {
  domain_rank: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  organic_cost: number | null;
  adwords_keywords: number | null;
  adwords_traffic: number | null;
  adwords_cost: number | null;
}

export async function getDomainMetrics(domain: string, database = "us"): Promise<DomainMetrics | null> {
  const key = await getSemrushKey();

  const url = `${BASE}/?type=domain_ranks&key=${key}&display_limit=1&export_columns=Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${encodeURIComponent(domain)}&database=${database}`;
  const res = await fetch(url);
  const text = await res.text();
  const rows = parseCsv(text);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    domain_rank: toInt(r["Rank"]),
    organic_keywords: toInt(r["Organic Keywords"]),
    organic_traffic: toInt(r["Organic Traffic"]),
    organic_cost: toFloat(r["Organic Cost"]),
    adwords_keywords: toInt(r["Adwords Keywords"]),
    adwords_traffic: toInt(r["Adwords Traffic"]),
    adwords_cost: toFloat(r["Adwords Cost"]),
  };
}

export interface KeywordRow {
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
}

export async function getOrganicKeywords(
  domain: string,
  limit = 200,
  database = "us",
): Promise<KeywordRow[]> {
  const key = await getSemrushKey();

  const url = `${BASE}/?type=domain_organic&key=${key}&display_limit=${limit}&export_columns=Ph,Po,Pp,Pd,Nq,Cp,Ur,Tr,Tc,Co,Nr&domain=${encodeURIComponent(domain)}&database=${database}&display_sort=tr_desc`;
  const res = await fetch(url);
  const text = await res.text();
  const rows = parseCsv(text);

  return rows.map((r) => ({
    keyword: r["Keyword"] || "",
    position: toInt(r["Position"]),
    previous_position: toInt(r["Previous Position"]),
    position_difference: toInt(r["Position Difference"]),
    search_volume: toInt(r["Search Volume"]),
    cpc: toFloat(r["CPC"]),
    url: r["Url"] || null,
    traffic_percent: toFloat(r["Traffic (%)"]),
    traffic_cost_percent: toFloat(r["Traffic Cost (%)"]),
    competition: toFloat(r["Competition"]),
    number_of_results: toInt(r["Number of Results"]),
  }));
}

export interface CompetitorRow {
  domain: string;
  relevance: number | null;
  common_keywords: number | null;
  organic_keywords: number | null;
  organic_traffic: number | null;
  organic_cost: number | null;
  adwords_keywords: number | null;
}

export async function getCompetitors(
  domain: string,
  limit = 10,
  database = "us",
): Promise<CompetitorRow[]> {
  const key = await getSemrushKey();

  const url = `${BASE}/?type=domain_organic_organic&key=${key}&display_limit=${limit}&export_columns=Dn,Cr,Np,Or,Ot,Oc,Ad&domain=${encodeURIComponent(domain)}&database=${database}`;
  const res = await fetch(url);
  const text = await res.text();
  const rows = parseCsv(text);

  return rows.map((r) => ({
    domain: r["Domain"] || "",
    relevance: toFloat(r["Competitor Relevance"]),
    common_keywords: toInt(r["Common Keywords"]),
    organic_keywords: toInt(r["Organic Keywords"]),
    organic_traffic: toInt(r["Organic Traffic"]),
    organic_cost: toFloat(r["Organic Cost"]),
    adwords_keywords: toInt(r["Adwords Keywords"]),
  }));
}

export interface BacklinksOverview {
  authority_score: number | null;
  total_backlinks: number | null;
  referring_domains: number | null;
  follow_backlinks: number | null;
  nofollow_backlinks: number | null;
}

export async function getBacklinksOverview(domain: string): Promise<BacklinksOverview | null> {
  const key = await getSemrushKey();

  const url = `${BASE}/analytics/v1/?type=backlinks_overview&key=${key}&target=${encodeURIComponent(domain)}&target_type=root_domain&export_columns=ascore,total,domains_num,follows_num,nofollows_num`;
  const res = await fetch(url);
  const text = await res.text();
  const rows = parseCsv(text);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    authority_score: toInt(r["ascore"]),
    total_backlinks: toInt(r["total"]),
    referring_domains: toInt(r["domains_num"]),
    follow_backlinks: toInt(r["follows_num"]),
    nofollow_backlinks: toInt(r["nofollows_num"]),
  };
}
