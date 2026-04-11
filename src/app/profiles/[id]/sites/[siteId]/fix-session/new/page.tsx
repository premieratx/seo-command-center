"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { AuditIssue } from "@/lib/types";

export default function NewFixSessionPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id: profileId, siteId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("Fix critical SEO issues");
  const [description, setDescription] = useState("");
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadIssues() {
      const { data } = await supabase
        .from("audit_issues")
        .select("*")
        .eq("site_id", siteId)
        .eq("status", "open")
        .order("severity", { ascending: true });
      setIssues((data as AuditIssue[]) || []);
      // Pre-select critical issues
      const crit = ((data as AuditIssue[]) || [])
        .filter((i) => i.severity === "critical")
        .map((i) => i.id);
      setSelectedIssueIds(new Set(crit));
    }
    loadIssues();
  }, [siteId, supabase]);

  function toggleIssue(id: string) {
    const next = new Set(selectedIssueIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIssueIds(next);
  }

  async function handleCreate() {
    if (selectedIssueIds.size === 0) {
      setError("Select at least one issue to fix");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/fix-session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          name,
          description,
          issue_ids: Array.from(selectedIssueIds),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");
      router.push(`/profiles/${profileId}/sites/${siteId}/fix-session/${data.session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedIssues = [...issues].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href={`/profiles/${profileId}/sites/${siteId}`}
        className="text-sm text-zinc-500 hover:text-zinc-300 mb-4 inline-block"
      >
        ← Back to site
      </Link>
      <h1 className="text-2xl font-bold mb-2">New Fix Session</h1>
      <p className="text-zinc-500 text-sm mb-6">
        Select the issues you want to fix. A working branch will be created in your connected
        GitHub repo, then you&apos;ll be able to generate and preview fixes before publishing.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Select Issues to Fix ({selectedIssueIds.size})</h2>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() =>
                    setSelectedIssueIds(new Set(issues.map((i) => i.id)))
                  }
                  className="text-blue-400 hover:text-blue-300"
                >
                  Select all
                </button>
                <button
                  onClick={() => setSelectedIssueIds(new Set())}
                  className="text-zinc-500 hover:text-zinc-300"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {sortedIssues.map((issue) => {
                const selected = selectedIssueIds.has(issue.id);
                return (
                  <label
                    key={issue.id}
                    className={`flex items-start gap-3 p-3 rounded cursor-pointer transition-colors ${
                      selected
                        ? "bg-blue-900/20 border border-blue-800/50"
                        : "bg-[#0a0a0a] border border-[#262626] hover:border-[#404040]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleIssue(issue.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                            issue.severity === "critical"
                              ? "bg-red-900/60 text-red-300"
                              : issue.severity === "high"
                                ? "bg-amber-900/60 text-amber-300"
                                : issue.severity === "medium"
                                  ? "bg-blue-900/60 text-blue-300"
                                  : "bg-green-900/60 text-green-300"
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-sm font-medium">{issue.title}</span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">{issue.category}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-4 space-y-4">
            <h2 className="font-semibold">Session Details</h2>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
                Session Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wide">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Add context for the commit message..."
              />
            </div>
            {error && (
              <div className="text-xs text-red-400 bg-red-900/20 border border-red-900/50 rounded p-2">
                {error}
              </div>
            )}
            <button
              onClick={handleCreate}
              disabled={loading || selectedIssueIds.size === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white py-3 rounded-lg text-sm font-medium transition-colors"
            >
              {loading ? "Creating branch..." : `Create Session & Branch (${selectedIssueIds.size} issues)`}
            </button>
            <p className="text-xs text-zinc-500">
              This creates a new branch in your connected GitHub repo. Your production site is
              unaffected until you click Publish later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
