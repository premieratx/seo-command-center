/**
 * Central Claude model registry.
 *
 * Stale dated model snapshots (like `claude-opus-4-5-20250929`) get sunset
 * by Anthropic and start returning 404 — that broke the Command Center
 * chat once already. This module is the SINGLE source of truth for which
 * models we use, with built-in auto-fallback so future sunsets degrade
 * gracefully instead of erroring.
 *
 * If you need to reference a model anywhere in the app, import from here.
 * Do NOT hardcode model IDs in routes or components.
 */

/** Task complexity tier — drives auto cost/quality selection. */
export type Tier = "fast" | "balanced" | "deep";

/**
 * Latest-known working model per tier, in priority order.
 * First entry is tried first; on 404 (sunset) the next is used.
 *
 * Keep newest → oldest. The fallback chain means a newly sunset snapshot
 * won't take down the app — it degrades to the next working alias.
 */
export const MODEL_CHAIN: Record<Tier, string[]> = {
  // Opus — multi-step strategy, batch orchestration, code changes
  deep: ["claude-opus-4-7", "claude-opus-4-5", "claude-sonnet-4-6"],
  // Sonnet — most day-to-day work, single-file edits, long-form writing
  balanced: ["claude-sonnet-4-6", "claude-sonnet-4-5", "claude-sonnet-4-20250514"],
  // Haiku — short replies, quick lookups, cheap classification
  fast: ["claude-haiku-4-5-20251001"],
};

/** Friendly names for the UI model selector. */
export const MODEL_OPTIONS: { value: string; label: string; tier: Tier }[] = [
  { value: "auto", label: "Auto (picks best for the task)", tier: "balanced" },
  { value: MODEL_CHAIN.deep[0], label: "Opus 4.7 (deep reasoning)", tier: "deep" },
  { value: MODEL_CHAIN.balanced[0], label: "Sonnet 4.6 (balanced)", tier: "balanced" },
  { value: MODEL_CHAIN.fast[0], label: "Haiku 4.5 (fast + cheap)", tier: "fast" },
];

/**
 * Pick the tier that fits this request. Defaults toward cheaper models —
 * only escalates to Opus when the task actually warrants multi-step
 * reasoning. Mirrors how Claude Code auto-selects: match cost to complexity.
 */
export function pickTier(message: string, conversationLen: number): Tier {
  const m = message.toLowerCase();
  const len = message.length;

  // Batch orchestration, audits, multi-file refactors → Opus
  const deepSignals = [
    /please execute\s+\d+\s+(recommendation|fix)/i, // batch mode
    /\n\s*[23456789]\.\s+/, // numbered list of 2+
    /orchestrator mode|unified plan|comprehensive plan|conflict detection/i,
    /audit|strategy|multi-step|architect|refactor (the|across|everything)/i,
    /rewrite\s+(all|every|the entire|the whole)/i,
    /across\s+(the )?(site|codebase|all pages)/i,
  ];
  if (deepSignals.some((p) => p.test(message))) return "deep";
  if (len > 2000 || conversationLen > 10) return "deep";

  // Short factual lookups → Haiku
  const fastSignals = [
    /^\s*(what|where|when|who|how much|status|list|show me)\b.{0,80}\?\s*$/i,
    /^\s*(yes|no|ok|thanks|got it|confirm)\b/i,
  ];
  if (fastSignals.some((p) => p.test(message)) && len < 120 && conversationLen < 3) {
    return "fast";
  }

  // Default — most SEO/content work
  return "balanced";
}

/**
 * Resolve a user-facing model selection (or "auto") to an actual ordered
 * list of model IDs to try. The first that doesn't 404 is used.
 */
export function resolveModelChain(
  selected: string | undefined,
  message: string,
  conversationLen: number,
): string[] {
  if (!selected || selected === "auto") {
    const tier = pickTier(message, conversationLen);
    return MODEL_CHAIN[tier];
  }
  // If the user pinned a specific model, try it first but still fall back to
  // the tier chain below it so a sunset snapshot doesn't 404 the whole chat.
  for (const tier of Object.keys(MODEL_CHAIN) as Tier[]) {
    if (MODEL_CHAIN[tier][0] === selected) return MODEL_CHAIN[tier];
  }
  // Unknown model — prepend it, then fall back to balanced.
  return [selected, ...MODEL_CHAIN.balanced];
}

/**
 * Call Anthropic `/v1/messages` with auto-fallback across a model chain.
 *
 * Retries on 404 (model sunset) by advancing through MODEL_CHAIN. Returns
 * the first successful Response AND the model that actually answered.
 * Non-404 errors (auth, rate limit, 5xx) surface immediately.
 *
 * If all models in the chain 404 (shouldn't happen with the fallback list
 * above), the last Response is returned so the caller can report the
 * final error.
 */
export async function callClaudeWithFallback(opts: {
  apiKey: string;
  models: string[];
  body: Record<string, unknown>;
  stream?: boolean;
}): Promise<{ response: Response; modelUsed: string }> {
  const { apiKey, models, body, stream } = opts;
  let lastResponse: Response | null = null;

  for (const model of models) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ ...body, model, stream: stream ?? body.stream }),
    });

    if (response.ok) return { response, modelUsed: model };

    // 404 = model sunset or not found → try next in chain
    if (response.status === 404) {
      lastResponse = response;
      console.warn(`[claude-fallback] ${model} returned 404, trying next model`);
      continue;
    }

    // Any other error — surface it; don't mask auth/rate limit/5xx
    return { response, modelUsed: model };
  }

  // All models exhausted — return the last 404 so caller reports the error
  return { response: lastResponse!, modelUsed: models[models.length - 1] };
}
