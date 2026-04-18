"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSuperAdminEmail } from "@/lib/admin";

export function AppShell({
  user,
  children,
}: {
  user: { email?: string };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = isSuperAdminEmail(user.email);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex-1 flex flex-col w-full">
      <header className="border-b border-[#262626] bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/profiles" className="font-bold text-lg">
            Business Command Center
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-amber-400 hover:text-amber-300 transition-colors"
                title="Super admin only"
              >
                Admin
              </Link>
            )}
            <span className="text-zinc-500">{user.email}</span>
            <button
              onClick={signOut}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="flex-1 w-full">{children}</div>
    </div>
  );
}
