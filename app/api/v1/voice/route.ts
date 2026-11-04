import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !elevenLabsKey) {
      return NextResponse.json({ success: false, error: "Server configuration is incomplete." }, { status: 500 });
    }

    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Please log in as Chairman." }, { status: 401 });
    }

    const accessToken = authorization.slice(7);
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !user || user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return NextResponse.json({ success: false, error: "Chairman access only." }, { status: 403 });
    }

    let text = "";
    let voiceId = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      text = String(body.text || body.script || "").trim();
      voiceId = String(body.voice_id || body.voiceId || body.voice || "").trim();
    } else {
      const formData = await req.formData();
      text = String(formData.get("text") || formData.get("script") || "").trim();
      voiceId = String(formData.get("voice_id") || formData.get("voiceId") || formData.get("voice") || "").trim();
    }

    if (!text) {
      return NextResponse.json({ success: false, error: "Enter text to speak." }, { status: 400 });
    }

    if (!voiceId) {
      return NextResponse.json({ success: false, error: "Select a voice." }, { status: 400 });
    }

    // Accept ElevenLabs voice IDs only — never URLs or file paths.
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(voiceId)) {
      return NextResponse.json({ success: false, error: "Invalid ElevenLabs voice ID." }, { status: 400 });
    }

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
      cache: "no-store",
    });

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error("ElevenLabs TTS failed:", ttsResponse.status, errText);
      return NextResponse.json({ success: false, error: "ElevenLabs could not generate this voice." }, { status: ttsResponse.status });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Voice TTS route error:", error);
    return NextResponse.json({ success: false, error: "Voice generation failed. Please try again." }, { status: 500 });
  }
}