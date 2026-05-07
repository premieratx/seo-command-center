"use client";

// Public demo route — renders the Ad Loop pane full-screen with no auth.
// Marked client-side so we can lazy-load the pane without SSR; the
// dashboard fetches data at runtime via /api/ads/* anyway, and those routes
// already auth-gate themselves once a live API is configured.

import dynamic from "next/dynamic";

const AdLoopPane = dynamic(() => import("@/components/ads/AdLoopPane"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-24 text-sm text-zinc-500">
      Loading Ad Loop…
    </div>
  ),
});

export default function AdLoopDemoPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-200">
      <header className="border-b border-zinc-100 bg-white/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="text-lg">📣</span>
            <div>
              <div className="text-sm font-semibold text-zinc-900">Ad Loop · Demo</div>
              <div className="text-[11px] text-zinc-500">
                Full-screen preview · sample data when APIs aren&apos;t connected
              </div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-500">
            Sign in at{" "}
            <a
              href="/login"
              className="text-blue-400 hover:text-blue-300 underline-offset-2 hover:underline"
            >
              /login
            </a>{" "}
            to use the live tab inside the Command Center.
          </div>
        </div>
      </header>
      <main className="max-w-[1800px] mx-auto px-4 py-6">
        <AdLoopPane />
      </main>
    </div>
  );
}
