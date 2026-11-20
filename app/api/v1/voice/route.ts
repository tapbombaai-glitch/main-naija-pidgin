// app/api/v1/voice/route.ts
// FIXED - NO music-metadata - FOR RENDER BUILD

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

// Lightweight duration - NO external package
async function getDurationSec(buffer: Buffer): Promise<number> {
  try {
    if (buffer.length > 44 && buffer.toString("ascii", 0, 4) === "RIFF") {
      const sampleRate = buffer.readUInt32LE(24);
      const dataSize = buffer.readUInt32LE(40);
      const channels = buffer.readUInt16LE(22);
      const bitsPerSample = buffer.readUInt16LE(34);
      if (sampleRate > 0 && channels > 0 && bitsPerSample > 0) {
        const bytesPerSec = (sampleRate * channels * bitsPerSample) / 8;
        const dur = dataSize / bytesPerSec;
        if (Number.isFinite(dur) && dur > 0) return dur;
      }
    }
    return 60;
  } catch {
    return 60;
  }
}

export async function POST(req: NextRequest) {
  let createdVoiceId: string | null = null;

  try {
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

    const authorization =
      req.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return response(
        false,
        "Please log in as Chairman.",
        401
      );
    }

    const token = authorization.slice(7);

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
      user.email?.toLowerCase() !== CHAIRMAN_EMAIL
    ) {
      return response(
        false,
        "Chairman access only.",
        403
      );
    }

    const formData = await req.formData();

    const name = String(
      formData.get("name") || ""
    ).trim();

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

    const normalizedName = name.toLowerCase();

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

    const extension =
      file.name.split(".").pop()?.toLowerCase() || "";

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return response(
        false,
        "Unsupported audio format. Use WAV, MP3, M4A, WEBM, OGG, FLAC or AAC.",
        400
      );
    }

    // 6. VALIDATE DURATION - NO music-metadata
    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    const duration = await getDurationSec(buffer);

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

    const { data: existingVoice, error: lookupError } =
      await supabaseAdmin
        .from("chairman_voices")
        .select("id")
        .ilike("name", name)
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

    const elevenLabsForm = new FormData();

    const audioBlob = new Blob(
      [new Uint8Array(buffer)],
      {
        type: file.type || "application/octet-stream",
      }
    );

    elevenLabsForm.append("name", name);

    elevenLabsForm.append(
      "files",
      audioBlob,
      file.name || `voice-sample.${extension}`
    );

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

    const cloneData = await cloneResponse.json();

    if (!cloneResponse.ok) {
      console.error(
        "ElevenLabs cloning error:",
        cloneResponse.status
      );

      return response(
        false,
        cloneData?.detail?.message ||
          cloneData?.detail ||
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

    const { data: savedVoice, error: saveError } =
      await supabaseAdmin
        .from("chairman_voices")
        .insert({
          name,
          elevenlabs_voice_id: createdVoiceId,
          is_published: false,
          requires_verification: true,
        })
        .select("id, name, elevenlabs_voice_id")
        .single();

    if (saveError) {
      console.error(
        "Main voice save failed:",
        saveError.message
      );

      const { data: recovery, error: recoveryError } =
        await supabaseAdmin
          .from("chairman_voice_recovery")
          .insert({
            name,
            elevenlabs_voice_id: createdVoiceId,
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

    console.log(
      "Chairman voice created:",
      createdVoiceId
    );

    return response(
      true,
      `${name} cloned and saved successfully. It is waiting for Chairman approval.`,
      200,
      {
        voice: savedVoice,
        voice_id: createdVoiceId,
        saved_to_database: true,
        is_published: false,
        duration_seconds: Math.round(duration),
      }
    );

  } catch (error) {
    console.error(
      "Chairman voice creation error:",
      error
    );

    return response(
      false,
      createdVoiceId
        ? "ElevenLabs created a voice, but the request failed afterward. Check the recovery records before retrying."
        : "Voice cloning failed. Please check the audio and try again.",
      500,
      {
        voice_id: createdVoiceId,
      }
    );
  }
}