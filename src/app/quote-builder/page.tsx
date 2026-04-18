"use client";

import dynamic from "next/dynamic";

// The quote builder's full react-router tree, loaded client-only so
// Next.js SSR doesn't try to prerender it.
const QuoteBuilderApp = dynamic(
  () => import("@/quote-app/mounts/QuoteBuilderMount"),
  { ssr: false, loading: () => <Loading label="Loading Quote Builder…" /> },
);

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] text-sm text-zinc-400">
      {label}
    </div>
  );
}

export default function QuoteBuilderPage() {
  return <QuoteBuilderApp />;
}
