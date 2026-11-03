import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const MAIN_VOICE_IDS = [
  "BXStbbwwT5cKeWf2Ik8O",
  "w5p3k3PueAgQOT4lq0SF",
];

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

    if (!supabaseUrl || !anonKey || !serviceKey || !elevenLabsKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    const authorization = req.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Please log in first." },
        { status: 401 }
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
        { success: false, error: "Chairman only." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const text = String(body.text || body.input || "").trim();
    const voiceId = String(
      body.voice_id || body.voiceId || ""
    ).trim();

    if (!text) {
      return NextResponse.json(
        { success: false, error: "Enter some text to generate." },
        { status: 400 }
      );
    }

    if (text.length > 1000) {
      return NextResponse.json(
        { success: false, error: "Maximum 1000 characters." },
        { status: 400 }
      );
    }

    if (!voiceId) {
      return NextResponse.json(
        { success: false, error: "Select a voice first." },
        { status: 400 }
      );
    }

    if (!/^[A-Za-z0-9_-]{5,100}$/.test(voiceId)) {
      return NextResponse.json(
        { success: false, error: "Invalid voice ID." },
        { status: 400 }
      );
    }

    // Preserve the two existing Main Naija voices.
    const isMainVoice = MAIN_VOICE_IDS.includes(voiceId);

    // Verify custom voices in the correct table.
    if (!isMainVoice) {
      const { data: voice, error } = await adminClient
        .from("chairman_voices")
        .select("id, name, elevenlabs_voice_id, is_active, requires_verification")
        .eq("elevenlabs_voice_id", voiceId)
        .maybeSingle();

      if (error) {
        console.error("Chairman voice lookup failed:", error);

        return NextResponse.json(
          { success: false, error: "Could not verify selected voice." },
          { status: 500 }
        );
      }

      if (!voice) {
        return NextResponse.json(
          { success: false, error: "Voice is not registered in Chairman Studio." },
          { status: 404 }
        );
      }

      if (
        voice.is_active !== true ||
        voice.requires_verification === true
      ) {
        return NextResponse.json(
          { success: false, error: "This voice is awaiting verification or activation." },
          { status: 403 }
        );
      }
    }

    // Generate real speech through ElevenLabs.
    const ttsResponse = await fetch(
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

      console.error("ElevenLabs TTS error:", errorText);

      let message = "ElevenLabs speech generation failed.";

      try {
        const result = JSON.parse(errorText);
        message =
          result.detail?.message ||
          result.detail ||
          result.message ||
          message;
      } catch {
        if (errorText) message = errorText.slice(0, 200);
      }

      return NextResponse.json(
        { success: false, error: message },
        { status: 502 }
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: "ElevenLabs returned empty audio." },
        { status: 502 }
      );
    }

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

    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return NextResponse.json(
        { success: false, error: "Speech generation timed out. Try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Unexpected speech generation error." },
      { status: 500 }
    );
  }
}