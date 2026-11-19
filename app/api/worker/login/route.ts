import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

// Only Pidgin worker accounts are currently allowed to log in.
const ACTIVE_WORKER_LANGUAGE = "pidgin";

type SavedCookie = {
  name: string;
  value: string;
  options?: any;
};

export async function POST(req: NextRequest) {
  const cookiesToSave: SavedCookie[] = [];

  const sendResponse = (
    body: Record<string, any>,
    status: number
  ) => {
    const response = NextResponse.json(body, { status });

    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");

    cookiesToSave.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  };

  try {
    const body = await req.json();

    // KEEP EXISTING LOGIN FIELDS

    const identifier =
      typeof body.identifier === "string"
        ? body.identifier.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!identifier || !password) {
      return sendResponse(
        {
          error: "Enter your Worker ID or email and password.",
        },
        400
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        "Worker login: Supabase environment variables missing."
      );

      return sendResponse(
        {
          error:
            "Login service is temporarily unavailable. Please contact support.",
        },
        500
      );
    }

    // NORMALIZE LOGIN IDENTIFIER

    const isEmail = identifier.includes("@");

    const cleanIdentifier = isEmail
      ? identifier.toLowerCase()
      : identifier.toUpperCase();

    // FIND REGISTERED WORKER
    // Language comes from the database, never from the browser.

    let query = supabaseAdmin
      .from("workers")
      .select(
        "email, worker_id, auth_user_id, language"
      );

    query = isEmail
      ? query.eq("email", cleanIdentifier)
      : query.eq("worker_id", cleanIdentifier);

    const { data: worker, error: workerError } =
      await query.maybeSingle();

    if (workerError) {
      console.error(
        "Worker lookup error:",
        workerError.message
      );

      return sendResponse(
        {
          error:
            "Unable to verify your worker account. Please try again.",
        },
        500
      );
    }

    if (!worker?.email || !worker?.worker_id) {
      return sendResponse(
        {
          error:
            "Worker account not found. Check your Worker ID or email.",
        },
        404
      );
    }

    const email = String(worker.email)
      .trim()
      .toLowerCase();

    // CHAIRMAN MUST USE SEPARATE LOGIN

    if (email === CHAIRMAN_EMAIL) {
      return sendResponse(
        {
          error: "Please use the Chairman Login.",
        },
        403
      );
    }

    // LANGUAGE LOCK
    // Existing workers have pidgin as their database default.
    // No other language is currently allowed.

    const workerLanguage = String(
      worker.language || ""
    )
      .trim()
      .toLowerCase();

    if (workerLanguage !== ACTIVE_WORKER_LANGUAGE) {
      return sendResponse(
        {
          error:
            "Your registered language is not currently open for worker login. Please contact support.",
        },
        403
      );
    }

    // CREATE EXISTING SUPABASE COOKIE SESSION

    const cookieStore = await cookies();

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSave.push(...cookiesToSet);
          },
        },
      }
    );

    // AUTHENTICATE USING REGISTERED EMAIL AND PASSWORD

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError || !data.user) {
      console.error(
        "Worker password login failed:",
        loginError?.message
      );

      return sendResponse(
        {
          error: "Wrong Worker ID or password.",
        },
        401
      );
    }

    const authenticatedEmail =
      data.user.email?.trim().toLowerCase();

    // VERIFY AUTHENTICATED EMAIL

    if (authenticatedEmail !== email) {
      await supabase.auth.signOut();

      return sendResponse(
        {
          error: "Worker account verification failed.",
        },
        403
      );
    }

    // VERIFY OR SECURELY ESTABLISH WORKER ACCOUNT MAPPING

    let verifiedAuthUserId = worker.auth_user_id;

    if (verifiedAuthUserId) {
      if (verifiedAuthUserId !== data.user.id) {
        await supabase.auth.signOut();

        return sendResponse(
          {
            error:
              "This worker account is linked to a different login. Please contact support.",
          },
          403
        );
      }
    } else {
      // First successful login: claim mapping only if still empty.

      const { data: linkedWorker, error: linkError } =
        await supabaseAdmin
          .from("workers")
          .update({
            auth_user_id: data.user.id,
          })
          .eq("worker_id", worker.worker_id)
          .is("auth_user_id", null)
          .select("auth_user_id")
          .maybeSingle();

      if (linkError) {
        console.error(
          "Worker account linking error:",
          linkError.message
        );

        await supabase.auth.signOut();

        return sendResponse(
          {
            error:
              "We could not securely link your worker account. Please try again or contact support.",
          },
          500
        );
      }

      if (linkedWorker?.auth_user_id) {
        verifiedAuthUserId =
          linkedWorker.auth_user_id;
      } else {
        // Another request may have linked the account first.

        const {
          data: existingWorker,
          error: verifyError,
        } = await supabaseAdmin
          .from("workers")
          .select("auth_user_id")
          .eq("worker_id", worker.worker_id)
          .maybeSingle();

        if (verifyError) {
          console.error(
            "Worker mapping verification error:",
            verifyError.message
          );

          await supabase.auth.signOut();

          return sendResponse(
            {
              error:
                "Unable to verify your worker account. Please try again.",
            },
            500
          );
        }

        verifiedAuthUserId =
          existingWorker?.auth_user_id || null;
      }

      if (verifiedAuthUserId !== data.user.id) {
        await supabase.auth.signOut();

        return sendResponse(
          {
            error:
              "Worker account verification failed. Please contact support.",
          },
          403
        );
      }
    }

    // VERIFY WORKER PROFILE LANGUAGE AND ID
    // The workers table remains the primary language authority.
    // If a profile exists, it must agree with that account.

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("worker_profiles")
        .select("worker_id, language")
        .eq("user_id", data.user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Worker profile verification error:",
        profileError.message
      );

      await supabase.auth.signOut();

      return sendResponse(
        {
          error:
            "Unable to verify your worker profile. Please try again.",
        },
        500
      );
    }

    if (profile) {
      const profileLanguage = String(
        profile.language || ""
      )
        .trim()
        .toLowerCase();

      if (
        profile.worker_id !== worker.worker_id ||
        profileLanguage !== ACTIVE_WORKER_LANGUAGE
      ) {
        await supabase.auth.signOut();

        return sendResponse(
          {
            error:
              "Your worker profile does not match your registered language or Worker ID. Please contact support.",
          },
          403
        );
      }
    }

    // SUCCESSFUL LOGIN
    // Keep the existing response fields and add language.

    return sendResponse(
      {
        success: true,
        message: "Worker login successful!",
        workerId: worker.worker_id,
        email,
        language: ACTIVE_WORKER_LANGUAGE,
      },
      200
    );
  } catch (error) {
    console.error("Worker login error:", error);

    return sendResponse(
      {
        error:
          "Something went wrong during login. Please try again.",
      },
      500
    );
  }
}