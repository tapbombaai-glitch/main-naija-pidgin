import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase server environment variables");
}

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    // Require the logged-in worker's access token.
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Please log in again." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return NextResponse.json(
        { error: "Invalid login token." },
        { status: 401 }
      );
    }

    // Verify the token with Supabase Auth.
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your login session is invalid. Please log in again." },
        { status: 401 }
      );
    }

    // Chairman must not use the worker withdrawal endpoint.
    if (
      user.email?.toLowerCase() === "tapbomba.ai@gmail.com"
    ) {
      return NextResponse.json(
        { error: "Chairman accounts cannot request worker withdrawals." },
        { status: 403 }
      );
    }

    // Find the worker using the verified authentication ID.
    const { data: worker, error: workerError } =
      await supabaseAdmin
        .from("workers")
        .select("worker_id")
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (workerError || !worker) {
      return NextResponse.json(
        { error: "Worker account not found." },
        { status: 403 }
      );
    }

    // The database function calculates the balance and fee.
    const { data, error } = await supabaseAdmin.rpc(
      "create_worker_withdrawal_request",
      {
        p_worker_id: worker.worker_id,
      }
    );

    if (error) {
      const message = error.message || "Unable to create withdrawal request.";

      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("Worker withdrawal error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}