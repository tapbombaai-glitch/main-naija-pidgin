import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Please log in again." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your login session is invalid." },
        { status: 401 }
      );
    }

    if (user.email?.toLowerCase() === "tapbomba.ai@gmail.com") {
      return NextResponse.json(
        { error: "Chairman cannot use worker bank settings." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const accountName = String(body.accountName || "").trim();
    const bankName = String(body.bankName || "").trim();
    const accountNumber = String(body.accountNumber || "").trim();

    if (!accountName || !bankName || !accountNumber) {
      return NextResponse.json(
        { error: "Please provide all bank details." },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must contain exactly 10 digits." },
        { status: 400 }
      );
    }

    const { data: worker, error: workerError } =
      await supabaseAdmin
        .from("workers")
        .update({
          account_name: accountName,
          bank_name: bankName,
          account_number: accountNumber,
        })
        .eq("auth_user_id", user.id)
        .select("worker_id")
        .maybeSingle();

    if (workerError || !worker) {
      console.error("Bank details save error:", workerError);

      return NextResponse.json(
        { error: "Could not save bank details to your worker account." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bank details saved successfully.",
      worker_id: worker.worker_id,
    });

  } catch (error) {
    console.error("Worker bank details error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}