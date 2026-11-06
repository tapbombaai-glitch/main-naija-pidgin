import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const SIGNED_URL_EXPIRY = 600;

// Create secure Supabase admin client
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Verify that the logged-in user is the Chairman
async function verifyChairman(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  const authClient = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(token);

  if (error || !user || user.email !== CHAIRMAN_EMAIL) {
    return null;
  }

  const admin = getAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("is_chairman")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.is_chairman !== true) {
    return null;
  }

  return admin;
}

// Extract a Storage bucket and file path from a Supabase audio URL
function getStorageFile(audioUrl: string, supabaseUrl: string) {
  try {
    const fileUrl = new URL(audioUrl);
    const configuredUrl = new URL(supabaseUrl);

    // Only accept files from this project's Supabase Storage
    if (fileUrl.origin !== configuredUrl.origin) {
      return null;
    }

    const match = fileUrl.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
    );

    if (!match) return null;

    const bucket = decodeURIComponent(match[1]);
    const path = decodeURIComponent(match[2]);

    // Only allow the known recording buckets
    if (!["voice-clips", "voices"].includes(bucket)) {
      return null;
    }

    if (!path || path.includes("..")) {
      return null;
    }

    return { bucket, path };
  } catch {
    return null;
  }
}

// Generate a secure playback URL for each recording
async function getRecordingAudioUrl(
  admin: ReturnType<typeof getAdminClient>,
  recording: any
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return {
      signedUrl: null,
      audioError: "Supabase URL is missing.",
    };
  }

  let bucket: string | null = null;
  let path: string | null = null;

  // New recordings: read the actual audio_url
  if (recording.audio_url) {
    const storageFile = getStorageFile(
      recording.audio_url,
      supabaseUrl
    );

    if (storageFile) {
      bucket = storageFile.bucket;
      path = storageFile.path;
    }
  }

  // Older recordings: preserve support for audio_path in voices
  if (!path && recording.audio_path) {
    bucket = "voices";
    path = recording.audio_path;
  }

  if (!bucket || !path) {
    return {
      signedUrl: null,
      audioError: "No valid audio storage path was found.",
    };
  }

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
    console.error("Recording audio URL error:", {
      recordingId: recording.id,
      bucket,
      path,
      message: error?.message,
    });

    return {
      signedUrl: null,
      audioError: "Could not create a playback link.",
    };
  }

  return {
    signedUrl: data.signedUrl,
    audioError: null,
  };
}

// LOAD RECORDINGS
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyChairman(request);

    if (!admin) {
      return NextResponse.json(
        { error: "Chairman access required." },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from("recordings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const recordings = await Promise.all(
      (data || []).map(async (recording) => {
        const audio = await getRecordingAudioUrl(admin, recording);

        return {
          ...recording,
          signedUrl: audio.signedUrl,
          audioError: audio.audioError,
        };
      })
    );

    return NextResponse.json(
      { recordings },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error: any) {
    console.error("Recordings GET error:", error);

    return NextResponse.json(
      { error: error.message || "Could not load recordings." },
      { status: 500 }
    );
  }
}

// APPROVE OR REJECT RECORDING
// Existing approval logic preserved
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyChairman(request);

    if (!admin) {
      return NextResponse.json(
        { error: "Chairman access required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = body.id;
    const newStatus = body.status;

    if (!id || !["approved", "rejected"].includes(newStatus)) {
      return NextResponse.json(
        { error: "A valid recording ID and status are required." },
        { status: 400 }
      );
    }

    const { data: updatedRecording, error } = await admin
      .from("recordings")
      .update({
        status: newStatus,
        is_approved: newStatus === "approved",
      })
      .eq("id", id)
      .select("id, worker_id, status, is_approved, earnings")
      .single();

    if (error) {
      console.error("Recording approval database error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        newStatus === "approved"
          ? "Recording approved successfully."
          : "Recording rejected successfully.",
      recording: updatedRecording,
    });
  } catch (error: any) {
    console.error("Recording review error:", error);

    return NextResponse.json(
      { error: error.message || "Recording review failed." },
      { status: 500 }
    );
  }
}