import { createClient } from "@supabase/supabase-js";

/**
 * Resolve the Anthropic API key from (in order):
 *   1. ANTHROPIC_API_KEY env var (preferred)
 *   2. public.app_config row where key = 'anthropic_api_key', read via the
 *      SERVICE ROLE client so it bypasses RLS.
 *
 * Returns null if neither is available.
 *
 * Note: after the RLS migration that hides secret keys from the `authenticated`
 * role, the old pattern of reading app_config with a cookie-based Supabase
 * client no longer works. All access MUST go through the service role.
 */
let cached: { key: string; at: number } | null = null;
const TTL_MS = 5 * 60 * 1000;

export async function getAnthropicKey(): Promise<string | null> {
  // 1. Env var always wins
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return envKey;

  // 2. Cached lookup from app_config
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.key;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  try {
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await admin
      .from("app_config")
      .select("value")
      .eq("key", "anthropic_api_key")
      .maybeSingle();
    if (error) {
      console.error("getAnthropicKey: app_config read failed", error.message);
      return null;
    }
    const val = data?.value as string | undefined;
    if (val) {
      cached = { key: val, at: now };
      return val;
    }
    return null;
  } catch (e) {
    console.error("getAnthropicKey: unexpected error", e);
    return null;
  }
}
