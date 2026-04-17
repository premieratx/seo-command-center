import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import type { Profile, Recommendation } from "@/lib/types";
import { isSuperAdminEmail } from "@/lib/admin";

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

  // Auto-seed Premier Party Cruises on first visit
  if (!profiles || profiles.length === 0) {
    await supabase.rpc("seed_ppc_profile");
    const { data: refreshed } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    profiles = refreshed;
  }

  // Auto-refresh recommendations on every login
  await supabase.rpc("generate_recommendations_for_user", { p_user_id: user.id });

  // Pull newest recommendations to display
  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "new")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <AppShell user={user}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {recommendations && recommendations.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-blue-900/20 to-purple-900/10 border border-blue-800/40 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-blue-400">✨</span>
                Fresh Recommendations
              </h2>
              <span className="text-xs text-zinc-500">
                Refreshed on login · {recommendations.length} new
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(recommendations as Recommendation[]).map((rec) => (
                <div
                  key={rec.id}
                  className="bg-[#0a0a0a]/60 border border-[#262626] rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rec.priority === 1
                          ? "bg-red-900/60 text-red-300"
                          : rec.priority === 2
                            ? "bg-amber-900/60 text-amber-300"
                            : "bg-blue-900/60 text-blue-300"
                      }`}
                    >
                      {rec.category.replace("_", " ")}
                    </span>
                    <div className="text-sm font-medium line-clamp-2">{rec.title}</div>
                  </div>
                  {rec.description && (
                    <div className="text-xs text-zinc-400 mt-2 line-clamp-2">
                      {rec.description}
                    </div>
                  )}
                  {rec.suggested_action && (
                    <div className="text-xs text-blue-300 mt-2 line-clamp-2">
                      → {rec.suggested_action}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Your Brand Profiles</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Each profile represents a brand or company. Add multiple sites under each profile.
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
