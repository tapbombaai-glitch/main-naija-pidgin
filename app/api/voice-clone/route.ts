import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_AUDIO_SIZE = 15 * 1024 * 1024; // 15MB

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

export async function POST(req: NextRequest) {
  try {
    // 1. CHECK SERVER CONFIGURATION
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey || !elevenLabsKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    // 2. VERIFY CHAIRMAN LOGIN
    const authorization = req.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Please log in as Chairman." },
        { status: 401 }
      );
    }

    const accessToken = authorization.slice(7);

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(accessToken);

    if (
      authError ||
      !user ||
      user.email?.toLowerCase() !== CHAIRMAN_EMAIL
    ) {
      return NextResponse.json(
        { success: false, error: "Chairman access only." },
        { status: 403 }
      );
    }

    // 3. CHECK REQUEST DATA
    const formData = await req.formData();

    const name = String(formData.get("name") || "").trim();
    const audio = formData.get("audio") || formData.get("file");

    if (!name || name.length > 100) {
      return NextResponse.json(
        { success: false, error: "Enter a valid voice name." },
        { status: 400 }
      );
    }

    if (!audio || typeof audio === "string" || !("arrayBuffer" in audio)) {
      return NextResponse.json(
        { success: false, error: "Please upload an audio recording." },
        { status: 400 }
      );
    }

    const audioFile = audio as File;

    if (audioFile.size === 0) {
      return NextResponse.json(
        { success: false, error: "The audio file is empty." },
        { status: 400 }
      );
    }

    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { success: false, error: "Audio file must not exceed 15MB." },
        { status: 413 }
      );
    }

    // 4. SEND AUDIO TO ELEVENLABS
    const elevenLabsForm = new FormData();
    elevenLabsForm.append("name", name);
    elevenLabsForm.append(
      "files",
      audioFile,
      audioFile.name || "voice-sample.webm"
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
      }
    );

    const cloneData = await cloneResponse.json();

    if (!cloneResponse.ok) {
      console.error("ElevenLabs cloning failed:", cloneResponse.status, cloneData);

      let errorMessage = "ElevenLabs could not clone this voice.";
      if (typeof cloneData?.detail === "string") {
        errorMessage = cloneData.detail;
      } else if (Array.isArray(cloneData?.detail) && cloneData.detail[0]?.msg) {
        errorMessage = cloneData.detail[0].msg;
      } else if (cloneData?.detail?.message) {
        errorMessage = cloneData.detail.message;
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: cloneResponse.status }
      );
    }

    // 5. VERIFY THE RETURNED VOICE ID
    const voiceId = cloneData.voice_id;

    if (!voiceId) {
      return NextResponse.json(
        { success: false, error: "ElevenLabs did not return a voice ID." },
        { status: 502 }
      );
    }

    console.log("ElevenLabs created voice:", voiceId);

    // 6. SAVE VOICE TO SUPABASE
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let savedToDatabase = false;

    try {
      const { error } = await supabaseAdmin.from("chairman_voices").insert({
        name,
        elevenlabs_voice_id: voiceId,
      });

      if (error) {
        console.error("Voice database save failed:", error.message);
      } else {
        savedToDatabase = true;
      }
    } catch (databaseError) {
      console.error("Voice database error:", databaseError);
    }

    // 7. RETURN REAL RESULT
    return NextResponse.json(
      {
        success: true,
        voice_id: voiceId,
        elevenlabs_voice_id: voiceId,
        name,
        saved_to_database: savedToDatabase,
        message: savedToDatabase
          ? `Voice "${name}" cloned and saved successfully!`
          : `Voice "${name}" cloned successfully, but database saving failed.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Voice clone route error:", error);

    return NextResponse.json(
      { success: false, error: "Voice cloning failed. Please try again." },
      { status: 500 }
    );
  }
}