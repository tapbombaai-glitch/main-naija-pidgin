import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY!;

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export async function POST(req: NextRequest) {
  let createdVoiceId: string | null = null;

  try {
    // 1. Check server configuration.
    if (!supabaseUrl || !anonKey || !serviceKey || !elevenLabsKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing server environment variables.",
        },
        { status: 500 }
      );
    }

    // 2. Verify login.
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Please log in first." },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const authClient = createClient(supabaseUrl, anonKey);

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

    // 3. Only Chairman can create platform voices.
    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return NextResponse.json(
        {
          success: false,
          error: "Only the Chairman can create platform voices.",
        },
        { status: 403 }
      );
    }

    // 4. Read uploaded recording.
    const formData = await req.formData();

    const name = String(formData.get("name") || "").trim();
    const audio = formData.get("audio");

    if (!name || name.length > 80) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a voice name between 1 and 80 characters.",
        },
        { status: 400 }
      );
    }

    if (
      !audio ||
      typeof audio === "string" ||
      typeof audio === "object" && !("arrayBuffer" in audio)
    ) {
      return NextResponse.json(
        { success: false, error: "Upload a voice recording first." },
        { status: 400 }
      );
    }

    const audioFile = audio as File;

    if (audioFile.size < 50 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: "Recording is too small. Please record a longer, clearer sample.",
        },
        { status: 400 }
      );
    }

    if (audioFile.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: "Recording is too large. Maximum size is 20 MB.",
        },
        { status: 400 }
      );
    }

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

    if (
      audioFile.type &&
      !allowedTypes.includes(audioFile.type)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported audio format. Record using your browser microphone.",
        },
        { status: 400 }
      );
    }

    // 5. Prepare recording for ElevenLabs.
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
        gender: "male",
        use_case: "text_to_speech",
      })
    );

    elevenForm.append("files", audioFile, audioFile.name || "voice-sample.webm");

    // 6. Create the REAL voice clone.
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

      return NextResponse.json(
        {
          success: false,
          error:
            cloneResult.detail?.message ||
            cloneResult.detail ||
            "ElevenLabs could not create the voice clone. Check your recording and account access.",
        },
        { status: 502 }
      );
    }

    createdVoiceId = cloneResult.voice_id;

    const requiresVerification =
      cloneResult.requires_verification === true;

    // 7. Save voice ID securely in Supabase.
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: savedVoice, error: saveError } = await adminClient
      .from("cloned_voices")
      .insert({
        owner_user_id: user.id,
        name,
        elevenlabs_voice_id: createdVoiceId,
        gender: "male",
        accent: "Nigerian Pidgin",
        description: "Chairman-created Main Naija Pidgin voice",
        is_public: false,
        is_active: !requiresVerification,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Supabase voice save error:", saveError);

      // Clean up the ElevenLabs clone if database saving fails.
      await fetch(
        `https://api.elevenlabs.io/v1/voices/${createdVoiceId}`,
        {
          method: "DELETE",
          headers: { "xi-api-key": elevenLabsKey },
        }
      );

      return NextResponse.json(
        {
          success: false,
          error: "Voice was created but could not be saved to Supabase.",
        },
        { status: 500 }
      );
    }

    // 8. Return the real Voice ID.
    return NextResponse.json({
      success: true,
      message: requiresVerification
        ? "Voice created. Verification is required before use."
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
    });
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