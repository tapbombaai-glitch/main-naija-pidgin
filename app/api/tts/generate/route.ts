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

// ✅ FEMALE VOICES - REAL FEMALE - 100% FEMALE - CLEAR LIKE YOUR VIDEO
const FEMALE_BELLA = "EXAVITQu4vr4xnSDxMaL"; // Bella - Sweet female - Clear
const FEMALE_ELLI = "MF3mGyEYCl7XYWbV9V6O"; // Elli - Young female - Clear
const FEMALE_RACHEL = "21m00Tcm4TlvDq8ikWAM"; // Rachel - Calm female

// ✅ NEW - CLEAR MALE VOICES FOR PIDGIN 4 & 5 - MAKE DEM CLEAR LIKE FEMALE!
const MALE_ADAM = "pNInz6obpgDQGcFmaJgB"; // Adam - Deep, Rugged, VERY CLEAR - For Pidgin 4
const MALE_ANTONI = "ErXwobaYiN019PkySvjV"; // Antoni - Balanced, Hybrid, VERY CLEAR - For Pidgin 5

// ✅ FOR YOUR WHATSAPP CLONED FEMALE - REPLACE WHEN YOU CLONE!
const WHATSAPP_FEMALE_1 = process.env.WHATSAPP_FEMALE_VOICE_ID_1?.trim() || FEMALE_BELLA; // Put your cloned ID here later
const WHATSAPP_FEMALE_2 = process.env.WHATSAPP_FEMALE_VOICE_ID_2?.trim() || FEMALE_ELLI;

const OLD_FAKE_ID = "DW6Zuhb8hBT0UMYMno9Z";

const VOICE_MAP: Record<string, string> = {
  // YOUR 5 MALE WARRI VOICES - EACH NOW DIFFERENT SOUND & CLEAR!
  "Main Naija Pidgin 1": CHAIRMAN_POWERFUL_VOICE_ID, // Your voice - Fast Young
  "Main Naija Pidgin 2": CHAIRMAN_POWERFUL_VOICE_ID, // Your voice - Warm Calm
  "Main Naija Pidgin 3": CHAIRMAN_POWERFUL_VOICE_ID, // Your voice - Bestseller Expressive
  "Main Naija Pidgin 3 - GREATEST": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 4": MALE_ADAM, // ✅ FIXED - WAS YOUR ID = MUMBLE - NOW ADAM = CLEAR!
  "Main Naija Pidgin 5": MALE_ANTONI, // ✅ FIXED - WAS YOUR ID = MUMBLE - NOW ANTONI = CLEAR!

  // OLD MALE NAMES
  "Lagos Male": CHAIRMAN_POWERFUL_VOICE_ID,
  "Delta Warri": MALE_ADAM,
  "Pidgin Narrator": CHAIRMAN_POWERFUL_VOICE_ID,
  "Yoruba Mix": MALE_ANTONI,
  "Chairman Original": CHAIRMAN_POWERFUL_VOICE_ID,
  "Chairman Voice": CHAIRMAN_POWERFUL_VOICE_ID,

  // ✅ FEMALE - NOW REAL FEMALE - CLEAR LIKE YOUR VIDEO!
  "Abuja Female": WHATSAPP_FEMALE_1,
  "Naija Slay Queen": WHATSAPP_FEMALE_1, // Bella or your WhatsApp cloned female
  "Naija Slay Queen - Female": WHATSAPP_FEMALE_1,
  "Warri Fine Girl": WHATSAPP_FEMALE_2, // Elli or your second WhatsApp female
  "Lagos Babe": WHATSAPP_FEMALE_1,
  "PH Fine Girl": WHATSAPP_FEMALE_2,
  "Female Voice 1": WHATSAPP_FEMALE_1,
  "Female Voice 2": WHATSAPP_FEMALE_2,
  "Lagos Female": FEMALE_RACHEL,
  "Warri Fine Girl - FEMALE": WHATSAPP_FEMALE_2,
};

// ✅ UPGRADED - ONE BUTTON = ONE DIFFERENT CLEAR SOUND - ZERO SPACE!
const VOICE_STYLES: Record<string, { stability: number; style: number; boost: number; model: string; label: string }> = {
  // Male - Clear settings - High stability = Clear word
  "Main Naija Pidgin 1": { stability: 0.70, style: 0.30, boost: 0.90, model: "eleven_multilingual_v2", label: "Relaxed Young Fast - Clear" },
  "Main Naija Pidgin 2": { stability: 0.75, style: 0.25, boost: 0.92, model: "eleven_multilingual_v2", label: "Warm Professional Calm - Clear" },
  "Main Naija Pidgin 3": { stability: 0.65, style: 0.45, boost: 0.90, model: "eleven_multilingual_v2", label: "Story Expressive BESTSELLER - Clear" },
  "Main Naija Pidgin 3 - GREATEST": { stability: 0.65, style: 0.45, boost: 0.90, model: "eleven_multilingual_v2", label: "Story Expressive BESTSELLER - Clear" },
  
  // ✅ FIXED - THE 2 LAST ONES YOU COMPLAIN - NOW CLEAR LIKE FEMALE!
  "Main Naija Pidgin 4": { stability: 0.80, style: 0.15, boost: 0.95, model: "eleven_multilingual_v2", label: "Rugged Local Street CLEAR - Adam" },
  "Main Naija Pidgin 5": { stability: 0.78, style: 0.18, boost: 0.93, model: "eleven_multilingual_v2", label: "Hybrid Bilingual Balanced CLEAR - Antoni" },

  // Female - Clear like your video - 00:00-00:03
  "Abuja Female": { stability: 0.60, style: 0.35, boost: 0.90, model: "eleven_multilingual_v2", label: "Female Lagos Sweet - Clear" },
  "Naija Slay Queen": { stability: 0.60, style: 0.35, boost: 0.90, model: "eleven_multilingual_v2", label: "Female Lagos Sweet - Clear" },
  "Naija Slay Queen - Female": { stability: 0.60, style: 0.35, boost: 0.90, model: "eleven_multilingual_v2", label: "Female Lagos Sweet - Clear" },
  "Warri Fine Girl": { stability: 0.62, style: 0.32, boost: 0.90, model: "eleven_multilingual_v2", label: "Female Warri Sharp - Clear" },
  "Warri Fine Girl - FEMALE": { stability: 0.62, style: 0.32, boost: 0.90, model: "eleven_multilingual_v2", label: "Female Warri Sharp - Clear" },
  "Lagos Female": { stability: 0.60, style: 0.35, boost: 0.90, model: "eleven_multilingual_v2", label: "Female Lagos Sweet - Clear" },
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
      return NextResponse.json({ success: false, error: "ELEVENLABS_API_KEY not set in Render env" }, { status: 500 });
    }

    if (!CHAIRMAN_POWERFUL_VOICE_ID || CHAIRMAN_POWERFUL_VOICE_ID === OLD_FAKE_ID || CHAIRMAN_POWERFUL_VOICE_ID.length < 10) {
      return NextResponse.json({ success: false, error: "Chairman! Voice ID wrong. Set CHAIRMAN_VOICE_ID = BXStbbwwT5cKeWf2Ik8O in Render" }, { status: 500 });
    }

    // 🔒 LOGIN CHECK - MUST LOGIN - NO FREE COLLECT!
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "🔒 No auth token - Login first!" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "🔒 Invalid session - Login again!" }, { status: 401 });
    }

    const { data: keyData, error: keyError } = await supabase.from("api_keys").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
    if (keyError || !keyData) {
      return NextResponse.json({ success: false, error: "No active API key found. Claim 100 FREE first for Pricing tab." }, { status: 400 });
    }

    const freeLeft = keyData.free_requests_remaining || 0;
    const paidLeft = keyData.paid_requests_remaining || 0;
    const totalLeft = freeLeft + paidLeft;
    if (totalLeft <= 0) {
      return NextResponse.json({ success: false, error: "No credits left. Buy Pro ₦5,000 for 1k voices - Paystack secured." }, { status: 400 });
    }

    const voiceId = VOICE_MAP[voice] || CHAIRMAN_POWERFUL_VOICE_ID;
    const styleConfig = VOICE_STYLES[voice] || { stability: 0.65, style: 0.35, boost: 0.90, model: "eleven_multilingual_v2", label: voice };
    const isFemale = voiceId === FEMALE_BELLA || voiceId === FEMALE_ELLI || voiceId === FEMALE_RACHEL || voiceId === WHATSAPP_FEMALE_1 || voiceId === WHATSAPP_FEMALE_2;

    console.log(`🎤 Voice: "${voice}" → ID: ${voiceId} ${styleConfig.label} Model:${styleConfig.model} ${isFemale ? '(FEMALE CLEAR)' : '(MALE CLEAR)'}`);

    // ✅ UPGRADED - v2 MODEL = CLEAR LIKE YOUR VIDEO - NOT V3 MUMBLE!
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: { "xi-api-key": elevenKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({
        text: text.trim(),
        model_id: styleConfig.model, // eleven_multilingual_v2 = CLEAR!
        voice_settings: { 
          stability: styleConfig.stability, 
          similarity_boost: styleConfig.boost, 
          style: styleConfig.style, 
          use_speaker_boost: true 
        },
      }),
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error("ElevenLabs error:", errText, "VoiceID:", voiceId, "Voice:", voice);
      return NextResponse.json({ success: false, error: `ElevenLabs failed: ${errText}` }, { status: 400 });
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`; // Zero space - No save for Supabase!

    // Deduct credit - Space park / Paystack withdrawal still intact
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
      voice_style: styleConfig.label,
      model_used: styleConfig.model,
      message: isFemale ? `Female voice clear! ${styleConfig.label}` : `Chairman Warri clear! ${styleConfig.label}`,
    });

  } catch (e: any) {
    console.error("TTS Route Error:", e);
    return NextResponse.json({ success: false, error: e.message || "Internal server error" }, { status: 500 });
  }
}