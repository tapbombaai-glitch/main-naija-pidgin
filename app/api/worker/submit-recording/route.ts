import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase server environment variables");
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const BUCKET = "voice-clips";

const PIDGIN_DAILY_LIMIT = 30;
const NIGERIAN_ENGLISH_DAILY_LIMIT = 10;

const PIDGIN_MIN_SECONDS = 11;
const PIDGIN_MAX_SECONDS = 15;

const NIGERIAN_ENGLISH_MIN_SECONDS = 60;

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

type RecordingLanguage =
  | "pidgin"
  | "main_naija_pidgin"
  | "nigerian_english"
  | "nigerian-voice";

function errorResponse(status: number, error: string) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}

function normalizeLanguage(value: string) {
  const language = value.trim().toLowerCase();

  if (
    language === "pidgin" ||
    language === "main_naija_pidgin"
  ) {
    return "pidgin" as const;
  }

  if (
    language === "nigerian_english" ||
    language === "nigerian-voice"
  ) {
    return "nigerian_english" as const;
  }

  return null;
}

/**
 * Get the beginning of the current Main Naija Pidgin
 * recording day.
 *
 * Recording day changes at 5:00 PM Lagos time.
 */
function getLagosRecordingDayStart(): Date {
  const now = new Date();

  const lagosParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const getPart = (type: string) =>
    lagosParts.find((p) => p.type === type)?.value || "0";

  let year = Number(getPart("year"));
  let month = Number(getPart("month"));
  let day = Number(getPart("day"));
  const hour = Number(getPart("hour"));

  /*
   * Before 5 PM Lagos, the recording day started at 5 PM
   * on the previous Lagos calendar day.
   */
  if (hour < 17) {
    const previousDay = new Date(
      Date.UTC(year, month - 1, day)
    );

    previousDay.setUTCDate(previousDay.getUTCDate() - 1);

    year = previousDay.getUTCFullYear();
    month = previousDay.getUTCMonth() + 1;
    day = previousDay.getUTCDate();
  }

  /*
   * Lagos is UTC+1 and has no DST.
   * 5:00 PM Lagos = 16:00 UTC.
   */
  return new Date(
    Date.UTC(year, month - 1, day, 16, 0, 0, 0)
  );
}

/**
 * Read an EBML/WebM duration.
 *
 * The Worker Dashboard uses MediaRecorder and normally produces
 * WebM audio in supported browsers.
 *
 * This intentionally does not trust a duration supplied by the
 * browser form.
 */
function readWebmDuration(buffer: Buffer): number | null {
  const EBML_ID = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

  if (buffer.length < 4 || !buffer.subarray(0, 4).equals(EBML_ID)) {
    return null;
  }

  let timecodeScale = 1_000_000; // Matroska default: nanoseconds

  let durationRaw: number | null = null;

  function readVint(
    offset: number
  ): { value: number; length: number } | null {
    if (offset >= buffer.length) return null;

    const first = buffer[offset];

    let mask = 0x80;
    let length = 1;

    while (length <= 8 && (first & mask) === 0) {
      mask >>= 1;
      length++;
    }

    if (length > 8 || offset + length > buffer.length) {
      return null;
    }

    let value = first & (mask - 1);

    for (let i = 1; i < length; i++) {
      value = value * 256 + buffer[offset + i];
    }

    return { value, length };
  }

  function readUnsigned(offset: number, length: number): number | null {
    if (
      offset < 0 ||
      length < 1 ||
      offset + length > buffer.length ||
      length > 8
    ) {
      return null;
    }

    let value = 0;

    for (let i = 0; i < length; i++) {
      value = value * 256 + buffer[offset + i];
    }

    return value;
  }

  function readFloat(offset: number, length: number): number | null {
    if (offset + length > buffer.length) return null;

    if (length === 4) {
      return buffer.readFloatBE(offset);
    }

    if (length === 8) {
      return buffer.readDoubleBE(offset);
    }

    return null;
  }

  function scan(start: number, end: number) {
    let offset = start;

    while (offset + 2 <= end && offset + 2 <= buffer.length) {
      const idStart = offset;

      /*
       * EBML IDs are 1–4 bytes.
       * We read the first byte to determine the length.
       */
      const first = buffer[offset];

      let idMask = 0x80;
      let idLength = 1;

      while (
        idLength <= 4 &&
        (first & idMask) === 0
      ) {
        idMask >>= 1;
        idLength++;
      }

      if (
        idLength > 4 ||
        offset + idLength > end ||
        offset + idLength > buffer.length
      ) {
        break;
      }

      let id = 0;

      for (let i = 0; i < idLength; i++) {
        id = id * 256 + buffer[offset + i];
      }

      offset += idLength;

      const sizeInfo = readVint(offset);

      if (!sizeInfo) break;

      offset += sizeInfo.length;

      const size = sizeInfo.value;

      /*
       * Unknown-size EBML elements are represented by all 1s.
       * We cannot safely scan those here.
       */
      if (size > buffer.length || offset + size > end) {
        break;
      }

      const dataStart = offset;
      const dataEnd = offset + size;

      // TimecodeScale = 0x2AD7B1
      if (id === 0x2ad7b1) {
        const value = readUnsigned(dataStart, size);

        if (value && value > 0) {
          timecodeScale = value;
        }
      }

      // Duration = 0x4489
      if (id === 0x4489) {
        const value = readFloat(dataStart, size);

        if (
          value !== null &&
          Number.isFinite(value) &&
          value > 0
        ) {
          durationRaw = value;
        }
      }

      /*
       * Segment = 0x18538067
       * Info = 0x1549A966
       */
      if (
        id === 0x18538067 ||
        id === 0x1549a966
      ) {
        scan(dataStart, dataEnd);
      }

      if (durationRaw !== null) {
        return;
      }

      offset = dataEnd;

      if (offset <= idStart) break;
    }
  }

  /*
   * WebM Segment normally begins after the EBML header.
   * Search the first few MB to avoid unnecessarily scanning
   * huge files.
   */
  const scanEnd = Math.min(buffer.length, 8 * 1024 * 1024);

  scan(0, scanEnd);

  if (
    durationRaw === null ||
    !Number.isFinite(durationRaw) ||
    durationRaw <= 0
  ) {
    return null;
  }

  /*
   * Matroska Duration is expressed in TimecodeScale units.
   * Default TimecodeScale = 1,000,000 ns.
   */
  const seconds =
    (durationRaw * timecodeScale) / 1_000_000_000;

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return seconds;
}

async function getAuthenticatedWorker(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    return {
      error: errorResponse(401, "Login required"),
    };
  }

  const {
    data: userData,
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !userData.user) {
    return {
      error: errorResponse(401, "Invalid or expired login session"),
    };
  }

  const user = userData.user;

  const email =
    (user.email || "").trim().toLowerCase();

  /*
   * Chairman must never submit Worker recordings.
   */
  if (email === CHAIRMAN_EMAIL) {
    return {
      error: errorResponse(
        403,
        "Chairman account cannot submit worker recordings"
      ),
    };
  }

  const {
    data: worker,
    error: workerError,
  } = await supabaseAdmin
    .from("workers")
    .select(
      "worker_id,auth_user_id,email,language"
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (workerError) {
    console.error(
      "Worker lookup error:",
      workerError.message
    );

    return {
      error: errorResponse(
        500,
        "Could not verify worker account"
      ),
    };
  }

  if (!worker) {
    return {
      error: errorResponse(
        403,
        "Worker account not found"
      ),
    };
  }

  if (worker.auth_user_id !== user.id) {
    return {
      error: errorResponse(
        403,
        "Worker ownership could not be verified"
      ),
    };
  }

  return {
    user,
    worker,
  };
}

export async function POST(req: NextRequest) {
  try {
    /*
     * 1. Authenticate the real Supabase user.
     */
    const authResult =
      await getAuthenticatedWorker(req);

    if ("error" in authResult) {
      return authResult.error;
    }

    const { worker } = authResult;

    /*
     * 2. Read multipart upload.
     */
    const formData = await req.formData();

    const audio = formData.get("audio");
    const languageValue = formData.get("language");
    const textValue = formData.get("text");

    if (!(audio instanceof File)) {
      return errorResponse(
        400,
        "Audio file is required"
      );
    }

    if (typeof languageValue !== "string") {
      return errorResponse(
        400,
        "Language is required"
      );
    }

    const language =
      normalizeLanguage(languageValue);

    if (!language) {
      return errorResponse(
        400,
        "Unsupported recording language"
      );
    }

    const text =
      typeof textValue === "string"
        ? textValue.trim()
        : "";

    /*
     * 3. Basic file validation.
     */
    if (audio.size <= 0) {
      return errorResponse(
        400,
        "Audio file is empty"
      );
    }

    if (audio.size > MAX_FILE_SIZE) {
      return errorResponse(
        400,
        "Audio file is too large"
      );
    }

    /*
     * Worker Dashboard currently uses MediaRecorder/WebM.
     * We only accept WebM here so the server can actually
     * inspect the duration instead of trusting the browser.
     */
    const contentType =
      (audio.type || "").toLowerCase();

    if (
      !contentType.includes("webm") &&
      !contentType.includes("audio/webm")
    ) {
      return errorResponse(
        400,
        "Unsupported audio format. Please record using the Worker recorder."
      );
    }

    const arrayBuffer =
      await audio.arrayBuffer();

    const audioBuffer =
      Buffer.from(arrayBuffer);

    /*
     * 4. SERVER-SIDE DURATION CHECK.
     *
     * IMPORTANT:
     * We deliberately ignore any duration sent by the
     * browser. The server reads the uploaded WebM itself.
     */
    const actualDuration =
      readWebmDuration(audioBuffer);

    if (
      actualDuration === null ||
      !Number.isFinite(actualDuration)
    ) {
      return errorResponse(
        400,
        "Could not verify the audio duration. Please record again."
      );
    }

    const roundedDuration =
      Math.round(actualDuration);

    /*
     * 5. Enforce dataset duration rules.
     */
    if (language === "pidgin") {
      if (
        actualDuration < PIDGIN_MIN_SECONDS ||
        actualDuration > PIDGIN_MAX_SECONDS
      ) {
        return errorResponse(
          400,
          `Pidgin recording must be between ${PIDGIN_MIN_SECONDS} and ${PIDGIN_MAX_SECONDS} seconds. Server measured ${actualDuration.toFixed(
            2
          )} seconds.`
        );
      }
    }

    if (language === "nigerian_english") {
      if (
        actualDuration < NIGERIAN_ENGLISH_MIN_SECONDS
      ) {
        return errorResponse(
          400,
          `Nigerian English recording must be at least ${NIGERIAN_ENGLISH_MIN_SECONDS} seconds. Server measured ${actualDuration.toFixed(
            2
          )} seconds.`
        );
      }
    }

    /*
     * 6. Determine the current 5 PM Lagos recording day.
     */
    const dayStart =
      getLagosRecordingDayStart();

    /*
     * 7. Server-side daily limit check.
     *
     * We count by language separately so Nigerian English
     * does not consume the Pidgin 30-task allowance.
     */
    const {
      count,
      error: countError,
    } = await supabaseAdmin
      .from("recordings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("worker_id", worker.worker_id)
      .gte("created_at", dayStart.toISOString())
      .in(
        "language",
        language === "pidgin"
          ? ["pidgin", "main_naija_pidgin"]
          : [
              "nigerian_english",
              "nigerian-voice",
            ]
      );

    if (countError) {
      console.error(
        "Daily recording count error:",
        countError.message
      );

      return errorResponse(
        500,
        "Could not verify today's recording limit"
      );
    }

    const dailyLimit =
      language === "pidgin"
        ? PIDGIN_DAILY_LIMIT
        : NIGERIAN_ENGLISH_DAILY_LIMIT;

    const currentCount = count || 0;

    if (currentCount >= dailyLimit) {
      return errorResponse(
        429,
        `Today's ${language === "pidgin"
          ? "Pidgin"
          : "Nigerian English"
        } recording limit has been reached.`
      );
    }

    /*
     * 8. Generate a server-controlled storage path.
     *
     * The client cannot choose another worker's folder.
     */
    const recordingId =
      crypto.randomUUID();

    const safeFileName =
      `${worker.worker_id}/${recordingId}.webm`;

    /*
     * 9. Upload privately through the server.
     */
    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(
        safeFileName,
        audioBuffer,
        {
          contentType:
            contentType || "audio/webm",
          upsert: false,
        }
      );

    if (uploadError) {
      console.error(
        "Recording storage upload error:",
        uploadError.message
      );

      return errorResponse(
        500,
        "Could not save recording audio"
      );
    }

    /*
     * 10. IMPORTANT:
     *
     * We do NOT use getPublicUrl().
     *
     * The bucket should remain private.
     */
    const audioPath = safeFileName;

    /*
     * 11. Create the recording row.
     *
     * Browser-provided earnings are ignored.
     * Browser-provided duration is ignored.
     * Browser-provided worker_id is ignored.
     *
     * Chairman approval later determines the reward.
     */
    const {
      data: recording,
      error: insertError,
    } = await supabaseAdmin
      .from("recordings")
      .insert({
        id: recordingId,
        worker_id: worker.worker_id,
        text,
        duration: roundedDuration,
        status: "pending",
        is_approved: false,

        /*
         * Never award money at submission time.
         */
        earnings: 0,
        amount: 0,
        reward: 0,
        payout_amount: 0,
        pending_earnings: 0,

        language,
        audio_path: audioPath,
        file_path: audioPath,
        file_name: `${recordingId}.webm`,

        /*
         * Preserve the existing approval/payment model.
         */
        is_paid: false,
        earnings_paid: false,
      })
      .select(
        "id,worker_id,language,duration,status,earnings,created_at"
      )
      .single();

    if (insertError) {
      console.error(
        "Recording database insert error:",
        insertError.message
      );

      /*
       * Database insert failed after Storage upload.
       * Remove only this newly-created orphan file.
       * No existing recording is touched.
       */
      await supabaseAdmin.storage
        .from(BUCKET)
        .remove([audioPath])
        .catch(() => undefined);

      return errorResponse(
        500,
        "Could not save recording information"
      );
    }

    /*
     * 12. Success.
     */
    return NextResponse.json(
      {
        success: true,
        message: "Recording submitted successfully",
        recording,
        server_duration_seconds: actualDuration,
        daily_count: currentCount + 1,
        daily_limit: dailyLimit,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error: any) {
    console.error(
      "Worker submit recording API error:",
      error?.message || error
    );

    return errorResponse(
      500,
      "Internal server error"
    );
  }
}