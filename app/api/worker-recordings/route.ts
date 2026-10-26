// app/api/worker-recordings/route.ts
// Main Naija Pidgin — Secure Worker Recording Upload
// Step 1: Worker Panel
// Payment integration is intentionally not included.

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

function response(
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

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Worker upload: Supabase server configuration missing.");

    return response(500, {
      error: "Recording service is not configured.",
    });
  }

  const authorization = req.headers.get("authorization") || "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  const accessToken = tokenMatch?.[1]?.trim();

  if (!accessToken) {
    return response(401, {
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

  try {
    // 1. Verify the actual Supabase user.
    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return response(401, {
        error: "Your session has expired. Please log in again.",
      });
    }

    const user = authData.user;

    // 2. Read and validate the submitted form.
    const formData = await req.formData();

    const audio = formData.get("audio");
    const text = formData.get("text");
    const language = formData.get("language");
    const freeTalkValue = formData.get("isFreeTalk");

    if (!(audio instanceof File)) {
      return response(400, {
        error: "Audio recording is missing.",
      });
    }

    if (audio.size <= 0 || audio.size > 15 * 1024 * 1024) {
      return response(400, {
        error: "Recording must be smaller than 15 MB.",
      });
    }

    const allowedTypes = new Set([
      "audio/webm",
      "audio/webm;codecs=opus",
      "audio/ogg",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
    ]);

    if (!allowedTypes.has(audio.type.toLowerCase())) {
      return response(400, {
        error: "Unsupported audio format. Please record again.",
      });
    }

    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.trim().length > 5000
    ) {
      return response(400, {
        error: "Enter the sentence or text you recorded.",
      });
    }

    const validLanguages = new Set([
      "pidgin",
      "hausa",
      "igbo",
      "yoruba",
    ]);

    const selectedLanguage =
      typeof language === "string"
        ? language.trim().toLowerCase()
        : "";

    if (!validLanguages.has(selectedLanguage)) {
      return response(400, {
        error: "Please select a supported language.",
      });
    }

    if (
      freeTalkValue !== "true" &&
      freeTalkValue !== "false"
    ) {
      return response(400, {
        error: "Invalid recording type.",
      });
    }

    const isFreeTalk = freeTalkValue === "true";

    // 3. Build a private, user-owned storage path.
    const mime = audio.type.toLowerCase();

    const extension =
      mime.includes("ogg") ? "ogg" :
      mime.includes("mp4") ? "m4a" :
      mime.includes("mpeg") ? "mp3" :
      mime.includes("wav") ? "wav" :
      "webm";

    const fileName =
      `${user.id}/${Date.now()}-${randomUUID()}.${extension}`;

    const audioBuffer = Buffer.from(
      await audio.arrayBuffer()
    );

    // 4. Upload the audio to the private "voices" bucket.
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

      return response(500, {
        error: "Could not upload your recording. Please try again.",
      });
    }

    // 5. Save the recording metadata.
    // Do not accept a user_id from the browser:
    // the authenticated Supabase user determines ownership.
    const wordCount = text.trim().split(/\s+/).length;

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
        word_count: wordCount,
        language: selectedLanguage,
        admin_status: "pending",
        is_free_talk: isFreeTalk,
        locked_for_worker: false,
      })
      .select("id,admin_status,file_name,created_at")
      .single();

    if (insertError || !recording) {
      console.error(
        "Worker recording database insert failed:",
        insertError?.message
      );

      // Remove the uploaded file if its database record could not be saved.
      const { error: cleanupError } = await supabaseAdmin.storage
        .from("voices")
        .remove([fileName]);

      if (cleanupError) {
        console.error(
          "Worker upload cleanup failed:",
          cleanupError.message
        );
      }

      return response(500, {
        error:
          "Your recording could not be saved. Please contact the Chairman if this continues.",
      });
    }

    // 6. Confirm submission without exposing a public storage URL.
    return response(201, {
      success: true,
      message: "Recording submitted for Chairman review.",
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

    return response(500, {
      error: "An unexpected error occurred while submitting your recording.",
    });
  }
}