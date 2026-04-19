"use client";

/**
 * GalleryPane — Command Center asset browser + gallery template builder.
 *
 * Two sub-tabs:
 *   1. Photos — every asset from Lovable (~91) + the 253 photos in the
 *              Supabase storage bucket 2024-disco-cruise-photos. Browse,
 *              search, filter by category, click to preview. Multi-select
 *              mode lets you pick N photos and turn them into a template.
 *   2. Templates — saved gallery layouts (grid/mosaic/slideshow/masonry/
 *               carousel) with customizable columns, gap, aspect ratio,
 *               captions, rounded corners. One-click copy of:
 *                 • HTML snippet (paste into blog_posts.body_md or any
 *                   static page)
 *                 • React JSX (for deep page integration)
 *                 • A compact `[gallery:<id>]` shortcode the cruise site
 *                   can render server-side
 *
 * Templates persist to public.gallery_templates so they're available
 * anywhere — Blog editor, Design tab, markdown body via shortcode.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import localManifest from "@/lib/gallery-manifest.json";
import supabaseManifest from "@/lib/supabase-gallery-manifest.json";
import { createClient } from "@/lib/supabase/client";

type Asset = { url: string; name: string; category: string };
const ASSETS: Asset[] = [...(localManifest as Asset[]), ...(supabaseManifest as Asset[])];

type Layout = "grid" | "mosaic" | "slideshow" | "masonry" | "carousel";

type Template = {
  id?: string;
  name: string;
  description: string | null;
  layout: Layout;
  photo_urls: string[];
  columns: number;
  gap_px: number;
  aspect_ratio: string | null; // "1/1" | "4/3" | "16/9" | "auto"
  show_captions: boolean;
  rounded_px: number;
  autoplay_ms: number | null;
  created_at?: string;
};

const supabase = createClient();

export default function GalleryPane() {
  const [sub, setSub] = useState<"photos" | "templates">("photos");
  const [templates, setTemplates] = useState<Template[]>([]);

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("gallery_templates")
      .select("*")
      .order("created_at", { ascending: false });
    setTemplates((data as Template[]) || []);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-[#262626] mb-5" role="tablist">
        {[
          { id: "photos" as const, label: "Photos", icon: "🖼️", count: ASSETS.length },
          { id: "templates" as const, label: "Templates", icon: "📐", count: templates.length },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={sub === t.id}
            onClick={() => setSub(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
              sub === t.id
                ? "border-blue-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span aria-hidden="true">{t.icon}</span> {t.label}{" "}
            <span className="text-zinc-500 text-xs">({t.count})</span>
          </button>
        ))}
      </div>

      {sub === "photos" && <PhotosPane onSavedTemplate={() => { loadTemplates(); setSub("templates"); }} />}
      {sub === "templates" && <TemplatesPane templates={templates} onReload={loadTemplates} />}
    </div>
  );
}

// ── Photos sub-tab ──────────────────────────────────────────────────────
function PhotosPane({ onSavedTemplate }: { onSavedTemplate: () => void }) {
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<Asset | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    ASSETS.forEach((a) => set.add(a.category));
    return ["all", ...Array.from(set).sort()];
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return ASSETS.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (q && !a.name.toLowerCase().includes(q) && !a.category.toLowerCase().includes(q))
        return false;
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

  function toggleSelect(url: string) {
    setSelected((s) => (s.includes(url) ? s.filter((u) => u !== url) : [...s, url]));
  }

  function clearSelection() {
    setSelected([]);
    setSelectMode(false);
  }

  return (
    <div>
      {/* Top controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <input
          type="text"
          placeholder={`Search ${ASSETS.length} photos…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-[#0a0a0a] border border-[#262626] rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-500"
        />
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div className="text-xs text-zinc-500">
            {filtered.length} / {ASSETS.length}
          </div>
          <button
            onClick={() => {
              setSelectMode((m) => !m);
              if (selectMode) setSelected([]);
            }}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              selectMode
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-[#141414] border-[#262626] text-zinc-300 hover:border-zinc-500"
            }`}
          >
            {selectMode ? "Exit select" : "Select photos"}
          </button>
        </div>
      </div>

      {/* Floating selection bar */}
      {selectMode && (
        <div className="sticky top-4 z-20 bg-[#141414] border border-blue-500/40 rounded-lg px-3 py-2 mb-4 flex items-center justify-between shadow-lg shadow-black/40">
          <div className="text-sm text-white">
            <strong>{selected.length}</strong> photo{selected.length === 1 ? "" : "s"} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="text-xs px-2.5 py-1 rounded bg-[#0a0a0a] border border-[#262626] text-zinc-300 hover:border-zinc-500"
            >
              Clear
            </button>
            <button
              onClick={() => setShowBuilder(true)}
              disabled={selected.length < 2}
              className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium"
            >
              Create gallery template →
            </button>
          </div>
        </div>
      )}

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
          {filtered.map((a) => {
            const isSelected = selected.includes(a.url);
            return (
              <button
                key={a.url}
                onClick={() => (selectMode ? toggleSelect(a.url) : setPreview(a))}
                className={`group relative aspect-square bg-[#141414] border rounded-md overflow-hidden transition-all ${
                  isSelected
                    ? "border-blue-500 ring-2 ring-blue-500/50"
                    : selectMode
                      ? "border-[#262626] hover:border-blue-400/60"
                      : "border-[#262626] hover:border-amber-500/50"
                }`}
                title={a.name}
              >
                <img
                  src={a.url}
                  alt={a.name}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-transform ${
                    isSelected ? "" : "group-hover:scale-[1.03]"
                  }`}
                />
                {selectMode && (
                  <div
                    className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "bg-black/60 text-zinc-400 border border-white/30"
                    }`}
                  >
                    {isSelected ? selected.indexOf(a.url) + 1 : ""}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1.5 translate-y-full group-hover:translate-y-0 transition-transform">
                  <div className="text-[10px] text-zinc-300 truncate">{a.name}</div>
                  <div className="text-[9px] text-zinc-500">{a.category}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {preview && !selectMode && (
        <PreviewModal preview={preview} onClose={() => setPreview(null)} copied={copied} copy={copy} />
      )}

      {showBuilder && (
        <TemplateBuilderModal
          photoUrls={selected}
          onClose={() => setShowBuilder(false)}
          onSaved={() => {
            setShowBuilder(false);
            clearSelection();
            onSavedTemplate();
          }}
        />
      )}
    </div>
  );
}

// ── Template Builder ────────────────────────────────────────────────────
function TemplateBuilderModal({
  photoUrls,
  onClose,
  onSaved,
}: {
  photoUrls: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [layout, setLayout] = useState<Layout>("grid");
  const [columns, setColumns] = useState(3);
  const [gap, setGap] = useState(8);
  const [aspectRatio, setAspectRatio] = useState<string>("1/1");
  const [showCaptions, setShowCaptions] = useState(false);
  const [rounded, setRounded] = useState(8);
  const [autoplay, setAutoplay] = useState(4000);
  const [photoCount, setPhotoCount] = useState(photoUrls.length);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const effectiveUrls = photoUrls.slice(0, photoCount);
  const isSlideshow = layout === "slideshow" || layout === "carousel";

  async function save() {
    if (!name.trim()) {
      setErr("Name is required");
      return;
    }
    setSaving(true);
    setErr(null);
    const payload: Template = {
      name: name.trim(),
      description: description.trim() || null,
      layout,
      photo_urls: effectiveUrls,
      columns,
      gap_px: gap,
      aspect_ratio: aspectRatio,
      show_captions: showCaptions,
      rounded_px: rounded,
      autoplay_ms: isSlideshow ? autoplay : null,
    };
    const { error } = await supabase.from("gallery_templates").insert(payload);
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#141414] border border-[#2a2a2a] rounded-lg max-w-6xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#262626]">
          <h3 className="text-base font-semibold text-white">Create gallery template</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl">
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5 p-5">
          {/* Config */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                Template name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Disco Night Highlights"
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                Description (optional)
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                Layout
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["grid", "mosaic", "masonry", "slideshow", "carousel"] as Layout[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLayout(l)}
                    className={`text-xs px-3 py-2 rounded border capitalize ${
                      layout === l
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-[#0a0a0a] border-[#262626] text-zinc-300 hover:border-zinc-500"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  Photo count ({photoUrls.length} picked)
                </label>
                <input
                  type="number"
                  min={2}
                  max={photoUrls.length}
                  value={photoCount}
                  onChange={(e) =>
                    setPhotoCount(Math.max(2, Math.min(photoUrls.length, parseInt(e.target.value) || 2)))
                  }
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                />
              </div>
              {!isSlideshow && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                    Columns
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={columns}
                    onChange={(e) => setColumns(Math.max(1, Math.min(6, parseInt(e.target.value) || 3)))}
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              )}
              {isSlideshow && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                    Autoplay (ms)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={500}
                    value={autoplay}
                    onChange={(e) => setAutoplay(parseInt(e.target.value) || 4000)}
                    className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  Gap (px)
                </label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={gap}
                  onChange={(e) => setGap(Math.max(0, Math.min(40, parseInt(e.target.value) || 0)))}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  Rounded (px)
                </label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={rounded}
                  onChange={(e) => setRounded(Math.max(0, Math.min(40, parseInt(e.target.value) || 0)))}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                  Aspect ratio
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
                >
                  <option value="auto">auto (native)</option>
                  <option value="1/1">1 : 1 (square)</option>
                  <option value="4/3">4 : 3</option>
                  <option value="3/2">3 : 2</option>
                  <option value="16/9">16 : 9</option>
                  <option value="2/3">2 : 3 (portrait)</option>
                </select>
              </div>
              <label className="flex items-center gap-2 self-end pb-1 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={showCaptions}
                  onChange={(e) => setShowCaptions(e.target.checked)}
                  className="accent-blue-500"
                />
                Show captions
              </label>
            </div>

            {err && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
                {err}
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                onClick={onClose}
                className="text-xs px-3 py-2 rounded bg-[#0a0a0a] border border-[#262626] text-zinc-300 hover:border-zinc-500"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !name.trim() || effectiveUrls.length < 2}
                className="flex-1 text-xs px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
              >
                {saving ? "Saving…" : "Save template"}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 min-h-[300px]">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Preview</div>
            <GalleryPreview
              urls={effectiveUrls}
              layout={layout}
              columns={columns}
              gap={gap}
              aspectRatio={aspectRatio}
              rounded={rounded}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Templates sub-tab ──────────────────────────────────────────────────
function TemplatesPane({
  templates,
  onReload,
}: {
  templates: Template[];
  onReload: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
    } catch {
      /* ignore */
    }
  };

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("gallery_templates").delete().eq("id", id);
    if (error) alert(error.message);
    else onReload();
  }

  if (!templates.length) {
    return (
      <div className="bg-[#141414] border border-[#262626] rounded-lg py-16 text-center">
        <p className="text-sm text-zinc-400 mb-2">No templates yet.</p>
        <p className="text-xs text-zinc-500">
          Go to <strong>Photos</strong>, click <strong>Select photos</strong>, pick 2+ images, then
          hit <strong>Create gallery template</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {templates.map((t) => {
        const html = renderGalleryHtml(t);
        const jsx = renderGalleryJsx(t);
        const shortcode = `[gallery:${t.id}]`;
        return (
          <div
            key={t.id}
            className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#262626] flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {t.photo_urls.length} photo{t.photo_urls.length === 1 ? "" : "s"} · {t.layout} ·{" "}
                  {t.layout === "slideshow" || t.layout === "carousel"
                    ? `${t.autoplay_ms}ms autoplay`
                    : `${t.columns}col`}{" "}
                  · gap {t.gap_px}px · {t.aspect_ratio || "auto"}
                  {t.show_captions ? " · captions" : ""}
                </div>
                {t.description && (
                  <div className="text-xs text-zinc-400 mt-1 italic">{t.description}</div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <CopyButton
                  label="HTML"
                  text={html}
                  copied={copied === `html-${t.id}`}
                  onCopy={() => copy(html, `html-${t.id}`)}
                />
                <CopyButton
                  label="JSX"
                  text={jsx}
                  copied={copied === `jsx-${t.id}`}
                  onCopy={() => copy(jsx, `jsx-${t.id}`)}
                />
                <CopyButton
                  label="Shortcode"
                  text={shortcode}
                  copied={copied === `sc-${t.id}`}
                  onCopy={() => copy(shortcode, `sc-${t.id}`)}
                />
                <button
                  onClick={() => t.id && deleteTemplate(t.id)}
                  className="text-xs px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:border-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="p-4 bg-[#0a0a0a]">
              <GalleryPreview
                urls={t.photo_urls}
                layout={t.layout}
                columns={t.columns}
                gap={t.gap_px}
                aspectRatio={t.aspect_ratio || "auto"}
                rounded={t.rounded_px}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CopyButton({
  label,
  text: _text,
  copied,
  onCopy,
}: {
  label: string;
  text: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      onClick={onCopy}
      className={`text-xs px-2.5 py-1 rounded border transition-colors ${
        copied
          ? "bg-green-500/15 border-green-500/40 text-green-300"
          : "bg-[#0a0a0a] border-[#262626] text-zinc-300 hover:border-zinc-500"
      }`}
    >
      {copied ? `${label} ✓` : `Copy ${label}`}
    </button>
  );
}

// ── Gallery renderer (live preview + export markup) ─────────────────────
function GalleryPreview({
  urls,
  layout,
  columns,
  gap,
  aspectRatio,
  rounded,
}: {
  urls: string[];
  layout: Layout;
  columns: number;
  gap: number;
  aspectRatio: string;
  rounded: number;
}) {
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    if (layout !== "slideshow" && layout !== "carousel") return;
    const id = setInterval(() => setSlideIdx((i) => (i + 1) % Math.max(1, urls.length)), 3200);
    return () => clearInterval(id);
  }, [layout, urls.length]);

  if (!urls.length) {
    return <div className="text-xs text-zinc-500 text-center py-8">No photos selected yet.</div>;
  }

  const imgStyle = {
    aspectRatio: aspectRatio === "auto" ? undefined : aspectRatio.replace("/", " / "),
    borderRadius: `${rounded}px`,
  } as React.CSSProperties;

  if (layout === "slideshow" || layout === "carousel") {
    return (
      <div style={{ borderRadius: `${rounded}px` }} className="relative overflow-hidden">
        <img
          src={urls[slideIdx]}
          alt=""
          className="w-full object-cover"
          style={{ aspectRatio: aspectRatio === "auto" ? "16/9" : aspectRatio.replace("/", " / ") }}
        />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlideIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === slideIdx ? "bg-white w-6" : "bg-white/40"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layout === "mosaic") {
    // Mosaic: first photo big (spans 2 cols + 2 rows), rest fill
    return (
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(columns, 3)}, 1fr)`,
          gap: `${gap}px`,
        }}
      >
        {urls.map((u, i) => (
          <img
            key={u + i}
            src={u}
            alt=""
            className={`w-full object-cover ${i === 0 ? "col-span-2 row-span-2" : ""}`}
            style={imgStyle}
          />
        ))}
      </div>
    );
  }

  if (layout === "masonry") {
    // Masonry via CSS columns (natural aspect ratios)
    return (
      <div
        style={{
          columnCount: columns,
          columnGap: `${gap}px`,
        }}
      >
        {urls.map((u, i) => (
          <img
            key={u + i}
            src={u}
            alt=""
            className="w-full mb-2"
            style={{ borderRadius: `${rounded}px`, marginBottom: `${gap}px`, breakInside: "avoid" }}
          />
        ))}
      </div>
    );
  }

  // Grid (default)
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: `${gap}px` }}
    >
      {urls.map((u, i) => (
        <img
          key={u + i}
          src={u}
          alt=""
          className="w-full object-cover"
          style={imgStyle}
        />
      ))}
    </div>
  );
}

// ── Export helpers ──────────────────────────────────────────────────────
function renderGalleryHtml(t: Template): string {
  const ar = t.aspect_ratio && t.aspect_ratio !== "auto" ? `aspect-ratio:${t.aspect_ratio};` : "";
  const imgs = t.photo_urls
    .map(
      (u) =>
        `    <img src="${u}" alt="" loading="lazy" style="width:100%;object-fit:cover;${ar}border-radius:${t.rounded_px}px;" />`,
    )
    .join("\n");

  if (t.layout === "slideshow" || t.layout === "carousel") {
    return `<!-- gallery-template:${t.name} -->
<div class="ppc-gallery ppc-gallery--${t.layout}" data-autoplay="${t.autoplay_ms}" style="position:relative;overflow:hidden;border-radius:${t.rounded_px}px;">
${imgs}
</div>`;
  }
  if (t.layout === "masonry") {
    return `<!-- gallery-template:${t.name} -->
<div class="ppc-gallery ppc-gallery--masonry" style="column-count:${t.columns};column-gap:${t.gap_px}px;">
${t.photo_urls
  .map(
    (u) =>
      `    <img src="${u}" alt="" loading="lazy" style="width:100%;margin-bottom:${t.gap_px}px;break-inside:avoid;border-radius:${t.rounded_px}px;" />`,
  )
  .join("\n")}
</div>`;
  }
  return `<!-- gallery-template:${t.name} -->
<div class="ppc-gallery ppc-gallery--${t.layout}" style="display:grid;grid-template-columns:repeat(${t.columns},1fr);gap:${t.gap_px}px;">
${imgs}
</div>`;
}

function renderGalleryJsx(t: Template): string {
  const propsLine = `photos={${JSON.stringify(t.photo_urls)}} layout="${t.layout}" columns={${t.columns}} gap={${t.gap_px}} aspectRatio="${t.aspect_ratio || "auto"}" rounded={${t.rounded_px}}${t.show_captions ? " showCaptions" : ""}${t.autoplay_ms ? ` autoplayMs={${t.autoplay_ms}}` : ""}`;
  return `{/* gallery-template:${t.name} */}
<Gallery ${propsLine} />`;
}

// ── Preview modal (single-photo, unchanged behavior) ───────────────────
function PreviewModal({
  preview,
  onClose,
  copied,
  copy,
}: {
  preview: Asset;
  onClose: () => void;
  copied: string | null;
  copy: (text: string, key: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
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
            onClick={onClose}
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
          <UrlRow
            label="URL"
            value={preview.url}
            onCopy={() => copy(preview.url, "url")}
            copied={copied === "url"}
          />
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
