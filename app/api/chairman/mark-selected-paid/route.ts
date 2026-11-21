import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const CAMPAIGN_START_ISO = "2026-11-21T16:00:00.000Z";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { worker_ids, batch_key } = body as { worker_ids: string[]; batch_key: string };

    // --- Input validation: browser sends ONLY worker_ids, NO amount ---
    if (!Array.isArray(worker_ids) || worker_ids.length === 0) {
      return NextResponse.json({ error: "No workers selected" }, { status: 400 });
    }
    if (worker_ids.length > 100) {
      return NextResponse.json({ error: "Max 100 workers at once" }, { status: 400 });
    }
    if (!batch_key || typeof batch_key !== "string") {
      return NextResponse.json({ error: "Missing batch key" }, { status: 400 });
    }
    // De-dupe — same worker twice in one batch must not pay twice
    const uniqueWorkerIds = [...new Set(worker_ids.filter((w) => typeof w === "string" && w.trim()))];
    if (uniqueWorkerIds.length === 0) {
      return NextResponse.json({ error: "No valid workers selected" }, { status: 400 });
    }

    // --- 1. CHAIRMAN AUTH — Server side, never trust browser ---
    const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return NextResponse.json({ error: "Only Chairman can mark paid" }, { status: 403 });
    }

    // Admin client — server only, uses SERVICE_ROLE_KEY, never exposed to browser
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server misconfigured: missing SERVICE_ROLE_KEY" }, { status: 500 });
    }
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // --- 2. CHAIRMAN PROFILE CHECK — same as dashboard verifyAdmin ---
    const { data: profile } = await admin.from("profiles").select("email, is_chairman").eq("id", user.id).maybeSingle();
    if (!profile || profile.email?.toLowerCase() !== CHAIRMAN_EMAIL || profile.is_chairman !== true) {
      return NextResponse.json({ error: "Chairman profile not verified" }, { status: 403 });
    }

    // --- 3. PROCESS EACH WORKER IN SEPARATE TRANSACTION ---
    const results: any[] = [];
    for (const worker_id of uniqueWorkerIds) {
      try {
        // Server calculates unpaid set itself — ignores any amount from browser
        const { data: unpaid, error: unpaidError } = await admin
          .from("recordings")
          .select("id")
          .eq("worker_id", worker_id)
          .eq("status", "approved")
          .eq("is_paid", false)
          .gte("created_at", CAMPAIGN_START_ISO);

        if (unpaidError) throw unpaidError;
        if (!unpaid || unpaid.length === 0) {
          results.push({ worker_id, success: false, error: "No unpaid amount" });
          continue;
        }

        // Idempotency key from CURRENT unpaid IDs — retry with same set = already_paid, no duplicate
        const idsHash = crypto
          .createHash("sha256")
          .update(unpaid.map((r: any) => String(r.id)).sort().join(","))
          .digest("hex")
          .slice(0, 32);
        const idempotency_key = `${batch_key}:${worker_id}:${idsHash}`;

        // ONE Postgres transaction per worker: UPDATE recordings + INSERT payment_history together
        const { data, error } = await admin.rpc("mark_worker_paid_secure", {
          p_worker_id: worker_id,
          p_paid_by: user.email,
          p_idempotency_key: idempotency_key,
        });
        if (error) throw error;
        results.push({ worker_id, success: true, ...data });
      } catch (e: any) {
        // Failed worker remains unpaid, others continue, retry is safe
        results.push({ worker_id, success: false, error: e.message || "Payment failed" });
      }
    }

    return NextResponse.json({
      success: true,
      succeeded: results.filter((r) => r.success).length,
      total: results.length,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Bulk payment failed" }, { status: 500 });
  }
}