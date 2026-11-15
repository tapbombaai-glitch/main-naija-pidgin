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

  try {
    const body = await req.json();

    const identifier =
      typeof body.identifier === "string"
        ? body.identifier.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Enter your Worker ID or email and password." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Worker login: Supabase environment variables missing.");

      return NextResponse.json(
        { error: "Login service is not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Look up the worker securely on the server.
    // This avoids unauthenticated browser requests being blocked by RLS.
    const cleanIdentifier = identifier.includes("@")
      ? identifier.toLowerCase()
      : identifier.toUpperCase();

    let query = supabaseAdmin
      .from("workers")
      .select("email, worker_id, auth_user_id");

    query = identifier.includes("@")
      ? query.eq("email", cleanIdentifier)
      : query.eq("worker_id", cleanIdentifier);

    const { data: worker, error: workerError } =
      await query.maybeSingle();

    if (workerError) {
      console.error("Worker lookup error:", workerError.message);

      return NextResponse.json(
        { error: "Unable to verify your worker account. Please try again." },
        { status: 500 }
      );
    }

    if (!worker?.email || !worker?.worker_id) {
      return NextResponse.json(
        { error: "Worker account not found. Check your Worker ID or email." },
        { status: 404 }
      );
    }

    const email = String(worker.email).trim().toLowerCase();

    // Chairman must use the separate Chairman login.
    if (email === CHAIRMAN_EMAIL) {
      return NextResponse.json(
        { error: "Please use the Chairman Login." },
        { status: 403 }
      );
    }

    // Create the authenticated Supabase session.
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

      return NextResponse.json(
        { error: "Wrong Worker ID or password." },
        { status: 401 }
      );
    }

    // Confirm that the authenticated account matches the worker record.
    const authenticatedEmail =
      data.user.email?.trim().toLowerCase();

    const emailMatches = authenticatedEmail === email;

    const authIdMatches =
      !worker.auth_user_id ||
      data.user.id === worker.auth_user_id;

    if (!emailMatches || !authIdMatches) {
      await supabase.auth.signOut();

      const response = NextResponse.json(
        { error: "Worker account verification failed." },
        { status: 403 }
      );

      response.headers.set("Cache-Control", "no-store");

      cookiesToSave.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });

      return response;
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Worker login successful!",
        workerId: worker.worker_id,
        email,
      },
      { status: 200 }
    );

    response.headers.set("Cache-Control", "no-store");

    cookiesToSave.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });

    return response;
  } catch (error) {
    console.error("Worker login error:", error);

    return NextResponse.json(
      { error: "Something went wrong during login. Please try again." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}