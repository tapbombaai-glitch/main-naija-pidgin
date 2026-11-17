import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server Supabase configuration is incomplete." },
        { status: 500 }
      );
    }

    const token = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim();

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify logged-in user.
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Session invalid. Please log in again." },
        { status: 401 }
      );
    }

    // Chairman email protection.
    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return NextResponse.json(
        { error: "Chairman access only." },
        { status: 403 }
      );
    }

    // Verify Chairman flag in database.
    const { data: chairman, error: chairmanError } = await admin
      .from("profiles")
      .select("email, is_chairman")
      .eq("id", user.id)
      .maybeSingle();

    if (chairmanError) {
      console.error("Chairman profile verification:", chairmanError.message);

      return NextResponse.json(
        { error: "Could not verify Chairman permissions." },
        { status: 500 }
      );
    }

    if (
      chairman?.email?.toLowerCase() !== CHAIRMAN_EMAIL ||
      chairman?.is_chairman !== true
    ) {
      return NextResponse.json(
        { error: "Your account is not authorised as Chairman." },
        { status: 403 }
      );
    }

    // ---------------------------------------------------------
    // 1. Read registered worker profiles.
    // ---------------------------------------------------------

    const { data: profiles, error: profileError } = await admin
      .from("worker_profiles")
      .select(
        "user_id, worker_id, full_name, email, city, state, accent, status, created_at"
      );

    if (profileError) {
      console.error("Worker profiles:", profileError.message);

      return NextResponse.json(
        { error: "Could not read worker profiles." },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 2. Read existing workers table.
    // ---------------------------------------------------------

    const { data: registeredWorkers, error: workersError } = await admin
      .from("workers")
      .select("worker_id, full_name");

    if (workersError) {
      console.error("Workers table:", workersError.message);

      return NextResponse.json(
        { error: "Could not read the workers table." },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 3. Get per-worker recording counts.
    //
    // IMPORTANT:
    // The database does the COUNT(*).
    // We do NOT download thousands of recording rows.
    // ---------------------------------------------------------

    const countsMap = new Map<string, number>();

    const {
      data: rpcCounts,
      error: rpcError,
    } = await admin.rpc("get_worker_recording_counts");

    if (!rpcError && Array.isArray(rpcCounts)) {
      for (const row of rpcCounts) {
        if (!row?.worker_id) continue;

        const workerId = String(row.worker_id);
        const recordingCount = Number(row.recordings_count || 0);

        countsMap.set(workerId, recordingCount);
      }
    } else {
      // Safe fallback.
      //
      // We intentionally DO NOT download the recordings table.
      // If the RPC is unavailable, we simply return zero per-worker
      // counts rather than bringing thousands of rows into memory.
      //
      // Once the SQL function is installed, the RPC path above
      // will provide the real counts.

      console.warn(
        "get_worker_recording_counts RPC failed:",
        rpcError?.message || "Unknown RPC error"
      );
    }

    // ---------------------------------------------------------
    // 4. Get the TRUE total number of recordings directly from
    // the database.
    //
    // This counts ALL recordings, including rows whose worker_id
    // may be NULL.
    // ---------------------------------------------------------

    const {
      count: totalRecordingsExact,
      error: totalRecordingsError,
    } = await admin
      .from("recordings")
      .select("*", {
        count: "exact",
        head: true,
      });

    if (totalRecordingsError) {
      console.error(
        "Total recordings count:",
        totalRecordingsError.message
      );

      return NextResponse.json(
        { error: "Could not count recording history." },
        { status: 500 }
      );
    }

    // ---------------------------------------------------------
    // 5. Build worker map.
    // ---------------------------------------------------------

    const workerMap = new Map<string, any>();

    // Profiles first.
    for (const worker of profiles || []) {
      if (!worker.worker_id) continue;

      const workerId = String(worker.worker_id);

      workerMap.set(workerId, {
        user_id: worker.user_id,
        worker_id: workerId,
        full_name: worker.full_name,
        email: worker.email,
        city: worker.city,
        state: worker.state,
        accent: worker.accent,
        status: worker.status || "Registered",
        created_at: worker.created_at,
        recordings_count: countsMap.get(workerId) || 0,
      });
    }

    // Existing workers table.
    for (const worker of registeredWorkers || []) {
      if (!worker.worker_id) continue;

      const workerId = String(worker.worker_id);
      const existing = workerMap.get(workerId);

      workerMap.set(workerId, {
        ...(existing || {}),
        user_id: existing?.user_id || workerId,
        worker_id: workerId,
        full_name: existing?.full_name || worker.full_name,
        status: existing?.status || "Registered",
        recordings_count:
          countsMap.get(workerId) ||
          existing?.recordings_count ||
          0,
      });
    }

    // Include recording-only workers.
    //
    // These are workers that appear in recordings but don't have
    // a matching profile/workers-table row.
    for (const [workerId, recordingCount] of countsMap.entries()) {
      if (workerMap.has(workerId)) continue;

      workerMap.set(workerId, {
        user_id: workerId,
        worker_id: workerId,
        full_name: workerId,
        email: null,
        city: null,
        state: null,
        accent: null,
        status: "Recording activity",
        created_at: null,
        recordings_count: recordingCount,
      });
    }

    // Sort workers by recording count, highest first.
    const workers = Array.from(workerMap.values()).sort(
      (a, b) =>
        Number(b.recordings_count || 0) -
        Number(a.recordings_count || 0)
    );

    // ---------------------------------------------------------
    // 6. Return Chairman worker data.
    // ---------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        workers,
        total: workers.length,

        // TRUE database total.
        totalRecordings: totalRecordingsExact ?? 0,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Chairman workers API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}