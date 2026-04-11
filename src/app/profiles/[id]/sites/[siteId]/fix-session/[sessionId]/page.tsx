import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { FixSessionClient } from "./FixSessionClient";
import type { FixSession, Fix, AuditIssue } from "@/lib/types";

export default async function FixSessionPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string; sessionId: string }>;
}) {
  const { id: profileId, siteId, sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: session } = await supabase
    .from("fix_sessions")
    .select("*")
    .eq("id", sessionId)
    .single<FixSession>();
  if (!session) notFound();

  const { data: fixes } = await supabase
    .from("fixes")
    .select("*")
    .eq("fix_session_id", sessionId)
    .order("created_at", { ascending: true });

  const { data: linkedIssues } = await supabase
    .from("audit_issues")
    .select("*")
    .eq("fixed_in_session_id", sessionId);

  return (
    <AppShell user={user}>
      <div className="max-w-5xl mx-auto px-4 py-6 w-full">
        <Link
          href={`/profiles/${profileId}/sites/${siteId}`}
          className="text-sm text-zinc-500 hover:text-zinc-300 mb-3 inline-block"
        >
          ← Back to site
        </Link>
        <FixSessionClient
          session={session}
          fixes={(fixes as Fix[]) || []}
          linkedIssues={(linkedIssues as AuditIssue[]) || []}
          profileId={profileId}
          siteId={siteId}
        />
      </div>
    </AppShell>
  );
}
