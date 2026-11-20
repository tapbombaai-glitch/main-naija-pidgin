// app/api/chairman/voice/create/route.ts
// MAIN NAIJA PIDGIN
// V4.1 PRODUCTION - CREATE ONLY
// NO AUTO-PUBLISH
// CHAIRMAN ONLY
// EXISTING VOICE RECORDS ARE NOT DELETED OR MODIFIED

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseBuffer } from "music-metadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================
// CONFIGURATION
// ============================================

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_AUDIO_SIZE + 1024 * 1024;
const MIN_AUDIO_SIZE = 30_000;

const MAX_FILES = 5;

const MIN_DURATION_SEC = 30;
const MAX_DURATION_SEC = 180;

const PROTECTED_NAMES = [
  "main naija pidgin",
  "main naija pidgin male",
  "warri babe",
  "warri boy",
];

const ALLOWED_EXTS = [
  ".wav",
  ".mp3",
  ".m4a",
  ".webm",
  ".ogg",
  ".flac",
  ".aac",
];

const ALLOWED_MIMES = [
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/vnd.wave",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/aacp",
];

// ============================================
// ERROR HANDLING
// ============================================

class RouteError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RouteError";
    this.status = status;
  }
}

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new RouteError(
      `Server configuration missing: ${name}`,
      500
    );
  }

  return value;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "Unknown error";
}

// ============================================
// SUPABASE ADMIN CLIENT
// ============================================

function getAdminClient() {
  return createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

// ============================================
// CHAIRMAN AUTHENTICATION
// ============================================

async function authorize(req: NextRequest) {
  const supabaseUrl = getEnv(
    "NEXT_PUBLIC_SUPABASE_URL"
  );

  const anonKey = getEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );

  const authorization = req.headers.get(
    "authorization"
  );

  if (!authorization?.startsWith("Bearer ")) {
    throw new RouteError(
      "Please log in as Chairman.",
      401
    );
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw new RouteError(
      "Invalid session. Please log in again.",
      401
    );
  }

  const client = createClient(
    supabaseUrl,
    anonKey,
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
  } = await client.auth.getUser(token);

  if (error || !user) {
    throw new RouteError(
      "Invalid session. Please log in again.",
      401
    );
  }

  const email = user.email?.trim().toLowerCase();

  if (email !== CHAIRMAN_EMAIL) {
    throw new RouteError(
      "Chairman only.",
      403
    );
  }

  return user;
}

// ============================================
// AUDIO DURATION VALIDATION
// ============================================

async function getDurationSec(
  file: File
): Promise<number> {
  try {
    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    const metadata = await parseBuffer(
      buffer,
      {
        mimeType: file.type || undefined,
        size: file.size,
        path: file.name,
      },
      {
        duration: true,
      }
    );

    const duration = metadata.format.duration;

    if (
      typeof duration !== "number" ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      throw new Error("Audio duration unavailable.");
    }

    return duration;
  } catch {
    throw new RouteError(
      `Cannot verify the duration of "${file.name}". Please upload a supported WAV, MP3, M4A, WEBM, OGG, FLAC or AAC recording.`,
      400
    );
  }
}

// ============================================
// FILE VALIDATION
// ============================================

function validateAudioFile(file: File) {
  const fileName = file.name.trim().toLowerCase();

  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex < 0) {
    throw new RouteError(
      `File extension missing: ${file.name}`,
      400
    );
  }

  const extension = fileName.slice(dotIndex);

  if (!ALLOWED_EXTS.includes(extension)) {
    throw new RouteError(
      `Unsupported file: ${file.name}. Allowed formats: WAV, MP3, M4A, WEBM, OGG, FLAC and AAC.`,
      400
    );
  }

  const mime = file.type.trim().toLowerCase();

  if (mime.startsWith("video/")) {
    throw new RouteError(
      "Video files are not allowed. Upload audio only.",
      400
    );
  }

  if (mime && !ALLOWED_MIMES.includes(mime)) {
    throw new RouteError(
      `Unsupported audio MIME type: ${mime}`,
      400
    );
  }

  if (file.size < MIN_AUDIO_SIZE) {
    throw new RouteError(
      `${file.name} is too small. Minimum file size is 30KB.`,
      400
    );
  }

  if (file.size > MAX_AUDIO_SIZE) {
    throw new RouteError(
      `${file.name} exceeds the maximum file size.`,
      413
    );
  }
}

// ============================================
// COLLECT AUDIO FILES
// ============================================

function collectAudioFiles(
  formData: FormData
): File[] {
  const files: File[] = [];

  const keys = [
    "audio",
    "audios",
    "files",
  ];

  for (const key of keys) {
    for (const item of formData.getAll(key)) {
      if (
        item instanceof File &&
        item.size > 0
      ) {
        files.push(item);
      }
    }
  }

  for (let i = 0; i < MAX_FILES; i++) {
    const item = formData.get(`audio_${i}`);

    if (
      item instanceof File &&
      item.size > 0
    ) {
      files.push(item);
    }
  }

  // Remove duplicate representations.

  const uniqueFiles = Array.from(
    new Map(
      files.map((file) => [
        JSON.stringify([
          file.name,
          file.size,
          file.lastModified,
        ]),
        file,
      ])
    ).values()
  );

  return uniqueFiles;
}

// ============================================
// PERSISTENT ATOMIC RATE LIMIT
// ============================================

async function checkRateLimitPersistent(
  admin: any,
  email: string
) {
  const { error } = await admin.rpc(
    "claim_chairman_voice_creation",
    {
      p_chairman_email: email.toLowerCase(),
    }
  );

  if (!error) {
    return;
  }

  const message = String(error.message || "");

  if (message.includes("RATE_LIMIT_HOURLY")) {
    throw new RouteError(
      "Maximum 5 voice creations per hour. Please wait before trying again.",
      429
    );
  }

  if (message.includes("RATE_LIMIT_MINUTE")) {
    throw new RouteError(
      "Please wait one minute before creating another voice.",
      429
    );
  }

  if (message.includes("CHAIRMAN_ONLY")) {
    throw new RouteError(
      "Chairman only.",
      403
    );
  }

  console.error(
    "Chairman voice rate-limit error:",
    message
  );

  throw new RouteError(
    "Could not verify the voice creation limit. Please try again.",
    500
  );
}

// ============================================
// DUPLICATE VOICE NAME CHECK
// ============================================

async function checkDuplicateName(
  admin: any,
  name: string
) {
  const escapedName = name.replace(
    /[\\%_]/g,
    "\\$&"
  );

  const {
    data,
    error,
  } = await admin
    .from("chairman_voices")
    .select("id")
    .ilike("name", escapedName)
    .limit(1);

  if (error) {
    console.error(
      "Chairman voice name lookup failed:",
      error
    );

    throw new RouteError(
      "Could not check existing voice names.",
      500
    );
  }

  if (data && data.length > 0) {
    throw new RouteError(
      `Voice "${name}" already exists. Choose another name.`,
      409
    );
  }
}

// ============================================
// ELEVENLABS ERROR HANDLING
// ============================================

function getElevenLabsError(data: any): string {
  const detail = data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (detail && typeof detail === "object") {
    return (
      detail.message ||
      detail.status ||
      JSON.stringify(detail)
    );
  }

  return (
    data?.message ||
    data?.error ||
    "Please check your audio and ElevenLabs account."
  );
}

// ============================================
// MAIN POST ROUTE
// ============================================

export async function POST(
  req: NextRequest
) {
  let createdVoiceId: string | null = null;

  let pendingName = "";
  let pendingCategory = "male";
  let pendingDesc = "";

  try {
    // 1. Authenticate Chairman.

    const user = await authorize(req);

    // 2. Check request size.

    const contentLengthHeader =
      req.headers.get("content-length");

    if (contentLengthHeader) {
      const contentLength = Number(
        contentLengthHeader
      );

      if (
        !Number.isFinite(contentLength) ||
        contentLength < 0
      ) {
        throw new RouteError(
          "Invalid upload request size.",
          400
        );
      }

      if (contentLength > MAX_REQUEST_SIZE) {
        throw new RouteError(
          "Upload too large. Maximum combined audio size is 25MB.",
          413
        );
      }
    }

    // 3. Initialize services.

    const admin = getAdminClient();

    const elevenKey = getEnv(
      "ELEVENLABS_API_KEY"
    );

    // 4. Parse form data.

    let formData: FormData;

    try {
      formData = await req.formData();
    } catch {
      throw new RouteError(
        "Invalid upload request. Please upload your audio again.",
        400
      );
    }

    // 5. Read form fields.

    const name = String(
      formData.get("name") || ""
    ).trim();

    const category = String(
      formData.get("gender") ||
      formData.get("category") ||
      "male"
    ).trim().toLowerCase();

    const descriptionInput = String(
      formData.get("description") || ""
    ).trim();

    const voiceDescription =
      descriptionInput ||
      `High quality Naija Pidgin voice - ${name} - ${category}`;

    pendingName = name;
    pendingCategory = category;
    pendingDesc = voiceDescription;

    // 6. Validate fields.

    if (
      name.length < 2 ||
      name.length > 80
    ) {
      throw new RouteError(
        "Voice name must contain 2–80 characters.",
        400
      );
    }

    if (!["male", "female"].includes(category)) {
      throw new RouteError(
        "Gender must be male or female.",
        400
      );
    }

    if (descriptionInput.length > 1000) {
      throw new RouteError(
        "Description cannot exceed 1,000 characters.",
        400
      );
    }

    // 7. Protect existing voices.

    if (
      PROTECTED_NAMES.includes(
        name.toLowerCase()
      )
    ) {
      throw new RouteError(
        `"${name}" is protected. Use a new name such as "${name} V2".`,
        409
      );
    }

    // 8. Collect audio files.

    const uniqueFiles = collectAudioFiles(
      formData
    );

    if (uniqueFiles.length === 0) {
      throw new RouteError(
        "Upload at least one audio recording. Each recording must be 30 seconds to 3 minutes.",
        400
      );
    }

    if (uniqueFiles.length > MAX_FILES) {
      throw new RouteError(
        "Maximum 5 audio files allowed per voice.",
        400
      );
    }

    // 9. Validate files and combined size.

    let totalSize = 0;

    for (const file of uniqueFiles) {
      validateAudioFile(file);

      totalSize += file.size;
    }

    if (totalSize > MAX_AUDIO_SIZE) {
      throw new RouteError(
        "Combined audio files exceed the 25MB limit.",
        413
      );
    }

    // 10. Verify actual audio duration.

    for (const file of uniqueFiles) {
      const duration = await getDurationSec(file);

      if (duration < MIN_DURATION_SEC) {
        throw new RouteError(
          `${file.name} is only ${Math.round(duration)} seconds. Minimum is 30 seconds.`,
          400
        );
      }

      if (duration > MAX_DURATION_SEC) {
        throw new RouteError(
          `${file.name} is ${Math.round(duration)} seconds. Maximum is 3 minutes.`,
          400
        );
      }
    }

    // 11. Check duplicate voice name.

    await checkDuplicateName(
      admin,
      name
    );

    // 12. Check rate limit before cloning.

    await checkRateLimitPersistent(
      admin,
      user.email!
    );

    // ========================================
    // ELEVENLABS VOICE CREATION
    // ========================================

    const elevenForm = new FormData();

    elevenForm.append(
      "name",
      name
    );

    elevenForm.append(
      "description",
      voiceDescription
    );

    elevenForm.append(
      "labels",
      JSON.stringify({
        language: "en",
        accent: "nigerian pidgin",
        gender: category,
        age: "young adult",
        descriptive:
          "clear, energetic, authentic Naija, confident, conversational",
        use_case: "conversational",
      })
    );

    for (const file of uniqueFiles) {
      elevenForm.append(
        "files",
        file,
        file.name
      );
    }

    elevenForm.append(
      "remove_background_noise",
      "true"
    );

    // 13. Send to ElevenLabs.

    let cloneResponse: Response;

    try {
      cloneResponse = await fetch(
        "https://api.elevenlabs.io/v1/voices/add",
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            Accept: "application/json",
          },
          body: elevenForm,
          cache: "no-store",
          signal: AbortSignal.timeout(50_000),
        }
      );
    } catch (error) {
      console.error(
        "ElevenLabs connection error:",
        safeErrorMessage(error)
      );

      throw new RouteError(
        "Could not connect to ElevenLabs. Please try again.",
        502
      );
    }

    // 14. Read provider response.

    const responseText =
      await cloneResponse.text();

    let cloneData: any = {};

    try {
      cloneData = JSON.parse(responseText);
    } catch {
      cloneData = {};
    }

    // 15. Handle provider errors.

    if (
      !cloneResponse.ok ||
      !cloneData.voice_id
    ) {
      const detail = getElevenLabsError(
        cloneData
      );

      if (
        cloneResponse.status === 401 ||
        cloneResponse.status === 403
      ) {
        throw new RouteError(
          `ElevenLabs permission error: ${detail.slice(0, 200)}`,
          403
        );
      }

      if (cloneResponse.status === 422) {
        throw new RouteError(
          `ElevenLabs rejected the audio: ${detail.slice(0, 200)}`,
          422
        );
      }

      if (cloneResponse.status === 429) {
        throw new RouteError(
          "ElevenLabs rate limit reached. Please wait and try again.",
          429
        );
      }

      throw new RouteError(
        `ElevenLabs failed (${cloneResponse.status}). ${detail.slice(0, 200)}`,
        502
      );
    }

    // 16. Keep the created voice ID for recovery.

    createdVoiceId = String(
      cloneData.voice_id
    );

    const requiresVerification = Boolean(
      cloneData.requires_verification
    );

    // ========================================
    // SAVE TO CHAIRMAN CATALOGUE
    // NO AUTO-PUBLISH
    // ========================================

    const {
      data: savedVoice,
      error: saveError,
    } = await admin
      .from("chairman_voices")
      .insert({
        name,

        description:
          descriptionInput ||
          `Chairman ${category} Naija voice - ${uniqueFiles.length} samples`,

        elevenlabs_voice_id:
          createdVoiceId,

        category,

        accent: "Naija Pidgin",

        is_active: !requiresVerification,

        is_published: false,

        requires_verification:
          requiresVerification,
      })
      .select()
      .single();

    // ========================================
    // RECOVERY IF DATABASE SAVE FAILS
    // ========================================

    if (saveError || !savedVoice) {
      console.error(
        "Chairman voice save failed:",
        saveError
      );

      const {
        data: recoveryRecord,
        error: recoveryError,
      } = await admin
        .from("chairman_voice_recovery")
        .insert({
          name,

          description:
            voiceDescription,

          elevenlabs_voice_id:
            createdVoiceId,

          category,

          error_message:
            saveError?.message ||
            "Unknown database save error",

          status: "orphan_needs_save",
        })
        .select()
        .single();

      if (
        recoveryError ||
        !recoveryRecord
      ) {
        console.error(
          "Chairman voice recovery failed:",
          recoveryError
        );

        return json(
          {
            success: false,

            needs_recovery: true,

            recovery_failed: true,

            error:
              "ElevenLabs created the voice, but Supabase could not save it. Keep this voice ID for manual recovery.",

            elevenlabs_voice_id:
              createdVoiceId,

            recovery: {
              name,
              elevenlabs_voice_id:
                createdVoiceId,
              category,
              description:
                voiceDescription,
            },
          },
          500
        );
      }

      return json(
        {
          success: false,

          needs_recovery: true,

          recovery_saved: true,

          error:
            "ElevenLabs created the voice successfully. Supabase saved it in the recovery table for restoration.",

          elevenlabs_voice_id:
            createdVoiceId,

          recovery_id:
            recoveryRecord.id,

          recovery: {
            name,
            elevenlabs_voice_id:
              createdVoiceId,
            category,
            description:
              voiceDescription,
          },
        },
        500
      );
    }

    // ========================================
    // SUCCESS
    // ========================================

    return json({
      success: true,

      message: requiresVerification
        ? `Voice "${name}" created successfully. Complete ElevenLabs verification before publishing.`
        : `Voice "${name}" created successfully. It is saved privately and has NOT been published.`,

      elevenlabs_voice_id:
        savedVoice.elevenlabs_voice_id,

      requiresVerification,

      files_used: uniqueFiles.length,

      is_published: false,

      voice: savedVoice,
    });

  } catch (error) {
    console.error(
      "Chairman voice creation error:",
      error
    );

    const status =
      error instanceof RouteError
        ? error.status
        : 500;

    return json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",

        elevenlabs_voice_id:
          createdVoiceId || undefined,

        needs_recovery:
          Boolean(createdVoiceId),

        recovery:
          createdVoiceId
            ? {
                name: pendingName,
                elevenlabs_voice_id:
                  createdVoiceId,
                category: pendingCategory,
                description: pendingDesc,
              }
            : undefined,
      },
      status
    );
  }
}

// ============================================
// HEALTH CHECK
// ============================================

export async function GET() {
  return json({
    success: true,

    message:
      "Main Naija Pidgin Chairman Voice V4.1",

    mode:
      "CREATE ONLY - NO AUTO-PUBLISH",

    limits: {
      maximum_files: MAX_FILES,

      minimum_duration_seconds:
        MIN_DURATION_SEC,

      maximum_duration_seconds:
        MAX_DURATION_SEC,

      maximum_total_size_mb: 25,

      creations_per_minute: 1,

      creations_per_hour: 5,
    },

    protected_voices: [
      "Main Naija Pidgin",
      "Main Naija Pidgin Male",
      "Warri Babe",
      "Warri Boy",
    ],
  });
}

Before deploying

1. Install the missing dependency

Run this in your project root:

npm install music-metadata

2. Confirm these Render environment variables exist:

- "NEXT_PUBLIC_SUPABASE_URL"
- "NEXT_PUBLIC_SUPABASE_ANON_KEY"
- "SUPABASE_SERVICE_ROLE_KEY"
- "ELEVENLABS_API_KEY"

3. Deploy

git add app/api/chairman/voice/create/route.ts package.json package-lock.json
git commit -m "Improve Chairman voice creation API"
git push origin main

Important protections

- Your existing Main Naija Pidgin and Warri Babe voices are not deleted.
- Existing voice IDs are not changed.
- New voices remain unpublished.
- The existing rate-limit RPC is retained.
- The existing recovery table is retained.
- The existing database columns are retained.

One thing to check: This code assumes your "chairman_voices" and "chairman_voice_recovery" tables already contain the columns used in the original file. It does not create or alter database tables. Also, the upload size check using "Content-Length" is an early check, not a complete streaming limit; your hosting platform should also enforce request-body limits.