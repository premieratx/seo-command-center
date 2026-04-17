import { NextRequest, NextResponse } from "next/server";
import { createClient as createSsrClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { isSuperAdminEmail } from "@/lib/admin";

/**
 * POST /api/admin/invite
 * Body: { email: string, profile_name?: string }
 *
 * Super-admin-only. Sends a Supabase magic-link invite to the given email.
 * The invited user receives an email with a link that signs them in. From
 * there they can create their own brand profile and add sites/repos.
 *
 * Requires:
 *   - SUPABASE_SERVICE_ROLE_KEY in env
 */
export async function POST(req: NextRequest) {
  // 1. Verify caller is a super admin (via their session cookie)
  const ssr = await createSsrClient();
  const {
    data: { user },
  } = await ssr.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Validate input
  const body = await req.json().catch(() => ({}));
  const email: string | undefined = typeof body.email === "string" ? body.email.trim() : undefined;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  // 3. Service role client — required to call admin APIs
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY env var is not set. Add it in Netlify → Site settings → Environment variables.",
      },
      { status: 500 }
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Send invite. `redirectTo` tells Supabase where to bounce the user to
  // after they click the email link and authenticate. We send them to
  // /profiles where they can create their first brand profile.
  const origin = req.headers.get("origin") || req.nextUrl.origin;
  const redirectTo = `${origin}/profiles`;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to send invite" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    invited_user_id: data.user?.id ?? null,
    email,
  });
}
