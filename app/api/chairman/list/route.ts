import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  // Fetch from BOTH tables - pending only
  const { data: workerRecs } = await supabaseAdmin
    .from("worker_recordings")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: legacyRecs } = await supabaseAdmin
    .from("recordings")
    .select("*")
    .eq("is_approved", false)
    .order("created_at", { ascending: false });

  const all = [...(workerRecs||[]), ...(legacyRecs||[])];
  return NextResponse.json({ recordings: all });
}