import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const SIGNED_URL_EXPIRY = 600;

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

  if (!url || !anonKey) {
    return null;
  }

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

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select("is_chairman")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.is_chairman !== true) {
    return null;
  }

  return admin;
}

function getStorageFile(audioUrl: string, supabaseUrl: string) {
  try {
    const fileUrl = new URL(audioUrl);
    const configuredUrl = new URL(supabaseUrl);

    if (fileUrl.origin !== configuredUrl.origin) {
      return null;
    }

    const match = fileUrl.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/
    );

    if (!match) {
      return null;
    }

    const bucket = decodeURIComponent(match[1]);
    const path = decodeURIComponent(match[2]);

    if (!["voice-clips", "voices"].includes(bucket)) {
      return null;
    }

    if (!path || path.includes("..")) {
      return null;
    }

    return {
      bucket,
      path,
    };
  } catch {
    return null;
  }
}

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

  const {
    data,
    error,
  } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);

  if (error || !data?.signedUrl) {
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

/* =========================================================
   GET RECORDINGS
   ========================================================= */

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyChairman(request);

    if (!admin) {
      return NextResponse.json(
        {
          error: "Chairman access required.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const workerId = searchParams.get("worker_id");
    const status = searchParams.get("status");

    const limit = Math.min(
      Math.max(
        Number(searchParams.get("limit") || 100),
        1
      ),
      100
    );

    /*
     * IMPORTANT:
     * We DO NOT delete recordings from Supabase.
     *
     * hidden_from_review = true means:
     * "Do not show this recording on the Chairman
     * Recording Review screen."
     *
     * The actual recording row and audio file remain safe.
     */

    let query = admin
      .from("recordings")
      .select("*")
      .eq("hidden_from_review", false)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (workerId) {
      query = query.eq("worker_id", workerId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      throw error;
    }

    const recordings = await Promise.all(
      (data || []).map(async (recording) => {
        const audio = await getRecordingAudioUrl(
          admin,
          recording
        );

        return {
          ...recording,
          signedUrl: audio.signedUrl,
          audioError: audio.audioError,
        };
      })
    );

    return NextResponse.json(
      {
        recordings,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "Load recordings error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Could not load recordings.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   APPROVE / REJECT RECORDING
   ========================================================= */

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyChairman(request);

    if (!admin) {
      return NextResponse.json(
        {
          error: "Chairman access required.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = body.id;
    const newStatus = body.status;

    if (
      !id ||
      !["approved", "rejected"].includes(newStatus)
    ) {
      return NextResponse.json(
        {
          error:
            "A valid recording ID and status are required.",
        },
        { status: 400 }
      );
    }

    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      return NextResponse.json(
        {
          error: "Invalid recording ID.",
        },
        { status: 400 }
      );
    }

    /*
     * Keep the existing earnings behaviour.
     * Approved recordings receive ₦30 through the
     * existing atomic RPC.
     */

    const amount = 30;

    const {
      data: rpcResult,
      error: rpcError,
    } = await admin.rpc(
      "approve_recording_atomic",
      {
        p_recording_id: id,
        p_new_status: newStatus,
        p_earnings_amount: amount,
      }
    );

    if (rpcError) {
      console.error(
        "Approve RPC error:",
        rpcError
      );

      return NextResponse.json(
        {
          error:
            "Approval failed: " +
            rpcError.message,
        },
        { status: 500 }
      );
    }

    if (!rpcResult?.success) {
      return NextResponse.json(
        {
          error:
            rpcResult?.error ||
            "Approval failed.",
        },
        { status: 500 }
      );
    }

    const {
      data: updatedRecording,
      error: updatedError,
    } = await admin
      .from("recordings")
      .select(
        "id, worker_id, status, is_approved, earnings, earnings_paid, hidden_from_review"
      )
      .eq("id", id)
      .single();

    if (updatedError) {
      console.error(
        "Updated recording lookup error:",
        updatedError
      );
    }

    return NextResponse.json({
      success: true,
      message: rpcResult.message,
      earnings_added: rpcResult.earnings_added,
      recording: updatedRecording,
    });
  } catch (error: any) {
    console.error(
      "Recording review error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Recording review failed.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   SAFE DELETE / HIDE FROM REVIEW
   ========================================================= */

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyChairman(request);

    if (!admin) {
      return NextResponse.json(
        {
          error: "Chairman access required.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const id = body?.id;

    if (!id) {
      return NextResponse.json(
        {
          error: "Recording ID is required.",
        },
        { status: 400 }
      );
    }

    if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
      return NextResponse.json(
        {
          error: "Invalid recording ID.",
        },
        { status: 400 }
      );
    }

    /*
     * IMPORTANT:
     *
     * We are NOT using .delete().
     *
     * The recording remains inside Supabase.
     * The audio file remains inside Storage.
     * Earnings/history remain untouched.
     *
     * We only mark it as hidden from the Chairman
     * Recording Review page.
     */

    const {
      data: existingRecording,
      error: findError,
    } = await admin
      .from("recordings")
      .select(
        "id, worker_id, status, earnings, hidden_from_review"
      )
      .eq("id", id)
      .maybeSingle();

    if (findError) {
      console.error(
        "Find recording before hide:",
        findError
      );

      return NextResponse.json(
        {
          error:
            "Could not find recording: " +
            findError.message,
        },
        { status: 500 }
      );
    }

    if (!existingRecording) {
      return NextResponse.json(
        {
          error: "Recording not found.",
        },
        { status: 404 }
      );
    }

    if (existingRecording.hidden_from_review === true) {
      return NextResponse.json({
        success: true,
        message:
          "Recording is already hidden from review.",
        deleted: false,
        hidden: true,
        preserved_in_supabase: true,
      });
    }

    const {
      data: hiddenRecording,
      error: hideError,
    } = await admin
      .from("recordings")
      .update({
        hidden_from_review: true,
      })
      .eq("id", id)
      .select(
        "id, worker_id, status, earnings, hidden_from_review"
      )
      .single();

    if (hideError) {
      console.error(
        "Hide recording error:",
        hideError
      );

      return NextResponse.json(
        {
          error:
            "Could not hide recording: " +
            hideError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,

      /*
       * The frontend can use this to remove the card
       * immediately.
       */

      deleted: true,
      hidden: true,

      /*
       * This makes it explicit that the actual data
       * was preserved.
       */

      preserved_in_supabase: true,
      audio_deleted: false,

      message:
        "Recording removed from the review list. The recording and audio remain safely stored in Supabase.",

      recording: hiddenRecording,
    });
  } catch (error: any) {
    console.error(
      "Recording hide/delete error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Could not remove recording from review.",
      },
      { status: 500 }
    );
  }
}