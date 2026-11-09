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
// =====================================================

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
    elevenlabsVoiceId: "trUA3YUtv2X5gHxPt97C",
  },
};

function getHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "x-api-key, Content-Type",
    "Access-Control-Allow-Methods":
      "POST, OPTIONS",
    Vary: "Origin",
  };
}

function jsonResponse(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: getHeaders(),
  });
}

export async function POST(req: NextRequest) {
  try {
    // =================================================
    // 1. CUSTOMER API KEY
    // =================================================

    const apiKey =
      req.headers.get("x-api-key")?.trim() || "";

    if (!apiKey) {
      return jsonResponse(
        {
          success: false,
          error: "Missing x-api-key header.",
        },
        401
      );
    }

    /*
     * Do NOT assume the customer's key format here.
     * The database hash is the source of truth.
     */

    const keyHash = createHash("sha256")
      .update(apiKey)
      .digest("hex");

    const {
      data: keyData,
      error: keyError,
    } = await supabaseAdmin
      .from("api_keys")
      .select(
        `
        id,
        user_id,
        is_active,
        status
        `
      )
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (keyError) {
      console.error(
        "API key lookup failed:",
        keyError.message
      );

      return jsonResponse(
        {
          success: false,
          error:
            "API authentication temporarily unavailable.",
        },
        503
      );
    }

    if (!keyData) {
      return jsonResponse(
        {
          success: false,
          error: "Invalid API key.",
        },
        401
      );
    }

    if (keyData.is_active !== true) {
      return jsonResponse(
        {
          success: false,
          error: "This API key is inactive.",
        },
        401
      );
    }

    if (
      keyData.status &&
      keyData.status !== "active"
    ) {
      return jsonResponse(
        {
          success: false,
          error: "This API key is not active.",
        },
        401
      );
    }

    // =================================================
    // 2. READ REQUEST BODY
    // =================================================

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          success: false,
          error: "Invalid JSON request body.",
        },
        400
      );
    }

    const requestBody =
      body && typeof body === "object"
        ? (body as Record<string, unknown>)
        : {};

    const text =
      typeof requestBody.text === "string"
        ? requestBody.text.trim()
        : "";

    const requestedVoice =
      typeof requestBody.voice === "string"
        ? requestBody.voice.trim()
        : "";

    const requestedVoiceId =
      typeof requestBody.voiceId === "string"
        ? requestBody.voiceId.trim()
        : "";

    if (text.length < 3) {
      return jsonResponse(
        {
          success: false,
          error:
            "Text is required (minimum 3 characters).",
        },
        400
      );
    }

    if (text.length > 5000) {
      return jsonResponse(
        {
          success: false,
          error:
            "Text exceeds the 5000 character limit.",
        },
        400
      );
    }

    // =================================================
    // 3. RESOLVE CUSTOMER VOICE
    // =================================================

    let voiceConfig:
      | {
          name: string;
          elevenlabsVoiceId: string;
        }
      | undefined;

    /*
     * The customer console can send either:
     *
     * voice: "warri-babe"
     * voice: "chairman-voice"
     *
     * OR:
     *
     * voiceId: "w5p3k3PueAgQOT4lq0SF"
     * voiceId: "trUA3YUtv2X5gHxPt97C"
     */

    if (requestedVoice) {
      voiceConfig =
        CUSTOMER_VOICES[requestedVoice.toLowerCase()];
    }

    if (!voiceConfig && requestedVoiceId) {
      voiceConfig = Object.values(CUSTOMER_VOICES).find(
        (voice) =>
          voice.elevenlabsVoiceId === requestedVoiceId
      );
    }

    if (!voiceConfig) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid voice. Available voices: Warri Babe, Chairman Voice.",
          voices: [
            {
              id: "warri-babe",
              name: "Warri Babe",
              voice_id:
                "w5p3k3PueAgQOT4lq0SF",
            },
            {
              id: "chairman-voice",
              name: "Chairman Voice",
              voice_id:
                "trUA3YUtv2X5gHxPt97C",
            },
          ],
        },
        400
      );
    }

    // =================================================
    // 4. GENERATE AUDIO
    // =================================================

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
            stability: 0.35,
            similarity_boost: 0.85,
            style: 0.65,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const providerStatus =
        elevenLabsResponse.status;

      const providerMessage =
        await elevenLabsResponse.text();

      console.error(
        "ElevenLabs V1 TTS failed:",
        providerStatus,
        providerMessage
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Voice generation failed. Please try again.",
        },
        providerStatus === 429
          ? 429
          : 502
      );
    }

    const audioBuffer =
      await elevenLabsResponse.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return jsonResponse(
        {
          success: false,
          error:
            "ElevenLabs returned empty audio.",
        },
        502
      );
    }

    // =================================================
    // 5. ATOMIC CREDIT DEDUCTION
    // =================================================

    const {
      data: deductionResult,
      error: deductionError,
    } = await supabaseAdmin.rpc(
      "atomic_credit_deduct",
      {
        p_key_id: keyData.id,
        p_amount: 1,
      }
    );

    if (deductionError) {
      console.error(
        "Atomic credit deduction failed:",
        deductionError.message
      );

      /*
       * Audio is intentionally NOT returned
       * when billing cannot be confirmed.
       */

      return jsonResponse(
        {
          success: false,
          error:
            "Credit deduction failed. Audio was not delivered.",
        },
        503
      );
    }

    const deductionRow =
      Array.isArray(deductionResult)
        ? deductionResult[0]
        : deductionResult;

    if (!deductionRow) {
      console.error(
        "Credit deduction returned no result."
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Unable to confirm credit deduction.",
        },
        503
      );
    }

    // =================================================
    // 6. RETURN AUDIO
    // =================================================

    const base64Audio = Buffer
      .from(audioBuffer)
      .toString("base64");

    return jsonResponse({
      success: true,

      message:
        "Main Naija Pidgin voice generated successfully.",

      voice: {
        id:
          requestedVoice ||
          requestedVoiceId,
        name: voiceConfig.name,
        elevenlabs_voice_id:
          voiceConfig.elevenlabsVoiceId,
      },

      audio_base64: base64Audio,

      audio_mime: "audio/mpeg",

      credits: {
        remaining:
          deductionRow.credits_remaining,
        used:
          deductionRow.credits_used,
        total:
          deductionRow.credits_total,
      },
    });
  } catch (error) {
    console.error(
      "Customer V1 Speak API error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error: "Internal server error.",
      },
      500
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getHeaders(),
  });
}