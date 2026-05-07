"use client";

// To-Do tab — pending items pulled from src/lib/todo/items.ts. Per-item
// "done" state is persisted to localStorage so it survives reloads without
// requiring a backend round-trip. Filter by category + priority and copy
// snippets / open links inline.

import { useEffect, useMemo, useState } from "react";
import {
  TODO_CATEGORIES,
  TODO_ITEMS,
  type TodoCategory,
  type TodoItem,
  type TodoPriority,
} from "@/lib/todo/items";

const STORAGE_KEY = "seocc-todo-done-v1";

const PRIORITY_STYLE: Record<TodoPriority, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-amber-100 text-amber-800 border-amber-200",
  normal: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const CATEGORY_STYLE: Record<TodoCategory, string> = {
  security: "bg-red-50 text-red-700 border-red-200",
  ads: "bg-blue-50 text-blue-700 border-blue-200",
  deploy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "v2-sync": "bg-indigo-50 text-indigo-700 border-indigo-200",
  seo: "bg-violet-50 text-violet-700 border-violet-200",
  polish: "bg-pink-50 text-pink-700 border-pink-200",
  content: "bg-amber-50 text-amber-800 border-amber-200",
};

function loadDone(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveDone(done: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]));
  } catch {
    /* quota exceeded etc. — silently ignore */
  }
}

export default function TodoListPane() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const [categoryFilter, setCategoryFilter] = useState<TodoCategory | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Load persisted state once on mount.
  useEffect(() => {
    setDone(loadDone());
  }, []);

  function toggleDone(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveDone(next);
      return next;
    });
  }

  const visible = useMemo(() => {
    const priorityRank: Record<TodoPriority, number> = { urgent: 0, high: 1, normal: 2 };
    return TODO_ITEMS.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      const isDone = done.has(item.id);
      if (filter === "open" && isDone) return false;
      if (filter === "done" && !isDone) return false;
      return true;
    }).sort((a, b) => {
      // Open items first, then by priority, then by added date desc.
      const aDone = done.has(a.id) ? 1 : 0;
      const bDone = done.has(b.id) ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      if (priorityRank[a.priority] !== priorityRank[b.priority])
        return priorityRank[a.priority] - priorityRank[b.priority];
      return b.added.localeCompare(a.added);
    });
  }, [done, filter, categoryFilter]);

  const counts = useMemo(() => {
    const all = TODO_ITEMS.length;
    const doneN = TODO_ITEMS.filter((i) => done.has(i.id)).length;
    const openN = all - doneN;
    const urgent = TODO_ITEMS.filter((i) => !done.has(i.id) && i.priority === "urgent").length;
    return { all, openN, doneN, urgent };
  }, [done]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-blue-600 mb-2">
          To-Do · Reminders + open work
        </p>
        <h2 className="text-2xl font-semibold text-zinc-900">To-Do List</h2>
        <p className="mt-1 text-sm text-zinc-500 max-w-3xl">
          Items I'm tracking across the SEO Command Center. Tick them off as you finish.
          Marked-done state persists locally — no backend round-trip needed.
        </p>
      </div>

      {counts.urgent > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <span aria-hidden="true" className="text-lg">🚨</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-800">
              {counts.urgent} urgent {counts.urgent === 1 ? "item" : "items"} need attention
            </div>
            <div className="text-xs text-red-700 mt-0.5">
              Review the items tagged <span className="font-semibold">URGENT</span> below first.
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5 text-xs">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white overflow-hidden">
          {(["open", "done", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {f === "open"
                ? `Open (${counts.openN})`
                : f === "done"
                  ? `Done (${counts.doneN})`
                  : `All (${counts.all})`}
            </button>
          ))}
        </div>

        <div className="inline-flex flex-wrap items-center gap-1.5">
          <span className="text-zinc-500">Category</span>
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-2.5 py-1 rounded border ${
              categoryFilter === "all"
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
            }`}
          >
            All
          </button>
          {TODO_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-2.5 py-1 rounded border inline-flex items-center gap-1.5 ${
                categoryFilter === c.id
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
              }`}
            >
              <span aria-hidden="true">{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {visible.length === 0 && (
          <div className="bg-white border border-zinc-200 rounded-lg p-8 text-center text-sm text-zinc-500">
            {filter === "done"
              ? "Nothing checked off yet."
              : "Nothing to show — try clearing filters or switching to All."}
          </div>
        )}
        {visible.map((item) => {
          const isDone = done.has(item.id);
          const isExpanded = expanded === item.id;
          return (
            <TodoCard
              key={item.id}
              item={item}
              done={isDone}
              expanded={isExpanded}
              onToggle={() => toggleDone(item.id)}
              onExpand={() => setExpanded(isExpanded ? null : item.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function TodoCard({
  item,
  done,
  expanded,
  onToggle,
  onExpand,
}: {
  item: TodoItem;
  done: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
}) {
  const cat = TODO_CATEGORIES.find((c) => c.id === item.category);
  const [copied, setCopied] = useState(false);

  return (
    <div
      className={`bg-white border rounded-lg overflow-hidden transition-opacity ${
        done ? "border-zinc-200 opacity-60" : "border-zinc-200"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          onClick={onToggle}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          aria-pressed={done}
          className={`mt-0.5 shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            done
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-zinc-300 hover:border-blue-500"
          }`}
        >
          {done && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6.5l2.5 2.5L10 3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <button onClick={onExpand} className="flex-1 min-w-0 text-left">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${PRIORITY_STYLE[item.priority]}`}
            >
              {item.priority}
            </span>
            <span
              className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${CATEGORY_STYLE[item.category]}`}
            >
              <span aria-hidden="true">{cat?.emoji}</span>
              <span>{cat?.label ?? item.category}</span>
            </span>
          </div>
          <div
            className={`text-sm font-semibold leading-snug ${
              done ? "line-through text-zinc-500" : "text-zinc-900"
            }`}
          >
            {item.title}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">{item.detail}</div>
        </button>

        <button
          onClick={onExpand}
          aria-label={expanded ? "Collapse" : "Expand"}
          className="shrink-0 w-7 h-7 rounded inline-flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
        >
          {expanded ? "▾" : "▸"}
        </button>
      </div>

      {expanded && (
        <div className="bg-zinc-50 border-t border-zinc-200 px-4 py-3 space-y-3">
          {item.steps && item.steps.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5">
                Steps
              </div>
              <ol className="text-xs text-zinc-700 space-y-1 list-decimal list-inside">
                {item.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          {item.action && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {item.action.href && (
                <a
                  href={item.action.href}
                  target={item.action.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.action.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {item.action.label} ↗
                </a>
              )}
              {item.action.copy && (
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(item.action!.copy!);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1800);
                    } catch {
                      /* clipboard blocked */
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300"
                >
                  {copied ? "✓ Copied" : `📋 ${item.action.label}`}
                </button>
              )}
            </div>
          )}
          <div className="text-[10px] text-zinc-400 pt-1">
            Added {item.added} · id <code className="text-zinc-500">{item.id}</code>
          </div>
        </div>
      )}
    </div>
  );
}
