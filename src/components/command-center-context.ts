"use client";

/**
 * Shared Command Center context — lets any tab route a "Fix This" prompt
 * into the Design tab's AI chat with a single call.
 *
 * Why this exists:
 *   The SEO tab exposes "Fix this" buttons on every keyword row, every
 *   Easy Win, and every Most Impactful insight. Previously those buttons
 *   only fired a console log or nothing at all. Now they push the prompt
 *   into `pendingFix`, switch the top-level tab to `web-design`, and the
 *   AI Assistant panel auto-sends the prompt against /api/agent-chat.
 *
 *   The Blog tab's per-post analyzer can also push "rewrite this section"
 *   prompts the same way — same pipeline, same result.
 */
import { useEffect, useState } from "react";

type CommandCenterState = {
  pendingFix: { prompt: string; origin: string; at: number } | null;
  setPendingFix: (prompt: string, origin: string) => void;
  clearPendingFix: () => void;
};

// Minimal global without importing React Context — the parent component
// holds the state and exposes it via a setter passed through props.
// This avoids accidentally triggering SSR mismatches.
let _state: {
  pendingFix: { prompt: string; origin: string; at: number } | null;
  listeners: Set<() => void>;
} = {
  pendingFix: null,
  listeners: new Set(),
};

function emit() {
  for (const l of _state.listeners) l();
}

export function setPendingFix(prompt: string, origin: string) {
  _state.pendingFix = { prompt, origin, at: Date.now() };
  emit();
}

export function clearPendingFix() {
  _state.pendingFix = null;
  emit();
}

export function useCommandCenter(): CommandCenterState {
  const [, tick] = useState(0);

  useEffect(() => {
    const l = () => tick((n) => n + 1);
    _state.listeners.add(l);
    return () => {
      _state.listeners.delete(l);
    };
  }, []);

  return {
    pendingFix: _state.pendingFix,
    setPendingFix,
    clearPendingFix,
  };
}
