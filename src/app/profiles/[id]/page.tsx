import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import type { Profile, Site } from "@/lib/types";

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single<Profile>();

  if (!profile) notFound();

  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("profile_id", id)
    .order("created_at", { ascending: false });

  return (
    <AppShell user={user}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/profiles"
          className="text-sm text-zinc-500 hover:text-zinc-300 mb-4 inline-block"
        >
          ← All profiles
        </Link>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            {profile.description && (
              <p className="text-zinc-500 text-sm mt-1">{profile.description}</p>
            )}
          </div>
          <Link
            href={`/profiles/${id}/sites/new`}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Connect a Site
          </Link>
        </div>

        {sites && sites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(sites as Site[]).map((site) => (
              <Link
                key={site.id}
                href={`/profiles/${id}/sites/${site.id}`}
                className="bg-[#141414] border border-[#262626] hover:border-[#404040] rounded-lg p-5 transition-colors"
              >
                <div className="font-semibold text-lg">{site.name}</div>
                <div className="text-sm text-zinc-500 mt-1 font-mono">
                  {site.domain}
                </div>
                <div className="flex gap-2 mt-3 text-xs">
                  {site.github_repo_owner && site.github_repo_name ? (
                    <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      GitHub: {site.github_repo_owner}/{site.github_repo_name}
                    </span>
                  ) : (
                    <span className="bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded">
                      No repo connected
                    </span>
                  )}
                  {site.last_audit_at && (
                    <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      Audited {new Date(site.last_audit_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-12 text-center">
            <div className="text-zinc-500 mb-4">
              No sites connected to this profile yet.
            </div>
            <Link
              href={`/profiles/${id}/sites/new`}
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Connect your first site
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
