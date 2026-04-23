"use client";

import { useEffect, useRef, useState } from "react";
// Note: the quote-app Supabase client references `localStorage` at module
// scope, which crashes SSR prerender. Load it lazily inside the lead-submit
// handler below via dynamic import so this component can be rendered on the
// server (or at build-time prerender) without blowing up.

/**
 * ChatbotTestPanel — interactive preview of the production cruise-site
 * chatbot, used by the operator in /chatbot-training to try the guided
 * flow with live widgets (date picker, guest slider, party-type buttons,
 * contact form). Contact-form submit creates a REAL lead in the quote-app
 * Supabase so it lands in the Lead Dashboard, matching the /quote-v2 flow.
 */

type TextMsg = { kind: "text"; role: "user" | "assistant"; content: string };
type WidgetMsg = {
  kind: "widget";
  widget: {
    name: string;
    input: Record<string, unknown>;
    id: string;
  };
  resolved?: string; // once the user submits, this is their resulting message
};
type Msg = TextMsg | WidgetMsg;

const WELCOME: TextMsg = {
  kind: "text",
  role: "assistant",
  content:
    "Hey! 🛥️ I'm the Premier Party Cruises concierge. Tell me about the event — I'll show availability and pricing.",
};

export default function ChatbotTestPanel() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [context, setContext] = useState<{
    party_type?: string;
    event_date?: string;
    guest_count?: number;
  }>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const buildClaudeMessages = (msgs: Msg[]) => {
    // Claude sees widget submissions as user turns with the resolved value.
    return msgs
      .map((m): { role: "user" | "assistant"; content: string } | null => {
        if (m.kind === "text") return { role: m.role, content: m.content };
        if (m.kind === "widget" && m.resolved)
          return { role: "user", content: m.resolved };
        return null;
      })
      .filter((x): x is { role: "user" | "assistant"; content: string } => !!x);
  };

  const send = async (userText: string) => {
    if (!userText.trim() || sending) return;
    const next: Msg[] = [...messages, { kind: "text", role: "user", content: userText.trim() }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chatbot-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: buildClaudeMessages(next) }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      await consumeStream(res, next);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { kind: "text", role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "error"}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  const consumeStream = async (res: Response, base: Msg[]) => {
    const reader = res.body?.getReader();
    if (!reader) return;
    const dec = new TextDecoder();
    let buf = "";
    let currentText = "";
    let working: Msg[] = [...base, { kind: "text", role: "assistant", content: "" }];
    setMessages(working);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6);
        if (raw === "[DONE]") continue;
        try {
          const p = JSON.parse(raw);
          if (p.text) {
            currentText += p.text;
            working = working.map((m, i) =>
              i === working.length - 1 && m.kind === "text" && m.role === "assistant"
                ? { ...m, content: currentText }
                : m,
            );
            setMessages(working);
          } else if (p.widget) {
            // Append as a widget card; next assistant text will open a new bubble
            working = [...working, { kind: "widget", widget: p.widget }];
            currentText = "";
            working.push({ kind: "text", role: "assistant", content: "" });
            setMessages(working);
          } else if (p.error) {
            working = [
              ...working,
              { kind: "text", role: "assistant", content: `⚠️ ${p.error}` },
            ];
            setMessages(working);
          }
        } catch {
          /* skip */
        }
      }
    }
    // Strip any trailing empty assistant bubble
    setMessages((prev) => prev.filter((m, i) => !(i === prev.length - 1 && m.kind === "text" && m.role === "assistant" && !m.content)));
  };

  const resolveWidget = (idx: number, resolvedText: string, patch: Partial<typeof context>) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === idx && m.kind === "widget" ? { ...m, resolved: resolvedText } : m)),
    );
    setContext((prev) => ({ ...prev, ...patch }));
    // Continue the conversation: send the resolved value as the next user turn
    const newText: TextMsg = { kind: "text", role: "user", content: resolvedText };
    const next = [...messages.slice(0, idx + 1).map((m, i) => (i === idx && m.kind === "widget" ? { ...m, resolved: resolvedText } : m)), newText];
    setMessages(next as Msg[]);
    void continueChat(next as Msg[]);
  };

  const continueChat = async (msgs: Msg[]) => {
    setSending(true);
    try {
      const res = await fetch("/api/chatbot-test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: buildClaudeMessages(msgs) }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      await consumeStream(res, msgs);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { kind: "text", role: "assistant", content: `⚠️ ${e instanceof Error ? e.message : "error"}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([WELCOME]);
    setContext({});
  };

  return (
    <div className="flex flex-col h-[70vh] max-h-[720px] bg-[#0a0a0a] border border-[#262626] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#262626]">
        <div>
          <div className="text-sm font-semibold text-white">🛥️ Test chat (guided flow preview)</div>
          <div className="text-[10px] text-zinc-500">
            Uses the knowledge base + inline widgets. Submitting the contact form creates a REAL lead in the Lead Dashboard.
          </div>
        </div>
        <button onClick={reset} className="text-[10px] text-zinc-400 hover:text-white border border-[#262626] rounded px-2 py-1">
          Reset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m, i) => {
          if (m.kind === "text") {
            if (!m.content) return null;
            return (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-[#161616] border border-[#262626] text-zinc-200 rounded-bl-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          }
          // Widget
          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] w-full">
                {m.resolved ? (
                  <div className="flex justify-end">
                    <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2 text-[13px]">
                      {m.resolved}
                    </div>
                  </div>
                ) : (
                  <WidgetCard
                    widget={m.widget}
                    context={context}
                    onSubmit={(resolvedText, patch) => resolveWidget(i, resolvedText, patch)}
                  />
                )}
              </div>
            </div>
          );
        })}
        {sending && (
          <div className="text-[11px] text-zinc-500 italic pl-2">Concierge is typing…</div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-1.5 border-t border-[#262626] p-2 bg-[#0d0d0d]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
          className="flex-1 bg-[#141414] border border-[#262626] text-sm text-white rounded px-3 py-2 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-sm font-semibold px-4 py-2 rounded"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function WidgetCard({
  widget,
  context,
  onSubmit,
}: {
  widget: { name: string; input: Record<string, unknown> };
  context: { party_type?: string; event_date?: string; guest_count?: number };
  onSubmit: (resolvedText: string, patch: Partial<typeof context>) => void;
}) {
  const label = String(widget.input.label || "");

  if (widget.name === "show_party_type") {
    const opts = (widget.input.options as string[] | undefined) || [
      "Bachelorette",
      "Bachelor",
      "Birthday",
      "Wedding",
      "Corporate",
      "Just a Party",
    ];
    return (
      <div className="bg-[#161616] border border-[#262626] rounded-xl p-3">
        <div className="text-[12px] text-zinc-300 mb-2">{label || "What kind of party?"}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {opts.map((o) => (
            <button
              key={o}
              onClick={() => onSubmit(o, { party_type: o })}
              className="text-[12px] bg-[#1f1f1f] hover:bg-blue-600 hover:text-white border border-[#333] rounded-lg px-2.5 py-2 text-zinc-200 transition-colors"
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (widget.name === "show_date_picker") {
    return <DatePickerCard label={label} onSubmit={onSubmit} />;
  }

  if (widget.name === "show_ppl_slider") {
    const min = Number(widget.input.min ?? 2);
    const max = Number(widget.input.max ?? 75);
    return <PplSliderCard label={label} min={min} max={max} onSubmit={onSubmit} />;
  }

  if (widget.name === "show_contact_form") {
    return <ContactFormCard label={label} summary={String(widget.input.summary || "")} context={context} onSubmit={onSubmit} />;
  }

  return <div className="text-[11px] text-zinc-500">Unknown widget: {widget.name}</div>;
}

function DatePickerCard({
  label,
  onSubmit,
}: {
  label: string;
  onSubmit: (resolvedText: string, patch: { event_date?: string }) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<string>("");
  return (
    <div className="bg-[#161616] border border-[#262626] rounded-xl p-3">
      <div className="text-[12px] text-zinc-300 mb-2">{label || "Pick a date"}</div>
      <div className="flex gap-1.5">
        <input
          type="date"
          min={today}
          value={v}
          onChange={(e) => setV(e.target.value)}
          className="flex-1 bg-[#0a0a0a] border border-[#262626] text-sm text-white rounded px-2.5 py-2 focus:outline-none focus:border-blue-500"
        />
        <button
          disabled={!v}
          onClick={() => {
            const nice = new Date(v + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            onSubmit(nice, { event_date: v });
          }}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-xs font-semibold px-3 py-2 rounded"
        >
          Lock it
        </button>
      </div>
    </div>
  );
}

function PplSliderCard({
  label,
  min,
  max,
  onSubmit,
}: {
  label: string;
  min: number;
  max: number;
  onSubmit: (resolvedText: string, patch: { guest_count: number }) => void;
}) {
  const [v, setV] = useState<number>(Math.min(Math.max(20, min), max));
  const fleetHint =
    v <= 14
      ? "Fits Day Tripper"
      : v <= 30
      ? "Fits Meeseeks or The Irony"
      : v <= 75
      ? "Calls for Clever Girl (flagship)"
      : "Over capacity — bigger groups need a second boat";
  return (
    <div className="bg-[#161616] border border-[#262626] rounded-xl p-3">
      <div className="text-[12px] text-zinc-300 mb-2">{label || "How many guests?"}</div>
      <div className="flex items-center gap-3 mb-1">
        <span className="text-2xl font-bold text-blue-400 w-12 text-center">{v}</span>
        <input
          type="range"
          min={min}
          max={max}
          value={v}
          onChange={(e) => setV(Number(e.target.value))}
          className="flex-1 accent-blue-500"
        />
      </div>
      <div className="text-[10px] text-zinc-500 mb-2">{fleetHint}</div>
      <button
        onClick={() => onSubmit(`${v} guests`, { guest_count: v })}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2 rounded"
      >
        Lock it
      </button>
    </div>
  );
}

function ContactFormCard({
  label,
  summary,
  context,
  onSubmit,
}: {
  label: string;
  summary: string;
  context: { party_type?: string; event_date?: string; guest_count?: number };
  onSubmit: (resolvedText: string, patch: Record<string, never>) => void;
}) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!first || !last || !email || !phone) {
      setErr("Please fill out every field.");
      return;
    }
    if (!context.event_date || !context.guest_count || !context.party_type) {
      setErr("Missing date, guest count, or party type — please back up a step.");
      return;
    }
    setSubmitting(true);
    try {
      const { supabase: quoteAppSupabase } = await import("@/quote-app/integrations/supabase/client");
      const { error } = await quoteAppSupabase.from("leads").insert({
        first_name: first.trim(),
        last_name: last.trim(),
        email: email.trim(),
        phone: phone.trim(),
        event_date: context.event_date,
        guest_count: context.guest_count,
        party_type: context.party_type,
        quote_url: typeof window !== "undefined" ? window.location.href : "",
        source_type: "chatbot_test",
        status: "new",
      });
      if (error) throw error;
      setOk(true);
      onSubmit(
        `Submitted contact info: ${first} ${last}, ${email}, ${phone}.`,
        {},
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (ok) {
    return (
      <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-3 text-[12px] text-emerald-200">
        ✅ Lead created. It's in the Lead Dashboard now.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-[#161616] border border-[#262626] rounded-xl p-3 space-y-2">
      <div className="text-[12px] text-zinc-200 font-medium">{label || "Last step — who should we text the quote to?"}</div>
      {summary && <div className="text-[10px] text-zinc-500">{summary}</div>}
      <div className="grid grid-cols-2 gap-1.5">
        <input
          placeholder="First name"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          className="bg-[#0a0a0a] border border-[#262626] text-xs text-white rounded px-2.5 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
        />
        <input
          placeholder="Last name"
          value={last}
          onChange={(e) => setLast(e.target.value)}
          className="bg-[#0a0a0a] border border-[#262626] text-xs text-white rounded px-2.5 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
        />
      </div>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full bg-[#0a0a0a] border border-[#262626] text-xs text-white rounded px-2.5 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
      />
      <input
        type="tel"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full bg-[#0a0a0a] border border-[#262626] text-xs text-white rounded px-2.5 py-1.5 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
      />
      {err && <div className="text-[10px] text-red-400">{err}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white text-xs font-semibold py-2 rounded"
      >
        {submitting ? "Creating lead…" : "Create lead →"}
      </button>
    </form>
  );
}
