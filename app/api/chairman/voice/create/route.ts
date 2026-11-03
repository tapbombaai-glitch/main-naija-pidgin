// app/api/chairman/voice/create/route.ts
// Chairman Gin - Create New Naija Voice with HIGH QUALITY CLEAR CLONE
// Fixed for Warri Guy original clear voice

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const MIN_AUDIO_SIZE = 30_000; // 30KB min - at least 30 seconds

class RouteError extends Error {
  status: number;
  constructor(message: string, status: number) { 
    super(message); 
    this.status = status; 
  }
}

function json(data: any, status = 200) {
  return NextResponse.json(data, { 
    status, 
    headers: { "Cache-Control": "no-store" } 
  });
}

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new RouteError(`Server configuration missing: ${name}`, 500);
  }
  return value;
}

async function authorize(req: NextRequest) {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const authorization = req.headers.get("authorization");
  
  if (!authorization?.startsWith("Bearer ")) {
    throw new RouteError("Please log in as Chairman.", 401);
  }
  
  const token = authorization.slice(7).trim();
  if (!token) throw new RouteError("Invalid login session.", 401);
  
  const authClient = createClient(supabaseUrl, anonKey, { 
    auth: { persistSession: false, autoRefreshToken: false } 
  });
  
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) throw new RouteError("Your session is invalid. Please log in again.", 401);
  if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
    throw new RouteError("Access denied. Chairman only.", 403);
  }
  return user;
}

export async function POST(req: NextRequest) {
  let createdVoiceId: string | null = null;
  
  try {
    await authorize(req);
    
    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const elevenLabsKey = getEnv("ELEVENLABS_API_KEY");
    
    const admin = createClient(supabaseUrl, serviceKey, { 
      auth: { persistSession: false, autoRefreshToken: false } 
    });

    const formData = await req.formData();
    const name = String(formData.get("name") || "").trim();
    const category = String(formData.get("gender") || formData.get("category") || "male").trim().toLowerCase();
    const descriptionInput = String(formData.get("description") || "").trim();
    const audio = formData.get("audio");

    // Validation
    if (name.length < 2 || name.length > 80) {
      throw new RouteError("Voice name must contain 2–80 characters.", 400);
    }
    if (!(audio instanceof File)) {
      throw new RouteError("Please record or upload an audio sample (WAV or MP3, 30 sec - 2 mins).", 400);
    }
    if (audio.type && !audio.type.startsWith("audio/")) {
      throw new RouteError("Please upload a valid audio file (WAV, MP3, M4A).", 400);
    }
    if (audio.size < MIN_AUDIO_SIZE) {
      throw new RouteError("Audio too small. Record at least 30 seconds for clear Naija voice.", 400);
    }
    if (audio.size > MAX_AUDIO_SIZE) {
      throw new RouteError("Maximum audio upload size is 20 MB.", 400);
    }

    // FIXED: High quality file handling
    const originalFile = audio as File;
    const timestamp = Date.now();
    // Keep original quality - don't force webm
    let fileName = originalFile.name || `chairman-naija-voice-${timestamp}.wav`;
    // If webm, rename to wav for better quality processing
    if (fileName.toLowerCase().endsWith('.webm')) {
      fileName = fileName.replace(/\.webm$/i, '.wav');
    }

    const elevenForm = new FormData();
    elevenForm.append("name", name);
    elevenForm.append("description", descriptionInput || `Chairman Naija Pidgin voice - ${name} - Original clear Warri/Lagos accent - Main Naija Pidgin API - ${category}`);
    elevenForm.append("labels", JSON.stringify({ 
      language: "en", 
      accent: "Nigerian Pidgin", 
      gender: category === "female" ? "female" : "male", 
      age: "young adult", 
      accent_strength: "strong",
      descriptive: "clear, energetic, authentic Naija, confident, street smart",
      use_case: "conversational"
    }));
    elevenForm.append("files", originalFile, fileName);
    // FIXED: Enable high quality enhancements
    elevenForm.append("remove_background_noise", "true");

    console.log(`Creating voice: ${name}, file: ${fileName}, size: ${originalFile.size}`);

    const cloneResponse = await fetch("https://api.elevenlabs.io/v1/voices/add", { 
      method: "POST", 
      headers: { 
        "xi-api-key": elevenLabsKey, 
        Accept: "application/json" 
      }, 
      body: elevenForm, 
      cache: "no-store" 
    });
    
    const responseText = await cloneResponse.text();
    let cloneData: any; 
    try { 
      cloneData = JSON.parse(responseText); 
    } catch { 
      cloneData = {}; 
    }
    
    if (!cloneResponse.ok || !cloneData.voice_id) { 
      console.error("ElevenLabs cloning error:", responseText.slice(0, 2000)); 
      throw new RouteError(
        cloneData?.detail?.message || 
        cloneData?.detail || 
        cloneData?.message || 
        "ElevenLabs could not create this voice. Try: 1) Record longer (1-2 mins) 2) Quiet room 3) Clear Naija speech", 
        502
      ); 
    }
    
    createdVoiceId = cloneData.voice_id;
    const requiresVerification = Boolean(cloneData.requires_verification);

    // Save to Supabase
    const { data: savedVoice, error: saveError } = await admin
      .from("chairman_voices")
      .insert({ 
        name, 
        description: descriptionInput || `Chairman-created ${category} Naija voice - High quality clear tune`, 
        elevenlabs_voice_id: createdVoiceId, 
        category, 
        accent: "Naija Pidgin", 
        is_active: !requiresVerification, 
        is_published: false, 
        requires_verification: requiresVerification 
      })
      .select()
      .single();
      
    if (saveError || !savedVoice) { 
      console.error("Chairman voice database save failed:", saveError); 
      return json({ 
        success: false, 
        error: "ElevenLabs created the voice, but Supabase could not save it. Voice ID preserved.", 
        elevenlabs_voice_id: createdVoiceId 
      }, 500); 
    }

    return json({ 
      success: true, 
      message: requiresVerification 
        ? "Voice created with noise removal & high quality! Verification required." 
        : "Your CLEAR real Naija voice clone created successfully! Original tune preserved!", 
      voice_id: savedVoice.elevenlabs_voice_id, 
      elevenlabs_voice_id: savedVoice.elevenlabs_voice_id, 
      requiresVerification, 
      voice: { 
        id: savedVoice.id, 
        name: savedVoice.name, 
        voice_id: savedVoice.elevenlabs_voice_id, 
        elevenlabs_voice_id: savedVoice.elevenlabs_voice_id, 
        accent: savedVoice.accent, 
        category: savedVoice.category, 
        is_active: savedVoice.is_active, 
        is_published: savedVoice.is_published, 
        requires_verification: savedVoice.requires_verification 
      } 
    });
    
  } catch (error) { 
    console.error("Voice create route error:", error); 
    const status = error instanceof RouteError ? error.status : 500; 
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unexpected server error.",
      elevenlabs_voice_id: createdVoiceId || undefined
    }, status); 
  }
}

export async function GET() {
  return json({ 
    success: true, 
    message: "Chairman voice create API is active - Use POST with formData: name, gender, audio file" 
  });
}