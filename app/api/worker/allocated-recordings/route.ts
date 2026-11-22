import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase server environment variables");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Please log in again." }, { status: 401 });
    }
    const token = authorization.slice(7).trim();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session." }, { status: 401 });
    }
    if (user.email?.toLowerCase() === "tapbomba.ai@gmail.com") {
      return NextResponse.json({ error: "Chairman cannot use worker endpoint." }, { status: 403 });
    }
    const { data: worker } = await supabaseAdmin
      .from("workers")
      .select("worker_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (!worker) return NextResponse.json({ error: "Worker not found." }, { status: 403 });

    // Pending + Approved = still unpaid, still allocated
    const { data: pendingReqs } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("id")
      .eq("worker_id", worker.worker_id)
      .in("status", ["pending", "approved"]);

    if (!pendingReqs || pendingReqs.length === 0) {
      return NextResponse.json({ allocatedIds: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const reqIds = pendingReqs.map((r: any) => r.id);

    // CORRECT column: withdrawal_request_id
    const { data: alloc, error: allocError } = await supabaseAdmin
      .from("withdrawal_recordings")
      .select("recording_id")
      .in("withdrawal_request_id", reqIds);

    if (allocError) throw allocError;

    return NextResponse.json(
      { allocatedIds: (alloc || []).map((a: any) => a.recording_id) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("Allocated recordings error:", e);
    return NextResponse.json({ error: "Could not load allocated recordings." }, { status: 500 });
  }
}