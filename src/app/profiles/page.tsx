import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import type { Profile } from "@/lib/types";
import { isSuperAdminEmail } from "@/lib/admin";

/**
 * Business Command Center — profile picker.
 *
 * Lists every brand profile the user has access to. Each card links to
 * the profile's primary site, which renders the full 10-tab Command
 * Center (SEO · Design · CRM · Quotes · Stats · Promos · Blog ·
 * Chatbot · Users · Docs). We used to render SEO recommendations on
 * this screen; they now live inside the SEO tab of the Command Center.
 */
export default async function ProfilesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (!profiles || profiles.length === 0) {
    await supabase.rpc("seed_ppc_profile");
    const { data: refreshed } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    profiles = refreshed;
  }

  // Background-refresh recommendations so they're fresh for the SEO tab.
  await supabase.rpc("generate_recommendations_for_user", { p_user_id: user.id });

  return (
    <AppShell user={user}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Business Command Center</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Pick a brand to open its full 10-tab Command Center (SEO ·
              Design · CRM · Quotes · Stats · Promos · Blog · Chatbot ·
              Users · Docs).
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isSuperAdminEmail(user.email) && (
              <Link
                href="/admin"
                className="bg-amber-900/30 border border-amber-800/60 text-amber-300 hover:bg-amber-900/50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                title="Super admin: see all brand profiles and invite users"
              >
                Admin View →
              </Link>
            )}
            <Link
              href="/profiles/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + New Profile
            </Link>
          </div>
        </div>

        {profiles && profiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(profiles as Profile[]).map((profile) => (
              <Link
                key={profile.id}
                href={`/profiles/${profile.id}`}
                className="bg-[#141414] border border-[#262626] hover:border-[#404040] rounded-lg p-5 transition-colors"
              >
                <div className="font-semibold text-lg">{profile.name}</div>
                {profile.description && (
                  <div className="text-sm text-zinc-500 mt-1 line-clamp-2">
                    {profile.description}
                  </div>
                )}
                <div className="text-xs text-zinc-600 mt-3">
                  Created {new Date(profile.created_at).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-12 text-center">
            <div className="text-zinc-500 mb-4">
              You don&apos;t have any brand profiles yet.
            </div>
            <Link
              href="/profiles/new"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Create your first profile
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
