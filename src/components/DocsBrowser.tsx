"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

type Doc = {
  filename: string;
  title: string;
  blurb: string;
  group: string;
  content: string;
};

export default function DocsBrowser({ docs }: { docs: Doc[] }) {
  const [active, setActive] = useState(docs[0]?.filename ?? "");
  const [query, setQuery] = useState("");
  const current = docs.find((d) => d.filename === active) ?? docs[0];

  // Filter + group. Group order is preserved by encounter — first time each
  // group label appears in the (already-sorted) docs array sets its position.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? docs.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            d.blurb.toLowerCase().includes(q) ||
            d.content.toLowerCase().includes(q),
        )
      : docs;
    const order: string[] = [];
    const groups = new Map<string, Doc[]>();
    for (const d of matches) {
      if (!groups.has(d.group)) {
        groups.set(d.group, []);
        order.push(d.group);
      }
      groups.get(d.group)!.push(d);
    }
    return order.map((g) => ({ group: g, docs: groups.get(g)! }));
  }, [docs, query]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-1">Docs</h1>
          <p className="text-sm text-zinc-500 max-w-2xl">
            Architecture, integrations, API references, and operational rules — the same
            documentation an AI agent reads when it opens this repo.
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs…"
          className="bg-white border border-zinc-200 rounded px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 w-64"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        <aside className="space-y-4">
          {grouped.length === 0 && (
            <div className="text-xs text-zinc-500 px-3 py-2">No docs match.</div>
          )}
          {grouped.map((g) => (
            <div key={g.group}>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 px-3 py-1.5">
                {g.group}
              </div>
              <div className="space-y-1">
                {g.docs.map((d) => (
                  <button
                    key={d.filename}
                    onClick={() => setActive(d.filename)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors border ${
                      active === d.filename
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 border-transparent"
                    }`}
                  >
                    <div className="font-medium">{d.title}</div>
                    {d.blurb && (
                      <div className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                        {d.blurb}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <article className="prose prose-sm max-w-none bg-white border border-zinc-200 rounded-lg p-6 overflow-x-auto">
          {current ? (
            <>
              <div className="flex items-center justify-between not-prose mb-4 pb-4 border-b border-zinc-200">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 m-0">{current.title}</h2>
                  <div className="text-xs text-zinc-500 mt-1 font-mono">
                    docs/{current.filename}
                  </div>
                </div>
                <a
                  href={`https://github.com/premieratx/seo-command-center/blob/main/docs/${current.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline whitespace-nowrap"
                >
                  Edit on GitHub ↗
                </a>
              </div>
              <ReactMarkdown>{current.content}</ReactMarkdown>
            </>
          ) : (
            <div className="text-zinc-500 text-sm">No docs found.</div>
          )}
        </article>
      </div>
    </div>
  );
}
