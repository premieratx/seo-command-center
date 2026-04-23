import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { corsHeaders } from "@/lib/api-auth";

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * GET /api/media?site_id=<uuid>&kind=<image|video|...>&limit=100
 * Lists media uploads for a site, newest first.
 *
 * DELETE /api/media?id=<uuid>
 * Removes the storage object + DB row.
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
  const kind = url.searchParams.get("kind");
  const limit = Math.min(Number(url.searchParams.get("limit") || "200"), 500);

  if (!siteId) {
    return NextResponse.json({ error: "site_id required" }, { status: 400, headers: CORS });
  }

  let q = supabase
    .from("media_uploads")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (kind) q = q.eq("kind", kind);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json({ items: data || [] }, { headers: CORS });
}

export async function DELETE(req: NextRequest) {
  const CORS = corsHeaders(req);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400, headers: CORS });

  const { data: row } = await supabase
    .from("media_uploads")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404, headers: CORS });

  await supabase.storage.from("command-center-media").remove([row.storage_path]);
  const { error } = await supabase.from("media_uploads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  return NextResponse.json({ ok: true }, { headers: CORS });
}
