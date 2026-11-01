import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ YOUR REAL MAIN NAIJA WARRI PIDGIN VOICE ID
const CHAIRMAN_POWERFUL_VOICE_ID = 
  process.env.CHAIRMAN_VOICE_ID?.trim() || 
  process.env.ELEVENLABS_VOICE_ID?.trim() || 
  "BXStbbwwT5cKeWf2Ik8O";

// Old fake ID we never want to use again
const OLD_FAKE_ID = "DW6Zuhb8hBT0UMYMno9Z";

const VOICE_MAP: Record<string, string> = {
  // Old Chairman names
  "Lagos Male": CHAIRMAN_POWERFUL_VOICE_ID,
  "Abuja Female": CHAIRMAN_POWERFUL_VOICE_ID,
  "Pidgin Narrator": CHAIRMAN_POWERFUL_VOICE_ID,
  "Delta Warri": CHAIRMAN_POWERFUL_VOICE_ID,
  "Yoruba Mix": CHAIRMAN_POWERFUL_VOICE_ID,

  // Common aliases
  "Chairman Original": CHAIRMAN_POWERFUL_VOICE_ID,
  "Chairman Voice": CHAIRMAN_POWERFUL_VOICE_ID,
  "My Voice": CHAIRMAN_POWERFUL_VOICE_ID,
  "Powerful Voice": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Warri Pidgin": CHAIRMAN_POWERFUL_VOICE_ID,

  // New 5
  "Main Naija Pidgin 1": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 2": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 3": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 3 - GREATEST": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 4": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 5": CHAIRMAN_POWERFUL_VOICE_ID,
};

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();

    if (!text?.trim() || !voice?.trim()) {
      return NextResponse.json(
        { success: false, error: "Text and voice are required" },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { success: false, error: "Text too long. Maximum 5000 characters for eleven_v3." },
        { status: 400 }
      );
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json(
        { success: false, error: "ELEVENLABS_API_KEY not set in environment" },
        { status: 500 }
      );
    }

    // Strict check so we never fall back to the old fake ID
    if (
      !CHAIRMAN_POWERFUL_VOICE_ID ||
      CHAIRMAN_POWERFUL_VOICE_ID === OLD_FAKE_ID ||
      CHAIRMAN_POWERFUL_VOICE_ID.length < 10
    ) {
      return NextResponse.json({
        success: false,
        error: "Chairman! Voice ID still wrong. Go to Render → Environment and set CHAIRMAN_VOICE_ID = BXStbbwwT5cKeWf2Ik8O"
      }, { status: 500 });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "No auth token" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    // Get active API key + credits
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json(
        { success: false, error: "No active API key found. Claim free key first." },
        { status: 400 }
      );
    }

    const freeLeft = keyData.free_requests_remaining || 0;
    const paidLeft = keyData.paid_requests_remaining || 0;
    const totalLeft = freeLeft + paidLeft;

    if (totalLeft <= 0) {
      return NextResponse.json(
        { success: false, error: "No credits left. Buy more." },
        { status: 400 }
      );
    }

    // Resolve voice
    const voiceId = VOICE_MAP[voice] || CHAIRMAN_POWERFUL_VOICE_ID;
    console.log(`🎤 Voice requested: "${voice}" → Using ID: ${voiceId}`);

    // Call ElevenLabs
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_v3",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.9,
            style: 0.8,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error("ElevenLabs error:", errText, "VoiceID:", voiceId);

      if (errText.includes("voice_not_found") || errText.toLowerCase().includes("not found")) {
        return NextResponse.json({
          success: false,
          error: `Voice ID ${voiceId} not found on ElevenLabs. Go to ElevenLabs → My Voices → copy the correct ID and set CHAIRMAN_VOICE_ID in Render.`,
        }, { status: 400 });
      }

      return NextResponse.json(
        { success: false, error: `ElevenLabs failed: ${errText}` },
        { status: 400 }
      );
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // Deduct credit (free first)
    if (freeLeft > 0) {
      await supabase
        .from("api_keys")
        .update({ free_requests_remaining: freeLeft - 1 })
        .eq("id", keyData.id);
    } else {
      await supabase
        .from("api_keys")
        .update({ paid_requests_remaining: paidLeft - 1 })
        .eq("id", keyData.id);
    }

    const remaining = totalLeft - 1;

    return NextResponse.json({
      success: true,
      audio_url: audioUrl,
      remaining_credits: remaining,
      voice_used: voice,
      voice_id_used: voiceId,
      message: "Voice generated successfully with Chairman Warri voice!",
    });

  } catch (e: any) {
    console.error("TTS Route Error:", e);
    return NextResponse.json(
      { success: false, error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}