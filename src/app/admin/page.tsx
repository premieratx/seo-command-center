import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { isSuperAdminEmail } from "@/lib/admin";
import { listAllProfilesForAdmin } from "@/lib/admin-data";
import { AdminInviteForm } from "./AdminInviteForm";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email)) redirect("/profiles");

  const profiles = await listAllProfilesForAdmin();

  return (
    <AppShell user={user}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wide text-amber-400 mb-1">
            Super Admin
          </div>
          <h1 className="text-2xl font-bold">Organization Overview</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Invite collaborators and see every brand profile across the account.
          </p>
        </div>

        {/* Invite panel */}
        <div className="bg-[#141414] border border-[#262626] rounded-lg p-6 mb-8">
          <h2 className="font-semibold mb-1">Invite a user</h2>
          <p className="text-sm text-zinc-500 mb-4">
            They&apos;ll receive an email link that signs them in. After signing
            in they can create their own brand profile and connect their GitHub
            repo.
          </p>
          <AdminInviteForm />
        </div>

        {/* All profiles */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">All Brand Profiles</h2>
          <span className="text-xs text-zinc-500">
            {profiles?.length ?? 0} total
          </span>
        </div>

        {profiles === null ? (
          <div className="bg-amber-900/20 border border-amber-800/40 text-amber-300 rounded-lg p-4 text-sm">
            <div className="font-semibold mb-1">Service role key not configured</div>
            <div className="text-amber-200/80">
              Add <code className="bg-black/40 px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
              in Netlify → Site settings → Environment variables to enable the
              cross-user admin view and invite system. Until then, profile list
              below will be empty.
            </div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="bg-[#141414] border border-[#262626] rounded-lg p-8 text-center text-zinc-500 text-sm">
            No profiles yet. Invite a collaborator above.
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#0a0a0a] text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Profile</th>
                  <th className="text-left px-4 py-3 font-medium">Owner</th>
                  <th className="text-left px-4 py-3 font-medium">Sites</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1a1a1a]/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {p.owner_email ?? (
                        <span className="text-zinc-600">(unknown)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{p.site_count}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/profiles/${p.id}`}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
