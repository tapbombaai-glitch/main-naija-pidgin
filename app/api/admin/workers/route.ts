import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

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

    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return NextResponse.json(
        { error: "Chairman access only." },
        { status: 403 }
      );
    }

    const { data: chairman, error: chairmanError } = await admin
      .from("profiles")
      .select("email, is_chairman")
      .eq("id", user.id)
      .maybeSingle();

    if (chairmanError) {
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

    // Read registered worker profiles.
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

    // Read the existing workers table.
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

    // Read worker IDs from recordings.
    const { data: recordings, error: recordingsError } = await admin
      .from("recordings")
      .select("worker_id");

    if (recordingsError) {
      console.error("Recordings:", recordingsError.message);
      return NextResponse.json(
        { error: "Could not read worker recording history." },
        { status: 500 }
      );
    }

    const workerMap = new Map<string, any>();

    // Add profiles first.
    for (const worker of profiles || []) {
      if (!worker.worker_id) continue;

      workerMap.set(worker.worker_id, {
        user_id: worker.user_id,
        worker_id: worker.worker_id,
        full_name: worker.full_name,
        email: worker.email,
        city: worker.city,
        state: worker.state,
        accent: worker.accent,
        status: worker.status || "Registered",
        created_at: worker.created_at,
        recordings_count: 0,
      });
    }

    // Add workers from the existing workers table.
    for (const worker of registeredWorkers || []) {
      if (!worker.worker_id) continue;

      const existing = workerMap.get(worker.worker_id);

      workerMap.set(worker.worker_id, {
        ...(existing || {}),
        user_id: existing?.user_id || worker.worker_id,
        worker_id: worker.worker_id,
        full_name: existing?.full_name || worker.full_name,
        status: existing?.status || "Registered",
        recordings_count: existing?.recordings_count || 0,
      });
    }

    // Count recordings and include recording-only workers.
    for (const recording of recordings || []) {
      const id = recording.worker_id;

      if (!id) continue;

      const existing = workerMap.get(id);

      if (existing) {
        existing.recordings_count += 1;
      } else {
        workerMap.set(id, {
          user_id: id,
          worker_id: id,
          full_name: id,
          email: null,
          city: null,
          state: null,
          accent: null,
          status: "Recording activity",
          created_at: null,
          recordings_count: 1,
        });
      }
    }

    const workers = Array.from(workerMap.values()).sort(
      (a, b) => b.recordings_count - a.recordings_count
    );

    return NextResponse.json(
      {
        success: true,
        workers,
        total: workers.length,
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