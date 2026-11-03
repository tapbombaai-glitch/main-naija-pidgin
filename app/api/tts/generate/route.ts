import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const authClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CHAIRMAN_VOICE =
  process.env.CHAIRMAN_VOICE_ID?.trim() ||
  process.env.ELEVENLABS_VOICE_ID?.trim() ||
  "Ye6C5yxJmY1P8bPSIMAl";

const BELLA = "EXAVITQu4vr4xnSDxMaL";
const ELLI = "MF3mGyEYCl7XYWbV9V6O";
const RACHEL = "21m00Tcm4TlvDq8ikWAM";
const ADAM = "pNInz6obpgDQGcFmaJgB";
const ANTONI = "ErXwobaYiN019PkySvjV";

const WARRI_BABE =
  process.env.WARRI_BABE_VOICE_ID?.trim() ||
  "w5p3k3PueAgQOT4lq0SF";

const FEMALE_1 = process.env.WHATSAPP_FEMALE_VOICE_ID_1?.trim() || BELLA;
const FEMALE_2 = process.env.WHATSAPP_FEMALE_VOICE_ID_2?.trim() || ELLI;

type VoiceConfig = {
  id: string;
  gender: "male" | "female";
  stability: number;
  style: number;
  label: string;
};

const VOICES: Record<string, VoiceConfig> = {
  // MAIN NAIJA PIDGIN - LOCKED TO CLEAN NATURAL VOICE - V3 SETTINGS
  "Main Naija Pidgin 1": {
    id: CHAIRMAN_VOICE,
    gender: "male",
    stability: 0.35,
    style: 0.75,
    label: "Chairman Original - Young",
  },
  "Main Naija Pidgin 2": {
    id: CHAIRMAN_VOICE,
    gender: "male",
    stability: 0.35,
    style: 0.72,
    label: "Chairman Original - Warm",
  },
  "Main Naija Pidgin 3": {
    id: CHAIRMAN_VOICE,
    gender: "male",
    stability: 0.32,
    style: 0.75,
    label: "Chairman Original - Expressive",
  },
  "Main Naija Pidgin 3 - GREATEST": {
    id: CHAIRMAN_VOICE,
    gender: "male",
    stability: 0.32,
    style: 0.75,
    label: "Chairman Original - Greatest - LOCKED CLEAN VOICE",
  },
  "Main Naija Pidgin 4": {
    id: ADAM,
    gender: "male",
    stability: 0.40,
    style: 0.55,
    label: "Adam - Deep Male",
  },
  "Main Naija Pidgin 5": {
    id: ANTONI,
    gender: "male",
    stability: 0.40,
    style: 0.55,
    label: "Antoni - Balanced Male",
  },

  "Warri Babe": {
    id: WARRI_BABE,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "Warri Babe - Female",
  },

  "Lagos Male": {
    id: CHAIRMAN_VOICE,
    gender: "male",
    stability: 0.35,
    style: 0.75,
    label: "Lagos Male",
  },
  "Delta Warri": {
    id: ADAM,
    gender: "male",
    stability: 0.40,
    style: 0.55,
    label: "Delta Warri Male",
  },
  "Pidgin Narrator": {
    id: CHAIRMAN_VOICE,
    gender: "male",
    stability: 0.35,
    style: 0.75,
    label: "Pidgin Narrator",
  },
  "Yoruba Mix": {
    id: ANTONI,
    gender: "male",
    stability: 0.40,
    style: 0.55,
    label: "Yoruba Mix Male",
  },
  "Chairman Original": {
    id: CHAIRMAN_VOICE,
    gender: "male",
    stability: 0.35,
    style: 0.75,
    label: "Chairman Original",
  },
  "Chairman Voice": {
    id: CHAIRMAN_VOICE,
    gender: "male",
    stability: 0.35,
    style: 0.75,
    label: "Chairman Voice",
  },

  "Abuja Female": {
    id: FEMALE_1,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "Abuja Female",
  },
  "Naija Slay Queen": {
    id: FEMALE_1,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "Naija Slay Queen",
  },
  "Naija Slay Queen - Female": {
    id: FEMALE_1,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "Naija Slay Queen Female",
  },
  "Warri Fine Girl": {
    id: FEMALE_2,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "Warri Fine Girl",
  },
  "Lagos Babe": {
    id: FEMALE_1,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "Lagos Babe",
  },
  "PH Fine Girl": {
    id: FEMALE_2,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "PH Fine Girl",
  },
  "Female Voice 1": {
    id: FEMALE_1,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "Female Voice 1",
  },
  "Female Voice 2": {
    id: FEMALE_2,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "Female Voice 2",
  },
  "Lagos Female": {
    id: RACHEL,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "Lagos Female",
  },
  "Warri Fine Girl - FEMALE": {
    id: FEMALE_2,
    gender: "female",
    stability: 0.38,
    style: 0.70,
    label: "Warri Fine Girl Female",
  },
};

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ success: false, error: "Server configuration is incomplete. Check Render environment variables." }, { status: 500 });
    }

    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Please log in first." }, { status: 401 });
    }

    const token = authorization.slice(7);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Your session has expired. Log in again." }, { status: 401 });
    }

    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voice = typeof body.voice === "string" ? body.voice.trim() : "";

    if (!text || !voice) {
      return NextResponse.json({ success: false, error: "Text and voice are required." }, { status: 400 });
    }
    if (text.length > 5000) {
      return NextResponse.json({ success: false, error: "Maximum text length is 5000 characters." }, { status: 400 });
    }

    const voiceConfig = VOICES[voice];
    if (!voiceConfig) {
      return NextResponse.json({ success: false, error: `Voice "${voice}" is not registered in the voice engine.` }, { status: 400 });
    }

    const { data: keyData, error: keyError } = await adminClient.from("api_keys").select("id, user_id, is_active, free_requests_remaining, paid_requests_remaining").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (keyError || !keyData) {
      return NextResponse.json({ success: false, error: "No active API key found. Claim your 100 free requests first." }, { status: 400 });
    }

    const freeLeft = Math.max(0, Number(keyData.free_requests_remaining || 0));
    const paidLeft = Math.max(0, Number(keyData.paid_requests_remaining || 0));
    const totalLeft = freeLeft + paidLeft;
    if (totalLeft <= 0) {
      return NextResponse.json({ success: false, error: "You have no requests remaining. Please purchase more credits." }, { status: 400 });
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY;
    const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceConfig.id)}`, {
      method: "POST",
      headers: { "xi-api-key": elevenKey!, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: {
          stability: voiceConfig.stability,
          similarity_boost: 0.80,
          style: voiceConfig.style,
          use_speaker_boost: true,
        },
      }),
      cache: "no-store",
    });

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text();
      console.error("ElevenLabs generation failed:", errorText);
      return NextResponse.json({ success: false, error: "Voice generation failed. Check your ElevenLabs voice ID and account." }, { status: 502 });
    }

    const audioBuffer = await elevenResponse.arrayBuffer();
    if (!audioBuffer.byteLength) {
      return NextResponse.json({ success: false, error: "The voice engine returned empty audio." }, { status: 502 });
    }

    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    const updateField = freeLeft > 0 ? "free_requests_remaining" : "paid_requests_remaining";
    const newBalance = freeLeft > 0 ? freeLeft - 1 : paidLeft - 1;

    const { error: creditError } = await adminClient.from("api_keys").update({ [updateField]: newBalance }).eq("id", keyData.id).eq("user_id", user.id);
    if (creditError) {
      console.error("Credit deduction failed:", creditError);
      return NextResponse.json({ success: false, error: "Audio was generated, but credit updating failed. Contact support before retrying." }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        audio_url: audioUrl,
        remaining_credits: totalLeft - 1,
        voice_used: voice,
        voice_id_used: voiceConfig.id,
        voice_gender: voiceConfig.gender,
        voice_style: voiceConfig.label,
        model_used: "eleven_v3",
        message: `${voiceConfig.label} generated successfully.`,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("TTS route error:", error);
    return NextResponse.json({ success: false, error: "An unexpected voice-generation error occurred." }, { status: 500 });
  }
}