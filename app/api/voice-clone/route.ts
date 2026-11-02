import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY!;

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const authClient = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export async function POST(req: NextRequest) {
  let createdVoiceId: string | null = null;

  try {
    if (!supabaseUrl || !anonKey || !serviceKey || !elevenLabsKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    // Verify Supabase session.
    const authorization = req.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Please log in first." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid login session." },
        { status: 401 }
      );
    }

    // Only the authorized Chairman can create platform voices.
    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return NextResponse.json(
        {
          success: false,
          error: "Only the Chairman can create platform voices.",
        },
        { status: 403 }
      );
    }

    // Verify Chairman profile as an additional check.
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("email, is_chairman")
      .eq("id", user.id)
      .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.email?.toLowerCase() !== CHAIRMAN_EMAIL ||
      profile.is_chairman !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Chairman profile verification failed.",
        },
        { status: 403 }
      );
    }

    // Read form data.
    const formData = await req.formData();

    const name = String(formData.get("name") || "").trim();
    const gender = String(formData.get("gender") || "").toLowerCase();
    const audio = formData.get("audio");

    if (!name || name.length > 80) {
      return NextResponse.json(
        { success: false, error: "Enter a voice name between 1 and 80 characters." },
        { status: 400 }
      );
    }

    if (gender !== "male" && gender !== "female") {
      return NextResponse.json(
        { success: false, error: "Select male or female voice." },
        { status: 400 }
      );
    }

    if (
      !audio ||
      typeof audio === "string" ||
      typeof (audio as File).arrayBuffer !== "function"
    ) {
      return NextResponse.json(
        { success: false, error: "Upload a voice recording first." },
        { status: 400 }
      );
    }

    const audioFile = audio as File;

    if (audioFile.size < 50 * 1024) {
      return NextResponse.json(
        { success: false, error: "Recording is too small. Please record a longer sample." },
        { status: 400 }
      );
    }

    if (audioFile.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Maximum recording size is 20 MB." },
        { status: 400 }
      );
    }

    // Accept WebM with codec parameters, such as audio/webm;codecs=opus.
    const mimeType = (audioFile.type || "").split(";")[0].trim().toLowerCase();

    const allowedTypes = [
      "audio/webm",
      "audio/wav",
      "audio/mpeg",
      "audio/mp3",
      "audio/mp4",
      "audio/ogg",
      "audio/x-m4a",
      "audio/m4a",
      "application/octet-stream",
    ];

    if (mimeType && !allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { success: false, error: "Unsupported audio format." },
        { status: 400 }
      );
    }

    // Prepare ElevenLabs clone request.
    const elevenForm = new FormData();

    elevenForm.append("name", name);

    elevenForm.append(
      "description",
      "Main Naija Pidgin authorized voice clone"
    );

    elevenForm.append(
      "labels",
      JSON.stringify({
        language: "English",
        accent: "Nigerian",
        gender,
        use_case: "text_to_speech",
      })
    );

    elevenForm.append(
      "files",
      audioFile,
      audioFile.name || "voice-sample.webm"
    );

    // Create actual ElevenLabs voice clone.
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

    const cloneResult = await cloneResponse.json();

    if (!cloneResponse.ok || !cloneResult.voice_id) {
      console.error("ElevenLabs cloning error:", cloneResult);

      const detail = cloneResult.detail;
      const errorMessage =
        typeof detail === "string"
          ? detail
          : detail?.message || "ElevenLabs could not create this voice clone.";

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 502 }
      );
    }

    createdVoiceId = cloneResult.voice_id;

    const requiresVerification =
      cloneResult.requires_verification === true;

    // Save the new voice without publishing it publicly.
    const { data: savedVoice, error: saveError } = await adminClient
      .from("cloned_voices")
      .insert({
        owner_user_id: user.id,
        name,
        elevenlabs_voice_id: createdVoiceId,
        gender,
        accent: "Nigerian Pidgin",
        description: "Chairman-created Main Naija Pidgin voice",
        is_public: false,
        is_active: !requiresVerification,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Supabase voice save error:", saveError);

      // Clean up only the newly created clone if saving failed.
      await fetch(
        `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(createdVoiceId)}`,
        {
          method: "DELETE",
          headers: { "xi-api-key": elevenLabsKey },
          cache: "no-store",
        }
      );

      createdVoiceId = null;

      return NextResponse.json(
        {
          success: false,
          error: "Voice was created but could not be saved to Supabase.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: requiresVerification
          ? "Voice created. Verification is required before activation."
          : "Your real voice clone was created successfully!",
        voice: {
          id: savedVoice.id,
          name: savedVoice.name,
          voice_id: savedVoice.elevenlabs_voice_id,
          gender: savedVoice.gender,
          accent: savedVoice.accent,
          is_public: savedVoice.is_public,
          is_active: savedVoice.is_active,
          requires_verification: requiresVerification,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Voice cloning route error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected voice cloning error occurred.",
      },
      { status: 500 }
    );
  }
}