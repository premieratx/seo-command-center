"use client";

/**
 * BlogPane — Command Center blog editor.
 *
 * Fresh build (not a Replit port). Posts live in public.blog_posts
 * (id, slug, title, excerpt, body_md, status, hero_image_url, tags,
 * author_email, published_at, created_at, updated_at). The cruise
 * site's blog renderer already consumes any table matching that shape
 * via its existing blog routes, so published posts light up on the
 * public site without additional wiring.
 *
 * Two views:
 *   List  — every post with status pill + published date + tags
 *   Edit  — markdown editor with live preview, metadata form, tag chips
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";

const supabase = createClient(
  "https://tgambsdjfwgoohkqopns.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYW1ic2RqZndnb29oa3FvcG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzNDYzMDUsImV4cCI6MjA3NDkyMjMwNX0.xRGHgSXJsMkxO5KV-Uh7TvLPGd8MnbYrBdKi-QNUMh4",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

type Post = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string | null;
  status: "draft" | "published" | "archived";
  hero_image_url: string | null;
  tags: string[];
  author_email: string | null;
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
};

const EMPTY: Post = {
  slug: "",
  title: "",
  excerpt: "",
  body_md: "# Your headline\n\nStart writing.",
  status: "draft",
  hero_image_url: "",
  tags: [],
  author_email: null,
  published_at: null,
};

export default function BlogPane() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("admin-ops?action=list_blog");
    if (error || (data as any)?.error) {
      setError(error?.message || (data as any)?.error);
    } else {
      setPosts(((data as any)?.posts as Post[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function savePost(post: Post) {
    const { data, error } = await supabase.functions.invoke("admin-ops?action=save_blog", {
      body: post,
    });
    if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error);
    return (data as any).post as Post;
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post? This can't be undone.")) return;
    const { error } = await supabase.functions.invoke("admin-ops?action=delete_blog", {
      body: { id },
    });
    if (!error) load();
  }

  if (editing) {
    return (
      <BlogEditor
        post={editing}
        onCancel={() => setEditing(null)}
        onSave={async (p) => {
          try {
            await savePost(p);
            setEditing(null);
            load();
          } catch (e: any) {
            alert(e.message || "Save failed");
          }
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">
            Blog posts ({posts.length})
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Source of truth: <code className="text-green-400">public.blog_posts</code>.
            Published posts auto-surface on the cruise site at{" "}
            <code className="text-green-400">/blog/&lt;slug&gt;</code>.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          + New post
        </button>
      </div>

      {loading && <div className="text-sm text-zinc-500 py-6 text-center">Loading…</div>}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
          {error}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg py-12 text-center">
          <p className="text-sm text-zinc-400 mb-3">No posts yet.</p>
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Write your first post
          </button>
        </div>
      )}

      {posts.length > 0 && (
        <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0a0a] border-b border-[#262626]">
              <tr className="text-left text-xs uppercase tracking-widest text-zinc-500">
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Tags</th>
                <th className="px-3 py-2">Published</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-[#262626] hover:bg-[#1a1a1a]">
                  <td className="px-3 py-2.5">
                    <div className="text-white font-medium">{p.title}</div>
                    <div className="text-xs text-zinc-500">/blog/{p.slug}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-400">
                    {p.tags?.length ? p.tags.join(", ") : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-zinc-400">
                    {p.published_at
                      ? new Date(p.published_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => setEditing(p)}
                      className="text-xs px-2 py-1 rounded bg-[#0a0a0a] border border-[#262626] hover:border-zinc-500 text-zinc-300 mr-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => p.id && deletePost(p.id)}
                      className="text-xs px-2 py-1 rounded bg-red-500/10 border border-red-500/30 hover:border-red-500 text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: Post["status"] }) {
  const c: Record<Post["status"], string> = {
    draft: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
    published: "bg-green-500/15 text-green-300 border-green-500/30",
    archived: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-widest border ${c[status]}`}>
      {status}
    </span>
  );
}

function BlogEditor({
  post,
  onSave,
  onCancel,
}: {
  post: Post;
  onSave: (p: Post) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Post>(post);
  const [submitting, setSubmitting] = useState(false);

  const tagInput = useMemo(() => (form.tags || []).join(", "), [form.tags]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSave(form);
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-white">
          {post.id ? "Edit post" : "New post"}
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs px-3 py-1.5 rounded bg-[#141414] border border-[#262626] text-zinc-300 hover:border-zinc-500"
          >
            Cancel
          </button>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Post["status"] })}
            className="text-xs bg-[#141414] border border-[#262626] rounded px-2 py-1.5 text-white"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button
            disabled={submitting}
            className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        {/* Left: form + editor */}
        <div className="space-y-3">
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <Field
            label="Slug (URL path, kebab-case)"
            value={form.slug}
            onChange={(v) => setForm({ ...form, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })}
            required
          />
          <Field label="Hero image URL" value={form.hero_image_url || ""} onChange={(v) => setForm({ ...form, hero_image_url: v })} />
          <Field
            label="Tags (comma-separated)"
            value={tagInput}
            onChange={(v) => setForm({ ...form, tags: v.split(",").map((t) => t.trim()).filter(Boolean) })}
          />
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Excerpt (SEO + preview)</label>
            <textarea
              rows={2}
              value={form.excerpt || ""}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Body (Markdown)</label>
            <textarea
              rows={24}
              value={form.body_md || ""}
              onChange={(e) => setForm({ ...form, body_md: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white font-mono"
            />
          </div>
        </div>

        {/* Right: live preview */}
        <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg p-5 overflow-y-auto max-h-[80vh]">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Live preview</p>
          {form.hero_image_url && (
            <img
              src={form.hero_image_url}
              alt=""
              className="w-full h-40 object-cover rounded mb-4 border border-[#262626]"
            />
          )}
          <h1 className="text-2xl font-bold text-white mb-1">{form.title || "Untitled"}</h1>
          {form.excerpt && <p className="text-sm text-zinc-400 mb-4 italic">{form.excerpt}</p>}
          <article className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{form.body_md || ""}</ReactMarkdown>
          </article>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
      />
    </div>
  );
}
