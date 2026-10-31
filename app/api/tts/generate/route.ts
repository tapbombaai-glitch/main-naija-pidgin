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
    if (!text || text.length > 2000) return NextResponse.json({ success: false, error: "Text too long" }, { status: 400 });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // CHECK CREDITS
    const { data: apiKey } = await supabaseAdmin
      .from("api_keys").select("*").eq("user_id", user.id).eq("is_active", true).single();

    if (!apiKey || (apiKey.free_requests_remaining + apiKey.paid_requests_remaining) <= 0) {
      return NextResponse.json({ success: false, error: "No credits, buy more" }, { status: 403 });
    }

    let audioUrl = "";

    // ===== REAL VOICE ENGINE START =====
    // If you have ELEVENLABS_API_KEY, it will generate REAL PIDGIN
    
    if (process.env.ELEVENLABS_API_KEY) {
      // MAP YOUR 5 VOICES TO ELEVENLABS VOICE IDs
      const voiceIds: any = {
        "Lagos Male": "pNInz6obpgDQGcFmaJgB", // Adam - deep male
        "Abuja Female": "21m00Tcm4TlvDq8ikWAM", // Rachel - female
        "Pidgin Narrator": "ErXwobaYiN019PkySvjV", // Antoni
        "Delta Warri": "VR6AewLTigWG4xSOukaG", // Arnold
        "Yoruba Mix": "EXAVITQu4vr4xnSDxMaL", // Bella
      };
      const voiceId = voiceIds[voice] || voiceIds["Lagos Male"];

      const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.6 }
        })
      });

      if (!elevenRes.ok) {
        const err = await elevenRes.text();
        throw new Error("ElevenLabs error: " + err);
      }

      const audioBuffer = await elevenRes.arrayBuffer();
      const fileName = `${user.id}/${Date.now()}-${voice.replace(/\s/g, "")}.mp3`;
      
      const { error: upErr } = await supabaseAdmin.storage
        .from("tts-audio")
        .upload(fileName, audioBuffer, { contentType: "audio/mpeg", upsert: true });
      
      if (upErr) throw new Error("Upload failed: " + upErr.message);

      const { data: publicUrl } = supabaseAdmin.storage.from("tts-audio").getPublicUrl(fileName);
      audioUrl = publicUrl.publicUrl;

    } else {
      // NO API KEY YET - USE FREE BACKUP THAT SPEAKS REAL TEXT (not music)
      // This uses a free TTS that will speak your text
      // It will say "How far boss" for real, not music!
      const encodedText = encodeURIComponent(text.substring(0, 200));
      // Free Google translate TTS - speaks real text
      audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodedText}`;
      // NOTE: Google sometimes blocks, so best is to add ELEVENLABS_API_KEY
    }
    // ===== REAL VOICE ENGINE END =====

    // DEDUCT CREDIT AFTER SUCCESS
    const newFree = apiKey.free_requests_remaining > 0 ? apiKey.free_requests_remaining - 1 : 0;
    const newPaid = apiKey.free_requests_remaining > 0 ? apiKey.paid_requests_remaining : apiKey.paid_requests_remaining - 1;

    await supabaseAdmin.from("api_keys")
      .update({ free_requests_remaining: newFree, paid_requests_remaining: newPaid })
      .eq("id", apiKey.id);

    // Save to history
    await supabaseAdmin.from("tts_generations").insert({
      user_id: user.id,
      text: text,
      voice: voice,
      audio_url: audioUrl
    });

    return NextResponse.json({
      success: true,
      audio_url: audioUrl,
      remaining_credits: newFree + newPaid
    });

  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}