import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const EXISTING_VOICES = ["BXStbbwwT5cKeWf2Ik8O", "w5p3k3PueAgQOT4lq0SF"];
const MAX_TEXT_LENGTH = 5000;
const TTS_TIMEOUT_MS = 45000; // Increased to 45s for high quality

class RouteError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
function getEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new RouteError(`Missing server configuration: ${name}`, 500);
  return value;
}
function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
async function authorize(req: NextRequest) {
  const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new RouteError("Please log in as Chairman.", 401);
  const token = authorization.slice(7).trim();
  if (!token) throw new RouteError("Invalid session. Please log in again.", 401);
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) throw new RouteError("Invalid session. Please log in again.", 401);
  if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) throw new RouteError("Access denied. Chairman only.", 403);
  return user;
}
export async function POST(req: NextRequest) {
  try {
    await authorize(req);
    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const elevenKey = getEnv("ELEVENLABS_API_KEY");
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").trim();
    const voiceId = String(body.voice_id || "").trim();
    if (!text) return jsonError("Text is required to generate speech.", 400);
    if (text.length > MAX_TEXT_LENGTH) return jsonError(`Text exceeds the ${MAX_TEXT_LENGTH}-character limit.`, 400);
    if (!voiceId) return jsonError("Voice ID is required.", 400);
    let elevenLabsVoiceId = voiceId;
    if (!EXISTING_VOICES.includes(voiceId)) {
      const { data: dbVoice, error: dbError } = await admin.from("chairman_voices").select("elevenlabs_voice_id, is_active, requires_verification, name").eq("elevenlabs_voice_id", voiceId).maybeSingle();
      if (dbError) return jsonError("Could not verify this voice. Please try again.", 500);
      if (!dbVoice) return jsonError("Voice not found in Chairman Studio. Please reload voices.", 404);
      if (dbVoice.requires_verification) return jsonError(`Voice "${dbVoice.name}" is awaiting verification.`, 403);
      if (!dbVoice.is_active) return jsonError(`Voice "${dbVoice.name}" is inactive.`, 403);
      elevenLabsVoiceId = dbVoice.elevenlabs_voice_id;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
    let ttsResponse: Response;
    try {
      // FIXED FOR CLEAR NAIJA VOICE - HIGH QUALITY
      ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(elevenLabsVoiceId)}?output_format=mp3_44100_192&optimize_streaming_latency=0`, 
        { 
          method: "POST", 
          headers: { "xi-api-key": elevenKey, "Content-Type": "application/json", Accept: "audio/mpeg" }, 
          body: JSON.stringify({ 
            text, 
            model_id: "eleven_multilingual_v2", 
            voice_settings: { 
              stability: 0.65,          // FIXED: High for clear stable Naija voice (was 0.5)
              similarity_boost: 0.85,   // FIXED: Keep original Warri/Lagos tune (was 0.75)
              style: 0.25,              // FIXED: Small style for clarity (was 0)
              use_speaker_boost: true 
            } 
          }), 
          signal: controller.signal, 
          cache: "no-store" 
        }
      );
    } catch (error) { 
      if (error instanceof Error && error.name === "AbortError") return jsonError("ElevenLabs request timed out after 45 seconds (high quality takes longer). Please try again.", 504); 
      throw error; 
    } finally { clearTimeout(timeoutId); }
    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text().catch(() => "");
      console.error("ElevenLabs TTS error:", ttsResponse.status, errorText.slice(0, 1000));
      if (ttsResponse.status === 401) return jsonError("ElevenLabs API key is invalid.", 502);
      if (ttsResponse.status === 404) return jsonError("Voice was not found on ElevenLabs.", 404);
      if (ttsResponse.status === 429) return jsonError("ElevenLabs quota or rate limit reached.", 429);
      return jsonError(`ElevenLabs speech generation failed (${ttsResponse.status}).`, 502);
    }
    const audioBuffer = await ttsResponse.arrayBuffer();
    if (!audioBuffer.byteLength) return jsonError("ElevenLabs returned empty audio.", 502);
    return new NextResponse(audioBuffer, { 
      status: 200, 
      headers: { 
        "Content-Type": "audio/mpeg", 
        "Cache-Control": "no-store", 
        "Content-Length": String(audioBuffer.byteLength), 
        "Content-Disposition": 'inline; filename="Main-Naija-Pidgin-Voice-Clear-192kbps.mp3"' 
      } 
    });
  } catch (error) { 
    console.error("Chairman voice test error:", error); 
    const status = error instanceof RouteError ? error.status : 500; 
    return jsonError(error instanceof Error ? error.message : "Unexpected server error.", status); 
  }
}