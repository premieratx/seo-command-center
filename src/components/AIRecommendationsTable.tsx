"use client";

import { useMemo, useState } from "react";
import type { AIInsight } from "@/lib/types";

/**
 * AI Visibility Recommendations Table
 *
 * Rich recommendations view backed by ai_insights table (extended with
 * target_keywords, target_pages, source_llm, source_surface, priority).
 *
 * Features:
 *   - History: rows grouped by extraction date, newest first
 *   - Select Multiple toggle → per-row checkboxes → batch "Fix selected"
 *   - Per-row "Fix now" button that hands the full rec to the Command Center
 *   - Priority badges, keyword + page pills, source LLM/surface tags
 *   - Status pill (pending / in_progress / applied / dismissed)
 *
 * Wiring: the Fix buttons call onFixNow(prompt) which the parent pipes
 * into the existing Command Center flow (sessionStorage + activeTab switch).
 */
export default function AIRecommendationsTable({
  insights,
  onFixNow,
}: {
  insights: AIInsight[];
  onFixNow?: (prompt: string) => void;
}) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "pending" | "applied">("pending");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Newest first
  const sorted = useMemo(() => {
    return [...insights].sort((a, b) => {
      const da = new Date(a.captured_at || 0).getTime();
      const db = new Date(b.captured_at || 0).getTime();
      return db - da;
    });
  }, [insights]);

  const filtered = useMemo(() => {
    return sorted.filter((r) => {
      if (filter === "pending" && r.status !== "pending") return false;
      if (filter === "applied" && r.status !== "applied") return false;
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
      return true;
    });
  }, [sorted, filter, priorityFilter]);

  // Group by YYYY-MM-DD
  const groups = useMemo(() => {
    const g = new Map<string, AIInsight[]>();
    for (const r of filtered) {
      const key = r.captured_at ? r.captured_at.slice(0, 10) : "unknown";
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(r);
    }
    return Array.from(g.entries());
  }, [filtered]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(filtered.map((r) => r.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const buildPrompt = (recs: AIInsight[]) => {
    const batchDirective =
      recs.length > 1
        ? `ORCHESTRATOR MODE — BATCH OF ${recs.length} FIXES.\n\nYou must:\n1. Read all ${recs.length} recommendations first, then design ONE comprehensive plan that addresses them together.\n2. Detect and resolve any conflicts between recommendations (same file, contradictory edits, keyword cannibalization, overlapping rewrites).\n3. Preserve crawler SEO depth and AI-extractable content — never trade ranking/citation coverage for prettier prose. If a design fix would cut SEO text, move it to progressive disclosure (accordion/details) in the SSR layer, don't delete it.\n4. Produce the Batch Analysis → Unified Plan → SEO/AI Impact → Content Review Checklist → Ready to Execute format defined in your system prompt.\n5. Only mark \`READY_TO_EXECUTE: yes\` once the plan is comprehensive, conflict-free, and includes a Content Review Checklist the Content Review Specialist will verify before ship.\n\n`
        : `Please execute this AI Visibility recommendation on the V2 site (CruiseConcierge). Identify the exact file + lines to change, make the edit, then hand off to the Content Review Specialist to verify the copy reads as luxury + turnkey + fun before ship.\n\n`;
    const intro = batchDirective;
    const body = recs
      .map((r, i) => {
        const pages = r.target_pages?.length ? `\n  Target pages: ${r.target_pages.join(", ")}` : "";
        const kws = r.target_keywords?.length
          ? `\n  Target keywords: ${r.target_keywords.join(", ")}`
          : "";
        const src = [r.source_llm, r.source_surface].filter(Boolean).join(" / ");
        const srcLine = src ? `\n  Source: ${src}` : "";
        const pri = r.priority ? `\n  Priority: ${r.priority}` : "";
        return `${i + 1}. ${r.title}\n  ${r.description || ""}${pages}${kws}${srcLine}${pri}`;
      })
      .join("\n\n");
    return intro + body;
  };

  const fixOne = (r: AIInsight) => {
    if (!onFixNow) return;
    onFixNow(buildPrompt([r]));
  };

  const fixSelected = () => {
    if (!onFixNow || selected.size === 0) return;
    const recs = filtered.filter((r) => selected.has(r.id));
    onFixNow(buildPrompt(recs));
    clearSelection();
  };

  if (insights.length === 0) return null;

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-base text-white">
            AI Visibility Recommendations
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {filtered.length} of {insights.length} recommendations — newest extraction at top. Fix one at a time or select multiple and batch.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-[#0a0a0a] border border-[#262626] text-xs text-zinc-300 rounded px-2 py-1"
          >
            <option value="pending">Pending</option>
            <option value="applied">Applied</option>
            <option value="all">All statuses</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#0a0a0a] border border-[#262626] text-xs text-zinc-300 rounded px-2 py-1"
          >
            <option value="all">All priorities</option>
            <option value="urgent">Urgent</option>
            <option value="short">Short</option>
            <option value="medium">Medium</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectMode}
              onChange={(e) => {
                setSelectMode(e.target.checked);
                if (!e.target.checked) clearSelection();
              }}
              className="accent-blue-600"
            />
            Select multiple
          </label>
        </div>
      </div>

      {selectMode && (
        <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 mb-3">
          <div className="text-xs text-zinc-300">
            {selected.size} selected
            <button
              type="button"
              onClick={selectAllVisible}
              className="ml-3 text-blue-400 hover:text-blue-300 underline underline-offset-2"
            >
              Select all visible
            </button>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="ml-3 text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={fixSelected}
            disabled={selected.size === 0}
            className={`text-xs rounded px-3 py-1.5 font-medium transition-colors ${
              selected.size === 0
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            Fix {selected.size || ""} selected →
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-zinc-500 border-b border-[#262626]">
              {selectMode && <th className="py-2 px-2 text-left w-8"></th>}
              <th className="py-2 px-2 text-left">Recommendation</th>
              <th className="py-2 px-2 text-left w-24">Date</th>
              <th className="py-2 px-2 text-left">Target pages / keywords</th>
              <th className="py-2 px-2 text-left w-20">Source</th>
              <th className="py-2 px-2 text-right w-28">Action</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(([date, rows]) => (
              <RowGroup
                key={date}
                date={date}
                rows={rows}
                selectMode={selectMode}
                selected={selected}
                toggle={toggle}
                fixOne={fixOne}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowGroup({
  date,
  rows,
  selectMode,
  selected,
  toggle,
  fixOne,
}: {
  date: string;
  rows: AIInsight[];
  selectMode: boolean;
  selected: Set<string>;
  toggle: (id: string) => void;
  fixOne: (r: AIInsight) => void;
}) {
  const label = date === "unknown" ? "—" : new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <>
      <tr className="bg-[#0d0d0d]">
        <td
          colSpan={selectMode ? 6 : 5}
          className="py-1.5 px-2 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold"
        >
          {label} · {rows.length} recs
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.id} className="border-b border-[#1a1a1a] hover:bg-[#161616] align-top">
          {selectMode && (
            <td className="py-2 px-2">
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggle(r.id)}
                className="accent-blue-600"
              />
            </td>
          )}
          <td className="py-2 px-2 max-w-[420px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-zinc-100">{r.title}</span>
              {r.priority && <PriorityBadge priority={r.priority} />}
              {r.status && r.status !== "pending" && <StatusBadge status={r.status} />}
            </div>
            {r.description && (
              <div className="text-zinc-400 mt-1 leading-relaxed">{r.description}</div>
            )}
          </td>
          <td className="py-2 px-2 text-zinc-500 whitespace-nowrap">
            {r.captured_at
              ? new Date(r.captured_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—"}
          </td>
          <td className="py-2 px-2 max-w-[320px]">
            {r.target_pages && r.target_pages.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1">
                {r.target_pages.slice(0, 3).map((p) => (
                  <span key={p} className="text-[10px] bg-blue-900/30 border border-blue-800/50 text-blue-200 rounded px-1.5 py-0.5">
                    {p}
                  </span>
                ))}
                {r.target_pages.length > 3 && <span className="text-[10px] text-zinc-500">+{r.target_pages.length - 3}</span>}
              </div>
            )}
            {r.target_keywords && r.target_keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {r.target_keywords.slice(0, 3).map((k) => (
                  <span key={k} className="text-[10px] bg-[#1a1a1a] border border-[#333] text-zinc-300 rounded px-1.5 py-0.5">
                    {k}
                  </span>
                ))}
                {r.target_keywords.length > 3 && <span className="text-[10px] text-zinc-500">+{r.target_keywords.length - 3}</span>}
              </div>
            )}
          </td>
          <td className="py-2 px-2 text-zinc-500 whitespace-nowrap">
            {r.source_llm && <div>{labelLlm(r.source_llm)}</div>}
            {r.source_surface && <div className="text-[10px] text-zinc-600">{labelSurface(r.source_surface)}</div>}
          </td>
          <td className="py-2 px-2 text-right">
            <button
              onClick={() => fixOne(r)}
              className="text-[11px] bg-[#1a1a1a] hover:bg-blue-600 hover:text-white border border-[#333] hover:border-blue-600 text-zinc-200 rounded px-2.5 py-1 font-medium transition-colors whitespace-nowrap"
            >
              Fix this now →
            </button>
          </td>
        </tr>
      ))}
    </>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: "bg-red-900/40 border-red-800 text-red-300",
    short: "bg-amber-900/40 border-amber-800 text-amber-300",
    medium: "bg-blue-900/40 border-blue-800 text-blue-300",
  };
  const s = styles[priority] || "bg-[#1a1a1a] border-[#333] text-zinc-400";
  return (
    <span className={`text-[9px] uppercase tracking-wider font-bold border rounded px-1.5 py-0.5 ${s}`}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    in_progress: "bg-blue-900/40 border-blue-800 text-blue-300",
    applied: "bg-emerald-900/40 border-emerald-800 text-emerald-300",
    dismissed: "bg-zinc-800 border-zinc-700 text-zinc-500",
  };
  const s = styles[status] || "bg-[#1a1a1a] border-[#333] text-zinc-400";
  return (
    <span className={`text-[9px] uppercase tracking-wider font-semibold border rounded px-1.5 py-0.5 ${s}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function labelLlm(llm: string) {
  const map: Record<string, string> = {
    chatgpt: "ChatGPT",
    google_ai_mode: "Google AI",
    perplexity: "Perplexity",
    gemini: "Gemini",
    all: "Cross-LLM",
  };
  return map[llm] || llm;
}

function labelSurface(s: string) {
  const map: Record<string, string> = {
    narrative_drivers: "Narrative",
    brand_performance: "Brand Perf",
    perception: "Perception",
    questions: "Questions",
  };
  return map[s] || s;
}
