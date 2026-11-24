import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const SIGNED_URL_EXPIRY = 3600;

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
      headers: { Authorization: `Bearer ${token}` },
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

function getStorageFile(value: string, supabaseUrl: string) {
  try {
    const fileUrl = new URL(value);
    const configuredUrl = new URL(supabaseUrl);

    if (fileUrl.origin !== configuredUrl.origin) return null;

    const match = fileUrl.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
    );

    if (!match) return null;

    const bucket = decodeURIComponent(match[1]);
    const path = decodeURIComponent(match[2]);

    if (!["voice-clips", "voices"].includes(bucket)) return null;
    if (!path || path.includes("..")) return null;

    return { bucket, path };
  } catch {
    return null;
  }
}

function findAudioLocation(recording: any, supabaseUrl: string) {
  for (const value of [recording.audio_url, recording.file_url]) {
    if (typeof value === "string") {
      const found = getStorageFile(value, supabaseUrl);
      if (found) return found;
    }
  }

  for (const value of [recording.audio_path, recording.file_path]) {
    if (typeof value === "string" && value.trim()) {
      if (value.includes("..")) continue;

      return {
        bucket: "voice-clips",
        path: value,
      };
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyChairman(request);

    if (!admin) {
      return NextResponse.json(
        { error: "Chairman access required." },
        { status: 403 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      throw new Error("Supabase URL is missing.");
    }

    const params = request.nextUrl.searchParams;

    const offset = Math.max(
      0,
      Number.parseInt(params.get("offset") || "0", 10) || 0
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(params.get("limit") || "25", 10) || 25
      )
    );

    const { data, error, count } = await admin
      .from("recordings")
      .select(
        "id, worker_id, text, duration, language, status, is_approved, created_at, audio_url, file_url, audio_path, file_path",
        { count: "exact" }
      )
      .eq("status", "approved")
      .eq("is_approved", true)
      .in("language", ["pidgin", "Pidgin"])
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const recordings = await Promise.all(
      (data || []).map(async (recording) => {
        const location = findAudioLocation(recording, supabaseUrl);

        if (!location) {
          return {
            id: recording.id,
            worker_id: recording.worker_id,
            text: recording.text,
            duration: recording.duration,
            language: recording.language,
            created_at: recording.created_at,
            signedUrl: null,
            audioError: "No valid storage path found.",
          };
        }

        const { data: signed, error: signingError } = await admin.storage
          .from(location.bucket)
          .createSignedUrl(location.path, SIGNED_URL_EXPIRY);

        return {
          id: recording.id,
          worker_id: recording.worker_id,
          text: recording.text,
          duration: recording.duration,
          language: recording.language,
          created_at: recording.created_at,
          signedUrl: signingError ? null : signed?.signedUrl || null,
          audioError: signingError ? "Could not sign audio file." : null,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        total: count || 0,
        offset,
        limit,
        nextOffset:
          offset + limit < (count || 0) ? offset + limit : null,
        recordings,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error: any) {
    console.error("Training export error:", error);

    return NextResponse.json(
      { error: error.message || "Training export failed." },
      { status: 500 }
    );
  }
}