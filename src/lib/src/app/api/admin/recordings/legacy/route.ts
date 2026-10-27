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

  // Update both tables - so Water Spine + Worker Panel both work
  const { error: e1 } = await supabaseAdmin.from("worker_recordings").update({ status }).eq("id", id);
  const { error: e2 } = await supabaseAdmin.from("recordings").update({ admin_status: status }).eq("id", id);

  if (e1 && e2) {
    return NextResponse.json({ success: false, error: "Recording not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}