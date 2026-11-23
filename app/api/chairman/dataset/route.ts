import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

async function verifyChairman(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      ),
    };
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey);

  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser(token);

  if (
    authError ||
    !user ||
    user.email?.toLowerCase() !== ADMIN_EMAIL
  ) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Chairman access only" },
        { status: 403 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("email,is_chairman")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.email?.toLowerCase() !== ADMIN_EMAIL ||
    profile.is_chairman !== true
  ) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "Chairman permission not verified" },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}

// GET: Load dataset recordings with their worker names and IDs.
export async function GET(request: NextRequest) {
  try {
    const { user, error: authResponse } =
      await verifyChairman(request);

    if (authResponse || !user) {
      return authResponse!;
    }

    const { data: recordings, error: recordingsError } =
      await supabaseAdmin
        .from("dataset_recordings")
        .select("*")
        .order("created_at", { ascending: false });

    if (recordingsError) {
      console.error(
        "Chairman dataset load error:",
        recordingsError
      );

      return NextResponse.json(
        { error: "Could not load dataset recordings" },
        { status: 500 }
      );
    }

    const userIds = [
      ...new Set(
        (recordings || [])
          .map((item) => item.user_id)
          .filter(Boolean)
      ),
    ];

    let workers: any[] = [];

    if (userIds.length > 0) {
      const { data, error: workersError } = await supabaseAdmin
        .from("workers")
        .select("auth_user_id,worker_id,full_name")
        .in("auth_user_id", userIds);

      if (workersError) {
        console.error(
          "Chairman dataset worker lookup error:",
          workersError
        );

        return NextResponse.json(
          { error: "Could not load contributor details" },
          { status: 500 }
        );
      }

      workers = data || [];
    }

    const workerMap = new Map(
      workers.map((worker) => [
        worker.auth_user_id,
        {
          worker_id: worker.worker_id,
          worker_name: worker.full_name,
        },
      ])
    );

    const results = (recordings || []).map((recording) => {
      const worker = workerMap.get(recording.user_id);

      return {
        ...recording,
        worker_id: worker?.worker_id || "Not linked",
        worker_name: worker?.worker_name || "Unknown contributor",
      };
    });

    return NextResponse.json(
      { success: true, recordings: results },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Chairman dataset GET error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Approve or reject one pending dataset recording.
export async function POST(request: NextRequest) {
  try {
    const { user, error: authResponse } =
      await verifyChairman(request);

    if (authResponse || !user) {
      return authResponse!;
    }

    const body = await request.json();

    const id = String(body.id || "").trim();
    const status = String(body.status || "")
      .trim()
      .toLowerCase();

    if (!id || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        {
          error: "A valid recording ID and status are required",
        },
        { status: 400 }
      );
    }

    // Only pending submissions can be reviewed.
    // The recording and audio file are never deleted.
    const { data, error } = await supabaseAdmin
      .from("dataset_recordings")
      .update({ status })
      .eq("id", id)
      .eq("status", "pending")
      .select("id,status")
      .maybeSingle();

    if (error) {
      console.error(
        "Chairman dataset update error:",
        error
      );

      return NextResponse.json(
        { error: "Could not update dataset recording" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error:
            "Recording not found or it has already been reviewed",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Dataset recording ${status} successfully`,
      recording: data,
    });
  } catch (error) {
    console.error("Chairman dataset API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}