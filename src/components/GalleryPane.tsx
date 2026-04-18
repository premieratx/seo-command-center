"use client";

/**
 * GalleryPane — Command Center asset browser.
 *
 * Shows every photo imported from the Lovable quote-app (~91 files)
 * organized by category (boats, party, addons, slides, tiles, tabs,
 * non-bach-slides, + loose files). Each thumbnail has:
 *   - Click to open large preview with URL + dimensions + filename
 *   - Copy URL button (for pasting into content editor)
 *   - Copy <img> markup button (ready-to-paste HTML)
 *   - Filter by category pill
 *   - Search box
 *
 * URL base: /gallery/... — files live in /public/gallery/ on the
 * seo-dashboard Netlify deploy. Once we publish, any copy of the URL
 * from here is immediately usable anywhere on the cruise site (just
 * paste it into an <img src>).
 */
import { useMemo, useState } from "react";
import localManifest from "@/lib/gallery-manifest.json";
import supabaseManifest from "@/lib/supabase-gallery-manifest.json";

type Asset = { url: string; name: string; category: string };
// Merge local /public/gallery/* photos with the 253 photos sitting in the
// Supabase public storage bucket (2024-disco-cruise-photos). Both sources
// expose the same shape { url, name, category } — the Supabase ones all
// live under the "2024-disco-cruise-photos" category so they filter cleanly.
const ASSETS: Asset[] = [...(localManifest as Asset[]), ...(supabaseManifest as Asset[])];

export default function GalleryPane() {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<Asset | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    ASSETS.forEach((a) => set.add(a.category));
    return ["all", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ASSETS.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (q && !a.name.toLowerCase().includes(q) && !a.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [category, query]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <input
          type="text"
          placeholder={`Search ${ASSETS.length} photos…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-500"
        />
        <div className="text-xs text-zinc-500 whitespace-nowrap">
          {filtered.length} / {ASSETS.length}
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
              category === c
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                : "bg-transparent border-[#262626] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-zinc-500">
          No photos match that search.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filtered.map((a) => (
            <button
              key={a.url}
              onClick={() => setPreview(a)}
              className="group relative aspect-square bg-[#141414] border border-[#262626] rounded-md overflow-hidden hover:border-amber-500/50 transition-colors"
              title={a.name}
            >
              <img
                src={a.url}
                alt={a.name}
                loading="lazy"
                className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1.5 translate-y-full group-hover:translate-y-0 transition-transform">
                <div className="text-[10px] text-zinc-300 truncate">{a.name}</div>
                <div className="text-[9px] text-zinc-500">{a.category}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-[#141414] border border-[#2a2a2a] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-4 border-b border-[#262626]">
              <div>
                <div className="text-sm font-semibold text-white">{preview.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  /{preview.category === "root" ? "" : `${preview.category}/`}
                  {preview.name}
                </div>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="text-zinc-400 hover:text-white text-lg px-2"
              >
                ×
              </button>
            </div>
            <div className="p-4 bg-[#0a0a0a]">
              <img
                src={preview.url}
                alt={preview.name}
                className="max-w-full max-h-[60vh] mx-auto rounded"
              />
            </div>
            <div className="p-4 space-y-2 border-t border-[#262626]">
              <UrlRow label="URL" value={preview.url} onCopy={() => copy(preview.url, "url")} copied={copied === "url"} />
              <UrlRow
                label="<img> markup"
                value={`<img src="${preview.url}" alt="${preview.name.replace(/[-_]/g, " ").replace(/\.[^.]+$/, "")}" loading="lazy" />`}
                onCopy={() =>
                  copy(
                    `<img src="${preview.url}" alt="${preview.name.replace(/[-_]/g, " ").replace(/\.[^.]+$/, "")}" loading="lazy" />`,
                    "img",
                  )
                }
                copied={copied === "img"}
              />
              <UrlRow
                label="Full URL (production)"
                value={`https://seo.premierpartycruises.com${preview.url}`}
                onCopy={() =>
                  copy(`https://seo.premierpartycruises.com${preview.url}`, "full")
                }
                copied={copied === "full"}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UrlRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded px-2 py-1.5 text-xs text-green-300 overflow-x-auto whitespace-nowrap">
          {value}
        </code>
        <button
          onClick={onCopy}
          className={`text-xs px-3 py-1.5 rounded border transition-colors whitespace-nowrap ${
            copied
              ? "border-green-500/40 text-green-400 bg-green-500/10"
              : "border-[#262626] text-zinc-300 hover:border-zinc-500"
          }`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
