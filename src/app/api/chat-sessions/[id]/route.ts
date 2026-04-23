import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { corsHeaders } from "@/lib/api-auth";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * GET    /api/chat-sessions/:id            → session + full message history
 * PATCH  /api/chat-sessions/:id            → update title or status
 * DELETE /api/chat-sessions/:id            → permanently delete
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const CORS = corsHeaders(req);
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const { data: session, error: sErr } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500, headers: CORS });
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404, headers: CORS });

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ session, messages: messages || [] }, { headers: CORS });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const CORS = corsHeaders(req);
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.title === "string") updates.title = body.title.slice(0, 200);
  if (["active", "completed", "archived"].includes(body.status)) updates.status = body.status;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no updates" }, { status: 400, headers: CORS });
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message || "not found" }, { status: 404, headers: CORS });

  // When a session is marked complete, also mark its linked recommendation/audit issue
  if (body.status === "completed") {
    if (data.recommendation_id) {
      await supabase
        .from("ai_insights")
        .update({ task_status: "complete", status: "applied" })
        .eq("id", data.recommendation_id);
    }
    if (data.audit_issue_id) {
      await supabase
        .from("audit_issues")
        .update({ task_status: "complete", status: "fixed" })
        .eq("id", data.audit_issue_id);
    }
  }

  return NextResponse.json({ session: data }, { headers: CORS });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const CORS = corsHeaders(req);
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json({ ok: true }, { headers: CORS });
}
