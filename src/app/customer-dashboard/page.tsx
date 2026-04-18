"use client";
import dynamic from "next/dynamic";
const CustomerDashboardMount = dynamic(
  () => import("@/quote-app/mounts/CustomerDashboardMount"),
  { ssr: false, loading: () => <div className="p-8 text-zinc-400">Loading Customer Dashboard…</div> },
);
export default function CustomerDashboardPage() { return <CustomerDashboardMount />; }
