import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client.
 *
 * Bypasses RLS — use ONLY in trusted server routes that have already
 * verified the caller (via Supabase auth session OR sync token) and never
 * import from client components.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY not configured — set it in Netlify env vars.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
