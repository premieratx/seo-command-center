import { callClaudeWithFallback, MODEL_CHAIN } from "@/lib/models";

/**
 * Compact an over-long chat into a short summary + keep the most recent
 * turns verbatim. Mirrors what `/compact` does in Claude Code.
 *
 * Strategy:
 *   - Keep the first system-context user turn if present (so goals stay)
 *   - Summarize everything except the last `keepRecent` messages
 *   - Replace the summarized block with a single assistant message:
 *       ### Compacted earlier conversation
 *       (concise bullet summary of what was covered)
 *
 * Runs on Sonnet (balanced — fast + cheap + understands the SEO context)
 * with a 2K max_tokens cap on the summary itself.
 */
export async function compactMessages(opts: {
  apiKey: string;
  messages: Array<{ role: "user" | "assistant"; content: unknown }>;
  keepRecent?: number;
}): Promise<{
  messages: Array<{ role: "user" | "assistant"; content: unknown }>;
  summary: string;
  droppedCount: number;
}> {
  const { apiKey, messages } = opts;
  const keepRecent = opts.keepRecent ?? 6;

  if (messages.length <= keepRecent + 2) {
    return { messages, summary: "", droppedCount: 0 };
  }

  const toSummarize = messages.slice(0, messages.length - keepRecent);
  const recent = messages.slice(messages.length - keepRecent);

  const transcriptText = toSummarize
    .map((m) => {
      const who = m.role === "user" ? "USER" : "ASSISTANT";
      const text =
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
          ? (m.content as Array<Record<string, unknown>>)
              .map((b) => (b.text as string) || JSON.stringify(b.input || b.content || ""))
              .join(" ")
          : "";
      return `${who}: ${text}`;
    })
    .join("\n\n")
    .slice(0, 80_000);

  const prompt = `You are compacting an in-progress Command Center chat for Premier Party Cruises. Produce a concise summary of what was discussed, decided, and done — so the conversation can continue without losing context.

Include:
- Files read or edited (with paths)
- Commits that landed on the working branch
- Decisions made (SEO direction, design changes, content rewrites)
- Open questions or pending next steps
- Key data the agent was working against (target keywords, pages, etc.)

Output:
## Compacted earlier conversation
- Short bullets, 6–15 max
- No filler, no meta-commentary
- Each bullet is a single sentence
- End with a "Still open:" line listing any unfinished threads

TRANSCRIPT:
${transcriptText}`;

  let summary = "";
  try {
    const { response } = await callClaudeWithFallback({
      apiKey,
      models: MODEL_CHAIN.balanced,
      body: {
        max_tokens: 2048,
        system:
          "You are a conversation summarizer. Return ONLY the compacted summary — no preamble, no 'here is...' framing.",
        messages: [{ role: "user", content: prompt }],
      },
    });
    if (response.ok) {
      const data = await response.json();
      summary = String(data.content?.[0]?.text || "").trim();
    }
  } catch {
    /* fallthrough */
  }

  if (!summary) {
    summary = `## Compacted earlier conversation\n(Summary unavailable — ${toSummarize.length} earlier turns dropped to free context.)`;
  }

  const compactedMessages: Array<{ role: "user" | "assistant"; content: unknown }> = [
    { role: "user", content: "[Compacted history — resume from here]" },
    { role: "assistant", content: summary },
    ...recent,
  ];

  return {
    messages: compactedMessages,
    summary,
    droppedCount: toSummarize.length,
  };
}
