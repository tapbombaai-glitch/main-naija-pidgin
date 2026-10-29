import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "voices";
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}

function getExtension(mime: string) {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg")) return "mp3";

  return "webm";
}

async function authenticateWorker(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      error: "Please log in before continuing.",
    };
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return {
      user: null,
      error: "Your session is invalid. Please log in again.",
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      user: null,
      error: "Authentication is not configured.",
    };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    return {
      user: null,
      error: "Your session has expired. Please log in again.",
    };
  }

  return {
    user: data.user,
    error: null,
  };
}

function isBlockedStatus(status: unknown) {
  const value = String(status ?? "").toLowerCase();

  return ["blocked", "suspended", "disabled"].includes(value);
}

/**
 * GET /api/worker-recordings
 *
 * Returns only the authenticated worker's recordings.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateWorker(request);

    if (!auth.user) {
      return jsonError(auth.error || "Unauthorized", 401);
    }

    const userId = auth.user.id;

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, display_name, status")
        .eq("id", userId)
        .maybeSingle();

    if (profileError) {
      console.error("Profile lookup failed:", profileError.message);
      return jsonError("Could not load your profile.", 500);
    }

    if (!profile || isBlockedStatus(profile.status)) {
      return jsonError("Your account cannot access recordings.", 403);
    }

    const { data: recordings, error } = await supabaseAdmin
      .from("recordings")
      .select(
        "id, user_id, file_name, audio_path, pidgin_text, transcription, language, word_count, recording_number, is_free_talk, is_whatsapp_group, admin_status, created_at, duration_seconds"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Recording lookup failed:", error.message);
      return jsonError("Could not load your recordings.", 500);
    }

    const result = await Promise.all(
      (recordings || []).map(async (recording) => {
        let audioUrl: string | null = null;

        if (recording.audio_path) {
          const { data, error: signError } =
            await supabaseAdmin.storage
              .from(BUCKET)
              .createSignedUrl(recording.audio_path, 60);

          if (!signError && data?.signedUrl) {
            audioUrl = data.signedUrl;
          }
        }

        return {
          ...recording,
          audio_url: audioUrl,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        profile,
        recordings: result,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Worker recordings GET failed:", error);
    return jsonError("Unexpected server error.", 500);
  }
}

/**
 * POST /api/worker-recordings
 *
 * Uploads an audio file and saves its database record.
 *
 * Request: multipart/form-data
 * Fields:
 *   audio
 *   mode
 *   language
 *   text
 *   duration
 */
export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null;

  try {
    const auth = await authenticateWorker(request);

    if (!auth.user) {
      return jsonError(auth.error || "Unauthorized", 401);
    }

    const user = auth.user;

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id, status")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error("Profile lookup failed:", profileError.message);
      return jsonError("Could not verify your worker profile.", 500);
    }

    if (!profile || isBlockedStatus(profile.status)) {
      return jsonError("Your account cannot submit recordings.", 403);
    }

    const formData = await request.formData();

    const audio = formData.get("audio");
    const mode = String(formData.get("mode") || "");
    const language = String(formData.get("language") || "pidgin");
    const text = String(formData.get("text") || "");
    const duration = Number(formData.get("duration") || 0);

    if (!(audio instanceof File)) {
      return jsonError("Select or record an audio file first.", 400);
    }

    if (!["free_talk", "read_text"].includes(mode)) {
      return jsonError("Invalid recording mode.", 400);
    }

    if (audio.size === 0 || audio.size > MAX_FILE_SIZE) {
      return jsonError(
        "Audio must be greater than 0 bytes and no larger than 25 MB.",
        400
      );
    }

    const allowedTypes = [
      "audio/webm",
      "audio/mp4",
      "audio/ogg",
      "audio/wav",
      "audio/mpeg",
      "audio/x-wav",
      "application/octet-stream",
    ];

    if (!allowedTypes.includes(audio.type)) {
      return jsonError(
        "Unsupported audio format. Please record again using your browser.",
        415
      );
    }

    if (
      !Number.isFinite(duration) ||
      duration < 1 ||
      duration > 3600
    ) {
      return jsonError("Invalid recording duration.", 400);
    }

    const extension = getExtension(audio.type);

    const fileName = `${Date.now()}-${randomUUID()}.${extension}`;

    // Every file belongs to the