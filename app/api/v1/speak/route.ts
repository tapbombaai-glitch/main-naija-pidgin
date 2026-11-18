import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables.");
}

if (!ELEVENLABS_API_KEY) {
  throw new Error("Missing ELEVENLABS_API_KEY.");
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// =====================================================
// MAIN NAIJA PIDGIN CUSTOMER V1 VOICES
// !!! CHAIRMAN: PUT YOUR NEW CLONED ID HERE !!!
// Go ElevenLabs > Voices > Chairman Voice > Copy Voice ID
// Replace "PASTE_NEW_CHAIRMAN_ID_HERE" with that ID
// Old trUA... don delete, old GVstk... na Arab man - NO USE THEM
// =====================================================

const CHAIRMAN_VOICE_ID = "PASTE_NEW_CHAIRMAN_ID_HERE";

const CUSTOMER_VOICES: Record<
  string,
  {
    name: string;
    elevenlabsVoiceId: string;
  }
> = {
  "warri-babe": {
    name: "Warri Babe",
    elevenlabsVoiceId: "w5p3k3PueAgQOT4lq0SF",
  },
  "chairman-voice": {
    name: "Chairman Voice",
    elevenlabsVoiceId: CHAIRMAN_VOICE_ID,
  },
};

// =====================================================
// STRONG NAIJA TEXT FIX - No more "Pigeon" / "night night agent"
// =====================================================

function normalizeNaijaText(text: string): string {
  let t = text;
  t = t.replace(/\bPidgin\b/gi, "Pee-jin");
  t = t.replace(/\bPijin\b/gi, "Pee-jin");
  t = t.replace(/\bNaija\b/gi, "Nai-ja");
  t = t.replace(/\bMain\b/gi, "Mayn");
  t = t.replace(/\bChairman\b/gi, "Chair-man");
  t = t.replace(/\bWetin\b/gi, "We-tin");
  t = t.replace(/\bUna\b/gi, "U-na");
  t = t.replace(/\bWelcome\b/gi, "Wel-come");
  return t;
}

function getHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "x-api-key, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status, headers: getHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    // 1. CUSTOMER API KEY
    const apiKey = req.headers.get("x-api-key")?.trim() || "";
    if (!apiKey) {
      return jsonResponse({ success: false, error: "Missing x-api-key header." }, 401);
    }

    const keyHash = createHash("sha256").update(apiKey).digest("hex");

    const { data: keyData, error: keyError } = await supabaseAdmin
      .from("api_keys")
      .select(`id, user_id, is_active, status`)
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyError) {
      console.error("API key lookup failed:", keyError.message);
      return jsonResponse({ success: false, error: "API authentication temporarily unavailable." }, 503);
    }
    if (!keyData) {
      return jsonResponse({ success: false, error: "Invalid API key." }, 401);
    }
    if (keyData.is_active !== true) {
      return jsonResponse({ success: false, error: "This API key is inactive." }, 401);
    }
    if (keyData.status && keyData.status !== "active") {
      return jsonResponse({ success: false, error: "This API key is not active." }, 401);
    }

    // 2. READ REQUEST BODY
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON request body." }, 400);
    }

    const requestBody = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const rawText = typeof requestBody.text === "string" ? requestBody.text.trim() : "";
    const requestedVoice = typeof requestBody.voice === "string" ? requestBody.voice.trim() : "";
    const requestedVoiceId = typeof requestBody.voiceId === "string" ? requestBody.voiceId.trim() : "";

    if (rawText.length < 3) {
      return jsonResponse({ success: false, error: "Text is required (minimum 3 characters)." }, 400);
    }
    if (rawText.length > 5000) {
      return jsonResponse({ success: false, error: "Text exceeds the 5000 character limit." }, 400);
    }

    const text = normalizeNaijaText(rawText);

    // 3. RESOLVE CUSTOMER VOICE
    let voiceConfig: { name: string; elevenlabsVoiceId: string } | undefined;
    let resolvedVoiceKey = "";

    if (requestedVoice) {
      voiceConfig = CUSTOMER_VOICES[requestedVoice.toLowerCase()];
      if (voiceConfig) resolvedVoiceKey = requestedVoice.toLowerCase();
    }
    if (!voiceConfig && requestedVoiceId) {
      const foundEntry = Object.entries(CUSTOMER_VOICES).find(
        ([, voice]) => voice.elevenlabsVoiceId === requestedVoiceId
      );
      if (foundEntry) {
        resolvedVoiceKey = foundEntry[0];
        voiceConfig = foundEntry[1];
      }
    }

    if (!voiceConfig) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid voice. Available voices: Warri Babe, Chairman Voice.",
          voices: [
            { id: "warri-babe", name: "Warri Babe", voice_id: "w5p3k3PueAgQOT4lq0SF" },
            { id: "chairman-voice", name: "Chairman Voice", voice_id: CHAIRMAN_VOICE_ID },
          ],
        },
        400
      );
    }

    // FIX: If Chairman ID never replaced, tell user clearly - no hide
    if (resolvedVoiceKey === "chairman-voice" && CHAIRMAN_VOICE_ID === "PASTE_NEW_CHAIRMAN_ID_HERE") {
      return jsonResponse(
        {
          success: false,
          error: "Chairman Voice never set. Go ElevenLabs, clone Chairman Voice, paste new Voice ID for backend. Old trUA ID don delete.",
        },
        400
      );
    }

    // 4. GENERATE AUDIO - multilingual_v2 + stable settings
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        voiceConfig.elevenlabsVoiceId
      )}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      }
    );

    // FIX: Show REAL ElevenLabs error - no more blind "Please try again"
    if (!elevenLabsResponse.ok) {
      const providerStatus = elevenLabsResponse.status;
      const providerMessage = await elevenLabsResponse.text();
      console.error("ElevenLabs V1 TTS failed:", providerStatus, providerMessage);

      // Friendly translation for common errors
      let friendly = providerMessage.slice(0, 300);
      if (providerMessage.includes("voice_not_found") || providerStatus === 404) {
        friendly = `Voice ID ${voiceConfig.elevenlabsVoiceId} not found for ElevenLabs. This voice don delete. Re-clone Chairman Voice and update backend ID.`;
      }
      if (providerStatus === 401) {
        friendly = "ElevenLabs API key invalid. Check ELEVENLABS_API_KEY for Render.";
      }

      return jsonResponse(
        {
          success: false,
          error: `Voice generation failed: ${friendly}`,
          elevenlabs_status: providerStatus,
          elevenlabs_raw: providerMessage.slice(0, 500),
        },
        providerStatus === 429 ? 429 : 502
      );
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      return jsonResponse({ success: false, error: "ElevenLabs returned empty audio." }, 502);
    }

    // 5. ATOMIC CREDIT DEDUCTION
    const { data: deductionResult, error: deductionError } = await supabaseAdmin.rpc(
      "atomic_credit_deduct",
      { p_key_id: keyData.id, p_amount: 1 }
    );

    if (deductionError) {
      console.error("Atomic credit deduction failed:", deductionError.message);
      return jsonResponse({ success: false, error: "Credit deduction failed. Audio was not delivered." }, 503);
    }

    const deductionRow = Array.isArray(deductionResult) ? deductionResult[0] : deductionResult;
    if (!deductionRow) {
      console.error("Credit deduction returned no result.");
      return jsonResponse({ success: false, error: "Unable to confirm credit deduction." }, 503);
    }

    // 6. RETURN AUDIO
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return jsonResponse({
      success: true,
      message: "Main Naija Pidgin voice generated successfully.",
      voice: {
        id: resolvedVoiceKey,
        name: voiceConfig.name,
        elevenlabs_voice_id: voiceConfig.elevenlabsVoiceId,
      },
      audio_base64: base64Audio,
      audio_mime: "audio/mpeg",
      credits: {
        remaining: deductionRow.credits_remaining,
        used: deductionRow.credits_used,
        total: deductionRow.credits_total,
      },
    });
  } catch (error) {
    console.error("Customer V1 Speak API error:", error);
    return jsonResponse({ success: false, error: "Internal server error." }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: getHeaders() });
}