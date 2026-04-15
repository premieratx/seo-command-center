import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const siteId = url.searchParams.get("site_id");
  if (!siteId) return NextResponse.json({ error: "site_id required" }, { status: 400 });

  const { data: audits } = await supabase
    .from("audits")
    .select("id, created_at, score, issue_count, page_count")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ audits: audits || [] });
}
