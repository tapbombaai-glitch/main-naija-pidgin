import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

// New campaign start.
// Recordings before this date retain their existing historical earnings.
const CAMPAIGN_START_ISO = "2026-11-21T16:00:00.000Z";
const CAMPAIGN_START_MS = new Date(CAMPAIGN_START_ISO).getTime();

const PIDGIN_REWARD = 20;
const NIGERIAN_ENGLISH_REWARD = 30;

// Verify Chairman identity and database profile.
async function verifyChairman(req: NextRequest) {
  const auth = req.headers.get("authorization");

  if (!auth?.startsWith("Bearer ")) {
    return { error: "Missing token", status: 401 };
  }

  const token = auth.slice(7);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return {
      error: "Supabase configuration missing",
      status: 500,
    };
  }

  const client = createClient(url, anon, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser(token);

  if (
    authError ||
    !user ||
    user.email?.toLowerCase() !== ADMIN_EMAIL
  ) {
    return {
      error: "Chairman only",
      status: 403,
    };
  }

  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("profiles")
      .select("email, is_chairman")
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.email?.toLowerCase() !== ADMIN_EMAIL ||
    profile.is_chairman !== true
  ) {
    return {
      error: "Chairman profile verification failed",
      status: 403,
    };
  }

  return { user };
}

// Identify the recording dataset.
function getRecordingReward(
  language: string,
  duration: number
): { reward: number | null; error?: string } {
  const normalized = language.trim().toLowerCase();

  // Main Naija Pidgin.
  if (
    normalized === "pidgin" ||
    normalized === "main_naija_pidgin"
  ) {
    if (duration < 11 || duration > 15) {
      return {
        reward: null,
        error:
          "Pidgin recordings must be between 11 and 15 seconds.",
      };
    }

    return { reward: PIDGIN_REWARD };
  }

  // Nigerian English dataset.
  if (
    normalized === "nigerian_english" ||
    normalized === "nigerian-voice"
  ) {
    if (duration < 60) {
      return {
        reward: null,
        error:
          "Nigerian English recordings must be at least 60 seconds.",
      };
    }

    return { reward: NIGERIAN_ENGLISH_REWARD };
  }

  return {
    reward: null,
    error: `Unrecognized recording dataset: ${language}`,
  };
}

// APPROVE OR REJECT RECORDING.
export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyChairman(req);

    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await req.json();

    const id = body.id;
    const status = body.status;

    if (
      typeof id !== "string" ||
      !id.trim() ||
      !["approved", "rejected"].includes(status)
    ) {
      return NextResponse.json(
        {
          error:
            "A valid recording ID and approved/rejected status are required.",
        },
        { status: 400 }
      );
    }

    // Find the selected recording.
    const { data: recording, error: findError } =
      await supabaseAdmin
        .from("recordings")
        .select(
          "id, status, is_approved, language, duration, earnings, created_at"
        )
        .eq("id", id)
        .maybeSingle();

    if (findError) {
      console.error("Recording lookup error:", findError);

      return NextResponse.json(
        { error: "Could not retrieve recording." },
        { status: 500 }
      );
    }

    if (!recording) {
      return NextResponse.json(
        { error: "Recording not found." },
        { status: 404 }
      );
    }

    // Never approve or modify an already-approved recording.
    if (
      recording.status === "approved" ||
      recording.is_approved === true
    ) {
      return NextResponse.json(
        {
          error:
            "This recording has already been approved. Its earnings are protected.",
        },
        { status: 409 }
      );
    }

    // Only pending recordings can be reviewed.
    if (recording.status !== "pending") {
      return NextResponse.json(
        {
          error:
            `This recording is already ${recording.status}. It cannot be reviewed again through this route.`,
        },
        { status: 409 }
      );
    }

    const updateData: Record<string, any> = {
      status,
      is_approved: status === "approved",
    };

    // Calculate reward only for new campaign recordings.
    if (status === "approved") {
      const createdAt = new Date(
        recording.created_at
      ).getTime();

      if (!Number.isFinite(createdAt)) {
        return NextResponse.json(
          { error: "Recording creation date is invalid." },
          { status: 400 }
        );
      }

      if (createdAt >= CAMPAIGN_START_MS) {
        const duration = Number(recording.duration);

        if (
          !Number.isFinite(duration) ||
          duration <= 0
        ) {
          return NextResponse.json(
            { error: "Recording duration is invalid." },
            { status: 400 }
          );
        }

        const result = getRecordingReward(
          String(recording.language || ""),
          duration
        );

        if (result.error || result.reward === null) {
          return NextResponse.json(
            { error: result.error },
            { status: 400 }
          );
        }

        // Server calculates the approved reward.
        updateData.earnings = result.reward;
      }

      // Older recordings keep their existing earnings.
    }

    // Atomic status check prevents two simultaneous approvals.
    const { data: updated, error: updateError } =
      await supabaseAdmin
        .from("recordings")
        .update(updateData)
        .eq("id", id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

    if (updateError) {
      console.error("Recording update error:", updateError);

      return NextResponse.json(
        { error: "Recording update failed." },
        { status: 500 }
      );
    }

    // Another request may have reviewed it first.
    if (!updated) {
      return NextResponse.json(
        {
          error:
            "This recording has already been reviewed. Refresh the page.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Recording ${status} successfully.`,
      reward:
        status === "approved"
          ? updateData.earnings ?? recording.earnings
          : 0,
    });
  } catch (error) {
    console.error("Chairman recording approval error:", error);

    return NextResponse.json(
      { error: "Recording update failed." },
      { status: 500 }
    );
  }
}

// Permanent recording deletion is intentionally disabled.
// Recordings and their historical records must be preserved.
export async function DELETE() {
  return NextResponse.json(
    {
      error:
        "Recording deletion is disabled. Recordings must be preserved.",
    },
    { status: 403 }
  );
}