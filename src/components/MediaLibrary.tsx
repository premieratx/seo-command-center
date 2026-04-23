"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MediaItem = {
  id: string;
  site_id: string;
  filename: string;
  mime_type: string;
  kind: "image" | "video" | "audio" | "pdf" | "doc" | "sheet" | "other";
  size_bytes: number | null;
  public_url: string;
  thumbnail_url: string | null;
  source: string;
  caption: string | null;
  created_at: string;
};

type Kind = MediaItem["kind"] | "all";

/**
 * Media Library — shows every file ever uploaded from the Command Center
 * (chat attachments, direct uploads, drag-drops). Lets you filter by kind,
 * upload more, copy a public URL to paste into chat, or delete.
 *
 * File upload flows in two places:
 *   1. This component's drag-drop / file-picker
 *   2. The Command Center chat's paperclip button (CommandTabAttach)
 * Both POST to /api/media/upload which writes to the shared bucket.
 */
export default function MediaLibrary({ siteId }: { siteId: string }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<Kind>("all");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ site_id: siteId });
      if (kind !== "all") qs.set("kind", kind);
      const res = await fetch(`/api/media?${qs.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load");
    } finally {
      setLoading(false);
    }
  }, [siteId, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("site_id", siteId);
      form.append("source", "media_library");
      for (const f of arr) form.append("files", f);
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/media?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `Delete failed (${res.status})`);
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
    }
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  const totalBytes = items.reduce((a, b) => a + (b.size_bytes || 0), 0);

  return (
    <div
      className="flex flex-col gap-4"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer?.files?.length) void handleUpload(e.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-white">Media Library</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {items.length} files · {formatBytes(totalBytes)} · drag-drop anywhere to upload
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="bg-[#0a0a0a] border border-[#262626] text-xs text-zinc-300 rounded px-2 py-1.5"
          >
            <option value="all">All kinds</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="pdf">PDFs</option>
            <option value="doc">Docs</option>
            <option value="sheet">Sheets</option>
            <option value="other">Other</option>
          </select>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleUpload(e.target.files);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-3 py-1.5 rounded font-medium"
          >
            {uploading ? "Uploading…" : "Upload files"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
          {error}
        </div>
      )}

      {dragOver && (
        <div className="text-xs text-blue-200 bg-blue-500/10 border border-blue-500/40 border-dashed rounded p-6 text-center">
          Drop to upload
        </div>
      )}

      {loading ? (
        <div className="text-xs text-zinc-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="bg-[#141414] border border-[#262626] border-dashed rounded-lg p-10 text-center">
          <p className="text-sm text-zinc-400">No files yet.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Upload PDFs, images, videos, Word/Sheet files — or drag them anywhere on this page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {items.map((it) => (
            <MediaCard key={it.id} item={it} onCopy={() => copyUrl(it.public_url)} onDelete={() => handleDelete(it.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaCard({
  item,
  onCopy,
  onDelete,
}: {
  item: MediaItem;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden group">
      <div className="aspect-square bg-[#0a0a0a] flex items-center justify-center relative">
        {item.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.public_url} alt={item.filename} className="w-full h-full object-cover" />
        ) : item.kind === "video" ? (
          <video src={item.public_url} className="w-full h-full object-cover" muted playsInline />
        ) : (
          <div className="text-center p-3">
            <div className="text-3xl mb-1">{iconForKind(item.kind)}</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">{item.kind}</div>
          </div>
        )}
      </div>
      <div className="p-2 text-xs">
        <div className="truncate text-zinc-200" title={item.filename}>
          {item.filename}
        </div>
        <div className="text-[10px] text-zinc-600 mt-0.5">
          {formatBytes(item.size_bytes || 0)} · {new Date(item.created_at).toLocaleDateString()}
        </div>
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={() => {
              onCopy();
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex-1 text-[10px] bg-[#0a0a0a] hover:bg-blue-600 hover:text-white border border-[#262626] text-zinc-300 rounded px-1.5 py-1 transition-colors"
          >
            {copied ? "Copied ✓" : "Copy URL"}
          </button>
          <a
            href={item.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] bg-[#0a0a0a] hover:bg-[#262626] border border-[#262626] text-zinc-300 rounded px-1.5 py-1"
          >
            Open
          </a>
          <button
            onClick={onDelete}
            className="text-[10px] bg-[#0a0a0a] hover:bg-red-600 hover:text-white border border-[#262626] text-zinc-500 rounded px-1.5 py-1"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function iconForKind(k: MediaItem["kind"]) {
  switch (k) {
    case "pdf":
      return "📄";
    case "doc":
      return "📝";
    case "sheet":
      return "📊";
    case "audio":
      return "🎵";
    case "video":
      return "🎬";
    case "image":
      return "🖼";
    default:
      return "📁";
  }
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
