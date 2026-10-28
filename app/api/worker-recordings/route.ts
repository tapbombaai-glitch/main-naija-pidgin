import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "../../../lib/supabase-admin";
import {
  CHAIRMAN_EMAIL,
  MAX_AUDIO_BYTES,
  SUPPORTED_LANGUAGES,
} from "../../../lib/constants";

export const runtime = "nodejs";

const STORAGE_BUCKET = "worker-recordings";
const MAX_RECORDING_SECONDS = 60;

const allowedMimeTypes = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function parseBoolean(value: FormDataEntryValue | null): boolean {
  return value === "true";
}

export async function POST(req: NextRequest) {
  let uploadedFilePath: string | null = null;

  try {
    // 1. Require a bearer access token.
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("Missing authorization token.", 401);
    }

    const token = authHeader.slice("Bearer ".length).trim();

    if (!token) {
      return jsonError("Missing authorization token.", 401);
    }

    // 2. Verify the user's token using Supabase Auth.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing public Supabase environment variables.");
      return jsonError("Authentication service is not configured.", 500);
    }

    const supabaseUserClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser(token);

    if (userError || !user) {
      return jsonError("Your session is invalid or has expired. Please log in again.", 401);
    }

    // 3. Prevent the chairman from submitting worker recordings.
    if (
      user.email?.trim().toLowerCase() ===
      CHAIRMAN_EMAIL.trim().toLowerCase()
    ) {
      return jsonError("The chairman account cannot submit worker recordings.", 403);
    }

    // 4. Read the submitted form.
    const formData = await req.formData();

    const audioEntry = formData.get("audio");
    const textEntry = formData.get("text");
    const languageEntry = formData.get("language");

    if (
      !audioEntry ||
      typeof audioEntry === "string" ||
      typeof textEntry !== "string"
    ) {
      return jsonError("Audio and recording text are required.", 400);
    }

    const audioFile = audioEntry;
    const text = textEntry.trim();

    if (!text) {
      return jsonError("Recording text cannot be empty.", 400);
    }

    if (text.length > 5000) {
      return jsonError("Recording text is too long.", 400);
    }

    if (audioFile.size <= 0) {
      return jsonError("The audio file is empty.", 400);
    }

    if (audioFile.size > MAX_AUDIO_BYTES) {
      return jsonError("The audio file exceeds the 15 MB limit.", 413);
    }

    // 5. Validate the audio type.
    const mimeType = audioFile.type
      .split(";")[0]
      .trim()
      .toLowerCase();

    if (!allowedMimeTypes.has(mimeType)) {
      return jsonError(
        "Unsupported audio format. Please record using a supported audio format.",
        415
      );
    }

    // 6. Validate the language.
    const language =
      typeof languageEntry === "string" ? languageEntry.trim().toLowerCase() : "pidgin";

    if (
      !SUPPORTED_LANGUAGES.some(
        (supportedLanguage) => supportedLanguage === language
      )
    ) {
      return jsonError("Unsupported language.", 400);
    }

    // 7. Read recording metadata.
    const isFreeTalk = parseBoolean(
      formData.get("isFreeTalk") ?? formData.get("is_free_talk")
    );

    const isWhatsAppGroup = parseBoolean(
      formData.get("isWhatsAppGroup") ??
        formData.get("is_whatsapp_group")
    );

    const durationRaw =
      formData.get("durationSeconds") ??
      formData.get("duration_seconds");

    const parsedDuration =
      typeof durationRaw === "string" ? Number(durationRaw) : 0;

    if (
      !Number.isFinite(parsedDuration) ||
      parsedDuration < 0 ||
      parsedDuration > MAX_RECORDING_SECONDS
    ) {
      return jsonError("Recording duration must be between 0 and 60 seconds.", 400);
    }

    const durationSeconds = Math.floor(parsedDuration);

    // 8. Generate a storage path under this authenticated user's ID.
    const extensionByMimeType: Record<string, string> = {
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/mp4": "m4a",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
    };

    const extension = extensionByMimeType[mimeType] ?? "webm";

    const randomId = crypto.randomUUID();
    const filePath = `${user.id}/${Date.now()}-${randomId}.${extension}`;

    // 9. Upload the audio to private Supabase Storage.
    const audioBuffer = await audioFile.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, audioBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Worker recording storage upload failed:", uploadError.message);
      return jsonError("Failed to upload the recording. Please try again.", 500);
    }

    uploadedFilePath = filePath;

    // 10. Insert the recording metadata.
    const { data: insertedRecording, error: insertError } =
      await supabaseAdmin
        .from("worker_recordings")
        .insert({
          user_id: user.id,
          email: user.email ?? null,
          text,
          language,
          storage_path: filePath,
          duration_seconds: durationSeconds,
          is_free_talk: isFreeTalk,
          is_whatsapp_group: isWhatsAppGroup,
          status: "pending",
          file_size: audioFile.size,
          mime_type: mimeType,
        })
        .select("id")
        .single();

    if (insertError) {
      console.error("Worker recording database insert failed:", insertError.message);

      // 11. Remove the uploaded file if its database record could not be saved.
      const { error: cleanupError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (cleanupError) {
        console.error(
          "Could not remove orphaned recording file:",
          cleanupError.message
        );
      } else {
        uploadedFilePath = null;
      }

      return jsonError("Failed to save the recording. Please try again.", 500);
    }

    uploadedFilePath = null;

    // 12. Return a successful response.
    return NextResponse.json(
      {
        success: true,
        message: "Recording submitted for chairman review.",
        recordingId: insertedRecording.id,
        status: "pending",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Worker recording API error:", error);

    // Best-effort cleanup if an unexpected error occurs after uploading.
    if (uploadedFilePath) {
      const { error: cleanupError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([uploadedFilePath]);

      if (cleanupError) {
        console.error(
          "Unexpected-error cleanup failed:",
          cleanupError.message
        );
      }
    }

    return jsonError("An unexpected server error occurred.", 500);
  }
}