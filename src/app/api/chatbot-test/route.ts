import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { corsHeaders } from "@/lib/api-auth";
import { getAnthropicKey } from "@/lib/anthropic-key";
import { callClaudeWithFallback, MODEL_CHAIN } from "@/lib/models";

export const maxDuration = 60;

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * POST /api/chatbot-test
 * Body: { messages: [{role, content}] }
 *
 * The trainer's Test Chat. Pulls every ACTIVE entry from
 * public.chatbot_knowledge_base, injects them into the system prompt,
 * and responds via Claude. Claude can emit interactive WIDGETS inline —
 * date picker, guest-count slider, party-type buttons, contact form —
 * by using these tool calls. The frontend renders the widget, the user
 * interacts, and their response becomes the next user message.
 *
 * This is the guided-flow preview: what a real guest would see on
 * premierpartycruises.com when the widget ships.
 */

const WIDGET_TOOLS = [
  {
    name: "show_date_picker",
    description:
      "Render a date picker so the guest can pick their event date. Use this the FIRST time you need a date — never ask for a date in plain text.",
    input_schema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Short prompt above the date picker, e.g. 'When's the party?'" },
      },
      required: ["label"],
    },
  },
  {
    name: "show_ppl_slider",
    description:
      "Render a guest-count slider. Use the FIRST time you need headcount — never ask for a number in plain text.",
    input_schema: {
      type: "object",
      properties: {
        label: { type: "string" },
        min: { type: "number", default: 2 },
        max: { type: "number", default: 75 },
      },
      required: ["label"],
    },
  },
  {
    name: "show_party_type",
    description:
      "Render quick-pick buttons for party type. Use the FIRST time you need to qualify the event — never ask 'what kind of party' in plain text.",
    input_schema: {
      type: "object",
      properties: {
        label: { type: "string" },
        options: {
          type: "array",
          items: { type: "string" },
          description:
            "Exact button labels. Good default set: ['Bachelorette','Bachelor','Birthday','Wedding','Corporate','Just a Party']",
        },
      },
      required: ["label"],
    },
  },
  {
    name: "show_contact_form",
    description:
      "Render the contact form that captures name, email, phone — creates a lead record in the lead dashboard. Use this at the end of the flow once you've gathered date/guests/party_type, to convert the chat into a real lead.",
    input_schema: {
      type: "object",
      properties: {
        label: {
          type: "string",
          description: "Encouraging CTA heading, e.g. 'Last step — who should we text the quote to?'",
        },
        summary: {
          type: "string",
          description:
            "One-sentence recap of what you already know so the form feels personal (e.g. 'Bachelorette, May 12, 18 guests').",
        },
      },
      required: ["label"],
    },
  },
];

const SYSTEM_BASE = `You are the Premier Party Cruises concierge chatbot. You help guests plan a cruise on Lake Travis — Austin's #1 party-boat company since 2009.

VOICE:
- Warm, confident, a little cheeky. Three registers: LUXURY + TURNKEY + FUN.
- Short replies (1–3 sentences). Never lecture.
- Never say "as an AI". Never break character.

GUIDED FLOW — always use WIDGETS, never ask for details in plain text:
  1. Greet + ask what kind of party → call show_party_type
  2. Ask the date → call show_date_picker
  3. Ask the guest count → call show_ppl_slider
  4. Once you have all three, offer availability + a rough price range and
     call show_contact_form to capture the lead
  5. After the form is submitted, confirm the lead is created and that
     someone from the team will reach out shortly.

FLEET (only 4 boats):
  - Day Tripper — 14 guests max, from $200/hr (private cruises)
  - Meeseeks — 25–30 guests, from $225/hr
  - The Irony — 25–30 guests, from $225/hr
  - Clever Girl — 50–75 guests, from $250/hr (flagship, 14 disco balls)

EVENT OPTIONS:
  - ATX Disco Cruise — bachelor/bachelorette/combined ONLY, seasonal
    March–October, $85–$105 per person, shared party with DJ + photographer
  - Private Cruises — ANY event type, year-round, 4-hour minimum, BYOB,
    licensed captain included

MARINA: Anderson Mill Marina, Leander TX (25 min from downtown Austin).
SAFETY: Coast Guard certified captains, 15+ years, perfect safety record,
150,000+ guests, 4.9/5 stars. BYOB-friendly.

PHONE: (512) 488-5892 (only share when asked).`;

export async function POST(req: NextRequest) {
  const CORS = corsHeaders(req);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const body = await req.json();
  const messages = (body.messages || []) as Array<{ role: "user" | "assistant"; content: unknown }>;
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages array required" }, { status: 400, headers: CORS });
  }

  const apiKey = await getAnthropicKey();
  if (!apiKey) {
    return NextResponse.json({ error: "No Anthropic API key configured" }, { status: 400, headers: CORS });
  }

  // Pull every active KB entry
  const { data: kb } = await supabase
    .from("chatbot_knowledge_base")
    .select("category, question, answer, priority")
    .eq("active", true)
    .order("priority", { ascending: false })
    .limit(100);

  const kbBlock =
    kb && kb.length > 0
      ? `\n\n═══ KNOWLEDGE BASE (${kb.length} entries) ═══\n` +
        kb
          .map(
            (k: Record<string, unknown>) =>
              `• [${k.category}] ${k.question ? `Q: ${k.question}\n  A: ${k.answer}` : `${k.answer}`}`,
          )
          .join("\n")
      : "";

  const systemPrompt = `${SYSTEM_BASE}${kbBlock}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        const { response } = await callClaudeWithFallback({
          apiKey,
          models: MODEL_CHAIN.balanced,
          body: {
            max_tokens: 1024,
            system: systemPrompt,
            tools: WIDGET_TOOLS,
            messages,
          },
        });

        if (!response.ok) {
          const errText = await response.text();
          emit({ error: `Claude ${response.status}`, detail: errText.slice(0, 300) });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }

        const data = await response.json();
        const blocks = (data.content as Array<Record<string, unknown>>) || [];
        for (const block of blocks) {
          if (block.type === "text") {
            const t = String(block.text || "");
            for (let i = 0; i < t.length; i += 48) emit({ text: t.slice(i, i + 48) });
          } else if (block.type === "tool_use") {
            emit({
              widget: {
                name: String(block.name),
                input: (block.input as Record<string, unknown>) || {},
                id: String(block.id),
              },
            });
          }
        }
      } catch (e) {
        emit({ error: e instanceof Error ? e.message : "unknown" });
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...CORS,
    },
  });
}
