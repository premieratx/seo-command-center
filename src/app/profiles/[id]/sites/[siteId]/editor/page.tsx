"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
      Loading editor...
    </div>
  ),
});

interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
}

interface SiteData {
  id: string;
  profile_id: string;
  name: string;
  domain: string;
  production_url: string;
  github_repo_owner: string | null;
  github_repo_name: string | null;
  github_default_branch: string | null;
  github_token_encrypted: string | null;
  current_working_branch: string | null;
}

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    scss: "scss",
    html: "html",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    py: "python",
    sh: "shell",
    env: "plaintext",
    txt: "plaintext",
    xml: "xml",
    svg: "xml",
  };
  return map[ext || ""] || "plaintext";
}

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id: profileId, siteId } = use(params);
  const supabase = createClient();

  const [site, setSite] = useState<SiteData | null>(null);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [openFile, setOpenFile] = useState<{
    path: string;
    content: string;
    sha: string;
    original: string;
  } | null>(null);
  const [modified, setModified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);

  // Load site data
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("sites")
        .select("*")
        .eq("id", siteId)
        .single();
      if (data) {
        setSite(data as SiteData);
        setBranch(data.current_working_branch || data.github_default_branch || "main");
      }
    }
    load();
  }, [siteId, supabase]);

  // Load files for current path
  const loadFiles = useCallback(
    async (path: string) => {
      if (!site) return;
      const res = await fetch(
        `/api/github/files?site_id=${siteId}&path=${encodeURIComponent(path)}&mode=list`,
      );
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setCurrentPath(path);
        const parts = path ? path.split("/") : [];
        setBreadcrumbs(parts);
      }
    },
    [site, siteId],
  );

  useEffect(() => {
    if (site) loadFiles("");
  }, [site, loadFiles]);

  // Open a file
  async function openFileHandler(path: string) {
    const res = await fetch(
      `/api/github/files?site_id=${siteId}&path=${encodeURIComponent(path)}&mode=content`,
    );
    if (res.ok) {
      const data = await res.json();
      setOpenFile({
        path,
        content: data.content,
        sha: data.sha,
        original: data.content,
      });
      setModified(false);
      setShowDiff(false);
    }
  }

  // Navigate into directory
  function navigateDir(path: string) {
    setOpenFile(null);
    loadFiles(path);
  }

  // Navigate via breadcrumb
  function navigateBreadcrumb(index: number) {
    const path = breadcrumbs.slice(0, index + 1).join("/");
    navigateDir(path);
  }

  // Create a working branch if none exists
  async function createWorkingBranch() {
    if (!site) return;
    setCreating(true);
    try {
      const res = await fetch("/api/fix-session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          name: `Code edits ${new Date().toLocaleDateString()}`,
          description: "Changes made via SEO Command Center code editor",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBranch(data.session.branch_name);
        setNotice(
          `Working branch created: ${data.session.branch_name}. Your changes will be saved here — production is untouched.`,
        );
      } else {
        setNotice(`Error: ${data.error}`);
      }
    } catch (e) {
      setNotice(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCreating(false);
    }
  }

  // Save file to GitHub
  async function saveFile() {
    if (!openFile || !site) return;
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/fix-session/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fix_session_id: null, // Direct commit mode
          fixes: [
            {
              file_path: openFile.path,
              before_content: openFile.original,
              after_content: openFile.content,
              change_type: "other",
              commit_message: `Edit ${openFile.path} via SEO Command Center`,
            },
          ],
        }),
      });
      const data = await res.json();
      if (res.ok && data.results?.[0]?.ok) {
        setModified(false);
        setOpenFile({ ...openFile, original: openFile.content, sha: data.results[0].commit_sha });
        setNotice(
          `Saved to branch ${branch}. Commit: ${data.results[0].commit_sha?.slice(0, 7)}`,
        );
      } else {
        setNotice(
          `Save failed: ${data.results?.[0]?.error || data.error || "Unknown error"}`,
        );
      }
    } catch (e) {
      setNotice(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  // Publish changes
  async function publish() {
    setPublishStatus("Creating PR and merging...");
    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fix_session_id: null }),
      });
      const data = await res.json();
      if (res.ok) {
        setPublishStatus(`Published! PR #${data.pr_number} merged. ${data.pr_url}`);
      } else {
        setPublishStatus(`Error: ${data.error}`);
      }
    } catch (e) {
      setPublishStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (!site) {
    return (
      <div className="flex items-center justify-center h-screen text-zinc-500">
        Loading...
      </div>
    );
  }

  if (!site.github_repo_owner || !site.github_repo_name) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Code Editor</h1>
        <p className="text-zinc-400 mb-6">
          Connect a GitHub repository to this site to enable code editing.
        </p>
        <Link
          href={`/profiles/${profileId}/sites/${siteId}`}
          className="text-blue-400 hover:text-blue-300"
        >
          ← Back to site settings
        </Link>
      </div>
    );
  }

  if (!site.github_token_encrypted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">GitHub Token Required</h1>
        <p className="text-zinc-400 mb-4">
          To edit code, you need to add a GitHub Personal Access Token with{" "}
          <code className="bg-zinc-800 px-1 rounded text-xs">repo</code> scope.
        </p>
        <a
          href={`https://github.com/settings/tokens/new?scopes=repo&description=SEO%20Command%20Center%20-%20${site.name}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium mb-4"
        >
          Generate Token on GitHub →
        </a>
        <p className="text-zinc-500 text-sm">
          Then go to{" "}
          <Link
            href={`/profiles/${profileId}/sites/${siteId}`}
            className="text-blue-400"
          >
            site settings
          </Link>{" "}
          and add the token.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Top bar */}
      <div className="border-b border-[#262626] bg-[#141414] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/profiles/${profileId}/sites/${siteId}`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← Dashboard
          </Link>
          <span className="text-zinc-600">|</span>
          <span className="text-sm font-semibold">{site.name}</span>
          <span className="text-xs font-mono text-zinc-500">
            {site.github_repo_owner}/{site.github_repo_name}
          </span>
          <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded font-mono">
            {branch}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!site.current_working_branch && (
            <button
              onClick={createWorkingBranch}
              disabled={creating}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              {creating ? "Creating..." : "Create Working Branch"}
            </button>
          )}
          {openFile && modified && (
            <button
              onClick={saveFile}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              {saving ? "Saving..." : "Save to Branch"}
            </button>
          )}
          {openFile && modified && (
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded text-xs font-medium"
            >
              {showDiff ? "Editor" : "View Diff"}
            </button>
          )}
          {site.current_working_branch && (
            <button
              onClick={publish}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium"
            >
              Publish to Production
            </button>
          )}
        </div>
      </div>

      {/* Notices */}
      {notice && (
        <div className="bg-blue-900/20 border-b border-blue-800/50 px-4 py-2 text-xs text-blue-200">
          {notice}
        </div>
      )}
      {publishStatus && (
        <div className="bg-green-900/20 border-b border-green-800/50 px-4 py-2 text-xs text-green-200">
          {publishStatus}
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* File browser sidebar */}
        <div className="w-64 border-r border-[#262626] bg-[#0e0e0e] flex flex-col shrink-0">
          {/* Breadcrumbs */}
          <div className="px-3 py-2 border-b border-[#262626] text-xs flex items-center gap-1 flex-wrap">
            <button
              onClick={() => navigateDir("")}
              className="text-blue-400 hover:text-blue-300"
            >
              root
            </button>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-zinc-600">/</span>
                <button
                  onClick={() => navigateBreadcrumb(i)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {crumb}
                </button>
              </span>
            ))}
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto">
            {currentPath && (
              <button
                onClick={() => {
                  const parent = currentPath.split("/").slice(0, -1).join("/");
                  navigateDir(parent);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-zinc-500 hover:bg-[#1a1a1a] flex items-center gap-2"
              >
                <span>📁</span> ..
              </button>
            )}
            {files
              .sort((a, b) => {
                if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .map((file) => (
                <button
                  key={file.path}
                  onClick={() =>
                    file.type === "dir"
                      ? navigateDir(file.path)
                      : openFileHandler(file.path)
                  }
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#1a1a1a] flex items-center gap-2 ${
                    openFile?.path === file.path
                      ? "bg-blue-900/20 text-blue-300"
                      : "text-zinc-300"
                  }`}
                >
                  <span>{file.type === "dir" ? "📁" : "📄"}</span>
                  <span className="truncate">{file.name}</span>
                  {file.size !== undefined && file.type === "file" && (
                    <span className="text-zinc-600 ml-auto text-[10px]">
                      {file.size > 1024
                        ? `${(file.size / 1024).toFixed(1)}K`
                        : `${file.size}B`}
                    </span>
                  )}
                </button>
              ))}
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 flex flex-col min-w-0">
          {openFile ? (
            <>
              {/* File tab */}
              <div className="border-b border-[#262626] bg-[#141414] px-4 py-1.5 flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-400">
                  {openFile.path}
                </span>
                {modified && (
                  <span className="text-xs text-amber-400 font-medium">
                    (modified)
                  </span>
                )}
              </div>

              {/* Monaco editor */}
              <div className="flex-1">
                {showDiff ? (
                  <MonacoEditor
                    height="100%"
                    language={getLanguage(openFile.path)}
                    value={openFile.content}
                    theme="vs-dark"
                    options={{
                      readOnly: true,
                      fontSize: 13,
                      minimap: { enabled: false },
                      lineNumbers: "on",
                      wordWrap: "on",
                    }}
                  />
                ) : (
                  <MonacoEditor
                    height="100%"
                    language={getLanguage(openFile.path)}
                    value={openFile.content}
                    theme="vs-dark"
                    onChange={(value) => {
                      if (openFile && value !== undefined) {
                        setOpenFile({ ...openFile, content: value });
                        setModified(value !== openFile.original);
                      }
                    }}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: true },
                      lineNumbers: "on",
                      wordWrap: "on",
                      tabSize: 2,
                      formatOnPaste: true,
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              <div className="text-center">
                <div className="text-4xl mb-4">📝</div>
                <div className="font-medium mb-1">Select a file to edit</div>
                <div className="text-xs text-zinc-600">
                  Browse files in the sidebar. Changes are saved to a working branch — production is never touched until you click Publish.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview pane (right side) */}
        <div className="w-[400px] border-l border-[#262626] bg-[#0e0e0e] flex flex-col shrink-0">
          <div className="border-b border-[#262626] px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Live Preview</span>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[#ff5f57]"></span>
              <span className="w-2 h-2 rounded-full bg-[#febc2e]"></span>
              <span className="w-2 h-2 rounded-full bg-[#28c840]"></span>
            </div>
          </div>
          <iframe
            src={`/api/proxy?url=${encodeURIComponent(site.production_url)}`}
            className="flex-1 bg-white"
            title="Site preview"
          />
        </div>
      </div>
    </div>
  );
}
