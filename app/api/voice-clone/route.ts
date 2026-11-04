import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_AUDIO_SIZE = 15 * 1024 * 1024;

function response(
  message: string,
  status: number,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1. CHECK ENVIRONMENT
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey || !elevenLabsKey) {
      return response("Server environment variables are missing.", 500);
    }

    // 2. CHAIRMAN AUTHENTICATION
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return response("Please log in as Chairman.", 401);
    }

    const token = authorization.slice(7);

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return response("Invalid or expired login session.", 401);
    }

    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return response("Only the Chairman can create voice clones.", 403);
    }

    // 3. READ UPLOADED AUDIO
    const incoming = await request.formData();

    const audio = incoming.get("audio");
    const name = String(incoming.get("name") || "").trim();
    const gender = String(incoming.get("gender") || "").trim();
    const category = String(incoming.get("category") || "").trim();

    if (!name) {
      return response("Please enter a voice name.", 400);
    }

    if (name.length > 80) {
      return response("Voice name must not exceed 80 characters.", 400);
    }

    if (!(audio instanceof File)) {
      return response("Please record or upload an audio sample.", 400);
    }

    if (audio.size === 0) {
      return response("The audio file is empty.", 400);
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return response("Audio must not exceed 15 MB.", 400);
    }

    if (!audio.type.startsWith("audio/") &&
        audio.type !== "application/octet-stream") {
      return response("Please upload a valid audio file.", 400);
    }

    // 4. SEND AUDIO TO ELEVENLABS
    const elevenForm = new FormData();

    elevenForm.append("name", name);
    elevenForm.append(
      "description",
      `Main Naija Pidgin voice clone. Gender: ${gender || "Not specified"}. Category: ${category || "Custom voice"}.`
    );

    elevenForm.append(
      "files",
      new Blob([await audio.arrayBuffer()], {
        type: audio.type || "application/octet-stream",
      }),
      audio.name || "voice-sample.webm"
    );

    const elevenResponse = await fetch(
      "https://api.elevenlabs.io/v1/voices/add",
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
        },
        body: elevenForm,
        signal: AbortSignal.timeout(60000),
      }
    );

    const elevenData = await elevenResponse.json().catch(() => null);

    if (!elevenResponse.ok) {
      console.error("ElevenLabs clone error:", elevenData);

      const errorMessage =
        elevenData?.detail?.message ||
        elevenData?.detail ||
        elevenData?.message ||
        "ElevenLabs could not create this voice.";

      return response(
        typeof errorMessage === "string"
          ? errorMessage
          : "ElevenLabs rejected the audio sample.",
        elevenResponse.status
      );
    }

    const voiceId = elevenData?.voice_id;

    if (!voiceId) {
      return response("ElevenLabs did not return a voice ID.", 502);
    }

    const requiresVerification = Boolean(
      elevenData.requires_verification
    );

    console.log("ElevenLabs voice created:", voiceId);

    // 5. SAVE CLONED VOICE TO SUPABASE
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: savedVoice, error: saveError } = await adminClient
      .from("chairman_voices")
      .insert({
        name,
        description: `Gender: ${gender || "Not specified"}`,
        elevenlabs_voice_id: voiceId,
        category: category || "custom",
        accent: null,
        is_active: true,
        is_published: false,
        requires_verification: requiresVerification,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Voice database save error:", saveError.message);

      return NextResponse.json(
        {
          success: false,
          error: "Voice was created at ElevenLabs but could not be saved to Supabase. Keep this voice ID for recovery.",
          voice_id: voiceId,
          database_error: saveError.message,
        },
        { status: 500 }
      );
    }

    // 6. SUCCESS
    return NextResponse.json({
      success: true,
      message: requiresVerification
        ? "Voice created. ElevenLabs verification is required."
        : "Voice cloned and saved successfully.",
      voice_id: voiceId,
      requires_verification: requiresVerification,
      voice: savedVoice,
    });
  } catch (error) {
    console.error("Voice cloning route error:", error);

    if (error instanceof Error && error.name === "TimeoutError") {
      return response("Voice cloning timed out. Please try again.", 504);
    }

    return response(
      error instanceof Error
        ? error.message
        : "Unexpected voice cloning error.",
      500
    );
  }
}