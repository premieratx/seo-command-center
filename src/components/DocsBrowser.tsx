"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

type Doc = {
  filename: string;
  title: string;
  blurb: string;
  content: string;
};

export default function DocsBrowser({ docs }: { docs: Doc[] }) {
  const [active, setActive] = useState(docs[0]?.filename ?? "");
  const current = docs.find((d) => d.filename === active) ?? docs[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Docs</h1>
        <p className="text-sm text-zinc-400">
          Single source of truth for PPC Quote Builder — pricing rules, payment
          safeguards, integrations, and roadmap.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="space-y-1">
          {docs.map((d) => (
            <button
              key={d.filename}
              onClick={() => setActive(d.filename)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                active === d.filename
                  ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-[#1a1a1a] border border-transparent"
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
        </aside>

        <article className="prose prose-invert prose-sm max-w-none bg-[#0f0f0f] border border-[#262626] rounded-lg p-6 overflow-x-auto">
          {current ? (
            <>
              <div className="flex items-center justify-between not-prose mb-4 pb-4 border-b border-[#262626]">
                <div>
                  <h2 className="text-lg font-bold text-white m-0">
                    {current.title}
                  </h2>
                  <div className="text-xs text-zinc-500 mt-1">
                    {current.filename}
                  </div>
                </div>
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
