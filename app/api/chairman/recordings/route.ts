import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ success: false, error: "Missing token" }, { status: 401 });
  }
  const token = auth.slice(7);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user } } = await client.auth.getUser(token);
  if (!user || user.email?.toLowerCase() !== CHAIRMAN_EMAIL.toLowerCase()) {
    return NextResponse.json({ success: false, error: "Chairman only" }, { status: 403 });
  }

  const { id, status } = await req.json();
  if (!id || !["approved", "rejected", "pending"].includes(status)) {
    return NextResponse.json({ success: false, error: "Invalid data" }, { status: 400 });
  }

  // Try NEW system first: worker_recordings table, status column
  const { data: workerRec } = await supabaseAdmin
    .from("worker_recordings")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (workerRec) {
    const { error } = await supabaseAdmin.from("worker_recordings").update({ status }).eq("id", id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, table: "worker_recordings" });
  }

  // If not in new table, try LEGACY: recordings table, admin_status column
  const { data: legacyRec } = await supabaseAdmin
    .from("recordings")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (legacyRec) {
    const { error } = await supabaseAdmin.from("recordings").update({ admin_status: status }).eq("id", id);
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, table: "recordings" });
  }

  return NextResponse.json({ success: false, error: "Recording not found in either table" }, { status: 404 });
}