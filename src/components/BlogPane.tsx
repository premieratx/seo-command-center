"use client";

/**
 * BlogPane — Command Center blog editor with inline SEO analyzer.
 *
 * In-house CMS (NOT a Replit port). Posts live in public.blog_posts
 * (id, slug, title, excerpt, body_md, status, hero_image_url, tags,
 * author_email, published_at, created_at, updated_at). The cruise site's
 * blog renderer already consumes that shape at /blog/<slug> so any post
 * flipped to status = 'published' lights up on the live site without
 * additional wiring.
 *
 * Two views:
 *   List  — every post + status + live SEO score
 *   Edit  — markdown editor w/ live preview AND right-side SEO analyzer
 *           that uses the same keyword + audit knowledge base as the SEO tab
 *
 * The SEO analyzer computes in real time as the author types:
 *   • Word count w/ green (≥1500) / amber (500-1499) / red (<500) target
 *   • Tracked keyword matches — which keywords from the site's SEMrush
 *     keyword set actually appear in the body (counts natural, not stuffed)
 *   • Keyword opportunity list — high-volume/low-position keywords the post
 *     doesn't mention yet, prioritized by impact
 *   • SEO checklist — title length, meta (excerpt) length, slug quality,
 *     hero image present, H1 present in body, internal link count, etc.
 *   • Historical audit snapshot — if the slug has been crawled before,
 *     show the last recorded score + word_count + top issues
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ReactMarkdown from "react-markdown";
import type { Keyword, AuditPage } from "@/lib/types";

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

// ── SEO math (shared by list view + editor sidebar) ─────────────────────

type PostSEO = {
  wordCount: number;
  score: number; // 0..100
  band: "red" | "amber" | "green";
  matches: Array<{ keyword: string; count: number; volume: number; position: number | null }>;
  opportunities: Array<{ keyword: string; volume: number; position: number | null }>;
  checklist: Array<{ label: string; ok: boolean; hint?: string }>;
  h1: string | null;
  internalLinks: number;
  historical: { word_count: number; score: number | null } | null;
};

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → anchor text
    .replace(/[>#*_~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computePostSEO(post: Post, keywords: Keyword[], auditPages: AuditPage[]): PostSEO {
  const body = post.body_md || "";
  const text = stripMarkdown(body).toLowerCase();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Count H1 and links in the raw markdown (not the stripped version).
  const h1Match = body.match(/^\s*#\s+(.+)$/m);
  const h1 = h1Match ? h1Match[1].trim() : null;
  const internalLinks =
    (body.match(/\[[^\]]+\]\(\/[^)]+\)/g) || []).length +
    (body.match(/\[[^\]]+\]\(https?:\/\/(?:www\.)?premierpartycruises\.com[^)]*\)/gi) || []).length;

  // Keyword presence: a tracked keyword "counts" if its whole-phrase
  // (escaped) appears in title + body as natural prose. Case-insensitive.
  const haystack = `${post.title} ${post.excerpt || ""} ${text}`.toLowerCase();
  const matches: PostSEO["matches"] = [];
  const opportunities: PostSEO["opportunities"] = [];

  for (const k of keywords) {
    const kw = (k.keyword || "").toLowerCase().trim();
    if (!kw) continue;
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    const count = (haystack.match(re) || []).length;
    if (count > 0) {
      matches.push({
        keyword: k.keyword,
        count,
        volume: k.search_volume || 0,
        position: k.position ?? null,
      });
    } else {
      opportunities.push({
        keyword: k.keyword,
        volume: k.search_volume || 0,
        position: k.position ?? null,
      });
    }
  }

  matches.sort((a, b) => (b.volume || 0) - (a.volume || 0));
  opportunities.sort((a, b) => {
    // Highest volume first, but prioritize "already ranking but not on page" (position 4-30)
    const prioA = a.position && a.position >= 4 && a.position <= 30 ? 1 : 0;
    const prioB = b.position && b.position >= 4 && b.position <= 30 ? 1 : 0;
    if (prioA !== prioB) return prioB - prioA;
    return (b.volume || 0) - (a.volume || 0);
  });

  // Historical audit row for this slug, if one exists.
  const slugPath = post.slug ? `/blog/${post.slug}` : null;
  const historical = slugPath
    ? auditPages.find((p) => p.url?.endsWith(slugPath)) || null
    : null;

  // Checklist — each item either contributes to or dings the overall score.
  const checklist: PostSEO["checklist"] = [
    {
      label: "Title length (30–70 chars)",
      ok: post.title.length >= 30 && post.title.length <= 70,
      hint: `${post.title.length} chars`,
    },
    {
      label: "Excerpt / meta description (120–160 chars)",
      ok: (post.excerpt || "").length >= 120 && (post.excerpt || "").length <= 160,
      hint: `${(post.excerpt || "").length} chars`,
    },
    {
      label: "Slug is kebab-case",
      ok: !!post.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug),
    },
    {
      label: "Hero image set",
      ok: !!post.hero_image_url,
    },
    {
      label: "H1 present in body",
      ok: !!h1,
      hint: h1 ? `“${h1.slice(0, 40)}${h1.length > 40 ? "…" : ""}”` : "Start body with `# Headline`",
    },
    {
      label: "Word count ≥ 1000",
      ok: wordCount >= 1000,
      hint: `${wordCount.toLocaleString()} words`,
    },
    {
      label: "≥ 3 internal links",
      ok: internalLinks >= 3,
      hint: `${internalLinks} linked`,
    },
    {
      label: "Has ≥ 1 tag",
      ok: post.tags.length >= 1,
    },
    {
      label: "Targets ≥ 1 tracked keyword",
      ok: matches.length >= 1,
      hint: matches.length ? `${matches.length} tracked kw hit` : "Add a tracked keyword to the copy",
    },
  ];

  const passed = checklist.filter((c) => c.ok).length;
  const base = Math.round((passed / checklist.length) * 100);
  // Length multiplier — reward long-form
  const lengthBonus = wordCount >= 1500 ? 0 : wordCount >= 1000 ? -5 : wordCount >= 500 ? -15 : -25;
  const keywordBonus = Math.min(matches.length, 5) * 3;
  const score = Math.max(0, Math.min(100, base + lengthBonus + keywordBonus));
  const band: PostSEO["band"] = score >= 75 ? "green" : score >= 50 ? "amber" : "red";

  return {
    wordCount,
    score,
    band,
    matches,
    opportunities: opportunities.slice(0, 12),
    checklist,
    h1,
    internalLinks,
    historical: historical
      ? { word_count: historical.word_count || 0, score: historical.score ?? null }
      : null,
  };
}

// ── Props ───────────────────────────────────────────────────────────────

type BlogPaneProps = {
  keywords?: Keyword[];
  auditPages?: AuditPage[];
  siteUrl?: string | null;
};

export default function BlogPane({ keywords = [], auditPages = [], siteUrl }: BlogPaneProps) {
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

  useEffect(() => {
    load();
  }, [load]);

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
        keywords={keywords}
        auditPages={auditPages}
        siteUrl={siteUrl ?? null}
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
          <h3 className="text-base font-semibold text-white">Blog posts ({posts.length})</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Source of truth: <code className="text-green-400">public.blog_posts</code>. Published
            posts auto-surface at <code className="text-green-400">/blog/&lt;slug&gt;</code>. SEO
            score is computed live from your {keywords.length.toLocaleString()} tracked keywords.
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
                <th className="px-3 py-2">SEO</th>
                <th className="px-3 py-2">Words</th>
                <th className="px-3 py-2">Tags</th>
                <th className="px-3 py-2">Published</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const seo = computePostSEO(p, keywords, auditPages);
                return (
                  <tr key={p.id} className="border-b border-[#262626] hover:bg-[#1a1a1a]">
                    <td className="px-3 py-2.5">
                      <div className="text-white font-medium">{p.title}</div>
                      <div className="text-xs text-zinc-500">/blog/{p.slug}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ScorePill score={seo.score} band={seo.band} />
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <span
                        className={
                          seo.wordCount >= 1500
                            ? "text-green-400"
                            : seo.wordCount >= 500
                              ? "text-amber-400"
                              : "text-red-400"
                        }
                      >
                        {seo.wordCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-400">
                      {p.tags?.length ? p.tags.join(", ") : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-zinc-400">
                      {p.published_at ? new Date(p.published_at).toLocaleDateString() : "—"}
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
                );
              })}
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

function ScorePill({ score, band }: { score: number; band: "red" | "amber" | "green" }) {
  const c = {
    red: "bg-red-500/15 text-red-300 border-red-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    green: "bg-green-500/15 text-green-300 border-green-500/30",
  }[band];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold ${c}`}>
      {score}/100
    </span>
  );
}

// ── Editor ──────────────────────────────────────────────────────────────

function BlogEditor({
  post,
  keywords,
  auditPages,
  siteUrl,
  onSave,
  onCancel,
}: {
  post: Post;
  keywords: Keyword[];
  auditPages: AuditPage[];
  siteUrl: string | null;
  onSave: (p: Post) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Post>(post);
  const [submitting, setSubmitting] = useState(false);
  const [rightPanel, setRightPanel] = useState<"preview" | "seo">("seo");

  const tagInput = useMemo(() => (form.tags || []).join(", "), [form.tags]);
  const seo = useMemo(() => computePostSEO(form, keywords, auditPages), [form, keywords, auditPages]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSave(form);
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-base font-semibold text-white">{post.id ? "Edit post" : "New post"}</h3>
        <div className="flex gap-2 items-center">
          <ScorePill score={seo.score} band={seo.band} />
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
          <Field
            label="Title"
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            required
          />
          <Field
            label="Slug (URL path, kebab-case)"
            value={form.slug}
            onChange={(v) =>
              setForm({
                ...form,
                slug: v
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-")
                  .replace(/-+/g, "-"),
              })
            }
            required
          />
          <Field
            label="Hero image URL"
            value={form.hero_image_url || ""}
            onChange={(v) => setForm({ ...form, hero_image_url: v })}
          />
          <Field
            label="Tags (comma-separated)"
            value={tagInput}
            onChange={(v) =>
              setForm({
                ...form,
                tags: v
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
              Excerpt (SEO + preview)
            </label>
            <textarea
              rows={2}
              value={form.excerpt || ""}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
              Body (Markdown)
            </label>
            <textarea
              rows={24}
              value={form.body_md || ""}
              onChange={(e) => setForm({ ...form, body_md: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white font-mono"
            />
          </div>
        </div>

        {/* Right: toggle between Live Preview and SEO Analyzer */}
        <div className="bg-[#0f0f0f] border border-[#262626] rounded-lg overflow-hidden sticky top-4 self-start max-h-[calc(100vh-2rem)] flex flex-col">
          <div className="flex border-b border-[#262626]">
            <button
              type="button"
              onClick={() => setRightPanel("seo")}
              className={`flex-1 px-4 py-2 text-xs uppercase tracking-widest ${
                rightPanel === "seo"
                  ? "bg-[#141414] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              SEO Analyzer
            </button>
            <button
              type="button"
              onClick={() => setRightPanel("preview")}
              className={`flex-1 px-4 py-2 text-xs uppercase tracking-widest ${
                rightPanel === "preview"
                  ? "bg-[#141414] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Live Preview
            </button>
          </div>

          <div className="p-5 overflow-y-auto">
            {rightPanel === "preview" ? (
              <>
                {form.hero_image_url && (
                  <img
                    src={form.hero_image_url}
                    alt=""
                    className="w-full h-40 object-cover rounded mb-4 border border-[#262626]"
                  />
                )}
                <h1 className="text-2xl font-bold text-white mb-1">
                  {form.title || "Untitled"}
                </h1>
                {form.excerpt && (
                  <p className="text-sm text-zinc-400 mb-4 italic">{form.excerpt}</p>
                )}
                <article className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{form.body_md || ""}</ReactMarkdown>
                </article>
              </>
            ) : (
              <SEOPanel seo={seo} siteUrl={siteUrl} slug={form.slug} />
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

// ── SEO Panel (inside editor right-side) ────────────────────────────────

function SEOPanel({
  seo,
  siteUrl,
  slug,
}: {
  seo: PostSEO;
  siteUrl: string | null;
  slug: string;
}) {
  return (
    <div className="space-y-5 text-sm">
      {/* Live overall score */}
      <section>
        <div className="flex items-baseline gap-3">
          <div
            className={`text-4xl font-mono font-bold ${
              seo.band === "green"
                ? "text-green-400"
                : seo.band === "amber"
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          >
            {seo.score}
          </div>
          <div className="text-zinc-500 text-xs">/100 live SEO score</div>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Updates as you type. Uses the same tracked-keyword + audit knowledge base as the SEO tab.
        </p>
      </section>

      {/* Word count tracker */}
      <section>
        <div className="flex items-baseline justify-between mb-1">
          <h4 className="text-[10px] uppercase tracking-widest text-zinc-500">Word count</h4>
          <span
            className={`text-xs font-mono font-semibold ${
              seo.wordCount >= 1500
                ? "text-green-400"
                : seo.wordCount >= 500
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          >
            {seo.wordCount.toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 bg-[#1a1a1a] rounded overflow-hidden">
          <div
            className={`h-full ${
              seo.wordCount >= 1500
                ? "bg-green-500"
                : seo.wordCount >= 500
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, (seo.wordCount / 2000) * 100)}%` }}
          />
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          Target: ≥1,500 words for long-form ranking. {seo.internalLinks} internal link{seo.internalLinks === 1 ? "" : "s"} detected.
        </p>
      </section>

      {/* SEO checklist */}
      <section>
        <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          SEO checklist ({seo.checklist.filter((c) => c.ok).length}/{seo.checklist.length})
        </h4>
        <ul className="space-y-1.5">
          {seo.checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span
                className={`mt-0.5 inline-block w-3.5 h-3.5 rounded-full text-center leading-[0.9rem] text-[10px] ${
                  item.ok ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                }`}
              >
                {item.ok ? "✓" : "×"}
              </span>
              <span className={item.ok ? "text-zinc-300" : "text-zinc-400"}>
                {item.label}
                {item.hint && (
                  <span className="text-zinc-500 ml-1.5 italic">— {item.hint}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Tracked keywords already present */}
      {seo.matches.length > 0 && (
        <section>
          <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
            Tracked keywords in this post ({seo.matches.length})
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {seo.matches.slice(0, 15).map((m) => (
              <div
                key={m.keyword}
                className="flex items-center justify-between text-xs py-1 border-b border-[#1a1a1a]"
              >
                <span className="text-zinc-300 truncate mr-2">{m.keyword}</span>
                <span className="text-zinc-500 text-[10px] whitespace-nowrap">
                  ×{m.count} · {m.volume.toLocaleString()}/mo
                  {m.position ? ` · #${m.position}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Keyword opportunities */}
      {seo.opportunities.length > 0 && (
        <section>
          <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
            Top keyword opportunities
          </h4>
          <p className="text-[11px] text-zinc-500 mb-2">
            High-volume keywords from your SEMrush set that this post doesn&apos;t mention yet.
            Ones you already rank 4–30 for are surfaced first.
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {seo.opportunities.map((o) => (
              <div
                key={o.keyword}
                className="flex items-center justify-between text-xs py-1 border-b border-[#1a1a1a]"
              >
                <span className="text-zinc-300 truncate mr-2">{o.keyword}</span>
                <span className="text-zinc-500 text-[10px] whitespace-nowrap">
                  {o.volume.toLocaleString()}/mo
                  {o.position ? ` · #${o.position}` : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Historical audit snapshot */}
      {seo.historical && (
        <section className="bg-[#0a0a0a] border border-[#262626] rounded p-3">
          <h4 className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
            Last live audit ({slug ? `/blog/${slug}` : "this slug"})
          </h4>
          <div className="flex gap-4 text-xs text-zinc-300">
            {seo.historical.score !== null && (
              <div>
                Score: <span className="font-mono font-semibold">{seo.historical.score}</span>
              </div>
            )}
            <div>
              Crawled words:{" "}
              <span className="font-mono font-semibold">
                {seo.historical.word_count.toLocaleString()}
              </span>
            </div>
          </div>
          {siteUrl && slug && (
            <a
              href={`${siteUrl.replace(/\/$/, "")}/blog/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-blue-400 hover:underline mt-2 inline-block"
            >
              Open live post ↗
            </a>
          )}
        </section>
      )}
    </div>
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
      <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-[#0a0a0a] border border-[#262626] rounded px-3 py-2 text-sm text-white"
      />
    </div>
  );
}
