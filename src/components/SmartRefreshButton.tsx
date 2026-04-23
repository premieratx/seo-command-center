"use client";

/**
 * SmartRefreshButton — drop-in replacement for the static "Refresh SEMRush"
 * button. Two-stage refresh:
 *
 *   STAGE 1 — API path: POST /api/audit/refresh-semrush. If your account
 *   has API units, you get keywords + competitors + metrics + backlinks
 *   in one shot.
 *
 *   STAGE 2 — Guided manual scrape (when API path fails OR you click
 *   "Manual scrape" directly): a 5-step wizard that opens each key
 *   SEMrush page in a new tab, lets you screenshot it (Cmd+Shift+4 or
 *   paste from clipboard), drops the image in, and after step 5 batch-
 *   ingests everything via /api/semrush-screenshot-ingest. Claude Opus
 *   4.5 Vision parses every visible metric — position tracking, organic
 *   rankings, AI Visibility, Share of Voice, competitor sentiment, AI
 *   recommendations — and writes them all to the right Supabase tables.
 *
 *   No SEMrush API credits consumed in stage 2.
 */
import { useState } from "react";

type CaptureStep = {
  id: string;
  title: string;
  why: string;
  semrushPath: string; // appended to https://www.semrush.com
};

const STEPS: CaptureStep[] = [
  {
    id: "position-tracking",
    title: "Position Tracking",
    why: "Daily ranking changes for every tracked keyword (volume, position, change vs yesterday, URL).",
    semrushPath:
      "/projects/?action=siteAuditExclude&filter=position-tracking",
  },
  {
    id: "organic-research",
    title: "Organic Research",
    why: "Top organic keywords by traffic — the long tail SEMrush sees you ranking for.",
    semrushPath: "/analytics/organic/positions/",
  },
  {
    id: "ai-visibility",
    title: "AI Visibility",
    why: "Share of Voice across ChatGPT / Gemini / Perplexity / Google AI Mode + favorable sentiment.",
    semrushPath: "/aitoolkit/ai-visibility/",
  },
  {
    id: "competitor",
    title: "Competitor Analysis",
    why: "Domain overlap with Float On, ATX Party Boats, Tide Up. Where competitors out-rank PPC.",
    semrushPath: "/analytics/organic/competitors/",
  },
  {
    id: "site-audit",
    title: "Site Audit",
    why: "Errors / warnings / notices on the V2 site. Critical issue counts feed the dashboard's Critical Issues card.",
    semrushPath: "/siteaudit/",
  },
];

type CapturedShot = {
  stepId: string;
  name: string;
  base64: string;
  mime: string;
};

export default function SmartRefreshButton({
  siteId,
  domain,
  onComplete,
}: {
  siteId: string;
  domain: string;
  onComplete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "api" | "wizard" | "ingest" | "done">("idle");
  const [apiResult, setApiResult] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [shots, setShots] = useState<CapturedShot[]>([]);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  function reset() {
    setPhase("idle");
    setApiResult(null);
    setApiError(null);
    setStepIdx(0);
    setShots([]);
    setIngestResult(null);
    setIngestError(null);
  }

  async function tryApi() {
    setPhase("api");
    setApiResult(null);
    setApiError(null);
    // Run BOTH refreshers in parallel:
    //   (a) /api/audit/refresh-semrush — regular SEMRush API: metrics,
    //       organic positions, tracked keywords, competitors, backlinks.
    //       This is the "live page position tracking" data.
    //   (b) /api/ai-visibility-refresh — Playwright-driven scrape of the
    //       AI Visibility dashboard: Share of Voice across ChatGPT/
    //       Gemini/Perplexity/Google AI Mode, sentiment, AI insights.
    // Both write fresh rows, so every refresh brings in new info.
    try {
      const [apiRes, aiRes] = await Promise.allSettled([
        fetch("/api/audit/refresh-semrush", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ site_id: siteId }),
        }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) })),
        fetch("/api/ai-visibility-refresh", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ site_id: siteId }),
        }).then(async (r) => ({ ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) })),
      ]);

      const parts: string[] = [];
      const issues: string[] = [];

      if (apiRes.status === "fulfilled" && apiRes.value.ok) {
        const d = apiRes.value.data;
        parts.push(
          `${d.keywords ?? 0} keywords (with positions)`,
          `${d.competitors ?? 0} competitors`,
          `metrics ${d.metrics ? "✓" : "✗"}`,
        );
      } else {
        const err = apiRes.status === "fulfilled" ? apiRes.value.data?.error : String(apiRes.reason);
        issues.push(`SEMRush API: ${err || "failed"}`);
      }

      if (aiRes.status === "fulfilled" && aiRes.value.ok) {
        const d = aiRes.value.data;
        parts.push(
          `${d.extracts ?? 0} AI surfaces scraped`,
          `${d.share_of_voice_rows ?? 0} SoV rows`,
          `${d.insights_rows ?? 0} insights`,
        );
      } else {
        const err = aiRes.status === "fulfilled" ? aiRes.value.data?.error : String(aiRes.reason);
        issues.push(`AI Visibility: ${err || "failed"}`);
      }

      if (parts.length > 0) {
        setApiResult(`✓ ${parts.join(" · ")}${issues.length > 0 ? `\n(issues: ${issues.join("; ")})` : ""}`);
        setPhase("done");
        if (onComplete) onComplete();
      } else {
        setApiError(issues.join("; ") || "Both refreshers failed");
        setPhase("wizard");
      }
    } catch (e: any) {
      setApiError(e?.message || "Refresh failed");
      setPhase("wizard");
    }
  }

  function readFile(file: File): Promise<CapturedShot> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result);
        const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
        resolve({
          stepId: STEPS[stepIdx].id,
          name: file.name || `${STEPS[stepIdx].id}.png`,
          base64,
          mime: file.type || "image/png",
        });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function captureFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    const parsed = await Promise.all(arr.map(readFile));
    setShots((prev) => [...prev, ...parsed]);
  }

  async function ingestNow() {
    setPhase("ingest");
    setIngestError(null);
    try {
      const res = await fetch("/api/semrush-screenshot-ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          note: `Smart Refresh manual scrape · ${new Date().toLocaleString()}`,
          screenshots: shots.map((s) => ({
            source: `${s.stepId}/${s.name}`,
            base64: s.base64,
            mime: s.mime,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Ingest failed (${res.status})`);
      setIngestResult(
        `Parsed: ${data.keywords ?? 0} keywords · ${data.site_metrics ? "metrics ✓" : "no metrics"} · ${data.share_of_voice ?? 0} SoV · ${data.insights ?? 0} insights · ${data.sentiment ?? 0} sentiment rows`,
      );
      setPhase("done");
      if (onComplete) onComplete();
    } catch (e: any) {
      setIngestError(e?.message || "Ingest failed");
      setPhase("wizard");
    }
  }

  const currentStep = STEPS[stepIdx];
  const stepShots = shots.filter((s) => s.stepId === currentStep?.id);
  const allDone = STEPS.every((s) => shots.some((sh) => sh.stepId === s.id));

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          reset();
        }}
        className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium whitespace-nowrap"
        title="Try SEMrush API first → falls back to guided screenshot scrape if no credits"
      >
        ⚡ Smart Refresh
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#141414] border border-[#2a2a2a] rounded-lg max-w-3xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
            onPaste={(e) => {
              if (phase !== "wizard") return;
              const items = e.clipboardData?.items || [];
              const imgs: File[] = [];
              for (const it of items) {
                if (it.type.startsWith("image/")) {
                  const f = it.getAsFile();
                  if (f) imgs.push(f);
                }
              }
              if (imgs.length) captureFiles(imgs);
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#262626]">
              <h3 className="text-base font-semibold text-white">
                ⚡ Smart Refresh — {domain}
              </h3>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white text-xl">
                ×
              </button>
            </div>

            {/* idle — chooser */}
            {phase === "idle" && (
              <div className="p-5 space-y-4">
                <p className="text-sm text-zinc-300">
                  Choose how to refresh SEMrush data for this site:
                </p>

                <button
                  onClick={tryApi}
                  className="w-full text-left bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-blue-500/30 hover:border-blue-500 rounded p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-blue-300">
                        ⚡ Try SEMrush API first
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        One-click pull. Costs ~10-100 API units. If your account is out of credits,
                        we automatically fall through to the manual scrape.
                      </div>
                    </div>
                    <div className="text-xs text-blue-400 whitespace-nowrap">Try first →</div>
                  </div>
                </button>

                <button
                  onClick={() => setPhase("wizard")}
                  className="w-full text-left bg-[#0a0a0a] hover:bg-[#1a1a1a] border border-purple-500/30 hover:border-purple-500 rounded p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-purple-300">
                        📸 Manual scrape (no credits needed)
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Walks through 5 SEMrush pages. Each step opens the right tab in SEMrush —
                        you screenshot it, drop the image in, click Next. Claude Opus Vision
                        parses everything in one batch at the end. Free.
                      </div>
                    </div>
                    <div className="text-xs text-purple-400 whitespace-nowrap">Start scrape →</div>
                  </div>
                </button>
              </div>
            )}

            {/* api — running */}
            {phase === "api" && (
              <div className="p-8 text-center">
                <div className="text-sm text-zinc-300 animate-pulse">
                  Hitting SEMrush API for {domain}…
                </div>
              </div>
            )}

            {/* wizard — capture each step */}
            {phase === "wizard" && currentStep && (
              <div className="p-5 space-y-4">
                {apiError && stepIdx === 0 && (
                  <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                    API path failed: {apiError}. Falling through to manual scrape.
                  </div>
                )}

                {/* Step indicator */}
                <div className="flex items-center gap-1.5">
                  {STEPS.map((s, i) => (
                    <div key={s.id} className="flex-1 flex items-center gap-1.5">
                      <div
                        className={`flex-1 h-1 rounded ${
                          shots.some((sh) => sh.stepId === s.id)
                            ? "bg-green-500"
                            : i === stepIdx
                              ? "bg-blue-500"
                              : "bg-[#262626]"
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                  Step {stepIdx + 1} of {STEPS.length}
                </div>

                <div>
                  <h4 className="text-base font-semibold text-white">{currentStep.title}</h4>
                  <p className="text-xs text-zinc-500 mt-1">{currentStep.why}</p>
                </div>

                <a
                  href={`https://www.semrush.com${currentStep.semrushPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Open SEMrush · {currentStep.title} ↗
                </a>

                <div
                  className={`border-2 border-dashed rounded p-6 text-center transition-colors ${
                    stepShots.length > 0
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-[#262626] hover:border-blue-500/40"
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files.length) captureFiles(e.dataTransfer.files);
                  }}
                  onClick={() =>
                    document.getElementById(`capture-input-${stepIdx}`)?.click()
                  }
                >
                  {stepShots.length > 0 ? (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {stepShots.map((s, i) => (
                        <div key={i} className="relative">
                          <img
                            src={`data:${s.mime};base64,${s.base64}`}
                            alt={s.name}
                            className="h-24 rounded border border-[#262626]"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShots((prev) =>
                                prev.filter(
                                  (sh) => !(sh.stepId === s.stepId && sh.name === s.name),
                                ),
                              );
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div className="text-2xl mb-2">📸</div>
                      <div className="text-sm text-zinc-300">
                        Screenshot the SEMrush page (<code>Cmd+Shift+4</code>), then drag, paste, or
                        click here.
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-2 cursor-pointer">
                        You can drop multiple shots if the page scrolls
                      </div>
                    </div>
                  )}
                </div>
                <input
                  id={`capture-input-${stepIdx}`}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) captureFiles(e.target.files);
                  }}
                />

                {/* Nav buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-[#262626]">
                  <button
                    onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                    disabled={stepIdx === 0}
                    className="text-xs px-3 py-1.5 rounded bg-[#0a0a0a] border border-[#262626] text-zinc-400 hover:text-white hover:border-zinc-500 disabled:opacity-30"
                  >
                    ← Back
                  </button>

                  <div className="text-xs text-zinc-500">
                    {shots.length} screenshot{shots.length === 1 ? "" : "s"} captured total
                  </div>

                  {stepIdx < STEPS.length - 1 ? (
                    <button
                      onClick={() => setStepIdx((i) => i + 1)}
                      className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    >
                      {stepShots.length > 0 ? "Next →" : "Skip →"}
                    </button>
                  ) : (
                    <button
                      onClick={ingestNow}
                      disabled={!allDone && shots.length === 0}
                      className="text-xs px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold"
                    >
                      🚀 Parse all {shots.length} shot{shots.length === 1 ? "" : "s"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ingest — running */}
            {phase === "ingest" && (
              <div className="p-8 text-center">
                <div className="text-sm text-zinc-300 animate-pulse">
                  Claude Opus 4.5 Vision is parsing {shots.length} screenshot
                  {shots.length === 1 ? "" : "s"}…
                </div>
                <div className="text-xs text-zinc-500 mt-2">
                  Usually 15-45 seconds. Stay on this screen.
                </div>
                {ingestError && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2 mt-4 text-left">
                    {ingestError}
                  </div>
                )}
              </div>
            )}

            {/* done */}
            {phase === "done" && (
              <div className="p-5 space-y-3">
                {apiResult && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-sm text-green-300">
                    {apiResult}
                  </div>
                )}
                {ingestResult && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded p-3 text-sm text-green-300">
                    {ingestResult}
                  </div>
                )}
                <p className="text-xs text-zinc-500">
                  Refresh complete. Close this dialog and the Compare bridge will reflect the new
                  data on next render.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={reset}
                    className="text-xs px-3 py-1.5 rounded bg-[#0a0a0a] border border-[#262626] text-zinc-300 hover:border-zinc-500"
                  >
                    Refresh again
                  </button>
                  <button
                    onClick={() => {
                      setOpen(false);
                      // Force a page reload so the freshly-ingested data shows immediately
                      if (typeof window !== "undefined") window.location.reload();
                    }}
                    className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Reload dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
