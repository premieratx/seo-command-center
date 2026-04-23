"use client";

import { useCallback, useRef, useState } from "react";

/**
 * SEMRush Bulk Ingest
 *
 * Drag N screenshots from the SEMRush AI Visibility module (Narrative Drivers,
 * Questions, Perception, Brand Performance, Citations) for any LLM (ChatGPT,
 * Gemini, Perplexity, Google AI Mode, Claude). Files are parsed → base64 →
 * batched to `/api/semrush-screenshot-ingest` which uses Claude Vision to
 * extract keywords, SoV, insights, sentiment.
 *
 * Filename convention (optional, gives better tagging):
 *   `narrative-drivers__chatgpt.png`
 *   `questions-branded__gemini.png`
 *   `perception__perplexity.png`
 *   `brand-performance__google-ai-mode.png`
 *
 * Anything before `__` is the surface, after is the LLM. No `__` = tag auto.
 */

type SurfaceKey =
  | "narrative_drivers"
  | "questions_branded"
  | "questions_nonbranded"
  | "citations_branded"
  | "citations_nonbranded"
  | "perception"
  | "brand_performance"
  | "unknown";

type LlmKey = "chatgpt" | "gemini" | "perplexity" | "google_ai_mode" | "claude" | "all" | "unknown";

type StagedFile = {
  id: string;
  file: File;
  previewUrl: string;
  surface: SurfaceKey;
  llm: LlmKey;
  status: "pending" | "uploading" | "done" | "error";
  result?: string;
  error?: string;
};

const SURFACES: { key: SurfaceKey; label: string }[] = [
  { key: "narrative_drivers", label: "Narrative Drivers" },
  { key: "questions_branded", label: "Questions — Branded" },
  { key: "questions_nonbranded", label: "Questions — Non-branded" },
  { key: "citations_branded", label: "Citations — Branded" },
  { key: "citations_nonbranded", label: "Citations — Non-branded" },
  { key: "perception", label: "Perception" },
  { key: "brand_performance", label: "Brand Performance" },
  { key: "unknown", label: "Unknown / Auto-detect" },
];

const LLMS: { key: LlmKey; label: string }[] = [
  { key: "chatgpt", label: "ChatGPT" },
  { key: "gemini", label: "Gemini" },
  { key: "perplexity", label: "Perplexity" },
  { key: "google_ai_mode", label: "Google AI Mode" },
  { key: "claude", label: "Claude" },
  { key: "all", label: "All / Combined" },
  { key: "unknown", label: "Unknown" },
];

function inferFromFilename(name: string): { surface: SurfaceKey; llm: LlmKey } {
  const lower = name.toLowerCase().replace(/\.(png|jpg|jpeg|webp)$/, "");
  const [rawSurface, rawLlm] = lower.split("__");

  const normalize = (s: string) => s.replace(/[-_\s]+/g, "_");
  const sNorm = normalize(rawSurface || "");
  const lNorm = normalize(rawLlm || "");

  const surfaceMatch: SurfaceKey = (SURFACES.find(
    (s) => s.key === sNorm || sNorm.includes(s.key),
  )?.key as SurfaceKey | undefined) || "unknown";

  const llmMatch: LlmKey = (LLMS.find(
    (l) => l.key === lNorm || lNorm.includes(l.key),
  )?.key as LlmKey | undefined) || "unknown";

  return { surface: surfaceMatch, llm: llmMatch };
}

async function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = r.result as string;
      resolve(dataUrl.replace(/^data:[^;]+;base64,/, ""));
    };
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

export default function SemrushBulkIngest({
  siteId,
  onIngested,
}: {
  siteId: string;
  onIngested?: () => void;
}) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const staged: StagedFile[] = arr.map((file) => {
      const { surface, llm } = inferFromFilename(file.name);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        surface,
        llm,
        status: "pending",
      };
    });
    setStaged((prev) => [...prev, ...staged]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const items = Array.from(e.clipboardData.items).filter((i) => i.type.startsWith("image/"));
      if (!items.length) return;
      const files = items.map((i) => i.getAsFile()).filter(Boolean) as File[];
      if (files.length) addFiles(files);
    },
    [addFiles],
  );

  const updateStaged = (id: string, patch: Partial<StagedFile>) =>
    setStaged((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const removeStaged = (id: string) =>
    setStaged((prev) => {
      const hit = prev.find((s) => s.id === id);
      if (hit) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((s) => s.id !== id);
    });

  const uploadAll = async () => {
    if (!staged.length || running) return;
    setRunning(true);
    setGlobalMessage(null);

    const pending = staged.filter((s) => s.status !== "done");
    for (const item of pending) {
      updateStaged(item.id, { status: "uploading", error: undefined });
      try {
        const base64 = await fileToBase64(item.file);
        const source = `semrush__${item.surface}__${item.llm}`;
        const resp = await fetch("/api/semrush-screenshot-ingest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            site_id: siteId,
            note: `${item.surface} / ${item.llm}`,
            screenshots: [{ source, base64, mime: item.file.type || "image/png" }],
          }),
        });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          updateStaged(item.id, {
            status: "error",
            error: json?.error || `HTTP ${resp.status}`,
          });
        } else {
          const summary: string[] = [];
          if (json.keywords) summary.push(`${json.keywords} kws`);
          if (json.share_of_voice) summary.push(`${json.share_of_voice} SoV`);
          if (json.insights) summary.push(`${json.insights} insights`);
          if (json.sentiment) summary.push(`${json.sentiment} sentiment`);
          updateStaged(item.id, {
            status: "done",
            result: summary.join(" · ") || "ingested",
          });
        }
      } catch (err) {
        updateStaged(item.id, {
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    setRunning(false);
    setGlobalMessage("Ingest complete — refresh to see new data below.");
    onIngested?.();
  };

  const clearDone = () => {
    setStaged((prev) => {
      prev.filter((s) => s.status === "done").forEach((s) => URL.revokeObjectURL(s.previewUrl));
      return prev.filter((s) => s.status !== "done");
    });
  };

  const doneCount = staged.filter((s) => s.status === "done").length;
  const errorCount = staged.filter((s) => s.status === "error").length;
  const pendingCount = staged.filter((s) => s.status === "pending").length;

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h3 className="font-semibold text-base text-white">SEMRush Bulk Ingest</h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Drop SEMRush AI Visibility screenshots here. Filename hints help tagging:{" "}
            <code className="text-amber-300 bg-[#0a0a0a] px-1 rounded">narrative-drivers__chatgpt.png</code>.
            Claude Vision extracts keywords, Share of Voice, insights, and competitor sentiment → writes to the dashboard tables below.
          </p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] rounded px-3 py-2 whitespace-nowrap"
        >
          Add files…
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onPaste={onPaste}
        tabIndex={0}
        className={`rounded-md border-2 border-dashed p-6 text-center text-sm transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-900/10 text-blue-300"
            : "border-[#333] text-zinc-500 hover:text-zinc-400"
        }`}
      >
        Drag & drop screenshots, or paste from clipboard (⌘V).
      </div>

      {staged.length > 0 && (
        <div className="mt-4 space-y-2">
          {staged.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 bg-[#0a0a0a] border border-[#262626] rounded p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.previewUrl}
                alt={s.file.name}
                className="w-16 h-16 object-cover rounded border border-[#262626]"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-zinc-300 truncate">{s.file.name}</div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <select
                    value={s.surface}
                    onChange={(e) =>
                      updateStaged(s.id, { surface: e.target.value as SurfaceKey })
                    }
                    className="bg-[#1a1a1a] border border-[#333] text-[11px] text-zinc-300 rounded px-1.5 py-0.5"
                    disabled={s.status === "uploading" || s.status === "done"}
                  >
                    {SURFACES.map((surf) => (
                      <option key={surf.key} value={surf.key}>
                        {surf.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={s.llm}
                    onChange={(e) => updateStaged(s.id, { llm: e.target.value as LlmKey })}
                    className="bg-[#1a1a1a] border border-[#333] text-[11px] text-zinc-300 rounded px-1.5 py-0.5"
                    disabled={s.status === "uploading" || s.status === "done"}
                  >
                    {LLMS.map((l) => (
                      <option key={l.key} value={l.key}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                {s.result && (
                  <div className="text-[11px] text-emerald-400 mt-1">✓ {s.result}</div>
                )}
                {s.error && (
                  <div className="text-[11px] text-red-400 mt-1 truncate" title={s.error}>
                    ✗ {s.error}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    s.status === "done"
                      ? "bg-emerald-900/40 text-emerald-300"
                      : s.status === "error"
                        ? "bg-red-900/40 text-red-300"
                        : s.status === "uploading"
                          ? "bg-blue-900/40 text-blue-300"
                          : "bg-[#1a1a1a] text-zinc-500"
                  }`}
                >
                  {s.status}
                </span>
                {s.status !== "uploading" && (
                  <button
                    onClick={() => removeStaged(s.id)}
                    className="text-xs text-zinc-500 hover:text-red-400 px-1"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-zinc-500">
              {staged.length} file{staged.length === 1 ? "" : "s"}
              {doneCount > 0 && <span className="text-emerald-400"> · {doneCount} done</span>}
              {errorCount > 0 && <span className="text-red-400"> · {errorCount} failed</span>}
              {pendingCount > 0 && <span> · {pendingCount} pending</span>}
            </div>
            <div className="flex gap-2">
              {doneCount > 0 && (
                <button
                  onClick={clearDone}
                  className="text-xs bg-[#1a1a1a] hover:bg-[#242424] border border-[#333] rounded px-3 py-1.5"
                >
                  Clear completed
                </button>
              )}
              <button
                onClick={uploadAll}
                disabled={running || staged.every((s) => s.status === "done")}
                className="text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded px-3 py-1.5 font-medium"
              >
                {running ? "Uploading…" : `Upload ${pendingCount + errorCount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {globalMessage && (
        <div className="mt-3 text-xs text-emerald-400">{globalMessage}</div>
      )}
    </div>
  );
}
