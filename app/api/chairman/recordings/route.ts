import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";
const STORAGE_BUCKET = "voice-clips";

// Verify that the request belongs to the Chairman.
async function verifyChairman(req: NextRequest) {
const auth = req.headers.get("authorization");

if (!auth?.startsWith("Bearer ")) {
return { error: "Missing token", status: 401 };
}

const token = auth.slice(7);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
return { error: "Supabase configuration missing", status: 500 };
}

const client = createClient(url, anon, {
auth: {
autoRefreshToken: false,
persistSession: false,
},
});

const {
data: { user },
error: authError,
} = await client.auth.getUser(token);

if (
authError ||
!user ||
user.email?.toLowerCase() !== ADMIN_EMAIL
) {
return { error: "Chairman only", status: 403 };
}

const { data: profile, error: profileError } =
await supabaseAdmin
.from("profiles")
.select("email, is_chairman")
.eq("id", user.id)
.maybeSingle();

if (
profileError ||
!profile ||
profile.email?.toLowerCase() !== ADMIN_EMAIL ||
profile.is_chairman !== true
) {
return {
error: "Chairman profile verification failed",
status: 403,
};
}

return { user };
}

// Find the audio file path in the recording.
function getStoragePath(recording: any): string | null {
const candidates = [
recording.file_path,
recording.audio_url,
];

for (const candidate of candidates) {
if (typeof candidate !== "string" || !candidate.trim()) {
continue;
}

let path = candidate.trim();

// Handle a Supabase Storage URL.
if (path.startsWith("http://") || path.startsWith("https://")) {
  try {
    const parsed = new URL(path);
    const marker = `/storage/v1/object/`;
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) continue;

    const storagePart = parsed.pathname.slice(
      markerIndex + marker.length
    );

    const parts = storagePart.split("/");

    // Expected: public/voice-clips/path
    // or signed/voice-clips/path
    if (
      parts.length < 3 ||
      parts[1] !== STORAGE_BUCKET
    ) {
      continue;
    }

    path = parts.slice(2).map(decodeURIComponent).join("/");
  } catch {
    continue;
  }
}

// Remove bucket prefix if it is included.
if (path.startsWith(`${STORAGE_BUCKET}/`)) {
  path = path.slice(STORAGE_BUCKET.length + 1);
}

path = path.replace(/^\/+/, "");

if (
  path &&
  !path.split("/").includes("..")
) {
  return path;
}

}

// Your Worker Panel upload format:
// worker_id/file_name
if (
typeof recording.worker_id === "string" &&
typeof recording.file_name === "string" &&
recording.worker_id.trim() &&
recording.file_name.trim()
) {
return "${recording.worker_id}/${recording.file_name}";
}

return null;
}

// EXISTING APPROVE / REJECT FUNCTION — PRESERVED.
export async function POST(req: NextRequest) {
try {
const authResult = await verifyChairman(req);

if ("error" in authResult) {
  return NextResponse.json(
    { error: authResult.error },
    { status: authResult.status }
  );
}

const body = await req.json();
const { id, status } = body;

if (
  typeof id !== "string" ||
  !["approved", "rejected", "pending"].includes(status)
) {
  return NextResponse.json(
    { error: "Invalid recording ID or status" },
    { status: 400 }
  );
}

const { data: recording, error: findError } =
  await supabaseAdmin
    .from("recordings")
    .select("id")
    .eq("id", id)
    .maybeSingle();

if (findError) {
  return NextResponse.json(
    { error: findError.message },
    { status: 500 }
  );
}

if (!recording) {
  return NextResponse.json(
    { error: "Recording not found" },
    { status: 404 }
  );
}

const { error: updateError } = await supabaseAdmin
  .from("recordings")
  .update({
    status,
    is_approved: status === "approved",
  })
  .eq("id", id);

if (updateError) {
  return NextResponse.json(
    { error: updateError.message },
    { status: 500 }
  );
}

return NextResponse.json({
  success: true,
  message: `Recording ${status} successfully`,
});

} catch (error) {
console.error("Chairman approval error:", error);

return NextResponse.json(
  { error: "Recording update failed" },
  { status: 500 }
);

}
}

// NEW DELETE FUNCTION — CHAIRMAN ONLY.
export async function DELETE(req: NextRequest) {
try {
const authResult = await verifyChairman(req);

if ("error" in authResult) {
  return NextResponse.json(
    { error: authResult.error },
    { status: authResult.status }
  );
}

const body = await req.json();
const id = body.id;

if (typeof id !== "string" || !id.trim()) {
  return NextResponse.json(
    { error: "A valid recording ID is required" },
    { status: 400 }
  );
}

// Find only the selected recording.
const { data: recording, error: findError } =
  await supabaseAdmin
    .from("recordings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

if (findError) {
  return NextResponse.json(
    { error: findError.message },
    { status: 500 }
  );
}

if (!recording) {
  return NextResponse.json(
    { error: "Recording not found" },
    { status: 404 }
  );
}

const storagePath = getStoragePath(recording);

if (!storagePath) {
  return NextResponse.json(
    {
      error:
        "Could not identify this recording's audio file. Nothing was deleted.",
    },
    { status: 400 }
  );
}

// Delete the selected audio file first.
const { error: storageError } = await supabaseAdmin.storage
  .from(STORAGE_BUCKET)
  .remove([storagePath]);

if (storageError) {
  console.error("Audio deletion error:", storageError);

  return NextResponse.json(
    {
      error:
        "Audio file could not be deleted. The recording record was kept.",
    },
    { status: 500 }
  );
}

// Delete only the selected recording row.
const { error: deleteError } = await supabaseAdmin
  .from("recordings")
  .delete()
  .eq("id", id);

if (deleteError) {
  console.error("Recording row deletion error:", deleteError);

  return NextResponse.json(
    {
      error:
        "Audio file was deleted, but the recording database row could not be deleted. Please check Supabase.",
    },
    { status: 500 }
  );
}

return NextResponse.json({
  success: true,
  message: "Recording and audio file deleted successfully.",
});

} catch (error) {
console.error("Chairman recording deletion error:", error);

return NextResponse.json(
  { error: "Recording deletion failed" },
  { status: 500 }
);

}
}