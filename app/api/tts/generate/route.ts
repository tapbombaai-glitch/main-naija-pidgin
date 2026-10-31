import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ success: false, error: "No token" }, { status: 401 });

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (!user) return NextResponse.json({ success: false, error: "Login again" }, { status: 401 });

    const { text, voice } = await req.json();
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: apiKey } = await supabaseAdmin.from("api_keys")
      .select("*").eq("user_id", user.id).eq("is_active", true).single();

    if (!apiKey || (apiKey.free_requests_remaining + apiKey.paid_requests_remaining) <= 0) {
      return NextResponse.json({ success: false, error: "No credits" }, { status: 403 });
    }

    // === OCEAN B - YOUR REAL VOICE CLONE ===
    // Uses your CHAIRMAN_VOICE_ID from ElevenLabs
    
    const voiceMap: any = {
      "Lagos Male": process.env.CHAIRMAN_VOICE_ID || "pNInz6obpgDQGcFmaJgB",
      "Abuja Female": "21m00Tcm4TlvDq8ikWAM",
      "Pidgin Narrator": "ErXwobaYiN019PkySvjV",
      "Delta Warri": "VR6AewLTigWG4xSOukaG",
      "Yoruba Mix": "EXAVITQu4vr4xnSDxMaL",
    };

    const voiceId = voiceMap[voice] || process.env.CHAIRMAN_VOICE_ID;

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ success: false, error: "Add ELEVENLABS_API_KEY to Render first!" }, { status: 500 });
    }

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.55, use_speaker_boost: true }
      })
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      throw new Error(errText);
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    const fileName = `${user.id}/chairman-${Date.now()}.mp3`;

    await supabaseAdmin.storage.from("tts-audio").upload(fileName, audioBuffer, {
      contentType: "audio/mpeg", upsert: true
    });

    const { data: { publicUrl } } = supabaseAdmin.storage.from("tts-audio").getPublicUrl(fileName);

    // Deduct credit
    const newFree = apiKey.free_requests_remaining > 0 ? apiKey.free_requests_remaining - 1 : 0;
    const newPaid = apiKey.free_requests_remaining > 0 ? apiKey.paid_requests_remaining : apiKey.paid_requests_remaining - 1;
    
    await supabaseAdmin.from("api_keys").update({ free_requests_remaining: newFree, paid_requests_remaining: newPaid }).eq("id", apiKey.id);
    await supabaseAdmin.from("tts_generations").insert({ user_id: user.id, text, voice, audio_url: publicUrl });

    return NextResponse.json({ success: true, audio_url: publicUrl, remaining_credits: newFree + newPaid });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}