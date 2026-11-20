// app/api/chairman/voice/create/route.ts
// MAIN NAIJA PIDGIN
// V4.3 PRODUCTION - CREATE ONLY
// NO AUTO-PUBLISH
// CHAIRMAN ONLY
// EXISTING VOICES ARE NEVER DELETED OR UPDATED

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseBuffer } from "music-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const MAX_AUDIO_SIZE = 15 * 1024 * 1024;
const MIN_AUDIO_SIZE = 30 * 1024;
const MIN_DURATION = 30;
const MAX_DURATION = 180;

const PROTECTED_NAMES = [
  "main naija pidgin",
  "main naija pidgin male",
  "warri babe",
  "warri boy",
];

const ALLOWED_EXTENSIONS = [
  "wav",
  "mp3",
  "m4a",
  "webm",
  "ogg",
  "flac",
  "aac",
];

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const elevenLabsKey =
  process.env.ELEVENLABS_API_KEY;

function response(
  success: boolean,
  message: string,
  status = 200,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    { success, message, ...extra },
    { status }
  );
}

export async function POST(req: NextRequest) {
  let createdVoiceId: string | null = null;
  let pendingName = "";
  let pendingCategory = "male";
  let pendingDesc = "";
  let admin: any = null;

  try {
    // 1. SERVER CONFIGURATION
    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !elevenLabsKey
    ) {
      return response(
        false,
        "Server configuration is incomplete.",
        500
      );
    }

    // 2. REQUEST SIZE PROTECTION
    const contentLength = Number(
      req.headers.get("content-length") || 0
    );

    if (contentLength > MAX_AUDIO_SIZE + 500_000) {
      return response(
        false,
        "Audio upload exceeds the allowed size.",
        413
      );
    }

    // 3. CHAIRMAN AUTHENTICATION
    const authorization =
      req.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return response(
        false,
        "Please log in as Chairman.",
        401
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return response(
        false,
        "Invalid session. Please log in again.",
        401
      );
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (
      authError ||
      !user ||
      user.email?.trim().toLowerCase() !== CHAIRMAN_EMAIL
    ) {
      return response(
        false,
        "Chairman access only.",
        403
      );
    }

    // 4. READ UPLOAD
    const formData = await req.formData();

    const name = String(
      formData.get("name") || ""
    ).trim();

    const category = String(
      formData.get("gender") ||
      formData.get("category") ||
      "male"
    ).trim().toLowerCase();

    const descriptionInput = String(
      formData.get("description") || ""
    ).trim();

    const voiceDescription =
      descriptionInput ||
      `High quality Naija Pidgin voice - ${name} - ${category}`;

    pendingName = name;
    pendingCategory = category;
    pendingDesc = voiceDescription;

    const audio =
      formData.get("audio") ||
      formData.get("file");

    if (!name || name.length > 100) {
      return response(
        false,
        "Enter a valid voice name.",
        400
      );
    }

    if (!["male", "female"].includes(category)) {
      return response(
        false,
        "Gender must be male or female.",
        400
      );
    }

    if (descriptionInput.length > 1000) {
      return response(
        false,
        "Description cannot exceed 1,000 characters.",
        400
      );
    }

    const normalizedName = name
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();

    if (PROTECTED_NAMES.includes(normalizedName)) {
      return response(
        false,
        "This is a protected Main Naija Pidgin voice name.",
        409
      );
    }

    if (
      !audio ||
      typeof audio === "string" ||
      typeof (audio as File).arrayBuffer !== "function"
    ) {
      return response(
        false,
        "Please upload an audio recording.",
        400
      );
    }

    const file = audio as File;

    if (
      file.size < MIN_AUDIO_SIZE ||
      file.size > MAX_AUDIO_SIZE
    ) {
      return response(
        false,
        "Audio must be between 30KB and 15MB.",
        400
      );
    }

    // 5. CHECK FILE FORMAT
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "";

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return response(
        false,
        "Unsupported audio format. Use WAV, MP3, M4A, WEBM, OGG, FLAC or AAC.",
        400
      );
    }

    const mime = file.type.trim().toLowerCase();
    if (mime.startsWith("video/")) {
      return response(
        false,
        "Video files are not allowed. Upload audio only.",
        400
      );
    }

    // 6. VALIDATE REAL AUDIO DURATION
    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    let duration: number;

    try {
      const metadata = await parseBuffer(
        buffer,
        {
          mimeType: file.type || undefined,
          size: buffer.length,
          path: file.name,
        },
        { duration: true }
      );

      duration = metadata.format.duration || 0;
    } catch {
      return response(
        false,
        "Unable to read this audio file. Please upload a valid recording.",
        400
      );
    }

    if (
      !Number.isFinite(duration) ||
      duration < MIN_DURATION ||
      duration > MAX_DURATION
    ) {
      return response(
        false,
        "Audio must be between 30 and 180 seconds.",
        400
      );
    }

    // 7. SUPABASE ADMIN CLIENT
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
    admin = supabaseAdmin;

    // 8. CHECK EXISTING VOICE NAME - escaped for ilike
    const escapedName = name.replace(/[\\%_]/g, "\\$&");

    const { data: existingVoice, error: lookupError } =
      await supabaseAdmin
        .from("chairman_voices")
        .select("id")
        .ilike("name", escapedName)
        .limit(1)
        .maybeSingle();

    if (lookupError) {
      console.error(
        "Voice lookup failed:",
        lookupError.message
      );

      return response(
        false,
        "Could not verify existing voice names.",
        500
      );
    }

    if (existingVoice) {
      return response(
        false,
        "A voice with this name already exists.",
        409
      );
    }

    // 9. ATOMIC CHAIRMAN RATE LIMIT
    const { error: rateError } =
      await supabaseAdmin.rpc(
        "claim_chairman_voice_creation",
        {
          p_chairman_email: CHAIRMAN_EMAIL,
        }
      );

    if (rateError) {
      const message = rateError.message || "";

      if (
        message.includes("RATE_LIMIT") ||
        message.includes("rate")
      ) {
        return response(
          false,
          "Voice creation limit reached. Please wait before trying again.",
          429
        );
      }

      console.error(
        "Rate limit error:",
        message
      );

      return response(
        false,
        "Could not verify voice creation permission.",
        500
      );
    }

    // 10. SEND AUDIO TO ELEVENLABS
    const elevenLabsForm = new FormData();

    const audioBlob = new Blob(
      [new Uint8Array(buffer)],
      {
        type: file.type || "application/octet-stream",
      }
    );

    elevenLabsForm.append("name", name);
    elevenLabsForm.append("description", voiceDescription);
    elevenLabsForm.append(
      "labels",
      JSON.stringify({
        language: "en",
        accent: "nigerian pidgin",
        gender: category,
        age: "young adult",
        descriptive:
          "clear, energetic, authentic Naija, confident, conversational",
        use_case: "conversational",
      })
    );
    elevenLabsForm.append(
      "files",
      audioBlob,
      file.name || `voice-sample.${extension}`
    );
    elevenLabsForm.append("remove_background_noise", "true");

    const cloneResponse = await fetch(
      "https://api.elevenlabs.io/v1/voices/add",
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
        },
        body: elevenLabsForm,
        cache: "no-store",
        signal: AbortSignal.timeout(90_000),
      }
    );

    let cloneData: any = {};
    try {
      cloneData = await cloneResponse.json();
    } catch {
      cloneData = {};
    }

    if (!cloneResponse.ok) {
      console.error(
        "ElevenLabs cloning error:",
        cloneResponse.status
      );

      return response(
        false,
        cloneData?.detail?.message ||
          cloneData?.detail ||
          cloneData?.message ||
          "ElevenLabs could not clone this voice.",
        cloneResponse.status
      );
    }

    createdVoiceId = cloneData.voice_id;

    if (!createdVoiceId) {
      return response(
        false,
        "ElevenLabs did not return a voice ID.",
        502
      );
    }

    const requiresVerification = Boolean(
      cloneData.requires_verification
    );

    // 11. SAVE AS UNPUBLISHED - NEVER AUTO-PUBLISH
    const { data: savedVoice, error: saveError } =
      await supabaseAdmin
        .from("chairman_voices")
        .insert({
          name,
          description: voiceDescription,
          elevenlabs_voice_id: createdVoiceId,
          category,
          accent: "Naija Pidgin",
          is_active: !requiresVerification,
          is_published: false,
          requires_verification: requiresVerification,
        })
        .select("id, name, elevenlabs_voice_id")
        .single();

    if (saveError) {
      console.error(
        "Main voice save failed:",
        saveError.message
      );

      // 12. ATTEMPT RECOVERY
      const { data: recovery, error: recoveryError } =
        await supabaseAdmin
          .from("chairman_voice_recovery")
          .insert({
            name,
            description: voiceDescription,
            elevenlabs_voice_id: createdVoiceId,
            category,
            error_message: saveError.message,
            status: "orphan_needs_save",
          })
          .select("id")
          .single();

      if (recoveryError) {
        console.error(
          "Voice recovery save failed:",
          recoveryError.message
        );
      }

      return response(
        false,
        recovery
          ? "Voice was cloned, but needs database recovery. Do not clone it again."
          : "Voice was cloned, but database saving and recovery both failed. Keep this voice ID safe.",
        500,
        {
          voice_id: createdVoiceId,
          recovery_saved: !!recovery,
          recovery_id: recovery?.id || null,
        }
      );
    }

    // 13. SUCCESS
    console.log(
      "Chairman voice created:",
      createdVoiceId
    );

    return response(
      true,
      requiresVerification
        ? `${name} cloned and saved privately. Complete ElevenLabs verification before publishing.`
        : `${name} cloned and saved successfully. It is saved privately and has NOT been published.`,
      200,
      {
        voice: savedVoice,
        voice_id: createdVoiceId,
        saved_to_database: true,
        is_published: false,
        requiresVerification,
        duration_seconds: Math.round(duration),
      }
    );

  } catch (error) {
    console.error(
      "Chairman voice creation error:",
      error
    );

    // Preserve voice ID if ElevenLabs already created it
    let recoverySaved = false;
    let recoveryId: string | null = null;

    if (createdVoiceId && admin) {
      try {
        const { data } = await admin
          .from("chairman_voice_recovery")
          .insert({
            name: pendingName,
            description: pendingDesc,
            elevenlabs_voice_id: createdVoiceId,
            category: pendingCategory,
            error_message:
              error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
            status: "orphan_needs_save",
          })
          .select("id")
          .single();
        if (data) {
          recoverySaved = true;
          recoveryId = data.id;
        }
      } catch {}
    }

    return response(
      false,
      createdVoiceId
        ? "ElevenLabs created a voice, but the request failed afterward. Check the recovery records before retrying."
        : "Voice cloning failed. Please check the audio and try again.",
      500,
      {
        voice_id: createdVoiceId,
        needs_recovery: Boolean(createdVoiceId),
        recovery_saved: recoverySaved,
        recovery_id: recoveryId,
      }
    );
  }
}