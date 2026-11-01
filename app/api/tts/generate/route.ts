import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! || 
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY! || 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ YOUR REAL VOICE - I NO CHANGE AM!
const CHAIRMAN_POWERFUL_VOICE_ID = 
  process.env.CHAIRMAN_VOICE_ID?.trim() || 
  process.env.ELEVENLABS_VOICE_ID?.trim() || 
  "BXStbbwwT5cKeWf2Ik8O"; // <- YOUR VOICE, I KEEP AM!

const CHAIRMAN_YORUBA_VOICE_ID = process.env.YORUBA_VOICE_ID?.trim() || CHAIRMAN_POWERFUL_VOICE_ID;
const CHAIRMAN_IGBO_VOICE_ID = process.env.IGBO_VOICE_ID?.trim() || CHAIRMAN_POWERFUL_VOICE_ID;

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
  "Yoruba Male": CHAIRMAN_YORUBA_VOICE_ID,
  "Yoruba Female": CHAIRMAN_YORUBA_VOICE_ID,
  "Yoruba Weather": CHAIRMAN_YORUBA_VOICE_ID,
  "Yoruba Weather Man": CHAIRMAN_YORUBA_VOICE_ID,
  "English Speaker": CHAIRMAN_POWERFUL_VOICE_ID,
  "Yoruba English": CHAIRMAN_YORUBA_VOICE_ID,
  "Yoruba-English Mix": CHAIRMAN_YORUBA_VOICE_ID,
  "Igbo Male": CHAIRMAN_IGBO_VOICE_ID,
  "Igbo Female": CHAIRMAN_IGBO_VOICE_ID,
  "Igbo Weather": CHAIRMAN_IGBO_VOICE_ID,
  "Igbo Weather Man": CHAIRMAN_IGBO_VOICE_ID,
  "Igbo English": CHAIRMAN_IGBO_VOICE_ID,
  "Igbo-English Mix": CHAIRMAN_IGBO_VOICE_ID,
  "Igbo Speaker": CHAIRMAN_IGBO_VOICE_ID,
};

export async function POST(req: NextRequest) {
  try {
    const { text, voice } = await req.json();
    if (!text || !voice) return NextResponse.json({ success: false, error: "Text and voice required" }, { status: 400 });

    // ✅ KEY ROTATION - Save your 35k! x3 = 105k
    const elevenKeys = [
      process.env.ELEVENLABS_API_KEY,
      process.env.ELEVENLABS_API_KEY_1,
      process.env.ELEVENLABS_API_KEY_2,
    ].filter(Boolean) as string[];
    const elevenKey = elevenKeys[Math.floor(Math.random() * elevenKeys.length)];
    if (!elevenKey) return NextResponse.json({ success: false, error: "ELEVENLABS_API_KEY not set" }, { status: 500 });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ success: false, error: "No auth token" }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ success: false, error: "Invalid session" }, { status: 401 });

    const { data: keyData } = await supabase.from("api_keys").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
    if (!keyData) return NextResponse.json({ success: false, error: "No API key found" }, { status: 400 });

    const totalLeft = (keyData.free_requests_remaining || 0) + (keyData.paid_requests_remaining || 0);
    if (totalLeft <= 0) return NextResponse.json({ success: false, error: "No credits left" }, { status: 400 });

    const voiceId = VOICE_MAP[voice] || CHAIRMAN_POWERFUL_VOICE_ID;

    // ✅ FIX FOR "NOT MY VOICE" - For instant clone like BXStbbwwT5cKeWf2Ik8O, use multilingual_v2 ONLY! v3 dey spoil am!
    // If you want feeling [laughs], we use turbo_v2_5 which supports am for instant clones
    const hasEmotionTag = text.includes("[laughs]") || text.includes("[whispers]") || text.includes("[shouts]") || text.includes("[sighs]") || text.includes("[laugh]");
    const modelToUse = hasEmotionTag ? "eleven_turbo_v2_5" : "eleven_multilingual_v2"; // <- turbo supports feeling + your voice
    const voiceSettings = {
      stability: 0.75,
      similarity_boost: 0.85,
      style: hasEmotionTag ? 0.30 : 0.0,
      use_speaker_boost: true
    };

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({ text, model_id: modelToUse, voice_settings: voiceSettings })
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
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

    return NextResponse.json({
      success: true,
      audio_url: audioUrl,
      remaining_credits: totalLeft - 1,
      voice_used: voice,
      voice_id_used: voiceId, // Will show BXStbbwwT5cKeWf2Ik8O
      model_used: modelToUse,
      message: "Voice generated successfully!"
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}