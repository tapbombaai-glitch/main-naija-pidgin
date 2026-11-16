import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

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

    // Keep the existing login fields.
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

    // Normalize the identifier without changing the worker's login method.
    const isEmail = identifier.includes("@");

    const cleanIdentifier = isEmail
      ? identifier.toLowerCase()
      : identifier.toUpperCase();

    // Find the registered worker using the server-side admin client.
    let query = supabaseAdmin
      .from("workers")
      .select("email, worker_id, auth_user_id");

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

    // Chairman must use the separate Chairman Login.
    if (email === CHAIRMAN_EMAIL) {
      return sendResponse(
        {
          error: "Please use the Chairman Login.",
        },
        403
      );
    }

    // Create the existing Supabase cookie-based session.
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

    // Authenticate using the worker's existing email and password.
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

    // Confirm the authenticated email belongs to this worker.
    if (authenticatedEmail !== email) {
      await supabase.auth.signOut();

      return sendResponse(
        {
          error: "Worker account verification failed.",
        },
        403
      );
    }

    // Verify or securely establish the worker's Supabase user mapping.
    let verifiedAuthUserId = worker.auth_user_id;

    if (verifiedAuthUserId) {
      // Existing mappings must match exactly.
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
      // First successful login: claim the mapping only if it is still empty.
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
        verifiedAuthUserId = linkedWorker.auth_user_id;
      } else {
        // Another request may have linked the account first.
        const { data: existingWorker, error: verifyError } =
          await supabaseAdmin
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

    // Successful login. Keep the response fields unchanged
    // so the existing worker login page can continue working.
    return sendResponse(
      {
        success: true,
        message: "Worker login successful!",
        workerId: worker.worker_id,
        email,
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