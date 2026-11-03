import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

const admin = createClient(
  supabaseUrl,
  serviceKey || "missing-service-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

async function authorize(request: NextRequest) {
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
    throw new Error("Server Supabase configuration is incomplete.");
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Please log in as Chairman.");
  }

  const token = authorization.slice(7);

  const authClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user) {
    throw new Error("Your session is invalid. Please log in again.");
  }

  if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
    throw new Error("Access denied. Chairman only.");
  }

  return user;
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "Something went wrong.";

  const status =
    message.includes("Chairman") ||
    message.includes("Access denied")
      ? 403
      : message.includes("session") ||
        message.includes("log in")
      ? 401
      : 500;

  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

/* GET: LOAD CHAIRMAN VOICES */

export async function GET(request: NextRequest) {
  try {
    await authorize(request);

    const { data, error } = await admin
      .from("chairman_voices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      voices: data || [],
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/* POST: CREATE A REAL ELEVENLABS VOICE CLONE */

export async function POST(request: NextRequest) {
  try {
    await authorize(request);

    if (!elevenLabsKey) {
      throw new Error("ELEVENLABS_API_KEY is missing on Render.");
    }

    const form = await request.formData();

    const name = String(form.get("name") || "").trim();
    const description = String(
      form.get("description") || ""
    ).trim();

    const audio = form.get("audio");

    if (name.length < 2 || name.length > 60) {
      throw new Error("Voice name must contain 2–60 characters.");
    }

    if (!(audio instanceof File)) {
      throw new Error("Please record or upload an audio sample.");
    }

    if (!audio.type.startsWith("audio/")) {
      throw new Error("Please upload a valid audio file.");
    }

    if (audio.size < 10_000) {
      throw new Error("Audio sample is too small. Record a longer sample.");
    }

    if (audio.size > 20 * 1024 * 1024) {
      throw new Error("Maximum audio upload size is 20 MB.");
    }

    const elevenForm = new FormData();

    elevenForm.append("name", name);
    elevenForm.append("description", description);
    elevenForm.append("files", audio, audio.name || "voice-sample.webm");

    const elevenResponse = await fetch(
      "https://api.elevenlabs.io/v1/voices/add",
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
        },
        body: elevenForm,
        cache: "no-store",
      }
    );

    const elevenData = await elevenResponse.json();

    if (!elevenResponse.ok || !elevenData.voice_id) {
      console.error("ElevenLabs cloning error:", elevenData);

      return NextResponse.json(
        {
          success: false,
          error:
            elevenData.detail?.message ||
            elevenData.detail ||
            elevenData.message ||
            "ElevenLabs could not create this voice.",
        },
        { status: 502 }
      );
    }

    const { data: savedVoice, error: saveError } =
      await admin
        .from("chairman_voices")
        .insert({
          name,
          description,
          elevenlabs_voice_id: elevenData.voice_id,
          category: "custom",
          accent: "Naija Pidgin",
          is_active: true,
          is_published: false,
          requires_verification:
            Boolean(elevenData.requires_verification),
        })
        .select()
        .single();

    if (saveError) {
      // Do not silently leave an untracked clone in ElevenLabs.
      console.error("Supabase voice save error:", saveError);

      await fetch(
        `https://api.elevenlabs.io/v1/voices/${elevenData.voice_id}`,
        {
          method: "DELETE",
          headers: { "xi-api-key": elevenLabsKey },
        }
      ).catch(() => null);

      throw new Error("Voice was created but could not be saved. Check Supabase.");
    }

    return NextResponse.json({
      success: true,
      message: "Voice clone created successfully.",
      voice: savedVoice,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/* DELETE: REMOVE A CLONE */

export async function DELETE(request: NextRequest) {
  try {
    await authorize(request);

    if (!elevenLabsKey) {
      throw new Error("ELEVENLABS_API_KEY is missing.");
    }

    const body = await request.json();
    const id = String(body.id || "");

    if (!id) {
      throw new Error("Voice ID is required.");
    }

    const { data: voice, error: lookupError } = await admin
      .from("chairman_voices")
      .select("*")
      .eq("id", id)
      .single();

    if (lookupError || !voice) {
      throw new Error("Voice not found.");
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(
        voice.elevenlabs_voice_id
      )}`,
      {
        method: "DELETE",
        headers: {
          "xi-api-key": elevenLabsKey,
        },
      }
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error("ElevenLabs delete error:", detail);

      throw new Error("ElevenLabs could not delete this voice.");
    }

    const { error: deleteError } = await admin
      .from("chairman_voices")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: "Voice deleted successfully.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}