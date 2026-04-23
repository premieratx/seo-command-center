import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicKey } from "@/lib/anthropic-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/_diag
 *
 * Authenticated diagnostic endpoint. Returns the live runtime config for
 * the agent-chat path: Node vs Edge, timeout ceiling, Anthropic key
 * status, Supabase connectivity, and a round-trip time to Anthropic.
 *
 * Use this to prove in-browser (or via curl with a session cookie) that
 * the backend is actually running as Node and can reach Claude — so when
 * the chat freezes we have hard evidence of what layer broke.
 */
export async function GET(req: NextRequest) {
  const start = Date.now();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const env = {
    NETLIFY: !!process.env.NETLIFY,
    NODE_VERSION: process.version,
    has_ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    has_SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    has_ANTHROPIC_TRIGGER_TOKEN: !!process.env.ANTHROPIC_TRIGGER_TOKEN,
    has_NEXT_USE_NETLIFY_EDGE: !!process.env.NEXT_USE_NETLIFY_EDGE,
    runtime_platform:
      process.env.NETLIFY_DEV === "true"
        ? "netlify-dev"
        : (globalThis as unknown as { EdgeRuntime?: string }).EdgeRuntime
        ? "edge"
        : "nodejs",
  };

  // Test Anthropic reachability without spending many tokens
  let anthropic: { ok: boolean; status?: number; latency_ms?: number; error?: string } = { ok: false };
  const key = await getAnthropicKey();
  if (!key) {
    anthropic = { ok: false, error: "no-api-key" };
  } else {
    const t0 = Date.now();
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      anthropic = { ok: r.ok, status: r.status, latency_ms: Date.now() - t0 };
      if (!r.ok) anthropic.error = (await r.text()).slice(0, 200);
    } catch (e) {
      anthropic = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  // Test Supabase reachability
  const t1 = Date.now();
  const { error: sbErr } = await supabase.from("sites").select("id").limit(1);
  const supabaseRT = { ok: !sbErr, latency_ms: Date.now() - t1, error: sbErr?.message };

  return NextResponse.json({
    ok: env.runtime_platform === "nodejs" && anthropic.ok && supabaseRT.ok,
    elapsed_ms: Date.now() - start,
    user_email: user.email,
    env,
    anthropic,
    supabase: supabaseRT,
  });
}
