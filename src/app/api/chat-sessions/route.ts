import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { corsHeaders } from "@/lib/api-auth";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * GET /api/chat-sessions?site_id=<uuid>&status=<active|completed|archived>
 *   → list sessions for the Command Center sidebar
 *
 * POST /api/chat-sessions { site_id, title?, recommendation_id?, audit_issue_id? }
 *   → create a new chat session. If recommendation_id is given and an
 *     existing ACTIVE session is already tied to it, returns that instead
 *     of creating a duplicate — so clicking Fix Now on the same rec always
 *     resumes the same conversation.
 */
export async function GET(req: NextRequest) {
  const CORS = corsHeaders(req);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const url = new URL(req.url);
  const siteId = url.searchParams.get("site_id");
  const status = url.searchParams.get("status");
  if (!siteId) return NextResponse.json({ error: "site_id required" }, { status: 400, headers: CORS });

  let q = supabase
    .from("chat_sessions")
    .select("*")
    .eq("site_id", siteId)
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json({ sessions: data || [] }, { headers: CORS });
}

export async function POST(req: NextRequest) {
  const CORS = corsHeaders(req);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const body = await req.json();
  const { site_id, title, recommendation_id, audit_issue_id } = body;
  if (!site_id) return NextResponse.json({ error: "site_id required" }, { status: 400, headers: CORS });

  // Reuse existing active session for the same recommendation
  if (recommendation_id) {
    const { data: existing } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("site_id", site_id)
      .eq("user_id", user.id)
      .eq("recommendation_id", recommendation_id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return NextResponse.json({ session: existing, reused: true }, { headers: CORS });
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      site_id,
      user_id: user.id,
      title: title || "New chat",
      recommendation_id: recommendation_id || null,
      audit_issue_id: audit_issue_id || null,
    })
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message || "insert failed" }, { status: 500, headers: CORS });
  }
  return NextResponse.json({ session: data, reused: false }, { headers: CORS });
}
