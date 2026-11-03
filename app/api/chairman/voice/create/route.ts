// app/api/chairman/voice/create/route.ts - V2 UPGRADED - CLEAR NAIJA CLONE
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const MIN_AUDIO_SIZE = 30_000;
const MAX_FILES = 5;

class RouteError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
function json(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new RouteError(`Server missing: ${name}`, 500);
  return v;
}
async function authorize(req: NextRequest) {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new RouteError("Please log in as Chairman.", 401);
  const token = auth.slice(7).trim();
  if (!token) throw new RouteError("Invalid session.", 401);
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new RouteError("Invalid session. Login again.", 401);
  if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) throw new RouteError("Chairman only.", 403);
  return user;
}

export async function POST(req: NextRequest) {
  let createdVoiceId: string | null = null;
  try {
    await authorize(req);
    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const elevenKey = getEnv("ELEVENLABS_API_KEY");
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim();
    const category = String(formData.get("gender") || formData.get("category") || "male").trim().toLowerCase();
    const descriptionInput = String(formData.get("description") || "").trim();

    // UPGRADED: Support multiple files
    const audioFiles: File[] = [];
    const singleAudio = formData.get("audio");
    if (singleAudio instanceof File) audioFiles.push(singleAudio);
    
    // Also check for audios[] or files
    for (let i = 0; i < MAX_FILES; i++) {
      const f = formData.get(`audio_${i}`) || formData.get(`audios`) || formData.get(`files`);
      if (f instanceof File && !audioFiles.includes(f)) audioFiles.push(f);
    }
    // Deduplicate
    const uniqueFiles = Array.from(new Map(audioFiles.map(f => [`${f.name}-${f.size}`, f])).values()).slice(0, MAX_FILES);

    if (name.length < 2 || name.length > 80) throw new RouteError("Voice name 2-80 characters.", 400);
    if (uniqueFiles.length === 0) throw new RouteError("Upload at least 1 audio (30 sec - 3 mins). For best clear voice, upload 3 samples.", 400);

    let totalSize = 0;
    for (const f of uniqueFiles) {
      if (f.type && !f.type.startsWith("audio/") && !f.type.startsWith("video/")) throw new RouteError(`Invalid file type: ${f.name}. Use WAV, MP3, M4A, WEBM.`, 400);
      if (f.size < MIN_AUDIO_SIZE) throw new RouteError(`File ${f.name} too small. Record at least 30 sec.`, 400);
      totalSize += f.size;
    }
    if (totalSize > MAX_AUDIO_SIZE) throw new RouteError(`Total audio size too large (${Math.round(totalSize/1024/1024)}MB). Max 25MB.`, 400);

    // UPGRADED: Check duplicate name in Supabase
    const { data: existingName } = await admin.from("chairman_voices").select("id").eq("name", name).maybeSingle();
    if (existingName) throw new RouteError(`Voice name "${name}" already exists. Use different name like "${name} V2" or "${name} Clear".`, 409);

    const elevenForm = new FormData();
    elevenForm.append("name", name);
    elevenForm.append("description", descriptionInput || `Chairman Gin - High quality clear Naija Pidgin voice - ${name} - Authentic Warri/Lagos street accent - ${category} - Main Naija Pidgin API`);
    elevenForm.append("labels", JSON.stringify({
      language: "en",
      accent: "nigerian pidgin",
      gender: category === "female" ? "female" : "male",
      age: "young adult",
      descriptive: "clear, energetic, authentic Naija, Warri, confident, street smart, original",
      use_case: "conversational"
    }));

    // UPGRADED: Append multiple files with high quality names
    uniqueFiles.forEach((file, idx) => {
      let fileName = file.name || `chairman-naija-${Date.now()}-${idx}.wav`;
      if (fileName.toLowerCase().endsWith('.webm')) fileName = fileName.replace(/\.webm$/i, `.wav`);
      elevenForm.append("files", file, fileName);
    });
    elevenForm.append("remove_background_noise", "true");

    console.log(`Chairman creating voice: ${name}, files: ${uniqueFiles.length}, total: ${Math.round(totalSize/1024)}KB`);

    const cloneResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": elevenKey, Accept: "application/json" },
      body: elevenForm,
      cache: "no-store"
    });

    const responseText = await cloneResponse.text();
    let cloneData: any; try { cloneData = JSON.parse(responseText); } catch { cloneData = {}; }

    if (!cloneResponse.ok || !cloneData.voice_id) {
      console.error("ElevenLabs cloning error:", responseText.slice(0, 3000));
      if (cloneResponse.status === 403) throw new RouteError("ElevenLabs blocked (403): Your API key does not have permission to clone voices, or you reached clone limit (free plan = 3 voices). Upgrade plan or delete old voices at elevenlabs.io/app", 403);
      if (cloneResponse.status === 422) throw new RouteError(`ElevenLabs validation (422): ${cloneData?.detail?.message || responseText.slice(0,200)}. Try longer audio (1-2 mins) with clear speech.`, 422);
      if (cloneResponse.status === 429) throw new RouteError("ElevenLabs rate limit (429). Wait 1 minute and try again.", 429);
      throw new RouteError(cloneData?.detail?.message || cloneData?.detail || cloneData?.message || `ElevenLabs failed (${cloneResponse.status}).`, 502);
    }

    createdVoiceId = cloneData.voice_id;
    const requiresVerification = Boolean(cloneData.requires_verification);

    const { data: savedVoice, error: saveError } = await admin.from("chairman_voices").insert({
      name,
      description: descriptionInput || `Chairman V2 ${category} Naija - ${uniqueFiles.length} samples - High clarity`,
      elevenlabs_voice_id: createdVoiceId,
      category,
      accent: "Naija Pidgin",
      is_active: !requiresVerification,
      is_published: false,
      requires_verification: requiresVerification
    }).select().single();

    if (saveError || !savedVoice) {
      console.error("Supabase save failed:", saveError);
      return json({ success: false, error: "ElevenLabs created voice but Supabase save failed. Voice preserved.", elevenlabs_voice_id: createdVoiceId, requires_verification: requiresVerification }, 500);
    }

    return json({
      success: true,
      message: requiresVerification ? `Voice "${name}" created! CLEAR quality with ${uniqueFiles.length} samples. Needs verification at elevenlabs.io → My Voices → Verify` : `SUCCESS! Clear Naija voice "${name}" cloned with ${uniqueFiles.length} samples! Original Warri tune preserved! 100% clear!`,
      voice_id: savedVoice.elevenlabs_voice_id,
      elevenlabs_voice_id: savedVoice.elevenlabs_voice_id,
      requiresVerification,
      files_used: uniqueFiles.length,
      voice: { id: savedVoice.id, name: savedVoice.name, voice_id: savedVoice.elevenlabs_voice_id, elevenlabs_voice_id: savedVoice.elevenlabs_voice_id, accent: savedVoice.accent, category: savedVoice.category, is_active: savedVoice.is_active, is_published: savedVoice.is_published, requires_verification: savedVoice.requires_verification }
    });

  } catch (error) {
    console.error("Voice create V2 error:", error);
    const status = error instanceof RouteError ? error.status : 500;
    return json({ success: false, error: error instanceof Error ? error.message : "Unexpected error.", elevenlabs_voice_id: createdVoiceId || undefined }, status);
  }
}

export async function GET() {
  return json({ success: true, message: "Chairman V2 Voice Create API - Upgraded - Supports 1-5 files for ultra-clear clone", upgrades: ["multi-file support (1-5 samples)", "duplicate name check", "better 403/422 handling", "noise removal", "clear Naija labels"] });
}