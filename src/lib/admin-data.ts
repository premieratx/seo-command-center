import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for super-admin server-side reads.
 * DO NOT import from client components or expose this to the browser.
 */
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AdminProfileRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_id: string;
  owner_email: string | null;
  site_count: number;
};

/**
 * Lists every profile in the system, enriched with the owner's email and
 * the number of sites attached. Returns null if the service role key isn't
 * configured.
 */
export async function listAllProfilesForAdmin(): Promise<AdminProfileRow[] | null> {
  const admin = adminClient();
  if (!admin) return null;

  // 1. Profiles
  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, name, description, created_at, user_id")
    .order("created_at", { ascending: false });
  if (pErr || !profiles) return [];

  // 2. Site counts per profile
  const { data: sites } = await admin.from("sites").select("id, profile_id");
  const siteCountByProfile = new Map<string, number>();
  for (const s of sites || []) {
    siteCountByProfile.set(s.profile_id, (siteCountByProfile.get(s.profile_id) || 0) + 1);
  }

  // 3. Owner emails — one lookup via the admin API per unique user_id
  const uniqueUserIds = Array.from(new Set(profiles.map((p) => p.user_id).filter(Boolean)));
  const emailByUserId = new Map<string, string>();
  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        if (data?.user?.email) emailByUserId.set(uid, data.user.email);
      } catch {
        /* ignore individual lookup failures */
      }
    })
  );

  return profiles.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    created_at: p.created_at,
    user_id: p.user_id,
    owner_email: emailByUserId.get(p.user_id) ?? null,
    site_count: siteCountByProfile.get(p.id) ?? 0,
  }));
}
