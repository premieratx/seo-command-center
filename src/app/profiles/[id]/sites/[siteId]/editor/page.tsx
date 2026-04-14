"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Terminal } from "@/components/Terminal";

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

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agent?: { id: string; name: string; emoji: string };
}

type ViewMode = "chat" | "code" | "split";

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", css: "css", scss: "scss", html: "html", md: "markdown",
    yml: "yaml", yaml: "yaml", py: "python", sh: "shell", txt: "plaintext",
    xml: "xml", svg: "xml",
  };
  return map[ext || ""] || "plaintext";
}

function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onResize(delta);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onResize]);

  return (
    <div
      ref={handleRef}
      onMouseDown={(e) => {
        isDragging.current = true;
        lastX.current = e.clientX;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        e.preventDefault();
      }}
      className="w-1.5 bg-[#1a1a1a] hover:bg-blue-600/50 cursor-col-resize flex-shrink-0 transition-colors relative group"
      title="Drag to resize"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-zinc-600 group-hover:bg-blue-400 rounded-full transition-colors" />
    </div>
  );
}

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id: profileId, siteId } = use(params);
  const supabase = createClient();

  // Site data
  const [site, setSite] = useState<Record<string, unknown> | null>(null);
  const [branch, setBranch] = useState<string | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [chatWidth, setChatWidth] = useState(480);
  const handleChatResize = useCallback((delta: number) => {
    setChatWidth((w) => Math.max(280, Math.min(w + delta, 900)));
  }, []);
  const [previewWidth, setPreviewWidth] = useState(420);
  const handlePreviewResize = useCallback((delta: number) => {
    setPreviewWidth((w) => Math.max(280, Math.min(w - delta, 900)));
  }, []);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Welcome to the SEO Command Center. I route your requests to specialist agents:

🔍 **SEO Specialist** — keywords, meta tags, rankings, internal linking
🤖 **AI Visibility Specialist** — Share of Voice, LLM mentions, AI content
🎨 **Design Specialist** — layout, UX, Wes McDowell principles, mobile
⚡ **Implementation Agent** — code changes, file edits, deploy

I automatically detect which agent should handle your request. Or you can address one directly.

**Try asking:**
- "What are my top 5 keyword quick wins?" → 🔍 SEO
- "How do I close the gap with Float On?" → 🤖 AI Visibility
- "Redesign the hero section for better conversion" → 🎨 Design
- "Fix the missing meta descriptions in pageContent.ts" → ⚡ Implementation

**Premier Party Cruises context loaded**: 4 boats, 200 keywords, 18 issues, AI SoV data, design guidelines.`,
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [model, setModel] = useState("claude-sonnet-4-20250514");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Code editor
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
  const [notice, setNotice] = useState<string | null>(null);

  // Load site
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("sites").select("*").eq("id", siteId).single();
      if (data) {
        setSite(data as Record<string, unknown>);
        setBranch((data.current_working_branch as string) || (data.github_default_branch as string) || "main");
      }
    }
    load();
  }, [siteId, supabase]);

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load files
  const loadFiles = useCallback(
    async (path: string) => {
      if (!site) return;
      const res = await fetch(`/api/github/files?site_id=${siteId}&path=${encodeURIComponent(path)}&mode=list`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        setCurrentPath(path);
        setBreadcrumbs(path ? path.split("/") : []);
      }
    },
    [site, siteId],
  );

  useEffect(() => {
    if (site && viewMode !== "chat") loadFiles("");
  }, [site, loadFiles, viewMode]);

  // Open file
  async function openFileHandler(path: string) {
    const res = await fetch(`/api/github/files?site_id=${siteId}&path=${encodeURIComponent(path)}&mode=content`);
    if (res.ok) {
      const data = await res.json();
      setOpenFile({ path, content: data.content, sha: data.sha, original: data.content });
      setModified(false);
    }
  }

  // Save file
  async function saveFile() {
    if (!openFile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/fix-session/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fix_session_id: null,
          fixes: [{
            file_path: openFile.path,
            before_content: openFile.original,
            after_content: openFile.content,
            change_type: "other",
            commit_message: `Edit ${openFile.path} via SEO Command Center`,
          }],
        }),
      });
      const data = await res.json();
      if (res.ok && data.results?.[0]?.ok) {
        setModified(false);
        setOpenFile({ ...openFile, original: openFile.content });
        setNotice(`Saved! Commit: ${data.results[0].commit_sha?.slice(0, 7)}`);
      }
    } catch (e) {
      setNotice(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  // Chat send
  async function sendMessage() {
    if (!chatInput.trim() || streaming) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput("");
    setStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.content })),
          model,
          site_id: siteId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.error || "Failed to get response"}` }
              : m,
          ),
        );
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              // First event contains agent info
              if (parsed.agent) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, agent: parsed.agent } : m,
                  ),
                );
              }
              if (parsed.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.text }
                      : m,
                  ),
                );
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Error: ${e instanceof Error ? e.message : String(e)}` }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  if (!site) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a] text-zinc-500">
        Loading...
      </div>
    );
  }

  const hasGitHub = !!(site.github_repo_owner && site.github_repo_name && site.github_token_encrypted);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a]">
      {/* Top bar */}
      <div className="border-b border-[#262626] bg-[#111] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/profiles/${profileId}/sites/${siteId}`}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            ← Dashboard
          </Link>
          <div className="h-4 w-px bg-zinc-700" />
          <span className="text-sm font-semibold">{(site.name as string) || "Site"}</span>
          {branch && (
            <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded font-mono">
              {branch}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex border border-[#333] rounded-md overflow-hidden">
            {[
              { id: "chat" as ViewMode, label: "AI Chat" },
              { id: "split" as ViewMode, label: "Split" },
              { id: "code" as ViewMode, label: "Code" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === v.id
                    ? "bg-blue-600 text-white"
                    : "bg-transparent text-zinc-400 hover:text-white"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Model selector */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-[#1a1a1a] border border-[#333] rounded text-xs text-zinc-300 px-2 py-1 focus:outline-none focus:border-blue-500"
          >
            <option value="claude-sonnet-4-20250514">Sonnet 4</option>
            <option value="claude-opus-4-20250514">Opus 4</option>
            <option value="claude-haiku-3-5-20241022">Haiku 3.5</option>
          </select>

          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-2 py-1 rounded text-xs ${showPreview ? "bg-zinc-700 text-white" : "bg-transparent text-zinc-500"}`}
          >
            Preview
          </button>

          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`px-2 py-1 rounded text-xs ${showTerminal ? "bg-green-900/40 text-green-300" : "bg-transparent text-zinc-500"}`}
          >
            Terminal
          </button>

          {openFile && modified && (
            <button
              onClick={saveFile}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className="bg-blue-900/20 border-b border-blue-800/50 px-4 py-1.5 text-xs text-blue-200 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-zinc-500 hover:text-white">x</button>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Chat or File Browser */}
        {(viewMode === "chat" || viewMode === "split") && (
          <div className="flex flex-col border-r border-[#262626] bg-[#0a0a0a]" style={{ width: viewMode === "split" ? `${chatWidth}px` : undefined, flex: viewMode === "split" ? "none" : 1 }}>
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] rounded-xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-[#141414] border border-[#262626] text-zinc-200"
                    }`}
                  >
                    {msg.agent && (
                      <div className="text-[10px] font-medium mb-1.5 flex items-center gap-1.5">
                        <span>{msg.agent.emoji}</span>
                        <span className="text-zinc-500">{msg.agent.name}</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    {msg.role === "assistant" && streaming && msg === messages[messages.length - 1] && (
                      <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-0.5" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="border-t border-[#262626] p-3">
              {/* File upload drop zone hint */}
              <div
                className="mb-2"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-blue-500"); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove("border-blue-500"); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-blue-500");
                  const file = e.dataTransfer.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      const content = reader.result as string;
                      if (file.type.startsWith("image/")) {
                        setChatInput((prev) => prev + `\n[Uploaded image: ${file.name}]`);
                      } else {
                        setChatInput((prev) => prev + `\n--- ${file.name} ---\n${content.slice(0, 2000)}`);
                      }
                    };
                    if (file.type.startsWith("image/")) {
                      reader.readAsDataURL(file);
                    } else {
                      reader.readAsText(file);
                    }
                  }
                }}
              >
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={streaming}
                      rows={chatInput.split("\n").length > 3 ? 5 : 2}
                      className="w-full bg-[#141414] border border-[#262626] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-zinc-600 resize-none"
                      placeholder={streaming ? "Thinking..." : "Ask anything... (drop files here, Shift+Enter for new line)"}
                    />
                  </div>
                  <div className="flex gap-1.5 pb-0.5">
                    <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-3 py-2.5 rounded-lg text-sm transition-colors">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.txt,.tsx,.ts,.js,.jsx,.json,.css,.html,.md"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const content = reader.result as string;
                            if (file.type.startsWith("image/")) {
                              setChatInput((prev) => prev + `\n[Uploaded image: ${file.name}]`);
                            } else {
                              setChatInput((prev) => prev + `\n--- ${file.name} ---\n${content.slice(0, 2000)}`);
                            }
                          };
                          file.type.startsWith("image/") ? reader.readAsDataURL(file) : reader.readAsText(file);
                          e.target.value = "";
                        }}
                      />
                      📎
                    </label>
                    <button
                      onClick={sendMessage}
                      disabled={streaming || !chatInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      {streaming ? "..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resize handle between chat and editor */}
        {viewMode === "split" && <ResizeHandle onResize={handleChatResize} />}

        {/* Middle: Code Editor (in split or code mode) */}
        {(viewMode === "code" || viewMode === "split") && (
          <div className="flex-1 flex min-w-0">
            {/* File sidebar */}
            {hasGitHub && (
              <div className="w-56 border-r border-[#262626] bg-[#0e0e0e] flex flex-col shrink-0 overflow-hidden">
                <div className="px-3 py-2 border-b border-[#262626] text-xs flex items-center gap-1 flex-wrap">
                  <button onClick={() => { setCurrentPath(""); loadFiles(""); }} className="text-blue-400 hover:text-blue-300">
                    root
                  </button>
                  {breadcrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span className="text-zinc-600">/</span>
                      <button
                        onClick={() => { const p = breadcrumbs.slice(0, i + 1).join("/"); setCurrentPath(p); loadFiles(p); }}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        {crumb}
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {currentPath && (
                    <button
                      onClick={() => { const p = currentPath.split("/").slice(0, -1).join("/"); loadFiles(p); }}
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
                        onClick={() => file.type === "dir" ? loadFiles(file.path) : openFileHandler(file.path)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#1a1a1a] flex items-center gap-2 ${
                          openFile?.path === file.path ? "bg-blue-900/20 text-blue-300" : "text-zinc-300"
                        }`}
                      >
                        <span>{file.type === "dir" ? "📁" : "📄"}</span>
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Editor */}
            <div className="flex-1 flex flex-col min-w-0">
              {openFile ? (
                <>
                  <div className="border-b border-[#262626] bg-[#111] px-4 py-1.5 flex items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400">{openFile.path}</span>
                    {modified && <span className="text-xs text-amber-400">(modified)</span>}
                  </div>
                  <div className="flex-1">
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
                        minimap: { enabled: viewMode !== "split" },
                        lineNumbers: "on",
                        wordWrap: "on",
                        tabSize: 2,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
                  <div className="text-center">
                    <div className="text-4xl mb-4">📝</div>
                    <div className="font-medium mb-1">
                      {hasGitHub ? "Select a file to edit" : "Connect GitHub in Settings"}
                    </div>
                    <div className="text-xs text-zinc-600 max-w-xs">
                      {hasGitHub
                        ? "Browse files in the sidebar. Changes save to a working branch."
                        : "Add a GitHub Personal Access Token to enable code editing."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resize handle before preview */}
        {showPreview && <ResizeHandle onResize={handlePreviewResize} />}

        {/* Right: Preview */}
        {showPreview && (
          <div className="border-l border-[#262626] bg-[#0e0e0e] flex flex-col shrink-0" style={{ width: `${previewWidth}px` }}>
            <div className="border-b border-[#262626] px-3 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Live Preview</span>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ff5f57]"></span>
                <span className="w-2 h-2 rounded-full bg-[#febc2e]"></span>
                <span className="w-2 h-2 rounded-full bg-[#28c840]"></span>
              </div>
            </div>
            <iframe
              src={`/api/proxy?url=${encodeURIComponent((site.production_url as string) || "")}`}
              className="flex-1 bg-white"
              title="Site preview"
            />
          </div>
        )}
      </div>

      {/* Terminal panel */}
      {showTerminal && (
        <div className="border-t border-[#262626] shrink-0">
          <Terminal siteId={siteId} className="rounded-none border-0" />
        </div>
      )}
    </div>
  );
}
