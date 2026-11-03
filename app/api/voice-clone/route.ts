import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;

class RouteError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
function json(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new RouteError(`Server config missing: ${name}`, 500);
  return value;
}

export async function POST(req: NextRequest) {
  let createdVoiceId: string | null = null;
  try {
    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const elevenLabsKey = getEnv("ELEVENLABS_API_KEY");

    // AUTH - ALLOW ALL LOGGED USERS
    const authorization = req.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) throw new RouteError("Please log in first.", 401);
    const token = authorization.slice(7).trim();
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await authClient.auth.getUser(token);
    if (error || !user) throw new RouteError("Session invalid. Please log in again.", 401);

    const isChairman = user.email?.toLowerCase() === CHAIRMAN_EMAIL;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // ✅ CREDIT CHECK - CHAIRMAN = FREE, CUSTOMER = PAY
    let keyData: any = null;
    let freeLeft = 0, paidLeft = 0, totalLeft = 0;
    if (!isChairman) {
      const { data, error: keyError } = await admin.from("api_keys").select("id, free_requests_remaining, paid_requests_remaining").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (keyError || !data) throw new RouteError("No active API key. Please buy credits.", 400);
      keyData = data;
      freeLeft = Math.max(0, Number(data.free_requests_remaining || 0));
      paidLeft = Math.max(0, Number(data.paid_requests_remaining || 0));
      totalLeft = freeLeft + paidLeft;
      if (totalLeft <= 0) throw new RouteError("No credits remaining. Buy credits to clone.", 402);
    }

    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim();
    const category = String(formData.get("gender") || formData.get("category") || "custom").trim().toLowerCase();
    const audio = formData.get("audio");
    if (name.length < 2 || name.length > 80) throw new RouteError("Voice name must contain 2–80 characters.", 400);
    if (!(audio instanceof File)) throw new RouteError("Please record or upload an audio sample.", 400);
    if (audio.type && !audio.type.startsWith("audio/")) throw new RouteError("Please upload a valid audio file.", 400);
    if (audio.size < 10_000) throw new RouteError("Audio too small. Record at least 30 seconds.", 400);
    if (audio.size > MAX_AUDIO_SIZE) throw new RouteError("Maximum audio size is 20 MB.", 400);

    // YOUR HIGH QUALITY FIX - KEEP AM!
    const originalName = (audio as File).name || `chairman-voice-${Date.now()}.wav`;
    const fileNameForEleven = originalName.toLowerCase().endsWith('.webm') ? originalName.replace(/\.webm$/i, '.wav') : originalName;

    const elevenForm = new FormData();
    elevenForm.append("name", name);
    elevenForm.append("description", `Chairman Naija Pidgin voice - ${name} - Original clear Warri/Lagos accent for Main Naija Pidgin API`);
    elevenForm.append("labels", JSON.stringify({ 
      language: "en", 
      accent: "Nigerian Pidgin", 
      gender: category, 
      age: "young adult", 
      use_case: "conversational",
      descriptive: "clear, energetic, authentic Naija" 
    }));
    elevenForm.append("files", audio, fileNameForEleven);
    elevenForm.append("remove_background_noise", "true");
    
    const cloneResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", { 
      method: "POST", 
      headers: { "xi-api-key": elevenLabsKey, Accept: "application/json" }, 
      body: elevenForm, 
      cache: "no-store" 
    });
    const responseText = await cloneResponse.text();
    let cloneData: any; try { cloneData = JSON.parse(responseText); } catch { cloneData = {}; }
    if (!cloneResponse.ok || !cloneData.voice_id) { 
      console.error("ElevenLabs error:", responseText.slice(0, 2000)); 
      throw new RouteError(cloneData?.detail?.message || "ElevenLabs could not create voice. Try 1-2 mins clear audio.", 502); 
    }
    createdVoiceId = cloneData.voice_id;
    const requiresVerification = Boolean(cloneData.requires_verification);
    
    const { data: savedVoice, error: saveError } = await admin.from("chairman_voices").insert({ 
      name, 
      description: `Chairman-created ${category} voice - High quality Naija`, 
      elevenlabs_voice_id: createdVoiceId, 
      category, 
      accent: "Naija Pidgin", 
      is_active: !requiresVerification, 
      is_published: false, 
      requires_verification: requiresVerification,
      user_id: user.id
    }).select().single();
    
    if (saveError || !savedVoice) { 
      console.error("DB save failed:", saveError); 
      return json({ success: false, error: "ElevenLabs created voice but DB failed.", elevenlabs_voice_id: createdVoiceId }, 500); 
    }

    // ✅ DEDUCT ONLY IF NOT CHAIRMAN
    if (!isChairman && keyData) {
      const field = freeLeft > 0 ? "free_requests_remaining" : "paid_requests_remaining";
      const newBal = freeLeft > 0 ? freeLeft - 1 : paidLeft - 1;
      await admin.from("api_keys").update({ [field]: newBal }).eq("id", keyData.id);
    }

    return json({ 
      success: true, 
      message: isChairman ? "Chairman clone FREE - High quality preserved!" : "Voice cloned - 1 credit used - High quality!",
      voice_id: savedVoice.elevenlabs_voice_id, 
      elevenlabs_voice_id: savedVoice.elevenlabs_voice_id, 
      remaining_credits: isChairman ? 999999 : totalLeft - 1,
      chairman_mode: isChairman ? "NO CREDIT - Chairman" : "Credit deducted",
      requiresVerification, 
      voice: savedVoice
    });
  } catch (error) { 
    console.error("Clone error:", error); 
    const status = error instanceof RouteError ? error.status : 500; 
    return json({ success: false, error: error instanceof Error ? error.message : "Unexpected error." }, status); 
  }
}