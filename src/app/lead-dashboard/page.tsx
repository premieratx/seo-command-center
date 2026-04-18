"use client";
import dynamic from "next/dynamic";
const LeadDashboardMount = dynamic(
  () => import("@/quote-app/mounts/LeadDashboardMount"),
  { ssr: false, loading: () => <div className="p-8 text-zinc-400">Loading Lead Dashboard…</div> },
);
export default function LeadDashboardPage() { return <LeadDashboardMount />; }
