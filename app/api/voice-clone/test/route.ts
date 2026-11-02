import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const MAIN_VOICE_IDS = [
  "BXStbbwwT5cKeWf2Ik8O",
  "w5p3k3PueAgQOT4lq0SF",
];

export async function POST(req: NextRequest) {
  try {
    // Check server configuration before creating Supabase clients.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey || !elevenLabsKey) {
      console.error("Voice Studio server configuration is incomplete.");

      return NextResponse.json(
        { success: false, error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

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

    // Verify Chairman login token.
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

    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return NextResponse.json(
        {
          success: false,
          error: "Only the Chairman can generate test speech.",
        },
        { status: 403 }
      );
    }

    // Verify Chairman profile.
    const {
      data: profile,
      error: profileError,
    } = await adminClient
      .from("profiles")
      .select("email, is_chairman")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Chairman profile query failed:", profileError.message);

      return NextResponse.json(
        { success: false, error: "Could not verify Chairman profile." },
        { status: 500 }
      );
    }

    if (
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

    // Read generation request.
    const body = await req.json().catch(() => ({}));

    const text = String(body.text || body.input || "").trim();
    const voiceId = String(body.voice_id || body.voiceId || "").trim();

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Enter some text to generate." },
        { status: 400 }
      );
    }

    if (text.length > 1000) {
      return NextResponse.json(
        {
          success: false,
          error: "Maximum 1000 characters for Chairman speech testing.",
        },
        { status: 400 }
      );
    }

    if (!voiceId) {
      return NextResponse.json(
        { success: false, error: "Select a voice first." },
        { status: 400 }
      );
    }

    // Validate voice ID format.
    if (!/^[A-Za-z0-9_-]{5,100}$/.test(voiceId)) {
      return NextResponse.json(
        { success: false, error: "Invalid voice ID." },
        { status: 400 }
      );
    }

    // Preserve the two existing Main Naija voices.
    const isMainVoice = MAIN_VOICE_IDS.includes(voiceId);

    // Verify all other voices against Supabase.
    if (!isMainVoice) {
      const {
        data: voiceRecord,
        error: voiceError,
      } = await adminClient
        .from("cloned_voices")
        .select("id, is_active, elevenlabs_voice_id, voice_id")
        .or(
          `elevenlabs_voice_id.eq.${voiceId},voice_id.eq.${voiceId}`
        )
        .maybeSingle();

      if (voiceError) {
        console.error("Voice verification error:", voiceError.message);

        return NextResponse.json(
          {
            success: false,
            error: "Could not verify the selected voice.",
          },
          { status: 500 }
        );
      }

      if (!voiceRecord) {
        return NextResponse.json(
          {
            success: false,
            error: "This voice is not registered in Chairman Studio.",
          },
          { status: 404 }
        );
      }

      if (voiceRecord.is_active === false) {
        return NextResponse.json(
          {
            success: false,
            error: "This voice is awaiting verification.",
          },
          { status: 403 }
        );
      }
    }

    // Generate REAL speech using ElevenLabs.
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        voiceId
      )}`,
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
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text().catch(() => "");

      console.error(
        "ElevenLabs TTS error:",
        ttsResponse.status,
        errorText
      );

      let errorMessage = "ElevenLabs speech generation failed.";

      try {
        const errJson = JSON.parse(errorText);

        errorMessage =
          errJson.detail?.message ||
          errJson.detail ||
          errJson.message ||
          errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText.slice(0, 200);
        }
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 502 }
      );
    }

    // Receive actual MP3 audio.
    const audioBuffer = await ttsResponse.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ElevenLabs returned empty audio.",
        },
        { status: 502 }
      );
    }

    // Return audio directly to the frontend.
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Voice test route error:", error);

    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { success: false, error: "Speech generation timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected speech generation error occurred.",
      },
      { status: 500 }
    );
  }
}