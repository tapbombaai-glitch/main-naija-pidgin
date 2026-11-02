import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY!;

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const EXISTING_VOICE_IDS = [
  "BXStbbwwT5cKeWf2Ik8O",
  "w5p3k3PueAgQOT4lq0SF",
];

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
  try {
    if (!supabaseUrl || !anonKey || !serviceKey || !elevenLabsKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    // 1. Verify login.
    const authorization = req.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Please log in as Chairman." },
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
        { success: false, error: "Your login session has expired." },
        { status: 401 }
      );
    }

    // 2. Chairman email restriction.
    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return NextResponse.json(
        { success: false, error: "Only the Chairman can test platform voices." },
        { status: 403 }
      );
    }

    // 3. Verify Chairman profile.
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
        { success: false, error: "Chairman verification failed." },
        { status: 403 }
      );
    }

    // 4. Read requested text and voice.
    const body = await req.json();

    const text =
      typeof body.text === "string" ? body.text.trim() : "";

    const voiceId =
      typeof body.voiceId === "string" ? body.voiceId.trim() : "";

    if (!text || !voiceId) {
      return NextResponse.json(
        { success: false, error: "Enter a message and select a voice." },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { success: false, error: "Maximum message length is 5,000 characters." },
        { status: 400 }
      );
    }

    // 5. Only allow the two confirmed voices or a voice
    // created and owned by this Chairman.
    let authorizedVoice = EXISTING_VOICE_IDS.includes(voiceId);

    if (!authorizedVoice) {
      const { data: savedVoice, error: voiceError } = await adminClient
        .from("cloned_voices")
        .select("id, elevenlabs_voice_id, owner_user_id")
        .eq("elevenlabs_voice_id", voiceId)
        .eq("owner_user_id", user.id)
        .maybeSingle();

      if (voiceError) {
        console.error("Voice lookup error:", voiceError);
      }

      authorizedVoice = Boolean(savedVoice);
    }

    if (!authorizedVoice) {
      return NextResponse.json(
        { success: false, error: "This voice is not authorized for your account." },
        { status: 403 }
      );
    }

    // 6. Generate real speech with ElevenLabs.
    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.9,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
        cache: "no-store",
      }
    );

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text();

      console.error("ElevenLabs test generation error:", errorText);

      return NextResponse.json(
        {
          success: false,
          error: "ElevenLabs could not generate speech. Check the voice ID and ElevenLabs account.",
        },
        { status: 502 }
      );
    }

    const audioBuffer = await elevenResponse.arrayBuffer();

    if (!audioBuffer.byteLength) {
      return NextResponse.json(
        { success: false, error: "ElevenLabs returned empty audio." },
        { status: 502 }
      );
    }

    // 7. Return playable audio.
    // No Marketplace credits are deducted.
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "no-store, private",
        "X-Voice-Test": "chairman",
      },
    });
  } catch (error) {
    console.error("Chairman voice test error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected voice testing error occurred.",
      },
      { status: 500 }
    );
  }
}