import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ YOUR REAL WARRI MALE VOICE
const CHAIRMAN_POWERFUL_VOICE_ID = 
  process.env.CHAIRMAN_VOICE_ID?.trim() || 
  process.env.ELEVENLABS_VOICE_ID?.trim() || 
  "BXStbbwwT5cKeWf2Ik8O";

// ✅ FEMALE VOICES - REAL FEMALE FROM ELEVENLABS - 100% FEMALE
const FEMALE_BELLA = "EXAVITQu4vr4xnSDxMaL"; // Bella - Sweet female
const FEMALE_ELLI = "MF3mGyEYCl7XYWbV9V6O"; // Elli - Young female
const FEMALE_RACHEL = "21m00Tcm4TlvDq8ikWAM"; // Rachel - Calm female

const OLD_FAKE_ID = "DW6Zuhb8hBT0UMYMno9Z";

const VOICE_MAP: Record<string, string> = {
  // YOUR 5 MALE WARRI VOICES
  "Main Naija Pidgin 1": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 2": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 3": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 3 - GREATEST": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 4": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 5": CHAIRMAN_POWERFUL_VOICE_ID,

  // OLD MALE NAMES
  "Lagos Male": CHAIRMAN_POWERFUL_VOICE_ID,
  "Delta Warri": CHAIRMAN_POWERFUL_VOICE_ID,
  "Pidgin Narrator": CHAIRMAN_POWERFUL_VOICE_ID,
  "Yoruba Mix": CHAIRMAN_POWERFUL_VOICE_ID,
  "Chairman Original": CHAIRMAN_POWERFUL_VOICE_ID,
  "Chairman Voice": CHAIRMAN_POWERFUL_VOICE_ID,

  // ✅ FEMALE - NOW REAL FEMALE!
  "Abuja Female": FEMALE_BELLA,
  "Naija Slay Queen": FEMALE_BELLA,
  "Naija Slay Queen - Female": FEMALE_BELLA,
  "Warri Fine Girl": FEMALE_ELLI,
  "Lagos Babe": FEMALE_BELLA,
  "PH Fine Girl": FEMALE_ELLI,
  "Female Voice 1": FEMALE_BELLA,
  "Female Voice 2": FEMALE_ELLI,
  "Lagos Female": FEMALE_RACHEL,
};

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();

    if (!text?.trim() || !voice?.trim()) {
      return NextResponse.json({ success: false, error: "Text and voice are required" }, { status: 400 });
    }

    if (text.length > 5000) {
      return NextResponse.json({ success: false, error: "Text too long. Maximum 5000 characters" }, { status: 400 });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json({ success: false, error: "ELEVENLABS_API_KEY not set" }, { status: 500 });
    }

    if (!CHAIRMAN_POWERFUL_VOICE_ID || CHAIRMAN_POWERFUL_VOICE_ID === OLD_FAKE_ID || CHAIRMAN_POWERFUL_VOICE_ID.length < 10) {
      return NextResponse.json({ success: false, error: "Chairman! Voice ID wrong. Set CHAIRMAN_VOICE_ID = BXStbbwwT5cKeWf2Ik8O in Render" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "No auth token" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    const { data: keyData, error: keyError } = await supabase.from("api_keys").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
    if (keyError || !keyData) {
      return NextResponse.json({ success: false, error: "No active API key found. Claim free key first." }, { status: 400 });
    }

    const freeLeft = keyData.free_requests_remaining || 0;
    const paidLeft = keyData.paid_requests_remaining || 0;
    const totalLeft = freeLeft + paidLeft;
    if (totalLeft <= 0) {
      return NextResponse.json({ success: false, error: "No credits left. Buy more." }, { status: 400 });
    }

    const voiceId = VOICE_MAP[voice] || CHAIRMAN_POWERFUL_VOICE_ID;
    const isFemale = voiceId === FEMALE_BELLA || voiceId === FEMALE_ELLI || voiceId === FEMALE_RACHEL;
    console.log(`🎤 Voice: "${voice}" → ID: ${voiceId} ${isFemale ? '(FEMALE)' : '(MALE WARRI)'}`);

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": elevenKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({
        text: text.trim(),
        model_id: "eleven_v3",
        voice_settings: { stability: isFemale ? 0.6 : 0.5, similarity_boost: 0.9, style: isFemale ? 0.4 : 0.8, use_speaker_boost: true },
      }),
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error("ElevenLabs error:", errText, "VoiceID:", voiceId);
      return NextResponse.json({ success: false, error: `ElevenLabs failed: ${errText}` }, { status: 400 });
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    if (freeLeft > 0) {
      await supabase.from("api_keys").update({ free_requests_remaining: freeLeft - 1 }).eq("id", keyData.id);
    } else {
      await supabase.from("api_keys").update({ paid_requests_remaining: paidLeft - 1 }).eq("id", keyData.id);
    }

    return NextResponse.json({
      success: true,
      audio_url: audioUrl,
      remaining_credits: totalLeft - 1,
      voice_used: voice,
      voice_id_used: voiceId,
      message: isFemale ? "Female voice generated!" : "Chairman Warri voice generated!",
    });

  } catch (e: any) {
    console.error("TTS Route Error:", e);
    return NextResponse.json({ success: false, error: e.message || "Internal server error" }, { status: 500 });
  }
}