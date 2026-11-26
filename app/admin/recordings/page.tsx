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
  if (!url || !serviceKey) throw new Error("Supabase server configuration is missing.");
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function verifyChairman(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user || user.email !== CHAIRMAN_EMAIL) return null;
  const admin = getAdminClient();
  const { data: profile, error: profileError } = await admin.from("profiles").select("is_chairman").eq("id", user.id).maybeSingle();
  if (profileError || profile?.is_chairman !== true) return null;
  return admin;
}

function getStorageFile(audioUrl: string, supabaseUrl: string) {
  try {
    const fileUrl = new URL(audioUrl);
    const configuredUrl = new URL(supabaseUrl);
    if (fileUrl.origin !== configuredUrl.origin) return null;
    const match = fileUrl.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
    if (!match) return null;
    const bucket = decodeURIComponent(match[1]);
    const path = decodeURIComponent(match[2]);
    if (!["voice-clips", "voices"].includes(bucket)) return null;
    if (!path || path.includes("..")) return null;
    return { bucket, path };
  } catch { return null; }
}

async function getRecordingAudioUrl(admin: ReturnType<typeof getAdminClient>, recording: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return { signedUrl: null, audioError: "Supabase URL is missing." };
  let bucket: string | null = null;
  let path: string | null = null;
  if (recording.audio_url) {
    const storageFile = getStorageFile(recording.audio_url, supabaseUrl);
    if (storageFile) { bucket = storageFile.bucket; path = storageFile.path; }
  }
  if (!path && recording.audio_path) { bucket = "voice-clips"; path = recording.audio_path; }
  if (!bucket || !path) return { signedUrl: null, audioError: "No valid audio storage path was found." };
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_EXPIRY);
  if (error || !data?.signedUrl) {
    console.error("Audio signing failed:", { recordingId: recording.id, bucket, path, error });
    return { signedUrl: null, audioError: "Could not create a playback link." };
  }
  return { signedUrl: data.signedUrl, audioError: null };
}

/* =========================================================
   GET - FIXED: PAGINATION + REAL TOTAL + COUNTS MATCH PAGE
   Priority: CLEAN/NOISY -> APPROVED/REJECTED/PENDING
   ========================================================= */
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyChairman(request);
    if (!admin) return NextResponse.json({ error: "Chairman access required." }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get("worker_id");
    const status = searchParams.get("status");
    const qualityStatus = searchParams.get("quality_status");
    const filter = searchParams.get("filter");

    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 100), 1), 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let filterStatus: string | null = status;
    let filterQuality: string | null = qualityStatus;
    if (filter && filter !== "all") {
      if (filter === "clean" || filter === "noisy") filterQuality = filter;
      else if (filter === "pending" || filter === "approved" || filter === "rejected") filterStatus = filter;
    }

    const applyBase = (q: any) => {
      let query = q.or("hidden_from_review.is.null,hidden_from_review.eq.false");
      if (workerId) query = query.eq("worker_id", workerId);
      return query;
    };

    const { count: totalCount } = await applyBase(admin.from("recordings").select("id", { count: "exact", head: true }));
    const total = totalCount || 0;

    const { count: cleanCountRaw } = await applyBase(admin.from("recordings").select("id", { count: "exact", head: true })).eq("quality_status", "clean");
    const cleanCount = cleanCountRaw || 0;
    const { count: noisyCountRaw } = await applyBase(admin.from("recordings").select("id", { count: "exact", head: true })).eq("quality_status", "noisy");
    const noisyCount = noisyCountRaw || 0;
    const { count: approvedCountRaw } = await applyBase(admin.from("recordings").select("id", { count: "exact", head: true })).eq("status", "approved").eq("is_approved", true).not("quality_status", "in", "(clean,noisy)");
    const approvedCount = approvedCountRaw || 0;
    const { count: rejectedCountRaw } = await applyBase(admin.from("recordings").select("id", { count: "exact", head: true })).eq("status", "rejected").not("quality_status", "in", "(clean,noisy)");
    const rejectedCount = rejectedCountRaw || 0;
    const pendingCount = Math.max(0, total - cleanCount - noisyCount - approvedCount - rejectedCount);

    let filteredTotal = total;
    if (filter && filter !== "all") {
      if (filter === "approved") filteredTotal = approvedCount;
      else if (filter === "pending") filteredTotal = pendingCount;
      else if (filter === "rejected") filteredTotal = rejectedCount;
      else if (filter === "clean") filteredTotal = cleanCount;
      else if (filter === "noisy") filteredTotal = noisyCount;
    } else if (workerId) {
      const { count } = await applyBase(admin.from("recordings").select("id", { count: "exact", head: true }));
      filteredTotal = count || 0;
    }

    let query = admin.from("recordings").select("*").or("hidden_from_review.is.null,hidden_from_review.eq.false").order("created_at", { ascending: false }).range(from, to);
    if (workerId) query = query.eq("worker_id", workerId);
    if (filterQuality) {
      query = query.eq("quality_status", filterQuality);
    } else if (filterStatus) {
      query = query.eq("status", filterStatus).not("quality_status", "in", "(clean,noisy)");
      if (filterStatus === "approved") query = query.eq("is_approved", true);
    } else {
      if (status) query = query.eq("status", status);
      if (qualityStatus) query = query.eq("quality_status", qualityStatus);
    }

    const { data, error } = await query;
    if (error) throw error;

    const recordings = await Promise.all(
      (data || []).map(async (recording) => {
        const audio = await getRecordingAudioUrl(admin, recording);
        return { ...recording, signedUrl: audio.signedUrl, audioError: audio.audioError };
      })
    );

    return NextResponse.json(
      {
        recordings,
        total: filteredTotal,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(filteredTotal / limit)),
        counts: { total, pending: pendingCount, clean: cleanCount, noisy: noisyCount, approved: approvedCount, rejected: rejectedCount },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate", Pragma: "no-cache" } }
    );
  } catch (error: any) {
    console.error("Could not load recordings:", error);
    return NextResponse.json({ error: error.message || "Could not load recordings." }, { status: 500 });
  }
}

/* =========================================================
   POST - UNTOUCHED
   ========================================================= */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyChairman(request);
    if (!admin) return NextResponse.json({ error: "Chairman access required." }, { status: 403 });
    const body = await request.json();
    const id = body.id;
    const qualityStatus = body.quality_status;
    if (qualityStatus !== undefined) {
      if (!id || !["clean", "noisy"].includes(qualityStatus)) return NextResponse.json({ error: "A valid recording ID and quality status are required." }, { status: 400 });
      if (!/^[0-9a-fA-F-]{36}$/.test(id)) return NextResponse.json({ error: "Invalid recording ID." }, { status: 400 });
      const { data: updatedRecording, error: updateError } = await admin.from("recordings").update({ quality_status: qualityStatus }).eq("id", id).select("id, worker_id, status, is_approved, quality_status, earnings, earnings_paid").single();
      if (updateError) {
        console.error("Quality status update error:", updateError);
        return NextResponse.json({ error: "Could not save recording quality: " + updateError.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: qualityStatus === "clean" ? "Recording marked CLEAN." : "Recording marked NOISY.", recording: updatedRecording });
    }
    const newStatus = body.status;
    if (!id || !["approved", "rejected"].includes(newStatus)) return NextResponse.json({ error: "A valid recording ID and status are required." }, { status: 400 });
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return NextResponse.json({ error: "Invalid recording ID." }, { status: 400 });
    const amount = 30;
    const { data: rpcResult, error: rpcError } = await admin.rpc("approve_recording_atomic", { p_recording_id: id, p_new_status: newStatus, p_earnings_amount: amount });
    if (rpcError) {
      console.error("Approve RPC error:", rpcError);
      return NextResponse.json({ error: "Approval failed: " + rpcError.message }, { status: 500 });
    }
    if (!rpcResult?.success) return NextResponse.json({ error: rpcResult?.error || "Approval failed." }, { status: 500 });
    const { data: updatedRecording } = await admin.from("recordings").select("id, worker_id, status, is_approved, quality_status, earnings, earnings_paid").eq("id", id).single();
    return NextResponse.json({ success: true, message: rpcResult.message, earnings_added: rpcResult.earnings_added, recording: updatedRecording });
  } catch (error: any) {
    console.error("Recording review error:", error);
    return NextResponse.json({ error: error.message || "Recording review failed." }, { status: 500 });
  }
}

/* =========================================================
   DELETE - UNTOUCHED - only hides from review
   ========================================================= */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyChairman(request);
    if (!admin) return NextResponse.json({ error: "Chairman access required." }, { status: 403 });
    const body = await request.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "A recording ID is required." }, { status: 400 });
    if (!/^[0-9a-fA-F-]{36}$/.test(id)) return NextResponse.json({ error: "Invalid recording ID." }, { status: 400 });
    const { data: recording, error: findError } = await admin.from("recordings").select("id, hidden_from_review").eq("id", id).maybeSingle();
    if (findError) throw findError;
    if (!recording) return NextResponse.json({ error: "Recording not found." }, { status: 404 });
    const { error: updateError } = await admin.from("recordings").update({ hidden_from_review: true }).eq("id", id);
    if (updateError) throw updateError;
    return NextResponse.json({ success: true, message: "Recording removed from review. The voice/audio file is still safely stored." });
  } catch (error: any) {
    console.error("Recording hide error:", error);
    return NextResponse.json({ error: error.message || "Could not remove recording from review." }, { status: 500 });
  }
}