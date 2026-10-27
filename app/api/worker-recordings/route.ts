// app/api/worker-recordings/route.ts
// Main Naija Pidgin — Secure Worker Recording Upload
// Upgrade 1: Authentication, suspension checks, private storage,
// recording metadata, and cleanup if the database insert fails.
// Customer API payment integration is intentionally excluded.

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_RECORDING_SECONDS = 60;
const MAX_TEXT_LENGTH = 5000;

const VALID_LANGUAGES = new Set([
  "pidgin",
  "hausa",
  "igbo",
  "yoruba",
]);

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

function respond(
  status: number,
  body: Record<string, unknown>
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}

function getExtension(mimeType: string): string {
  const mime = mimeType.toLowerCase();

  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("mpeg")) return "mp3";
  if (mime.includes("wav")) return "wav";

  return "webm";
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Worker upload: server-side Supabase configuration is missing."
    );

    return respond(500, {
      error: "Recording service is not configured.",
    });
  }

  // 1. Require a valid Supabase access token.
  const authorization = req.headers.get("authorization") || "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  const accessToken = tokenMatch?.[1]?.trim();

  if (!accessToken) {
    return respond(401, {
      error: "Please log in before submitting a recording.",
    });
  }

  const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  let uploadedFileName: string | null = null;

  try {
    // 2. Verify the real Supabase user.
    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return respond(401, {
        error: "Your session has expired. Please log in again.",
      });
    }

    const user = authData.user;

    // 3. Enforce account suspension on the server.
    // Do not rely only on disabled buttons in the browser.
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id,status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Worker upload: profile lookup failed:",
        profileError.message
      );

      return respond(500, {
        error: "Could not verify your worker account.",
      });
    }

    if (!profile) {
      return respond(403, {
        error: "Your worker profile could not be found.",
      });
    }

    if ((profile.status || "").toLowerCase() === "suspended") {
      return respond(403, {
        error: "Your worker account is suspended. Contact the Chairman.",
      });
    }

    // 4. Parse and validate the submitted form.
    const formData = await req.formData();

    const audio = formData.get("audio");
    const text = formData.get("text");
    const language = formData.get("language");
    const freeTalkValue = formData.get("isFreeTalk");
    const whatsappValue = formData.get("isWhatsAppGroup");
    const durationValue = formData.get("durationSeconds");

    if (!(audio instanceof File)) {
      return respond(400, {
        error: "Audio recording is missing.",
      });
    }

    if (audio.size <= 0 || audio.size > MAX_AUDIO_BYTES) {
      return respond(400, {
        error: "Recording must be greater than zero and no larger than 15 MB.",
      });
    }

    const audioType = audio.type.toLowerCase();

    if (!ALLOWED_AUDIO_TYPES.has(audioType)) {
      return respond(400, {
        error: "Unsupported audio format. Please record again.",
      });
    }

    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.trim().length > MAX_TEXT_LENGTH
    ) {
      return respond(400, {
        error: "Enter the sentence or text you recorded.",
      });
    }

    const selectedLanguage =
      typeof language === "string"
        ? language.trim().toLowerCase()
        : "";

    if (!VALID_LANGUAGES.has(selectedLanguage)) {
      return respond(400, {
        error: "Please select a supported language.",
      });
    }

    if (
      freeTalkValue !== "true" &&
      freeTalkValue !== "false"
    ) {
      return respond(400, {
        error: "Invalid recording type.",
      });
    }

    if (
      whatsappValue !== "true" &&
      whatsappValue !== "false"
    ) {
      return respond(400, {
        error: "Invalid WhatsApp-group selection.",
      });
    }

    const isFreeTalk = freeTalkValue === "true";
    const isWhatsAppGroup = whatsappValue === "true";

    // The browser supplies this value for display/statistics.
    // It is not proof that the actual audio duration is valid.
    let durationSeconds: number | null = null;

    if (
      typeof durationValue === "string" &&
      durationValue.trim() !== ""
    ) {
      const parsedDuration = Number(durationValue);

      if (
        !Number.isInteger(parsedDuration) ||
        parsedDuration < 0 ||
        parsedDuration > MAX_RECORDING_SECONDS
      ) {
        return respond(400, {
          error: "Recording duration must be between 0 and 60 seconds.",
        });
      }

      durationSeconds = parsedDuration;
    }

    // 5. Generate a storage path from the authenticated user ID.
    // The client cannot choose another user's storage folder.
    const fileName =
      `${user.id}/${Date.now()}-${randomUUID()}.${getExtension(audioType)}`;

    const audioBuffer = Buffer.from(
      await audio.arrayBuffer()
    );

    // 6. Upload to the private Supabase Storage bucket.
    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from("voices")
      .upload(fileName, audioBuffer, {
        contentType: audio.type,
        upsert: false,
      });

    if (uploadError) {
      console.error(
        "Worker audio upload failed:",
        uploadError.message
      );

      return respond(500, {
        error: "Could not upload your recording. Please try again.",
      });
    }

    uploadedFileName = fileName;

    // 7. Save recording metadata using the verified user ID.
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    const {
      data: recording,
      error: insertError,
    } = await supabaseAdmin
      .from("recordings")
      .insert({
        user_id: user.id,
        file_name: fileName,
        audio_path: fileName,
        pidgin_text: text.trim(),
        transcription: text.trim(),
        word_count: wordCount,
        language: selectedLanguage,
        admin_status: "pending",
        is_free_talk: isFreeTalk,
        is_whatsapp_group: isWhatsAppGroup,
        duration_seconds: durationSeconds,

        // Keep the existing lock behavior until the playback
        // endpoint is updated and verified separately.
        locked_for_worker: false,
      })
      .select("id,admin_status,created_at")
      .single();

    if (insertError || !recording) {
      console.error(
        "Worker recording database insert failed:",
        insertError?.message
      );

      // 8. Clean up the uploaded file if saving the database row failed.
      const {
        error: cleanupError,
      } = await supabaseAdmin.storage
        .from("voices")
        .remove([fileName]);

      if (cleanupError) {
        console.error(
          "Worker upload cleanup failed:",
          cleanupError.message
        );
      } else {
        uploadedFileName = null;
      }

      return respond(500, {
        error:
          "Your recording could not be saved. Please try again or contact the Chairman.",
      });
    }

    uploadedFileName = null;

    // 9. Return metadata only, never a public storage URL.
    return respond(201, {
      success: true,
      message: "Recording submitted to the Chairman for review.",
      recording: {
        id: recording.id,
        status: recording.admin_status,
        created_at: recording.created_at,
      },
    });
  } catch (error) {
    console.error(
      "Unexpected worker upload error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    // Best-effort cleanup for unexpected errors after uploading.
    if (uploadedFileName) {
      const {
        error: cleanupError,
      } = await supabaseAdmin.storage
        .from("voices")
        .remove([uploadedFileName]);

      if (cleanupError) {
        console.error(
          "Unexpected-error cleanup failed:",
          cleanupError.message
        );
      }
    }

    return respond(500, {
      error: "An unexpected error occurred while submitting your recording.",
    });
  }
}