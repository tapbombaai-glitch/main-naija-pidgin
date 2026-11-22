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

async function authenticateWorker(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      error: "Please log in again.",
      status: 401,
    };
  }

  const token = authorization.slice(7).trim();

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: "Your login session is invalid.",
      status: 401,
    };
  }

  if (user.email?.toLowerCase() === "tapbomba.ai@gmail.com") {
    return {
      user: null,
      error: "Chairman cannot use worker bank settings.",
      status: 403,
    };
  }

  return {
    user,
    error: null,
    status: 200,
  };
}

// LOAD SAVED BANK DETAILS
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateWorker(request);

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { data: worker, error } = await supabaseAdmin
      .from("workers")
      .select(
        "worker_id, account_name, bank_name, account_number, phone"
      )
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();

    if (error || !worker) {
      console.error("Bank details load error:", error);

      return NextResponse.json(
        { error: "Worker bank details could not be found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        worker_id: worker.worker_id,
        accountName: worker.account_name || "",
        bankName: worker.bank_name || "",
        accountNumber: worker.account_number || "",
        phoneNumber: worker.phone || "",
        saved: Boolean(
          worker.account_name &&
          worker.bank_name &&
          worker.account_number &&
          worker.phone
        ),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Worker bank details load error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// SAVE BANK DETAILS
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateWorker(request);

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();

    // Accept both camelCase and snake_case from the dashboard.
    const accountName = String(
      body.accountName ?? body.account_name ?? ""
    ).trim();

    const bankName = String(
      body.bankName ?? body.bank_name ?? ""
    ).trim();

    const accountNumber = String(
      body.accountNumber ?? body.account_number ?? ""
    ).trim();

    const phoneNumber = String(
      body.phoneNumber ?? body.phone ?? ""
    ).trim();

    if (!accountName || !bankName || !accountNumber || !phoneNumber) {
      return NextResponse.json(
        {
          error:
            "Please provide all bank details and your phone number.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        {
          error: "Account number must contain exactly 10 digits.",
        },
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
          phone: phoneNumber,
        })
        .eq("auth_user_id", auth.user.id)
        .select("worker_id")
        .maybeSingle();

    if (workerError || !worker) {
      console.error("Bank details save error:", workerError);

      return NextResponse.json(
        {
          error:
            "Could not save bank details to your worker account.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bank details saved successfully.",
      worker_id: worker.worker_id,
      saved: true,
    });
  } catch (error) {
    console.error("Worker bank details error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}