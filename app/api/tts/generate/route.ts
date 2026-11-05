import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY!;

const authClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const CHAIRMAN_VOICE =
  process.env.CHAIRMAN_VOICE_ID?.trim() ||
  process.env.ELEVENLABS_VOICE_ID?.trim() ||
  "Ye6C5yxJmY1P8bPSIMAl";

const BELLA = "EXAVITQu4vr4xnSDxMaL";
const ELLI = "MF3mGyEYCl7XYWbV9V6O";
const ADAM = "pNInz6obpgDQGcFmaJgB";
const ANTONI = "ErXwobaYiN019PkySvjV";

const WARRI_BABE =
  process.env.WARRI_BABE_VOICE_ID?.trim() ||
  "w5p3k3PueAgQOT4lq0SF";

const FEMALE_1 =
  process.env.WHATSAPP_FEMALE_VOICE_ID_1?.trim() || BELLA;

const FEMALE_2 =
  process.env.WHATSAPP_FEMALE_VOICE_ID_2?.trim() || ELLI;

type VoiceConfig = {
  id: string;
  gender: "male" | "female";
  stability: number;
  style: number;
  label: string;
};

const WINNER_MALE = {
  gender: "male" as const,
  stability: 0.5,
  style: 0.75,
};

const WINNER_FEMALE = {
  gender: "female" as const,
  stability: 0.5,
  style: 0.75,
};

const VOICES: Record<string, VoiceConfig> = {
  "Main Naija Pidgin 1": {
    id: CHAIRMAN_VOICE,
    ...WINNER_MALE,
    label: "Main Pidgin 1 - CLEAN",
  },

  "Main Naija Pidgin 2": {
    id: CHAIRMAN_VOICE,
    ...WINNER_MALE,
    label: "Main Pidgin 2 - CLEAN",
  },

  "Main Naija Pidgin 3": {
    id: CHAIRMAN_VOICE,
    ...WINNER_MALE,
    label: "Main Pidgin 3 - CLEAN",
  },

  "Main Naija Pidgin 3 - GREATEST": {
    id: CHAIRMAN_VOICE,
    ...WINNER_MALE,
    label: "GREATEST - LOCKED",
  },

  "Main Naija Pidgin 4": {
    id: ADAM,
    gender: "male",
    stability: 0.5,
    style: 0.55,
    label: "Adam - Deep Male",
  },

  "Main Naija Pidgin 5": {
    id: ANTONI,
    gender: "male",
    stability: 0.5,
    style: 0.55,
    label: "Antoni - Balanced Male",
  },

  "Warri Babe": {
    id: WARRI_BABE,
    ...WINNER_FEMALE,
    label: "Warri Babe - CLEAN",
  },

  "Lagos Male": {
    id: CHAIRMAN_VOICE,
    ...WINNER_MALE,
    label: "Lagos Male",
  },

  "Delta Warri": {
    id: ADAM,
    gender: "male",
    stability: 0.5,
    style: 0.55,
    label: "Delta Warri Male",
  },

  "Pidgin Narrator": {
    id: CHAIRMAN_VOICE,
    ...WINNER_MALE,
    label: "Pidgin Narrator",
  },

  "Chairman Original": {
    id: CHAIRMAN_VOICE,
    ...WINNER_MALE,
    label: "Chairman Original",
  },

  "Chairman Voice": {
    id: CHAIRMAN_VOICE,
    ...WINNER_MALE,
    label: "Chairman Voice",
  },

  "Abuja Female": {
    id: FEMALE_1,
    ...WINNER_FEMALE,
    label: "Abuja Female",
  },

  "Naija Slay Queen": {
    id: FEMALE_1,
    ...WINNER_FEMALE,
    label: "Naija Slay Queen",
  },

  "Warri Fine Girl": {
    id: FEMALE_2,
    ...WINNER_FEMALE,
    label: "Warri Fine Girl",
  },

  "Lagos Babe": {
    id: FEMALE_1,
    ...WINNER_FEMALE,
    label: "Lagos Babe",
  },
};

async function saveUsageLog(params: {
  userId: string;
  apiKeyId: string | null;
  voice: string;
  status: string;
  credits: number;
  characterCount: number;
  freeRemaining: number | null;
  paidRemaining: number | null;
  errorMessage?: string | null;
}) {
  try {
    const { error } = await adminClient
      .from("api_usage_logs")
      .insert({
        user_id: params.userId,
        api_key_id: params.apiKeyId,
        voice_name: params.voice,
        model_used: "eleven_v3",
        status: params.status,
        credits_deducted: params.credits,
        character_count: params.characterCount,
        remaining_free: params.freeRemaining,
        remaining_paid: params.paidRemaining,
        error_message: params.errorMessage || null,
      });

    if (error) {
      console.error("Usage history save failed:", error.message);
    }
  } catch (error) {
    console.error("Usage history exception:", error);
  }
}

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  let keyId: string | null = null;
  let voiceName = "Unknown";
  let characterCount = 0;

  try {
    if (
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !elevenLabsKey
    ) {
      return NextResponse.json(
        { success: false, error: "Server config incomplete." },
        { status: 500 }
      );
    }

    const authorization = req.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Please log in first." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Session expired." },
        { status: 401 }
      );
    }

    userId = user.id;

    const body = await req.json();

    const text =
      typeof body.text === "string" ? body.text.trim() : "";

    const voice =
      typeof body.voice === "string" ? body.voice.trim() : "";

    voiceName = voice;
    characterCount = text.length;

    if (!text || !voice) {
      return NextResponse.json(
        { success: false, error: "Text and voice required." },
        { status: 400 }
      );
    }

    if (text.length > 5000) {
      return NextResponse.json(
        { success: false, error: "Text limit is 5,000 characters." },
        { status: 400 }
      );
    }

    const voiceConfig = VOICES[voice];

    if (!voiceConfig) {
      return NextResponse.json(
        { success: false, error: `Voice "${voice}" not registered.` },
        { status: 400 }
      );
    }

    // CHAIRMAN DOES NOT PAY CREDITS
    const isChairman =
      user.email?.toLowerCase() === CHAIRMAN_EMAIL;

    let freeLeft = 0;
    let paidLeft = 0;

    // FIND CUSTOMER API KEY
    if (!isChairman) {
      const {
        data: keyData,
        error: keyError,
      } = await adminClient
        .from("api_keys")
        .select(
          "id, user_id, is_active, free_requests_remaining, paid_requests_remaining"
        )
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (keyError || !keyData) {
        return NextResponse.json(
          { success: false, error: "No active API key." },
          { status: 400 }
        );
      }

      keyId = keyData.id;

      freeLeft = Math.max(
        0,
        Number(keyData.free_requests_remaining || 0)
      );

      paidLeft = Math.max(
        0,
        Number(keyData.paid_requests_remaining || 0)
      );

      if (freeLeft + paidLeft <= 0) {
        await saveUsageLog({
          userId: user.id,
          apiKeyId: keyId,
          voice,
          status: "rejected_no_credits",
          credits: 0,
          characterCount,
          freeRemaining: freeLeft,
          paidRemaining: paidLeft,
          errorMessage: "No credits remaining.",
        });

        return NextResponse.json(
          {
            success: false,
            error: "No credits remaining. Please purchase credits.",
            remaining_credits: 0,
          },
          { status: 402 }
        );
      }
    }

    // GENERATE VOICE
    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        voiceConfig.id
      )}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_v3",
          voice_settings: {
            stability: voiceConfig.stability,
            style: voiceConfig.style,
          },
        }),
        cache: "no-store",
      }
    );

    if (!elevenResponse.ok) {
      const errorText = await elevenResponse.text();

      console.error("ElevenLabs generation failed:", errorText);

      await saveUsageLog({
        userId: user.id,
        apiKeyId: keyId,
        voice,
        status: "failed",
        credits: 0,
        characterCount,
        freeRemaining: isChairman ? null : freeLeft,
        paidRemaining: isChairman ? null : paidLeft,
        errorMessage: "ElevenLabs voice generation failed.",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Voice generation failed. No credit was deducted.",
        },
        { status: 502 }
      );
    }

    const audioBuffer = await elevenResponse.arrayBuffer();

    if (!audioBuffer.byteLength) {
      await saveUsageLog({
        userId: user.id,
        apiKeyId: keyId,
        voice,
        status: "failed",
        credits: 0,
        characterCount,
        freeRemaining: isChairman ? null : freeLeft,
        paidRemaining: isChairman ? null : paidLeft,
        errorMessage: "ElevenLabs returned empty audio.",
      });

      return NextResponse.json(
        {
          success: false,
          error: "Empty audio received. No credit was deducted.",
        },
        { status: 502 }
      );
    }

    // CHAIRMAN: NO CREDIT DEDUCTION
    if (isChairman) {
      const base64Audio =
        Buffer.from(audioBuffer).toString("base64");

      await saveUsageLog({
        userId: user.id,
        apiKeyId: null,
        voice,
        status: "success",
        credits: 0,
        characterCount,
        freeRemaining: null,
        paidRemaining: null,
      });

      return NextResponse.json({
        success: true,
        audio_url: `data:audio/mpeg;base64,${base64Audio}`,
        remaining_credits: 999999,
        free_remaining: 999999,
        paid_remaining: 0,
        voice_used: voice,
        chairman_mode: "NO CREDIT DEDUCTED - Chairman",
        model_used: "eleven_v3",
        settings_used: `stability:${voiceConfig.stability} style:${voiceConfig.style}`,
      });
    }

    // ATOMICALLY DEDUCT ONE CREDIT AFTER SUCCESSFUL GENERATION
    const {
      data: deduction,
      error: deductionError,
    } = await adminClient.rpc("consume_api_credit", {
      p_api_key_id: keyId,
      p_user_id: user.id,
    });

    if (deductionError) {
      console.error(
        "Atomic credit deduction failed:",
        deductionError.message
      );

      return NextResponse.json(
        {
          success: false,
          error: "Credit verification failed. Audio was not delivered. Please try again.",
        },
        { status: 500 }
      );
    }

    if (!deduction || deduction.success !== true) {
      await saveUsageLog({
        userId: user.id,
        apiKeyId: keyId,
        voice,
        status: "rejected_no_credits",
        credits: 0,
        characterCount,
        freeRemaining: 0,
        paidRemaining: 0,
        errorMessage: "Credit balance changed before deduction.",
      });

      return NextResponse.json(
        {
          success: false,
          error: "No credits remaining. Please purchase credits.",
        },
        { status: 402 }
      );
    }

    const remainingFree = Number(deduction.free_remaining);
    const remainingPaid = Number(deduction.paid_remaining);
    const remainingTotal = Number(deduction.remaining_credits);

    // SAVE SUCCESSFUL USAGE
    await saveUsageLog({
      userId: user.id,
      apiKeyId: keyId,
      voice,
      status: "success",
      credits: 1,
      characterCount,
      freeRemaining: remainingFree,
      paidRemaining: remainingPaid,
    });

    const base64Audio =
      Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      audio_url: `data:audio/mpeg;base64,${base64Audio}`,
      remaining_credits: remainingTotal,
      free_remaining: remainingFree,
      paid_remaining: remainingPaid,
      voice_used: voice,
      chairman_mode: "Credit deducted",
      model_used: "eleven_v3",
      settings_used: `stability:${voiceConfig.stability} style:${voiceConfig.style}`,
    });
  } catch (error) {
    console.error("TTS route error:", error);

    if (userId) {
      await saveUsageLog({
        userId,
        apiKeyId: keyId,
        voice: voiceName || "Unknown",
        status: "failed",
        credits: 0,
        characterCount,
        freeRemaining: null,
        paidRemaining: null,
        errorMessage: "Unexpected voice generation error.",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unexpected error. No successful generation was recorded.",
      },
      { status: 500 }
    );
  }
}