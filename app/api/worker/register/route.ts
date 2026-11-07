import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let authUserId: string | null = null;

  try {
    const body = await request.json();

    const fullName = String(body.fullName || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const region = String(body.region || "").trim();

    if (!fullName || !phone || !email || !password || !region) {
      return NextResponse.json(
        { error: "Please complete all registration fields." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const { data: existingWorker } = await supabaseAdmin
      .from("workers")
      .select("worker_id")
      .eq("email", email)
      .maybeSingle();

    if (existingWorker) {
      return NextResponse.json(
        { error: "This email is already registered." },
        { status: 409 }
      );
    }

    let workerId = "";

    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `WORKER-${randomInt(100000, 999999)}`;

      const { data } = await supabaseAdmin
        .from("workers")
        .select("worker_id")
        .eq("worker_id", candidate)
        .maybeSingle();

      if (!data) {
        workerId = candidate;
        break;
      }
    }

    if (!workerId) {
      return NextResponse.json(
        { error: "Could not generate a Worker ID. Please try again." },
        { status: 500 }
      );
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          worker_id: workerId,
          account_type: "worker",
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Account creation failed." },
        { status: 400 }
      );
    }

    authUserId = authData.user.id;

    const { error: insertError } = await supabaseAdmin
      .from("workers")
      .insert({
        worker_id: workerId,
        full_name: fullName,
        phone,
        email,
        auth_user_id: authUserId,
        region,
        voice_earnings: 0,
        total_voice_sales: 0,
      });

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      authUserId = null;

      return NextResponse.json(
        { error: "Could not save worker profile: " + insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Worker registration successful!",
      workerId,
    });
  } catch (error) {
    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
    }

    console.error("Worker registration error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}