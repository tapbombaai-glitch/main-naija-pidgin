import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

class RouteError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new RouteError(
      `Missing server configuration: ${name}`,
      500
    );
  }

  return value;
}

async function verifyChairman(req: NextRequest) {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const authorization =
    req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new RouteError("Please log in.", 401);
  }

  const token = authorization.slice(7).trim();

  const auth = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await auth.auth.getUser(token);

  if (error || !user) {
    throw new RouteError("Invalid session.", 401);
  }

  if (
    user.email?.toLowerCase() !==
    CHAIRMAN_EMAIL
  ) {
    throw new RouteError("Chairman access only.", 403);
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyChairman(req);

    const elevenKey = getEnv("ELEVENLABS_API_KEY");

    const body = await req.json();

    const { voiceId, text } = body;

    if (
      typeof voiceId !== "string" ||
      !/^[a-zA-Z0-9_-]{5,100}$/.test(voiceId)
    ) {
      throw new RouteError("Invalid voice ID.", 400);
    }

    if (
      typeof text !== "string" ||
      !text.trim() ||
      text.length > 1000
    ) {
      throw new RouteError(
        "Enter preview text (maximum 1,000 characters).",
        400
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",

        headers: {
          "xi-api-key": elevenKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },

        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_multilingual_v2",
          output_format: "mp3_44100_128",
        }),

        cache: "no-store",
      }
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error(
        "ElevenLabs preview error:",
        response.status,
        detail
      );

      throw new RouteError(
        "ElevenLabs could not generate this voice preview.",
        502
      );
    }

    const audio = await response.arrayBuffer();

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.byteLength),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });

  } catch (error) {
    const status =
      error instanceof RouteError
        ? error.status
        : 500;

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Voice preview failed.",
      },
      { status }
    );
  }
}