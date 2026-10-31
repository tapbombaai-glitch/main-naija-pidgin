import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 🔥 PUT YOUR POWERFUL VOICE ID HERE - AFTER YOU CLONE FOR ELEVENLABS
const CHAIRMAN_POWERFUL_VOICE_ID = process.env.CHAIRMAN_VOICE_ID || "REPLACE_WITH_YOUR_VOICE_ID";

const VOICE_MAP: Record<string, string> = {
  // YOUR POWERFUL VOICE - NUMBER 1 - CHAIRMAN ORIGINAL
  "Chairman Original": CHAIRMAN_POWERFUL_VOICE_ID,
  "My Voice": CHAIRMAN_POWERFUL_VOICE_ID,
  "Chairman Voice": CHAIRMAN_POWERFUL_VOICE_ID,
  "Powerful Voice": CHAIRMAN_POWERFUL_VOICE_ID,
  "Chairman #1 Lagos Male - YOUR VOICE": CHAIRMAN_POWERFUL_VOICE_ID,
  
  // If you want ALL 5 voices to use YOUR powerful voice (uncomment below 5 lines)
  "Lagos Male": CHAIRMAN_POWERFUL_VOICE_ID, 
  "Abuja Female": CHAIRMAN_POWERFUL_VOICE_ID,
  "Pidgin Narrator": CHAIRMAN_POWERFUL_VOICE_ID,
  "Delta Warri": CHAIRMAN_POWERFUL_VOICE_ID,
  "Yoruba Mix": CHAIRMAN_POWERFUL_VOICE_ID,

  // Short names also use your voice
  "Abuja Fem": CHAIRMAN_POWERFUL_VOICE_ID,
  "Pidgin Nar": CHAIRMAN_POWERFUL_VOICE_ID,
  "Delta Wari": CHAIRMAN_POWERFUL_VOICE_ID,

  // Backup original ElevenLabs IDs (if you want to keep them, comment the 5 lines above and uncomment below)
  // "Lagos Male": "pFZP5JQG7iQjIQuC4Bku",
  // "Abuja Female": "21m00Tcm4TlvDq8ikWAM",
  // "Pidgin Narrator": "AZnzlk1XvdvUeBnXmlld", 
  // "Delta Warri": "EXAVITQu4vr4xnSDxMaL",
  // "Yoruba Mix": "MF3mGyEYCl7XYWbV9V6O",
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

    // Check if Chairman Voice ID is set
    if (!CHAIRMAN_POWERFUL_VOICE_ID || CHAIRMAN_POWERFUL_VOICE_ID === "REPLACE_WITH_YOUR_VOICE_ID") {
      return NextResponse.json({ success: false, error: "Chairman! Add your Voice ID for line 10. Go ElevenLabs clone your voice first." }, { status: 500 });
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

    // USE YOUR POWERFUL VOICE FOR ANY SELECTION
    const voiceId = VOICE_MAP[voice] || CHAIRMAN_POWERFUL_VOICE_ID;

    // Make pidgin sound better - fix "Main" pronunciation
    let optimizedText = text
      .replace(/Main Naija Pidgin/gi, "Main Naija Pidgin Marketplace")
      .replace(/\bMain\b/g, "Main");

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: optimizedText,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.6, similarity_boost: 0.85, style: 0.7 }
      })
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error("ElevenLabs error:", errText);
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
      voice_used: "Chairman Original - Your Powerful Voice",
      message: "Voice generated successfully with Chairman voice!"
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}