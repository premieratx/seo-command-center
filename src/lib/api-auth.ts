/**
 * Shared auth + CORS helpers for the `/api/*` routes that accept a
 * server-to-server sync token.
 *
 * Design goals:
 *  - NEVER fall back to a hardcoded token. If SEO_SYNC_TOKEN is not set in the
 *    environment, the endpoint must refuse all token-based auth rather than
 *    accept a guessable default.
 *  - CORS is an explicit allowlist. Unknown origins get no CORS headers back,
 *    which means browsers from those origins cannot read the response or
 *    consume the endpoint from JS (same-origin policy).
 */

import type { NextRequest } from "next/server";

/**
 * Parse the comma-separated SEO_SYNC_ALLOWED_ORIGINS env var into a Set.
 * Defaults to localhost dev origins if unset.
 */
function allowedOrigins(): Set<string> {
  const raw = process.env.SEO_SYNC_ALLOWED_ORIGINS || "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    // Sensible local-dev defaults; production MUST set SEO_SYNC_ALLOWED_ORIGINS
    return new Set([
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
    ]);
  }
  return new Set(list);
}

/**
 * Compute CORS headers for a given request. Only echoes the origin if it is
 * in the allowlist — otherwise returns an empty header bag so browsers from
 * disallowed origins are blocked by same-origin policy on the client side.
 */
export function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed = allowedOrigins();
  if (!origin || !allowed.has(origin)) {
    // No CORS headers → browsers block cross-origin reads. Non-browser callers
    // (server-to-server) are unaffected because they don't enforce CORS.
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-seo-sync-token",
    "Access-Control-Allow-Credentials": "false",
  };
}

/**
 * Verify a sync token from a request. Returns true ONLY if:
 *   1. SEO_SYNC_TOKEN is set in the environment (no hardcoded fallback).
 *   2. The request's x-seo-sync-token header OR ?token= query matches exactly.
 *
 * Comparison is timing-safe.
 */
export function verifySyncToken(req: NextRequest): boolean {
  const configured = process.env.SEO_SYNC_TOKEN;
  if (!configured || configured.length < 16) {
    // No valid token configured → refuse all token-based auth.
    // (Length check blocks trivial/default values like "test" or "dev".)
    return false;
  }

  const provided =
    req.headers.get("x-seo-sync-token") ||
    req.nextUrl.searchParams.get("token") ||
    "";

  if (!provided || provided.length !== configured.length) return false;

  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < configured.length; i++) {
    diff |= configured.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}
