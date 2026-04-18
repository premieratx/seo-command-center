import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/profiles");
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4">Business Command Center</h1>
        <p className="text-xl text-zinc-400 mb-8">
          Ten connected tabs — SEO · Design · CRM · Quotes · Stats · Promos ·
          Blog · Chatbot · Users · Docs — all backed by the same Supabase
          schema. Audit, build, publish, and measure from one console.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
        <div className="text-xs text-zinc-500 mt-3">Invite-only. Contact your admin for access.</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
          {[
            { label: "Deep Audit", desc: "200+ checks" },
            { label: "Cannibalization", desc: "Detect & fix" },
            { label: "Auto Fixes", desc: "Real code edits" },
            { label: "Branch Preview", desc: "Before publish" },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-[#141414] border border-[#262626] rounded-lg p-4"
            >
              <div className="text-sm font-semibold">{f.label}</div>
              <div className="text-xs text-zinc-500 mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
