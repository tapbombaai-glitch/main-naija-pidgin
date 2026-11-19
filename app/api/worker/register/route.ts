import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONLY PIDGIN REGISTRATION IS OPEN RIGHT NOW.
// Workers cannot choose or change their language through the browser.
const WORKER_LANGUAGE = "pidgin" as const;

const LOCATION_MAP: Record<
  string,
  { state: string; city: string }
> = {
  warri: { state: "Delta", city: "Warri" },
  "port harcourt": {
    state: "Rivers",
    city: "Port Harcourt",
  },
  ph: { state: "Rivers", city: "Port Harcourt" },
  lagos: { state: "Lagos", city: "Lagos" },
  abuja: { state: "FCT", city: "Abuja" },
  enugu: { state: "Enugu", city: "Enugu" },
  onitsha: { state: "Anambra", city: "Onitsha" },
  benin: { state: "Edo", city: "Benin City" },
  kano: { state: "Kano", city: "Kano" },
  ibadan: { state: "Oyo", city: "Ibadan" },
  owerri: { state: "Imo", city: "Owerri" },
  uyo: { state: "Akwa Ibom", city: "Uyo" },
  calabar: { state: "Cross River", city: "Calabar" },
};

function resolveLocation(body: any) {
  const region = String(body.region || "").trim();

  const suppliedState = String(body.state || "").trim();
  const suppliedCity = String(body.city || "").trim();

  const mapped = LOCATION_MAP[region.toLowerCase()];

  return {
    state: suppliedState || mapped?.state || "Not specified",
    city: suppliedCity || mapped?.city || region,
  };
}

async function generateWorkerId(): Promise<string | null> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `WORKER-${randomInt(100000, 999999)}`;

    const { data, error } = await supabaseAdmin
      .from("workers")
      .select("worker_id")
      .eq("worker_id", candidate)
      .maybeSingle();

    if (error) {
      console.error("Worker ID lookup failed:", error);
      throw new Error("Could not verify Worker ID availability.");
    }

    if (!data) {
      return candidate;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  let authUserId: string | null = null;

  try {
    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");
    const region = String(body.region || "").trim();

    const { state, city } = resolveLocation(body);

    // The server controls the language.
    // Reject attempts to register for a language that is not open.
    const requestedLanguage = String(body.language || "")
      .trim()
      .toLowerCase();

    if (
      requestedLanguage &&
      requestedLanguage !== WORKER_LANGUAGE
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Only Nigerian Pidgin registration is currently open.",
        },
        { status: 403 }
      );
    }

    // Accent is classification metadata.
    // Never guess a worker's actual accent.
    const accent =
      String(body.accent || "Not specified").trim() ||
      "Not specified";

    // REQUIRED FIELD VALIDATION

    if (
      !fullName ||
      !phone ||
      !email ||
      !password ||
      !region ||
      !city
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Please complete all registration fields.",
        },
        { status: 400 }
      );
    }

    if (fullName.length < 2 || fullName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid full name.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must contain at least 8 characters.",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (email === "tapbomba.ai@gmail.com") {
      return NextResponse.json(
        {
          success: false,
          error: "This email is reserved for Chairman access.",
        },
        { status: 403 }
      );
    }

    // CHECK EXISTING WORKER

    const { data: existingWorker, error: lookupError } =
      await supabaseAdmin
        .from("workers")
        .select("worker_id")
        .eq("email", email)
        .maybeSingle();

    if (lookupError) {
      console.error("Worker lookup error:", lookupError);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to verify registration. Please try again.",
        },
        { status: 500 }
      );
    }

    if (existingWorker) {
      return NextResponse.json(
        {
          success: false,
          error: "This email is already registered. Please log in.",
        },
        { status: 409 }
      );
    }

    // GENERATE WORKER ID

    const workerId = await generateWorkerId();

    if (!workerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unable to generate Worker ID. Please try again.",
        },
        { status: 500 }
      );
    }

    // CREATE SUPABASE AUTH ACCOUNT

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,

        user_metadata: {
          full_name: fullName,
          display_name: fullName,

          worker_id: workerId,

          account_type: "worker",

          // PERMANENT ACCOUNT LANGUAGE
          language: WORKER_LANGUAGE,

          phone,
          region,
          state,
          city,
          accent,
        },
      });

    if (authError || !authData.user) {
      console.error(
        "Supabase Auth registration failed:",
        authError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            authError?.message ||
            "Unable to create your account.",
        },
        { status: 400 }
      );
    }

    authUserId = authData.user.id;

    // UPDATE THE AUTOMATICALLY CREATED WORKER PROFILE

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("worker_profiles")
        .update({
          worker_id: workerId,

          full_name: fullName,
          email,
          state,
          city,
          accent,

          // SAME LANGUAGE AS AUTH ACCOUNT
          language: WORKER_LANGUAGE,

          updated_at: new Date().toISOString(),
        })
        .eq("user_id", authUserId)
        .select("user_id")
        .maybeSingle();

    if (profileError || !profile) {
      console.error(
        "Worker profile creation/verification failed:",
        profileError
      );

      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      authUserId = null;

      return NextResponse.json(
        {
          success: false,
          error:
            "Worker profile could not be created. Please contact support.",
          details: profileError?.message || "Profile row not found.",
        },
        { status: 500 }
      );
    }

    // CREATE MAIN WORKER RECORD

    const { error: insertError } = await supabaseAdmin
      .from("workers")
      .insert({
        worker_id: workerId,
        auth_user_id: authUserId,

        full_name: fullName,
        email,
        phone,

        region,

        // SAME LANGUAGE AS AUTH AND PROFILE
        language: WORKER_LANGUAGE,

        voice_earnings: 0,
        total_voice_sales: 0,
      });

    if (insertError) {
      console.error(
        "Main worker record creation failed:",
        insertError
      );

      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      authUserId = null;

      return NextResponse.json(
        {
          success: false,
          error: "Could not save worker account.",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // SUCCESS

    authUserId = null;

    return NextResponse.json(
      {
        success: true,
        message: "Worker registration successful!",

        worker: {
          id: authData.user.id,
          worker_id: workerId,
          full_name: fullName,
          email,
          region,
          state,
          city,
          accent,
          language: WORKER_LANGUAGE,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("WORKER REGISTRATION ERROR:", error);

    if (authUserId) {
      const { error: cleanupError } =
        await supabaseAdmin.auth.admin.deleteUser(authUserId);

      if (cleanupError) {
        console.error(
          "Auth cleanup failed:",
          cleanupError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Registration failed. Please try again.",
      },
      { status: 500 }
    );
  }
}