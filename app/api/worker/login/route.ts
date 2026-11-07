import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase/server";
import { CHAIRMAN_EMAIL } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const identifier = String(body.identifier || "").trim();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Enter your Worker ID or email and password." },
        { status: 400 }
      );
    }

    const isEmail = identifier.includes("@");

    let workerQuery = supabaseAdmin
      .from("workers")
      .select("worker_id, email, auth_user_id, full_name");

    if (isEmail) {
      workerQuery = workerQuery.eq("email", identifier.toLowerCase());
    } else {
      workerQuery = workerQuery.eq(
        "worker_id",
        identifier.toUpperCase()
      );
    }

    const { data: worker, error: workerError } =
      await workerQuery.maybeSingle();

    if (
      workerError ||
      !worker ||
      !worker.email ||
      !worker.auth_user_id
    ) {
      return NextResponse.json(
        { error: "Invalid Worker ID/email or password." },
        { status: 401 }
      );
    }

    // Chairman account must never use the Worker login.
    if (worker.email.toLowerCase() === CHAIRMAN_EMAIL.toLowerCase()) {
      return NextResponse.json(
        { error: "Please use the Chairman login." },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: worker.email,
        password,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid Worker ID/email or password." },
        { status: 401 }
      );
    }

    // Make sure the authenticated Supabase user belongs
    // to the worker profile we found.
    if (authData.user.id !== worker.auth_user_id) {
      await supabase.auth.signOut();

      return NextResponse.json(
        { error: "Worker account verification failed." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      workerId: worker.worker_id,
      fullName: worker.full_name,
    });
  } catch (error) {
    console.error("Worker login error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}