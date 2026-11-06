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

    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

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

    // Verify the actual logged-in user.
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your session is invalid. Please log in again." },
        { status: 401 }
      );
    }

    // Only the authorised Chairman can access this endpoint.
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
      console.error("Chairman verification failed:", chairmanError.message);
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

    // Read the real worker profiles.
    const { data: workers, error: workersError } = await admin
      .from("worker_profiles")
      .select(
        "user_id, worker_id, full_name, email, city, state, accent, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (workersError) {
      console.error("Worker list failed:", workersError.message);
      return NextResponse.json(
        { error: "Could not load worker profiles." },
        { status: 500 }
      );
    }

    // Count recordings without changing or deleting any records.
    const { data: recordings, error: recordingsError } = await admin
      .from("recordings")
      .select("worker_id");

    if (recordingsError) {
      console.error("Recording count failed:", recordingsError.message);
      return NextResponse.json(
        { error: "Could not count worker recordings." },
        { status: 500 }
      );
    }

    const recordingCounts: Record<string, number> = {};

    for (const recording of recordings || []) {
      const id = recording.worker_id;

      if (id) {
        recordingCounts[id] = (recordingCounts[id] || 0) + 1;
      }
    }

    const result = (workers || []).map((worker) => ({
      ...worker,
      recordings_count: worker.worker_id
        ? recordingCounts[worker.worker_id] || 0
        : 0,
    }));

    return NextResponse.json(
      {
        success: true,
        workers: result,
        total: result.length,
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