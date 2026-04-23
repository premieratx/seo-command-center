/**
 * Context-window budgeting for the Command Center chat.
 *
 * Claude Opus + Sonnet 4.X support 200K tokens by default, and Opus 4.7
 * supports 1M tokens with the beta header `context-1m-2025-08-07`. We
 * enable the 1M beta for Opus so long conversations — multi-step SEO
 * plans, repeated Fix Now batches, huge file reads — don't hit a wall.
 *
 * Tokens are approximated from character length (1 token ≈ 3.5 chars).
 * Cheap + close enough for budgeting; we add a 15% safety margin.
 */

export type ContextBudget = {
  /** model id we're about to call */
  model: string;
  /** hard ceiling the model accepts */
  budget: number;
  /** current estimated token count across all messages + system */
  used: number;
  /** 0–1 fill ratio with safety margin applied */
  pct: number;
  /** when true, caller should compact or trim before calling the API */
  needsCompaction: boolean;
};

const PER_MODEL_BUDGET: Record<string, number> = {
  // Opus 4.7 with 1M-context beta header
  "claude-opus-4-7": 1_000_000,
  "claude-opus-4-5": 200_000,
  "claude-sonnet-4-6": 200_000,
  "claude-sonnet-4-5": 200_000,
  "claude-sonnet-4-20250514": 200_000,
  "claude-haiku-4-5-20251001": 200_000,
};

/** Models that support the 1M-context beta header. */
export function supportsLongContext(model: string): boolean {
  return /opus-4-7/.test(model);
}

/**
 * Returns Anthropic API extra headers for a given model. Adds the 1M
 * context beta when the model supports it.
 */
export function extraAnthropicHeaders(model: string): Record<string, string> {
  return supportsLongContext(model) ? { "anthropic-beta": "context-1m-2025-08-07" } : {};
}

function modelBudget(model: string): number {
  return PER_MODEL_BUDGET[model] ?? 200_000;
}

/** Rough token count from text. Under-counts slightly for code-heavy content. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 3.5);
}

/** Token count for a full messages array (plus optional system string). */
export function countMessageTokens(
  messages: Array<{ role: string; content: unknown }>,
  system?: string,
): number {
  let total = system ? estimateTokens(system) : 0;
  for (const m of messages) {
    if (typeof m.content === "string") {
      total += estimateTokens(m.content);
    } else if (Array.isArray(m.content)) {
      // Anthropic tool_use / tool_result blocks — count text field + JSON
      for (const block of m.content as Array<Record<string, unknown>>) {
        const t = (block.text as string | undefined) || (block.content as string | undefined) || "";
        total += estimateTokens(t);
        // Account for tool input JSON
        if (block.input) total += estimateTokens(JSON.stringify(block.input));
      }
    }
    total += 8; // role/control overhead per message
  }
  return total;
}

/** Compute the budget snapshot for a given model + message stack. */
export function budgetFor(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  system?: string,
): ContextBudget {
  const budget = modelBudget(model);
  const used = countMessageTokens(messages, system);
  // 85% of budget = compaction threshold (leave headroom for response + tools)
  const pct = used / budget;
  return {
    model,
    budget,
    used,
    pct: Math.min(1, pct),
    needsCompaction: pct > 0.85,
  };
}
