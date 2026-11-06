import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MINIMUM_PAYOUT = 5000;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

async function getChairman(request: NextRequest) {
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Server Supabase configuration is incomplete: missing URL or keys in Render env.");
  }

  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) {
    return { error: "Authentication required.", status: 401 };
  }

  const auth = createClient(supabaseUrl, anonKey);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error,
  } = await auth.auth.getUser(token);

  if (error || !user) {
    return { error: "Session invalid. Please log in again.", status: 401 };
  }

  if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
    return { error: "Chairman access only.", status: 403 };
  }

  const { data: chairman, error: chairmanError } = await admin
    .from("profiles")
    .select("email, is_chairman")
    .eq("id", user.id)
    .maybeSingle();

  if (chairmanError) {
    throw new Error(`profiles query failed: ${chairmanError.message}`);
  }

  if (
    chairman?.email?.toLowerCase() !== CHAIRMAN_EMAIL ||
    chairman?.is_chairman !== true
  ) {
    return { error: "Your account is not authorised as Chairman.", status: 403 };
  }

  return { admin };
}

async function getPaymentData(admin: any) {
  const [
    { data: recordings, error: recordingsError },
    { data: payments, error: paymentsError },
    { data: profiles, error: profilesError },
    { data: workers, error: workersError },
  ] = await Promise.all([
    admin.from("recordings").select("worker_id, earnings, is_approved"),
    admin
      .from("payments")
      .select("id, worker_id, amount, payment_reference, payment_method, status, paid_at")
      .order("paid_at", { ascending: false }),
    admin
      .from("worker_profiles")
      .select("worker_id, full_name, email, state, city"),
    admin
      .from("workers")
      .select("worker_id, full_name, bank_name, account_number, account_name"),
  ]);

  if (recordingsError) throw new Error(`recordings query failed: ${recordingsError.message}`);
  if (paymentsError) throw new Error(`payments query failed: ${paymentsError.message}`);
  if (profilesError) throw new Error(`worker_profiles query failed: ${profilesError.message}`);
  if (workersError) throw new Error(`workers query failed: ${workersError.message}`);

  const workerMap = new Map<string, any>();

  for (const worker of profiles || []) {
    if (!worker.worker_id) continue;

    workerMap.set(worker.worker_id, {
      worker_id: worker.worker_id,
      name: worker.full_name || worker.worker_id,
      email: worker.email,
      state: worker.state,
      city: worker.city,
      account_name: null,
      bank_name: null,
      account_number: null,
    });
  }

  for (const worker of workers || []) {
    if (!worker.worker_id) continue;
    const existing = workerMap.get(worker.worker_id) || {};
    workerMap.set(worker.worker_id, {
      ...existing,
      worker_id: worker.worker_id,
      name: existing.name || worker.full_name || worker.worker_id,
      account_name: worker.account_name || existing.account_name || worker.full_name || null,
      bank_name: worker.bank_name || existing.bank_name || null,
      account_number: worker.account_number || existing.account_number || null,
    });
  }

  const approvedEarnings = new Map<string, number>();

  for (const recording of recordings || []) {
    if (!recording.worker_id || recording.is_approved !== true) continue;
    const amount = Number(recording.earnings || 0);
    approvedEarnings.set(
      recording.worker_id,
      (approvedEarnings.get(recording.worker_id) || 0) + amount
    );
    if (!workerMap.has(recording.worker_id)) {
      workerMap.set(recording.worker_id, {
        worker_id: recording.worker_id,
        name: recording.worker_id,
        bank_name: null,
        account_number: null,
      });
    }
  }

  const paidAmounts = new Map<string, number>();

  for (const payment of payments || []) {
    if (!payment.worker_id || payment.status !== "paid") continue;
    paidAmounts.set(
      payment.worker_id,
      (paidAmounts.get(payment.worker_id) || 0) + Number(payment.amount || 0)
    );
  }

  const workerPayments = Array.from(workerMap.values()).map((worker) => {
    const approved = approvedEarnings.get(worker.worker_id) || 0;
    const paid = paidAmounts.get(worker.worker_id) || 0;
    const balance = Math.max(0, approved - paid);
    return {
      ...worker,
      approved_earnings: approved,
      amount_paid: paid,
      outstanding: balance,
      eligible: approved >= MINIMUM_PAYOUT && balance > 0,
    };
  });

  return {
    workers: workerPayments,
    payments: payments || [],
    overview: {
      total_earnings: workerPayments.reduce((sum, w) => sum + w.approved_earnings, 0),
      total_paid: workerPayments.reduce((sum, w) => sum + w.amount_paid, 0),
      total_outstanding: workerPayments.reduce((sum, w) => sum + w.outstanding, 0),
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const result = await getChairman(request);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const data = await getPaymentData(result.admin);
    return NextResponse.json(
      { success: true, ...data },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error: any) {
    const message = error?.message || "Could not load payment information.";
    console.error("Chairman payments GET:", message);
    return NextResponse.json(
      { error: "Could not load payment information. Check server logs." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await getChairman(request);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();
    const workerId = String(body.worker_id || "").trim();
    const amount = Number(body.amount);
    const reference = String(body.payment_reference || "").trim();

    if (!workerId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Enter a valid worker and payment amount." },
        { status: 400 }
      );
    }
    if (!reference) {
      return NextResponse.json(
        { error: "Enter the bank transfer reference." },
        { status: 400 }
      );
    }

    const { data: existingPayment, error: duplicateError } = await result.admin
      .from("payments")
      .select("id, worker_id, amount, payment_reference, status, paid_at")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (duplicateError) {
      throw new Error(`payments duplicate check failed: ${duplicateError.message}`);
    }

    if (existingPayment) {
      return NextResponse.json(
        { error: "This transfer reference has already been recorded.", payment: existingPayment },
        { status: 409 }
      );
    }

    const data = await getPaymentData(result.admin);
    const worker = data.workers.find((item: any) => item.worker_id === workerId);

    if (!worker) {
      return NextResponse.json({ error: "Worker not found." }, { status: 404 });
    }
    if (worker.approved_earnings < MINIMUM_PAYOUT) {
      return NextResponse.json(
        { error: "Worker must have at least ₦5,000 in approved earnings." },
        { status: 400 }
      );
    }
    if (amount > worker.outstanding) {
      return NextResponse.json(
        { error: "Payment cannot exceed the outstanding balance." },
        { status: 400 }
      );
    }

    const { data: payment, error: insertError } = await result.admin
      .from("payments")
      .insert({
        worker_id: workerId,
        amount,
        payment_reference: reference,
        payment_method: "Bank transfer",
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      if ((insertError as any).code === "23505") {
        return NextResponse.json(
          { error: "This transfer reference has already been recorded." },
          { status: 409 }
        );
      }
      throw new Error(`payments insert failed: ${insertError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully.",
      payment,
    });
  } catch (error: any) {
    const message = error?.message || "Could not record payment.";
    console.error("Chairman payments POST:", message);
    return NextResponse.json(
      { error: "Could not record payment. Check server logs." },
      { status: 500 }
    );
  }
}