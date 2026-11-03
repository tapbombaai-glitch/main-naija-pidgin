import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;

class RouteError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new RouteError(
      `Server configuration missing: ${name}`,
      500
    );
  }

  return value;
}

async function authorize(req: NextRequest) {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const authorization = req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new RouteError("Please log in as Chairman.", 401);
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw new RouteError("Invalid login session.", 401);
  }

  const authClient = createClient(
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
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    throw new RouteError(
      "Your session is invalid. Please log in again.",
      401
    );
  }

  if (
    user.email?.toLowerCase() !== CHAIRMAN_EMAIL
  ) {
    throw new RouteError(
      "Access denied. Chairman only.",
      403
    );
  }

  return user;
}

/* =================================
   CREATE CHAIRMAN VOICE CLONE
================================= */

export async function POST(req: NextRequest) {
  let createdVoiceId: string | null = null;

  try {
    await authorize(req);

    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const elevenLabsKey = getEnv("ELEVENLABS_API_KEY");

    const admin = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const formData = await req.formData();

    const name = String(
      formData.get("name") || ""
    ).trim();

    const category = String(
      formData.get("gender") ||
      formData.get("category") ||
      "custom"
    ).trim().toLowerCase();

    const audio = formData.get("audio");

    // Validate voice name
    if (name.length < 2 || name.length > 80) {
      throw new RouteError(
        "Voice name must contain 2–80 characters.",
        400
      );
    }

    // Validate audio file
    if (!(audio instanceof File)) {
      throw new RouteError(
        "Please record or upload an audio sample.",
        400
      );
    }

    if (
      audio.type &&
      !audio.type.startsWith("audio/")
    ) {
      throw new RouteError(
        "Please upload a valid audio file.",
        400
      );
    }

    if (audio.size < 10_000) {
      throw new RouteError(
        "Audio sample is too small. Record a longer sample.",
        400
      );
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      throw new RouteError(
        "Maximum audio upload size is 20 MB.",
        400
      );
    }

    // Prepare ElevenLabs upload
    const elevenForm = new FormData();

    elevenForm.append("name", name);

    elevenForm.append(
      "description",
      "Main Naija Pidgin authorized Chairman voice clone"
    );

    elevenForm.append(
      "labels",
      JSON.stringify({
        language: "English",
        accent: "Nigerian",
        gender: category,
        use_case: "text_to_speech",
      })
    );

    elevenForm.append(
      "files",
      audio,
      audio.name || "voice-sample.webm"
    );

    // Create actual ElevenLabs clone
    const cloneResponse = await fetch(
      "https://api.elevenlabs.io/v1/voices/add",
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          Accept: "application/json",
        },
        body: elevenForm,
        cache: "no-store",
      }
    );

    const responseText = await cloneResponse.text();

    let cloneData: any;

    try {
      cloneData = JSON.parse(responseText);
    } catch {
      cloneData = {};
    }

    if (
      !cloneResponse.ok ||
      !cloneData.voice_id
    ) {
      console.error(
        "ElevenLabs cloning error:",
        responseText.slice(0, 2000)
      );

      throw new RouteError(
        cloneData?.detail?.message ||
        cloneData?.detail ||
        cloneData?.message ||
        "ElevenLabs could not create this voice.",
        502
      );
    }

    createdVoiceId = cloneData.voice_id;

    const requiresVerification = Boolean(
      cloneData.requires_verification
    );

    // Save to the SAME table used by Chairman Studio
    const { data: savedVoice, error: saveError } =
      await admin
        .from("chairman_voices")
        .insert({
          name,
          description:
            `Chairman-created ${category} voice`,
          elevenlabs_voice_id: createdVoiceId,
          category,
          accent: "Naija Pidgin",
          is_active: !requiresVerification,
          is_published: false,
          requires_verification: requiresVerification,
        })
        .select()
        .single();

    if (saveError || !savedVoice) {
      console.error(
        "Chairman voice database save failed:",
        saveError,
        "ElevenLabs voice ID:",
        createdVoiceId
      );

      // Preserve the newly created ElevenLabs voice.
      // Do NOT automatically delete it.
      return json(
        {
          success: false,
          error:
            "ElevenLabs created the voice, but Supabase could not save it. The voice has been preserved. Contact support with the voice ID below.",
          elevenlabs_voice_id: createdVoiceId,
        },
        500
      );
    }

    // Successful response
    return json({
      success: true,

      message: requiresVerification
        ? "Voice created. Verification is required before activation."
        : "Your real voice clone was created successfully!",

      voice_id: savedVoice.elevenlabs_voice_id,

      elevenlabs_voice_id:
        savedVoice.elevenlabs_voice_id,

      requiresVerification,

      voice: {
        id: savedVoice.id,
        name: savedVoice.name,

        voice_id:
          savedVoice.elevenlabs_voice_id,

        elevenlabs_voice_id:
          savedVoice.elevenlabs_voice_id,

        accent: savedVoice.accent,
        category: savedVoice.category,

        is_active: savedVoice.is_active,
        is_published: savedVoice.is_published,

        requires_verification:
          savedVoice.requires_verification,
      },
    });

  } catch (error) {
    console.error("Voice clone route error:", error);

    const status =
      error instanceof RouteError
        ? error.status
        : 500;

    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      },
      status
    );
  }
}