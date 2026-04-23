import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { corsHeaders } from "@/lib/api-auth";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * PATCH /api/recommendations/task-status
 *   { kind: "ai_insight" | "audit_issue", id: uuid, task_status: "not_started"|"in_progress"|"complete"|"archived" }
 *
 * Updates the task_status column on ai_insights or audit_issues so the
 * recommendation lists can show not_started / in_progress / complete /
 * archived badges and filter accordingly.
 */
export async function PATCH(req: NextRequest) {
  const CORS = corsHeaders(req);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const body = await req.json();
  const { kind, id, task_status } = body;
  if (!["ai_insight", "audit_issue"].includes(kind)) {
    return NextResponse.json({ error: "invalid kind" }, { status: 400, headers: CORS });
  }
  if (!id || !task_status) {
    return NextResponse.json({ error: "id and task_status required" }, { status: 400, headers: CORS });
  }
  const allowed = ["not_started", "in_progress", "complete", "archived"];
  if (!allowed.includes(task_status)) {
    return NextResponse.json({ error: "invalid task_status" }, { status: 400, headers: CORS });
  }

  const table = kind === "ai_insight" ? "ai_insights" : "audit_issues";
  const patch: Record<string, unknown> = { task_status };
  if (task_status === "complete") patch.status = table === "ai_insights" ? "applied" : "fixed";
  if (task_status === "archived") patch.status = "dismissed";

  const { data, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json({ item: data }, { headers: CORS });
}
