"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FixSession, Fix, AuditIssue } from "@/lib/types";

export function FixSessionClient({
  session,
  fixes,
  linkedIssues,
  profileId,
  siteId,
}: {
  session: FixSession;
  fixes: Fix[];
  linkedIssues: AuditIssue[];
  profileId: string;
  siteId: string;
}) {
  void profileId;
  void siteId;
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function publish() {
    setLoading("publish");
    setNotice("Publishing: creating PR, merging to main, triggering production deploy...");
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fix_session_id: session.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      setNotice(`✅ Published! PR #${data.pr_number} merged. ${data.pr_url}`);
      setTimeout(() => router.refresh(), 2000);
    } catch (e) {
      setNotice(`❌ Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(null);
    }
  }

  const statusColor: Record<string, string> = {
    draft: "bg-zinc-800 text-zinc-300",
    previewing: "bg-blue-900/60 text-blue-300",
    published: "bg-green-900/60 text-green-300",
    abandoned: "bg-red-900/60 text-red-300",
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{session.name}</h1>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${statusColor[session.status] || ""}`}
            >
              {session.status}
            </span>
          </div>
          <p className="text-sm text-zinc-500 font-mono">
            Branch: {session.branch_name}
          </p>
          {session.description && (
            <p className="text-sm text-zinc-400 mt-2">{session.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {session.status !== "published" && fixes.length > 0 && (
            <button
              onClick={publish}
              disabled={loading !== null}
              className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {loading === "publish" ? "Publishing..." : "Publish to Production"}
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="mb-4 bg-blue-900/20 border border-blue-800/50 rounded-lg px-4 py-3 text-sm text-blue-200">
          {notice}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <h2 className="font-semibold mb-3">
            Linked Issues ({linkedIssues.length})
          </h2>
          <div className="space-y-2">
            {linkedIssues.map((issue) => (
              <div
                key={issue.id}
                className="bg-[#0a0a0a] border border-[#262626] rounded p-3 text-sm"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium uppercase ${
                      issue.severity === "critical"
                        ? "bg-red-900/60 text-red-300"
                        : issue.severity === "high"
                          ? "bg-amber-900/60 text-amber-300"
                          : "bg-blue-900/60 text-blue-300"
                    }`}
                  >
                    {issue.severity}
                  </span>
                  <div>
                    <div className="font-medium">{issue.title}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{issue.category}</div>
                  </div>
                </div>
              </div>
            ))}
            {linkedIssues.length === 0 && (
              <div className="text-sm text-zinc-500">No issues linked to this session.</div>
            )}
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-lg p-4">
          <h2 className="font-semibold mb-3">Applied Fixes ({fixes.length})</h2>
          {fixes.length === 0 ? (
            <div className="text-sm text-zinc-500">
              No fixes applied yet. Fix generation coming next — for now, fixes can be applied via
              the /api/fix-session/apply route.
            </div>
          ) : (
            <div className="space-y-2">
              {fixes.map((fix) => (
                <div
                  key={fix.id}
                  className="bg-[#0a0a0a] border border-[#262626] rounded p-3 text-sm"
                >
                  <div className="font-mono text-xs text-blue-300">{fix.file_path}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {fix.change_type}
                    {fix.github_commit_sha && ` · ${fix.github_commit_sha.slice(0, 7)}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
