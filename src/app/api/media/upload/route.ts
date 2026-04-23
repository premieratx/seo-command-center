import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { corsHeaders } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIME_KIND: Array<[RegExp, "image" | "video" | "audio" | "pdf" | "doc" | "sheet" | "other"]> = [
  [/^image\//, "image"],
  [/^video\//, "video"],
  [/^audio\//, "audio"],
  [/^application\/pdf/, "pdf"],
  [/word|officedocument\.wordprocessingml|msword|opendocument\.text/i, "doc"],
  [/spreadsheet|excel|csv|officedocument\.spreadsheetml/i, "sheet"],
];

function kindFromMime(mime: string): "image" | "video" | "audio" | "pdf" | "doc" | "sheet" | "other" {
  for (const [pat, kind] of MIME_KIND) if (pat.test(mime)) return kind;
  return "other";
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * POST /api/media/upload  (multipart/form-data)
 *
 * Fields:
 *   files       one or more File entries (repeat the field name)
 *   site_id     uuid of the site the upload belongs to
 *   source      origin tag — e.g. "command_center_chat", "media_library"
 *
 * Writes every file to the `command-center-media` Supabase storage bucket
 * and records a row in public.media_uploads. Returns the list of uploaded
 * records so the caller can insert markdown refs into a chat message.
 */
export async function POST(req: NextRequest) {
  const CORS = corsHeaders(req);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });

  const form = await req.formData();
  const siteId = form.get("site_id")?.toString();
  const source = form.get("source")?.toString() || "command_center_chat";
  const caption = form.get("caption")?.toString() || null;
  if (!siteId) {
    return NextResponse.json({ error: "site_id required" }, { status: 400, headers: CORS });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "no files in form" }, { status: 400, headers: CORS });
  }

  const uploaded: Array<Record<string, unknown>> = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const kind = kindFromMime(file.type);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const ts = Date.now();
      const storagePath = `${siteId}/${ts}-${safeName}`;

      const bytes = Buffer.from(await file.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from("command-center-media")
        .upload(storagePath, bytes, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (upErr) {
        errors.push(`${file.name}: ${upErr.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("command-center-media")
        .getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      const { data: row, error: dbErr } = await supabase
        .from("media_uploads")
        .insert({
          site_id: siteId,
          user_id: user.id,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          kind,
          size_bytes: file.size,
          storage_path: storagePath,
          public_url: publicUrl,
          thumbnail_url: kind === "image" ? publicUrl : null,
          source,
          caption,
        })
        .select()
        .single();

      if (dbErr || !row) {
        errors.push(`${file.name}: db insert failed — ${dbErr?.message}`);
        continue;
      }
      uploaded.push(row);
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json(
    { uploaded, errors, count: uploaded.length },
    { status: uploaded.length > 0 ? 200 : 500, headers: CORS },
  );
}
