import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// YOUR CHAIRMAN VOICES -> ELEVENLABS VOICE IDs (Change to your real IDs from ElevenLabs dashboard)
const VOICE_MAP: Record<string, string> = {
  "Lagos Male": "pFZP5JQG7iQjIQuC4Bku", // Example - replace with your own
  "Abuja Female": "21m00Tcm4TlvDq8ikWAM",
  "Pidgin Narrator": "AZnzlk1XvdvUeBnXmlld", 
  "Delta Warri": "EXAVITQu4vr4xnSDxMaL",
  "Yoruba Mix": "MF3mGyEYCl7XYWbV9V6O",
  // Also support short names
  "Abuja Fem": "21m00Tcm4TlvDq8ikWAM",
  "Pidgin Nar": "AZnzlk1XvdvUeBnXmlld",
  "Delta Wari": "EXAVITQu4vr4xnSDxMaL",
  "Yoruba Mix": "MF3mGyEYCl7XYWbV9V6O",
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

    // Get user from token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "No auth token" }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });
    }

    // Get user's api key record for credit check
    const { data: keyData } = await supabase.from("api_keys").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();

    if (!keyData) {
      return NextResponse.json({ success: false, error: "No API key found. Claim free key first." }, { status: 400 });
    }

    const totalLeft = (keyData.free_requests_remaining || 0) + (keyData.paid_requests_remaining || 0);
    if (totalLeft <= 0) {
      return NextResponse.json({ success: false, error: "No credits left. Buy more." }, { status: 400 });
    }

    const voiceId = VOICE_MAP[voice] || VOICE_MAP["Lagos Male"];

    // CALL ELEVENLABS - YOUR OWN FREE KEY
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.8 }
      })
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.error("ElevenLabs error:", errText);
      return NextResponse.json({ success: false, error: `ElevenLabs failed: ${errText}` }, { status: 400 });
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    
    // Convert to base64 data URL - THIS FIXES 0:00 ISSUE 100%
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    // DEDUCT CREDIT ONLY AFTER SUCCESSFUL GENERATION
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
      message: "Voice generated successfully!"
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}