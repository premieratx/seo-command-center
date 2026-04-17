"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface KnowledgeEntry {
  id?: string;
  category: string;
  question: string;
  answer: string;
  context_tags: string[];
  priority: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

const CATEGORY_OPTIONS = [
  "overview", "pricing", "location", "fleet", "byob", "disco_cruise",
  "included", "weather", "booking", "safety", "corporate", "swim",
  "phone", "group_size", "services", "bachelorette", "bachelor",
  "wedding", "birthday", "policy", "custom",
];

export default function ChatbotTrainingPage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<KnowledgeEntry | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Test chat
  const [testOpen, setTestOpen] = useState(false);
  const [testMessages, setTestMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [testInput, setTestInput] = useState("");
  const [testSending, setTestSending] = useState(false);

  // Conversation log viewer
  const [convsOpen, setConvsOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("chatbot_knowledge_base")
      .select("*")
      .order("priority", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) {
      alert("Load error: " + error.message);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }

  async function loadConversations() {
    const { data } = await supabase
      .from("chatbot_conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(50);
    setConversations(data || []);
    setConvsOpen(true);
  }

  useEffect(() => { load(); }, []);

  function startEdit(entry?: KnowledgeEntry) {
    if (entry) {
      setEditingId(entry.id!);
      setDraft({ ...entry });
    } else {
      setEditingId("new");
      setDraft({
        category: "overview",
        question: "",
        answer: "",
        context_tags: [],
        priority: 5,
        active: true,
      });
    }
  }

  async function saveEdit() {
    if (!draft) return;
    if (!draft.answer.trim()) {
      alert("Answer is required");
      return;
    }
    const payload = {
      site_id: "37292000-d661-4238-8ba4-6a53b71c2d07",
      category: draft.category,
      question: draft.question || null,
      answer: draft.answer,
      context_tags: draft.context_tags,
      priority: draft.priority,
      active: draft.active,
      updated_at: new Date().toISOString(),
    };
    if (editingId === "new") {
      const { error } = await supabase.from("chatbot_knowledge_base").insert(payload);
      if (error) { alert("Save error: " + error.message); return; }
    } else {
      const { error } = await supabase.from("chatbot_knowledge_base").update(payload).eq("id", editingId);
      if (error) { alert("Save error: " + error.message); return; }
    }
    setEditingId(null);
    setDraft(null);
    await load();
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this knowledge entry? This can't be undone.")) return;
    const { error } = await supabase.from("chatbot_knowledge_base").delete().eq("id", id);
    if (error) { alert("Delete error: " + error.message); return; }
    await load();
  }

  async function toggleActive(entry: KnowledgeEntry) {
    await supabase.from("chatbot_knowledge_base").update({ active: !entry.active, updated_at: new Date().toISOString() }).eq("id", entry.id!);
    await load();
  }

  async function sendTestMessage() {
    if (!testInput.trim() || testSending) return;
    const userMsg = { role: "user", content: testInput.trim() };
    const newMessages = [...testMessages, userMsg];
    setTestMessages(newMessages);
    setTestInput("");
    setTestSending(true);
    try {
      // Try localhost CruiseConcierge backend first, then production
      let endpoint = "https://premierpartycruises.com/api/chat/message";
      try {
        const pingRes = await fetch("http://localhost:5173/", { method: "HEAD", mode: "no-cors" });
        if (pingRes) endpoint = "http://localhost:5173/api/chat/message";
      } catch { /* fall through to production */ }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: `kb_test_${Date.now()}`,
          message: userMsg.content,
          context: { pageContext: "home", source: "kb_test" },
        }),
      });
      const data = await res.json();
      setTestMessages([...newMessages, { role: "assistant", content: data.message || "(no response)" }]);
    } catch (e: any) {
      setTestMessages([...newMessages, { role: "assistant", content: "Error: " + e.message }]);
    } finally {
      setTestSending(false);
    }
  }

  const filtered = entries.filter(e => {
    if (filter !== "all" && e.category !== filter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!((e.question || "").toLowerCase().includes(s) || e.answer.toLowerCase().includes(s) || e.category.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const stats = {
    total: entries.length,
    active: entries.filter(e => e.active).length,
    byCategory: entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1;
      return acc;
    }, {}),
  };

  return (
    <div className="min-h-screen" style={{ background: "#07070C", color: "#EDE3D0", fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        :root {
          --bg-0: #07070C;
          --bg-1: #0F0F18;
          --bg-card: #1A1A26;
          --gold: #C8A96E;
          --gold-light: #DFC08A;
          --cream: #F0E6D0;
          --cream-muted: #C8B898;
          --text-muted: #A89878;
          --border: rgba(200,169,110,0.18);
          --brand-blue: #1E88E5;
        }
        .ct-btn {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid;
          background: transparent;
        }
        .ct-btn-primary {
          background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
          color: var(--bg-0);
          border-color: var(--gold);
        }
        .ct-btn-primary:hover {
          box-shadow: 0 0 20px rgba(200,169,110,0.4);
        }
        .ct-btn-outline {
          color: var(--gold);
          border-color: var(--gold);
        }
        .ct-btn-outline:hover {
          background: rgba(200,169,110,0.1);
        }
        .ct-btn-blue {
          color: var(--brand-blue);
          border-color: var(--brand-blue);
        }
        .ct-btn-blue:hover {
          background: rgba(30,136,229,0.1);
          color: #fff;
        }
        .ct-btn-danger {
          color: #ff6b6b;
          border-color: #ff6b6b;
        }
        .ct-btn-danger:hover {
          background: rgba(255,107,107,0.12);
        }
        .ct-input, .ct-textarea, .ct-select {
          width: 100%;
          padding: 0.75rem 1rem;
          background: var(--bg-0);
          border: 1px solid var(--border);
          color: var(--cream);
          font-size: 0.9rem;
          font-family: inherit;
        }
        .ct-input:focus, .ct-textarea:focus, .ct-select:focus {
          outline: none;
          border-color: var(--gold);
          box-shadow: 0 0 0 2px rgba(200,169,110,0.2);
        }
        .ct-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          padding: 1.25rem;
          transition: border-color 0.2s ease;
        }
        .ct-card:hover {
          border-color: rgba(200,169,110,0.35);
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <Link href="/" style={{ color: "var(--gold)", fontSize: "0.8rem", textDecoration: "none", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "3rem", fontWeight: 300, marginTop: "0.75rem", marginBottom: "0.5rem", color: "#F0E6D0" }}>
            Chatbot <em style={{ color: "#DFC08A" }}>Training</em>
          </h1>
          <p style={{ color: "var(--cream-muted)", fontSize: "1rem", maxWidth: 720, lineHeight: 1.6 }}>
            Every knowledge base entry here gets fed into the Claude-powered chatbot on premierpartycruises.com. The bot will answer questions using ONLY this data — so make sure everything here is accurate and up-to-date.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div className="ct-card">
            <div style={{ fontSize: "2rem", fontFamily: "'Cormorant Garamond', serif", color: "var(--gold-light)" }}>{stats.total}</div>
            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-muted)" }}>Total Entries</div>
          </div>
          <div className="ct-card">
            <div style={{ fontSize: "2rem", fontFamily: "'Cormorant Garamond', serif", color: "#4caf50" }}>{stats.active}</div>
            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-muted)" }}>Active</div>
          </div>
          <div className="ct-card">
            <div style={{ fontSize: "2rem", fontFamily: "'Cormorant Garamond', serif", color: "var(--cream)" }}>{Object.keys(stats.byCategory).length}</div>
            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--text-muted)" }}>Categories</div>
          </div>
          <div className="ct-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.5rem" }}>
            <button className="ct-btn ct-btn-blue" onClick={() => { setTestMessages([]); setTestOpen(true); }}>
              Test Chatbot →
            </button>
            <button className="ct-btn ct-btn-outline" onClick={loadConversations}>
              View Conversations
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <select className="ct-select" style={{ width: "auto", flex: "0 0 auto", minWidth: 180 }} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All categories ({entries.length})</option>
            {Object.entries(stats.byCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, n]) => (
              <option key={cat} value={cat}>{cat} ({n})</option>
            ))}
          </select>
          <input className="ct-input" style={{ flex: 1, maxWidth: 400 }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="ct-btn ct-btn-primary" onClick={() => startEdit()} style={{ marginLeft: "auto" }}>
            + Add Entry
          </button>
        </div>

        {/* Entry list */}
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filtered.map(entry => (
              <div key={entry.id} className="ct-card" style={{ opacity: entry.active ? 1 : 0.4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: "0.68rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      color: "var(--gold)",
                      border: "1px solid var(--border)",
                      padding: "0.15rem 0.6rem",
                    }}>{entry.category}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      Priority {entry.priority}
                    </span>
                    {entry.context_tags && entry.context_tags.length > 0 && (
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Tags: {entry.context_tags.join(", ")}
                      </span>
                    )}
                    {!entry.active && <span style={{ fontSize: "0.7rem", color: "#ff6b6b" }}>INACTIVE</span>}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="ct-btn ct-btn-outline" onClick={() => toggleActive(entry)} style={{ fontSize: "0.7rem", padding: "0.3rem 0.8rem" }}>
                      {entry.active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="ct-btn ct-btn-outline" onClick={() => startEdit(entry)} style={{ fontSize: "0.7rem", padding: "0.3rem 0.8rem" }}>
                      Edit
                    </button>
                    <button className="ct-btn ct-btn-danger" onClick={() => deleteEntry(entry.id!)} style={{ fontSize: "0.7rem", padding: "0.3rem 0.8rem" }}>
                      Delete
                    </button>
                  </div>
                </div>
                {entry.question && (
                  <div style={{ marginBottom: "0.5rem", fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem", color: "var(--cream)" }}>
                    Q: {entry.question}
                  </div>
                )}
                <div style={{ color: "var(--cream-muted)", lineHeight: 1.65, fontSize: "0.95rem" }}>
                  {entry.answer}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                No entries match. Click + Add Entry to create one.
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editingId && draft && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div className="ct-card" style={{ maxWidth: 720, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", marginBottom: "1.5rem", color: "var(--cream)" }}>
                {editingId === "new" ? "New Knowledge Entry" : "Edit Entry"}
              </h2>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--gold)", marginBottom: "0.4rem" }}>Category</label>
                  <select className="ct-select" value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--gold)", marginBottom: "0.4rem" }}>Question (optional)</label>
                  <input className="ct-input" value={draft.question || ""} onChange={e => setDraft({ ...draft, question: e.target.value })} placeholder="e.g. How much does it cost?" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--gold)", marginBottom: "0.4rem" }}>Answer *</label>
                  <textarea className="ct-textarea" rows={8} value={draft.answer} onChange={e => setDraft({ ...draft, answer: e.target.value })} placeholder="Complete accurate answer the bot should give…" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--gold)", marginBottom: "0.4rem" }}>Priority (1-10)</label>
                    <input className="ct-input" type="number" min={1} max={10} value={draft.priority} onChange={e => setDraft({ ...draft, priority: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--gold)", marginBottom: "0.4rem" }}>Tags (comma-separated)</label>
                    <input className="ct-input" value={(draft.context_tags || []).join(", ")} onChange={e => setDraft({ ...draft, context_tags: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} placeholder="pricing, bachelor" />
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--cream-muted)" }}>
                  <input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} />
                  Active (bot will use this entry)
                </label>
              </div>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
                <button className="ct-btn ct-btn-outline" onClick={() => { setEditingId(null); setDraft(null); }}>Cancel</button>
                <button className="ct-btn ct-btn-primary" onClick={saveEdit}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Test Chat Modal */}
        {testOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div className="ct-card" style={{ maxWidth: 640, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", color: "var(--cream)" }}>Test Chatbot</h2>
                <button onClick={() => setTestOpen(false)} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", minHeight: 300, padding: "1rem 0" }}>
                {testMessages.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    Type a question to see how the bot responds using your knowledge base.<br/>
                    <span style={{ fontSize: "0.85rem" }}>Try: "How much for 10 people on Saturday?"</span>
                  </div>
                )}
                {testMessages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: "1rem", display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "80%",
                      padding: "0.75rem 1rem",
                      background: msg.role === "user" ? "linear-gradient(135deg, #C8A96E 0%, #DFC08A 100%)" : "var(--bg-0)",
                      color: msg.role === "user" ? "#07070C" : "var(--cream-muted)",
                      border: msg.role === "user" ? "none" : "1px solid var(--border)",
                      fontSize: "0.92rem",
                      lineHeight: 1.55,
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {testSending && (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "0.5rem" }}>
                    Bot is thinking…
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                <input
                  className="ct-input"
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendTestMessage()}
                  placeholder="Ask the bot anything…"
                  disabled={testSending}
                />
                <button className="ct-btn ct-btn-primary" onClick={sendTestMessage} disabled={testSending || !testInput.trim()}>
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conversations Viewer */}
        {convsOpen && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div className="ct-card" style={{ maxWidth: 900, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", color: "var(--cream)" }}>Recent Conversations</h2>
                <button onClick={() => setConvsOpen(false)} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
              </div>
              {conversations.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                  No conversations yet. The chatbot will log guest conversations here.
                </div>
              ) : (
                conversations.map(conv => (
                  <details key={conv.id} style={{ marginBottom: "0.75rem", border: "1px solid var(--border)", padding: "0.75rem" }}>
                    <summary style={{ cursor: "pointer", color: "var(--cream)", fontSize: "0.9rem" }}>
                      <strong>{conv.page_context || "general"}</strong> ·{" "}
                      <span style={{ color: "var(--text-muted)" }}>
                        {new Date(conv.last_message_at).toLocaleString()} · {conv.messages?.length || 0} messages
                      </span>
                    </summary>
                    <div style={{ marginTop: "0.75rem" }}>
                      {(conv.messages || []).map((m: any, i: number) => (
                        <div key={i} style={{ marginBottom: "0.5rem", padding: "0.5rem 0.75rem", background: m.role === "user" ? "rgba(30,136,229,0.1)" : "rgba(200,169,110,0.08)", borderLeft: "2px solid " + (m.role === "user" ? "var(--brand-blue)" : "var(--gold)") }}>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>{m.role}</div>
                          <div style={{ fontSize: "0.88rem", color: "var(--cream-muted)", whiteSpace: "pre-wrap" }}>{m.content}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
