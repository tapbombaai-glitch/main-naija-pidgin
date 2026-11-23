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

const CHAIRMAN_VOICE_ID =
  process.env.CHAIRMAN_VOICE_ID || "";

const MODEL_ID =
  process.env.ELEVENLABS_MODEL_ID ||
  "eleven_multilingual_v2";

const MAX_TEXT_LENGTH = 5000;
const REQUEST_TIMEOUT = 90000;

const ALLOWED_MODELS = [
  "eleven_multilingual_v2",
  "eleven_v3",
  "eleven_v4",
];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase environment variables.");
}

if (!ELEVENLABS_API_KEY) {
  throw new Error("Missing ELEVENLABS_API_KEY.");
}

if (!ALLOWED_MODELS.includes(MODEL_ID)) {
  throw new Error("Unsupported ElevenLabs model.");
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

type VoiceConfig = {
  name: string;
  publicId: string;
  elevenlabsVoiceId: string;
};

const FALLBACK_VOICES: Record<string, VoiceConfig> = {
  "warri-babe": {
    name: "Warri Babe",
    publicId: "warri-babe",
    elevenlabsVoiceId: "w5p3k3PueAgQOT4lq0SF",
  },

  "chairman-voice": {
    name: "Chairman Voice",
    publicId: "chairman-voice",
    elevenlabsVoiceId: CHAIRMAN_VOICE_ID,
  },
};

function getHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "x-api-key, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Resolve only voices that are enabled in mn_voices.
 *
 * The actual ElevenLabs provider ID must come from
 * chairman_voices.elevenlabs_voice_id.
 *
 * Never use mn_voices.voice_id as a provider ID.
 */
async function resolveVoice(
  requestedVoice: string,
  requestedVoiceId: string
): Promise<VoiceConfig | null> {

  const { data: marketplaceVoices, error } =
    await supabaseAdmin
      .from("mn_voices")
      .select("voice_id, name, enabled")
      .limit(100);

  if (error) {
    console.error("Voice marketplace lookup failed:", error);
    throw new Error("Voice marketplace is temporarily unavailable.");
  }

  const voices = marketplaceVoices || [];

  // First, resolve the requested marketplace voice.
  const marketplaceVoice = voices.find((voice: any) => {
    if (voice.enabled !== true) return false;

    const slug = toSlug(
      String(voice.name || voice.voice_id || "")
    );

    const storedId = String(
      voice.voice_id || ""
    ).toLowerCase();

    const name = String(
      voice.name || ""
    ).toLowerCase();

    if (requestedVoice) {
      return (
        slug === toSlug(requestedVoice) ||
        storedId === requestedVoice ||
        name === requestedVoice
      );
    }

    return false;
  });

  if (marketplaceVoice) {
    const voiceName = String(
      marketplaceVoice.name || marketplaceVoice.voice_id
    );

    // Look up the real provider ID.
    const { data: chairmanVoice, error: providerError } =
      await supabaseAdmin
        .from("chairman_voices")
        .select(
          "name, elevenlabs_voice_id, is_published, is_active"
        )
        .eq("name", voiceName)
        .eq("is_published", true)
        .eq("is_active", true)
        .maybeSingle();

    if (providerError) {
      console.error(
        "Provider voice lookup failed:",
        providerError
      );

      throw new Error("Unable to verify the selected voice.");
    }

    const providerId = String(
      chairmanVoice?.elevenlabs_voice_id || ""
    ).trim();

    // Do not use the marketplace slug as a provider ID.
    if (!chairmanVoice || !providerId) {
      return null;
    }

    return {
      name: voiceName,
      publicId: toSlug(
        String(marketplaceVoice.voice_id || voiceName)
      ),
      elevenlabsVoiceId: providerId,
    };
  }

  // Support direct provider-ID requests only for known fallback voices.
  if (requestedVoiceId) {
    const fallback = Object.values(FALLBACK_VOICES).find(
      (voice) =>
        voice.elevenlabsVoiceId &&
        voice.elevenlabsVoiceId === requestedVoiceId
    );

    if (fallback) return fallback;
  }

  // Preserve existing Warri Babe and Chairman Voice fallback.
  if (requestedVoice) {
    const fallback =
      FALLBACK_VOICES[requestedVoice] ||
      FALLBACK_VOICES[toSlug(requestedVoice)];

    if (fallback) return fallback;
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // 1. API KEY AUTHENTICATION

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

    const keyHash = createHash("sha256")
      .update(apiKey)
      .digest("hex");

    const { data: keyData, error: keyError } =
      await supabaseAdmin
        .from("api_keys")
        .select("id, user_id, is_active, status")
        .eq("key_hash", keyHash)
        .maybeSingle();

    if (keyError) {
      console.error("API key lookup failed:", keyError);

      return jsonResponse(
        {
          success: false,
          error: "API authentication temporarily unavailable.",
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

    if (
      keyData.is_active !== true ||
      (keyData.status && keyData.status !== "active")
    ) {
      return jsonResponse(
        {
          success: false,
          error: "This API key is inactive.",
        },
        401
      );
    }

    // 2. VALIDATE REQUEST

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
        ? requestBody.voice.trim().toLowerCase()
        : "";

    const requestedVoiceId =
      typeof requestBody.voiceId === "string"
        ? requestBody.voiceId.trim()
        : "";

    if (text.length < 3) {
      return jsonResponse(
        {
          success: false,
          error: "Text must contain at least 3 characters.",
        },
        400
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return jsonResponse(
        {
          success: false,
          error: "Text exceeds the 5000 character limit.",
        },
        400
      );
    }

    if (!requestedVoice && !requestedVoiceId) {
      return jsonResponse(
        {
          success: false,
          error: "Please select a voice.",
        },
        400
      );
    }

    // IMPORTANT:
    // Original Nigerian Pidgin text is sent unchanged.

    // 3. RESOLVE VOICE

    let voiceConfig: VoiceConfig | null;

    try {
      voiceConfig = await resolveVoice(
        requestedVoice,
        requestedVoiceId
      );
    } catch (error) {
      console.error("Voice resolution error:", error);

      return jsonResponse(
        {
          success: false,
          error: "Unable to verify the selected voice.",
        },
        503
      );
    }

    if (!voiceConfig) {
      return jsonResponse(
        {
          success: false,
          error:
            "This voice is unavailable or has no verified published ElevenLabs voice ID.",
        },
        400
      );
    }

    if (!voiceConfig.elevenlabsVoiceId) {
      return jsonResponse(
        {
          success: false,
          error: "This voice has not been configured.",
        },
        400
      );
    }

    // 4. MODEL SETTINGS

    let voiceSettings: Record<string, unknown>;

    if (MODEL_ID === "eleven_v4") {
      voiceSettings = {
        stability: 0.45,
        similarity_boost: 0.85,
      };
    } else {
      voiceSettings = {
        stability: 0.45,
        similarity_boost: 0.85,
        style: 0,
        use_speaker_boost: true,
        speed: 1.0,
      };
    }

    // 5. GENERATE SPEECH

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT
    );

    let elevenLabsResponse: Response;

    try {
      elevenLabsResponse = await fetch(
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
            model_id: MODEL_ID,
            voice_settings: voiceSettings,
          }),

          cache: "no-store",
          signal: controller.signal,
        }
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Speech generation timed out. Please try again.",
          },
          504
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }

    // 6. HANDLE ELEVENLABS ERRORS - REPLACED SECTION

    if (!elevenLabsResponse.ok) {
      const providerStatus = elevenLabsResponse.status;
      const providerMessage = await elevenLabsResponse.text();

      console.error(
        "ElevenLabs generation failed:",
        JSON.stringify({
          status: providerStatus,
          marketplace_voice: voiceConfig.publicId,
          voice_name: voiceConfig.name,
          provider_voice_id: voiceConfig.elevenlabsVoiceId,
          details: providerMessage.slice(0, 500),
        })
      );

      let friendlyError =
        "ElevenLabs could not generate the requested speech.";

      if (providerStatus === 401) {
        friendlyError = "ElevenLabs API key is invalid.";
      } else if (providerStatus === 404) {
        friendlyError =
          `ElevenLabs cannot find the configured voice "${voiceConfig.name}".`;
      } else if (providerStatus === 429) {
        friendlyError =
          "ElevenLabs rate limit reached. Try again shortly.";
      } else if (providerStatus === 402) {
        friendlyError =
          "Your ElevenLabs account requires additional credits or plan access.";
      } else if (providerStatus === 422) {
        friendlyError =
          "ElevenLabs rejected the text, voice or model configuration.";
      }

      return jsonResponse(
        {
          success: false,
          error: friendlyError,
          elevenlabs_status: providerStatus,
        },
        providerStatus === 429 ? 429 : 502
      );
    }

    // 7. READ AUDIO

    const audioBuffer =
      await elevenLabsResponse.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return jsonResponse(
        {
          success: false,
          error: "ElevenLabs returned empty audio.",
        },
        502
      );
    }

    // 8. ATOMIC CREDIT DEDUCTION
    // Keep the existing database RPC.

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
        "Credit deduction failed:",
        deductionError
      );

      return jsonResponse(
        {
          success: false,
          error:
            "Credit deduction could not be confirmed. Audio was not delivered.",
        },
        503
      );
    }

    const deductionRow = Array.isArray(deductionResult)
      ? deductionResult[0]
      : deductionResult;

    if (
      !deductionRow ||
      typeof deductionRow.credits_remaining !== "number"
    ) {
      return jsonResponse(
        {
          success: false,
          error: "Unable to confirm API credit balance.",
        },
        503
      );
    }

    // 9. RETURN AUDIO

    const base64Audio = Buffer.from(
      audioBuffer
    ).toString("base64");

    return jsonResponse({
      success: true,

      message:
        "Main Naija Pidgin speech generated successfully.",

      voice: {
        id: voiceConfig.publicId,
        name: voiceConfig.name,
      },

      model: MODEL_ID,

      audio_base64: base64Audio,

      audio_mime: "audio/mpeg",

      credits: {
        remaining: deductionRow.credits_remaining,
        used: deductionRow.credits_used,
        total: deductionRow.credits_total,
      },
    });

  } catch (error) {
    console.error(
      "Main Naija Pidgin V1 Speak error:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Speech generation failed due to an internal server error.",
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