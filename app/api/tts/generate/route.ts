import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY! || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ YOUR REAL MAIN NAIJA WARRI PIDGIN ID - COPIED TODAY
// This is the ID you just copied: BXStbbwwT5cKeWf2Ik8O
const CHAIRMAN_POWERFUL_VOICE_ID = 
  process.env.CHAIRMAN_VOICE_ID?.trim() || 
  process.env.ELEVENLABS_VOICE_ID?.trim() || 
  "BXStbbwwT5cKeWf2Ik8O"; // <- YOUR REAL ID, NOT DW6Z... AGAIN

const VOICE_MAP: Record<string, string> = {
  "Chairman Original": CHAIRMAN_POWERFUL_VOICE_ID,
  "My Voice": CHAIRMAN_POWERFUL_VOICE_ID,
  "Chairman Voice": CHAIRMAN_POWERFUL_VOICE_ID,
  "Powerful Voice": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Warri Pidgin": CHAIRMAN_POWERFUL_VOICE_ID,
  "Lagos Male": CHAIRMAN_POWERFUL_VOICE_ID, 
  "Abuja Female": CHAIRMAN_POWERFUL_VOICE_ID,
  "Pidgin Narrator": CHAIRMAN_POWERFUL_VOICE_ID,
  "Delta Warri": CHAIRMAN_POWERFUL_VOICE_ID,
  "Yoruba Mix": CHAIRMAN_POWERFUL_VOICE_ID,

  // ✅ NEW VOICES ADDED (same powerful ID)
  "Main Naija Pidgin 1": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 2": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 3": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 4": CHAIRMAN_POWERFUL_VOICE_ID,
  "Main Naija Pidgin 5": CHAIRMAN_POWERFUL_VOICE_ID,
};

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();
    
    if (!text || !voice) {
      return NextResponse.json({ success: false, error: "Text and voice required" }, { status: 400 });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenKey) {
      return NextResponse.json({ success: false, error: "ELEVENLABS_API_KEY not set in Render" }, { status: 500 });
    }

    if (!CHAIRMAN_POWERFUL_VOICE_ID || CHAIRMAN_POWERFUL_VOICE_ID === "DW6Zuhb8hBT0UMYMno9Z") {
      return NextResponse.json({ success: false, error: "Chairman! Your Voice ID still be old fake one. Go Render Environment set CHAIRMAN_VOICE_ID = BXStbbwwT5cKeWf2Ik8O" }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "No auth token" }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    const { data: keyData } = await supabase.from("api_keys").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();

    if (!keyData) {
      return NextResponse.json({ success: false, error: "No API key found. Claim free key first." }, { status: 400 });
    }

    const totalLeft = (keyData.free_requests_remaining || 0) + (keyData.paid_requests_remaining || 0);
    if (totalLeft <= 0) {
      return NextResponse.json({ success: false, error: "No credits left. Buy more." }, { status: 400 });
    }

    const voiceId = VOICE_MAP[voice] || CHAIRMAN_POWERFUL_VOICE_ID;
    console.log(`Using Voice ID: ${voiceId} for request: ${voice}`);

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_v3", // v3 sabi laugh, whisper, shout for Warri Pidgin
        voice_settings: { stability: 0.5, similarity_boost: 0.9, style: 0.8, use_speaker_boost: true }
      })
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error("ElevenLabs error:", errText, "VoiceID used:", voiceId);
      
      // Clear error message for voice_not_found
      if (errText.includes("voice_not_found") || errText.includes("not found")) {
        return NextResponse.json({ 
          success: false, 
          error: `Voice ID ${voiceId} not found. Go ElevenLabs -> My Voices -> Copy correct ID and set for Render CHAIRMAN_VOICE_ID. Raw: ${errText}` 
        }, { status: 400 });
      }

      return NextResponse.json({ success: false, error: `ElevenLabs failed: ${errText}` }, { status: 400 });
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    if (keyData.free_requests_remaining > 0) {
      await supabase.from("api_keys").update({ free_requests_remaining: keyData.free_requests_remaining - 1 }).eq("id", keyData.id);
    } else {
      await supabase.from("api_keys").update({ paid_requests_remaining: keyData.paid_requests_remaining - 1 }).eq("id", keyData.id);
    }

    const remaining = totalLeft - 1;

    return NextResponse.json({
      success: true,
      audio_url: audioUrl,
      remaining_credits: remaining,
      voice_used: "Main Naija Pidgin - Chairman Original",
      voice_id_used: voiceId,
      message: "Voice generated successfully with Chairman Warri voice!"
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}