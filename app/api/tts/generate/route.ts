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

const WARRI_BABE = process.env.WARRI_BABE_VOICE_ID?.trim() || "w5p3k3PueAgQOT4lq0SF";
const FEMALE_1 = process.env.WHATSAPP_FEMALE_VOICE_ID_1?.trim() || BELLA;
const FEMALE_2 = process.env.WHATSAPP_FEMALE_VOICE_ID_2?.trim() || ELLI;

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

type VoiceConfig = {
  id: string;
  gender: "male" | "female";
  stability: number;
  style: number;
  label: string;
};

const WINNER_MALE: Omit<VoiceConfig, "id" | "label"> = {
  gender: "male",
  stability: 0.50,
  style: 0.75,
};

const WINNER_FEMALE: Omit<VoiceConfig, "id" | "label"> = {
  gender: "female",
  stability: 0.50,
  style: 0.75,
};

const VOICES: Record<string, VoiceConfig> = {
  "Main Naija Pidgin 1": { id: CHAIRMAN_VOICE, ...WINNER_MALE, label: "Main Pidgin 1 - sp100_s50_s75 - CLEAN" },
  "Main Naija Pidgin 2": { id: CHAIRMAN_VOICE, ...WINNER_MALE, label: "Main Pidgin 2 - CLEAN" },
  "Main Naija Pidgin 3": { id: CHAIRMAN_VOICE, ...WINNER_MALE, label: "Main Pidgin 3 - CLEAN" },
  "Main Naija Pidgin 3 - GREATEST": { id: CHAIRMAN_VOICE, ...WINNER_MALE, label: "GREATEST - LOCKED sp100_s50_s75" },
  "Main Naija Pidgin 4": { id: ADAM, gender: "male", stability: 0.50, style: 0.55, label: "Adam - Deep Male" },
  "Main Naija Pidgin 5": { id: ANTONI, gender: "male", stability: 0.50, style: 0.55, label: "Antoni - Balanced Male" },
  "Warri Babe": { id: WARRI_BABE, ...WINNER_FEMALE, label: "Warri Babe - sp100_s50_s75 - CLEAN" },
  "Lagos Male": { id: CHAIRMAN_VOICE, ...WINNER_MALE, label: "Lagos Male" },
  "Delta Warri": { id: ADAM, gender: "male", stability: 0.50, style: 0.55, label: "Delta Warri Male" },
  "Pidgin Narrator": { id: CHAIRMAN_VOICE, ...WINNER_MALE, label: "Pidgin Narrator" },
  "Chairman Original": { id: CHAIRMAN_VOICE, ...WINNER_MALE, label: "Chairman Original" },
  "Chairman Voice": { id: CHAIRMAN_VOICE, ...WINNER_MALE, label: "Chairman Voice" },
  "Abuja Female": { id: FEMALE_1, ...WINNER_FEMALE, label: "Abuja Female" },
  "Naija Slay Queen": { id: FEMALE_1, ...WINNER_FEMALE, label: "Naija Slay Queen" },
  "Warri Fine Girl": { id: FEMALE_2, ...WINNER_FEMALE, label: "Warri Fine Girl" },
  "Lagos Babe": { id: FEMALE_1, ...WINNER_FEMALE, label: "Lagos Babe" },
};

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ success: false, error: "Server config incomplete." }, { status: 500 });
    }

    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Please log in first." }, { status: 401 });
    }

    const token = authorization.slice(7);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Session expired." }, { status: 401 });
    }

    const body = await req.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voice = typeof body.voice === "string" ? body.voice.trim() : "";

    if (!text || !voice) return NextResponse.json({ success: false, error: "Text and voice required." }, { status: 400 });

    const voiceConfig = VOICES[voice];
    if (!voiceConfig) return NextResponse.json({ success: false, error: `Voice "${voice}" not registered.` }, { status: 400 });

    // ✅ CHAIRMAN CHECK - NO CREDIT FOR YOU
    const isChairman = user.email?.toLowerCase() === CHAIRMAN_EMAIL;
    let keyData: any = null;
    let freeLeft = 0, paidLeft = 0, totalLeft = 0;

    if (!isChairman) {
      const { data, error: keyError } = await adminClient.from("api_keys").select("id, user_id, is_active, free_requests_remaining, paid_requests_remaining").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (keyError || !data) return NextResponse.json({ success: false, error: "No active API key." }, { status: 400 });
      keyData = data;
      freeLeft = Math.max(0, Number(keyData.free_requests_remaining || 0));
      paidLeft = Math.max(0, Number(keyData.paid_requests_remaining || 0));
      totalLeft = freeLeft + paidLeft;
      if (totalLeft <= 0) return NextResponse.json({ success: false, error: "No credits remaining." }, { status: 402 });
    }

    const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceConfig.id)}`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_v3",
        voice_settings: {
          stability: voiceConfig.stability,
          style: voiceConfig.style,
        },
      }),
      cache: "no-store",
    });

    if (!elevenResponse.ok) {
      const err = await elevenResponse.text();
      console.error(err);
      return NextResponse.json({ success: false, error: "Voice generation failed." }, { status: 502 });
    }

    const audioBuffer = await elevenResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    // ✅ DEDUCT ONLY IF NOT CHAIRMAN
    if (!isChairman && keyData) {
      const updateField = freeLeft > 0 ? "free_requests_remaining" : "paid_requests_remaining";
      const newBalance = freeLeft > 0 ? freeLeft - 1 : paidLeft - 1;
      await adminClient.from("api_keys").update({ [updateField]: newBalance }).eq("id", keyData.id).eq("user_id", user.id);
    }

    return NextResponse.json({
      success: true,
      audio_url: `data:audio/mpeg;base64,${base64Audio}`,
      remaining_credits: isChairman ? 999999 : totalLeft - 1,
      voice_used: voice,
      chairman_mode: isChairman ? "NO CREDIT DEDUCTED - Chairman" : "Credit deducted",
      model_used: "eleven_v3",
      settings_used: `V3 CORRECT sp100_s50_s75 - stability:${voiceConfig.stability} style:${voiceConfig.style}`,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Unexpected error." }, { status: 500 });
  }
}