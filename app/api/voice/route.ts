import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

const VOICE_MAP: any = {
  chairman: "pFZP5JQG7iQjIQuC4Bku",
  madam: "XrExE9yKIg1WjnnlVkGX",
  pikin: "EXAVITQu4vr4xnSDxMaL"
};
const CHAIRMAN_VOICE_ID = "pFZP5JQG7iQjIQuC4Bku";

export async function POST(req: Request) {
  try {
    // 1. CHECK API KEY
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer mn_live_")) {
      return NextResponse.json({ 
        error: "Unauthorized. Get API Key at /keys",
        hint: "Add header: Authorization: Bearer YOUR_KEY"
      }, { status: 401 });
    }

    const apiKey = auth.replace("Bearer ", "").trim();
    const hash = hashKey(apiKey);

    const { data: keyData } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", hash)
      .eq("is_active", true)
      .single();

    if (!keyData) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }

    // 2. CHECK CREDITS - Your free keys control
    const freeLeft = keyData.free_requests_remaining ?? 100;
    const paidLeft = keyData.paid_requests_remaining ?? 0;
    const totalLeft = freeLeft + paidLeft;
    
    // If you use old schema with no free/paid columns, use usage_count logic
    if (keyData.max_requests && keyData.usage_count >= keyData.max_requests) {
       return NextResponse.json({ error: "No credits left. Buy more!" }, { status: 403 });
    }
    if (freeLeft !== undefined && totalLeft <= 0) {
       return NextResponse.json({ error: "No credits left. Buy more!" }, { status: 403 });
    }

    // 3. GET TEXT
    const body = await req.json();
    const { text, voice = "chairman" } = body;
    if (!text) {
      return NextResponse.json({ error: "Text required" }, { status: 400 });
    }

    // ✅ SAVE YOUR 35k - LIMIT FREE USERS
    const isFreeUser = freeLeft > 0;
    if (isFreeUser && text.length > 100) {
      return NextResponse.json({ 
        error: `Free key max 100 chars. Your text is ${text.length} chars. Buy paid key for 300 chars!` 
      }, { status: 400 });
    }
    if (text.length > 300) {
      return NextResponse.json({ error: "Max 300 chars" }, { status: 400 });
    }

    const voiceId = VOICE_MAP[voice] || CHAIRMAN_VOICE_ID;

    // ✅ FIX YOUR 35k PLENTY ISSUE - KEY ROTATION
    const elevenKeys = [
      process.env.ELEVENLABS_API_KEY,
      process.env.ELEVENLABS_API_KEY_1,
      process.env.ELEVENLABS_API_KEY_2,
      process.env.ELEVENLABS_API_KEY_3,
    ].filter(Boolean) as string[];

    if (elevenKeys.length === 0) {
      return NextResponse.json({ error: "No ElevenLabs key set in Render" }, { status: 500 });
    }

    const elevenKey = elevenKeys[Math.floor(Math.random() * elevenKeys.length)];

    const hasEmotionTag = text.includes("[laughs]") || text.includes("[laugh]") || text.includes("[whispers]");
    const modelToUse = hasEmotionTag ? "eleven_v3" : "eleven_multilingual_v2";

    // ✅ FIX: NO output_format - No more subscription_required error!
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        model_id: modelToUse,
        voice_settings: {
          stability: 0.70,
          similarity_boost: 0.85,
          style: hasEmotionTag ? 0.45 : 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!elevenRes.ok) {
      const errText = await elevenRes.text();
      console.log("ElevenLabs error:", errText);
      return NextResponse.json({ error: `ElevenLabs error: ${errText}` }, { status: 500 });
    }

    const audioBuffer = await elevenRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // 4. UPDATE USAGE - Deduct only on success!
    const updates: any = {
      last_used_at: new Date().toISOString(),
      usage_count: (keyData.usage_count || 0) + 1
    };
    
    // If your table get free/paid columns
    if (keyData.free_requests_remaining !== undefined) {
      if (keyData.free_requests_remaining > 0) {
        updates.free_requests_remaining = keyData.free_requests_remaining - 1;
      } else if (keyData.paid_requests_remaining > 0) {
        updates.paid_requests_remaining = keyData.paid_requests_remaining - 1;
      }
    }

    await supabase.from("api_keys").update(updates).eq("id", keyData.id);

    // 5. SUCCESS
    return NextResponse.json({
      success: true,
      audio_url: audioUrl,
      text: text,
      voice_used: voiceId,
      model_used: modelToUse,
      remaining: (totalLeft - 1),
      usage: keyData.usage_count + 1,
      message: "Voice generated! 35k saved with rotation!"
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}