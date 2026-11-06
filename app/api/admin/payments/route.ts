import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

async function getChairman(request: NextRequest) {
  try {
    const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return {
        error: NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return {
        error: NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ),
      };
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      anonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return {
        error: NextResponse.json(
          { error: "Invalid authentication" },
          { status: 401 }
        ),
      };
    }

    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL.toLowerCase()) {
      return {
        error: NextResponse.json(
          { error: "Chairman access required" },
          { status: 403 }
        ),
      };
    }

    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, email, is_chairman")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Chairman profile lookup failed:",
        profileError.message
      );

      return {
        error: NextResponse.json(
          { error: "Unable to verify Chairman account" },
          { status: 500 }
        ),
      };
    }

    if (
      !profile ||
      profile.is_chairman !== true ||
      profile.email?.toLowerCase() !== CHAIRMAN_EMAIL.toLowerCase()
    ) {
      return {
        error: NextResponse.json(
          { error: "Chairman access required" },
          { status: 403 }
        ),
      };
    }

    return { admin, user };
  } catch (error) {
    console.error("Chairman authentication error:", error);

    return {
      error: NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      ),
    };
  }
}

/* =========================================================
   GET PAYMENTS / WORKER EARNINGS
   ========================================================= */

export async function GET(request: NextRequest) {
  const chairman = await getChairman(request);

  if ("error" in chairman) {
    return chairman.error;
  }

  const { admin } = chairman;

  try {
    /*
     * WORKER PROFILES
     * Confirmed schema:
     * worker_id
     * full_name
     * email
     * state
     * city
     */
    const {
      data: workerProfiles,
      error: workerProfilesError,
    } = await admin
      .from("worker_profiles")
      .select(
        "worker_id, full_name, email, state, city"
      );

    if (workerProfilesError) {
      console.error(
        "worker_profiles error:",
        workerProfilesError.message
      );

      return NextResponse.json(
        { error: "Could not load worker profiles" },
        { status: 500 }
      );
    }

    /*
     * WORKERS
     * Confirmed schema from previous inspection:
     * worker_id
     * full_name
     * bank_name
     * account_number
     * account_name
     */
    const {
      data: workers,
      error: workersError,
    } = await admin
      .from("workers")
      .select(
        "worker_id, full_name, bank_name, account_number, account_name"
      );

    if (workersError) {
      console.error(
        "workers error:",
        workersError.message
      );

      return NextResponse.json(
        { error: "Could not load worker payment details" },
        { status: 500 }
      );
    }

    /*
     * RECORDINGS
     *
     * CONFIRMED REAL SCHEMA:
     * worker_id       text
     * earnings        numeric
     * amount          numeric
     * status          text
     * is_approved     boolean
     * created_at      timestamptz
     *
     * We use ONLY the confirmed fields.
     */
    const {
      data: recordings,
      error: recordingsError,
    } = await admin
      .from("recordings")
      .select(
        "worker_id, earnings, is_approved, status, created_at"
      )
      .eq("is_approved", true);

    if (recordingsError) {
      console.error(
        "recordings error:",
        recordingsError.message
      );

      return NextResponse.json(
        { error: "Could not load approved recordings" },
        { status: 500 }
      );
    }

    /*
     * PAYMENT HISTORY
     */
    const {
      data: payments,
      error: paymentsError,
    } = await admin
      .from("payments")
      .select(
        "id, worker_id, amount, payment_reference, payment_method, status, paid_at"
      )
      .order("paid_at", { ascending: false });

    if (paymentsError) {
      console.error(
        "payments error:",
        paymentsError.message
      );

      return NextResponse.json(
        { error: "Could not load payment history" },
        { status: 500 }
      );
    }

    const workerMap = new Map<string, any>();

    for (const worker of workerProfiles || []) {
      workerMap.set(worker.worker_id, {
        worker_id: worker.worker_id,
        full_name: worker.full_name || "",
        email: worker.email || "",
        state: worker.state || "",
        city: worker.city || "",
      });
    }

    /*
     * Add workers table banking information.
     */
    for (const worker of workers || []) {
      const existing =
        workerMap.get(worker.worker_id) || {
          worker_id: worker.worker_id,
          full_name: worker.full_name || "",
          email: "",
          state: "",
          city: "",
        };

      workerMap.set(worker.worker_id, {
        ...existing,
        full_name:
          existing.full_name ||
          worker.full_name ||
          "",
        bank_name: worker.bank_name || "",
        account_number:
          worker.account_number || "",
        account_name:
          worker.account_name || "",
      });
    }

    /*
     * Calculate approved earnings.
     */
    const approvedByWorker =
      new Map<string, number>();

    for (const recording of recordings || []) {
      if (!recording.worker_id) {
        continue;
      }

      if (recording.is_approved !== true) {
        continue;
      }

      const amount = Number(recording.earnings || 0);

      if (!Number.isFinite(amount) || amount <= 0) {
        continue;
      }

      const current =
        approvedByWorker.get(recording.worker_id) || 0;

      approvedByWorker.set(
        recording.worker_id,
        current + amount
      );
    }

    /*
     * Calculate already-paid amounts.
     */
    const paidByWorker =
      new Map<string, number>();

    for (const payment of payments || []) {
      if (!payment.worker_id) {
        continue;
      }

      const status =
        String(payment.status || "").toLowerCase();

      if (
        status !== "paid" &&
        status !== "completed"
      ) {
        continue;
      }

      const amount = Number(payment.amount || 0);

      if (!Number.isFinite(amount) || amount <= 0) {
        continue;
      }

      const current =
        paidByWorker.get(payment.worker_id) || 0;

      paidByWorker.set(
        payment.worker_id,
        current + amount
      );
    }

    /*
     * Include every worker that appears in:
     * - worker_profiles
     * - workers
     * - recordings
     * - payments
     */
    const allWorkerIds = new Set<string>();

    for (const id of workerMap.keys()) {
      allWorkerIds.add(id);
    }

    for (const id of approvedByWorker.keys()) {
      allWorkerIds.add(id);
    }

    for (const id of paidByWorker.keys()) {
      allWorkerIds.add(id);
    }

    const result = Array.from(allWorkerIds).map(
      (workerId) => {
        const worker = workerMap.get(workerId) || {
          worker_id: workerId,
          full_name: "",
          email: "",
          state: "",
          city: "",
        };

        const approved =
          approvedByWorker.get(workerId) || 0;

        const paid =
          paidByWorker.get(workerId) || 0;

        const outstanding = Math.max(
          approved - paid,
          0
        );

        return {
          worker_id: workerId,
          full_name: worker.full_name || "",
          email: worker.email || "",
          state: worker.state || "",
          city: worker.city || "",
          bank_name: worker.bank_name || "",
          account_number:
            worker.account_number || "",
          account_name:
            worker.account_name || "",

          approved_earnings: approved,
          paid_amount: paid,
          outstanding_amount: outstanding,

          minimum_payout: 5000,
          eligible_for_payment:
            outstanding >= 5000,
        };
      }
    );

    /*
     * Payment history formatted for Chairman UI.
     */
    const paymentHistory =
      (payments || []).map((payment) => ({
        id: payment.id,
        worker_id: payment.worker_id,
        amount: Number(payment.amount || 0),
        payment_reference:
          payment.payment_reference || "",
        payment_method:
          payment.payment_method || "",
        status: payment.status || "",
        paid_at: payment.paid_at || null,
      }));

    return NextResponse.json({
      success: true,
      workers: result,
      payments: paymentHistory,
    });
  } catch (error) {
    console.error(
      "GET /api/admin/payments failed:",
      error
    );

    return NextResponse.json(
      { error: "Could not load payment information" },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST MANUAL PAYMENT
   ========================================================= */

export async function POST(request: NextRequest) {
  const chairman = await getChairman(request);

  if ("error" in chairman) {
    return chairman.error;
  }

  const { admin } = chairman;

  try {
    const body = await request.json();

    const workerId = String(
      body.worker_id || ""
    ).trim();

    const amount = Number(body.amount);

    const paymentReference = String(
      body.payment_reference || ""
    ).trim();

    const paymentMethod =
      String(
        body.payment_method ||
          "Bank transfer"
      ).trim();

    if (!workerId) {
      return NextResponse.json(
        { error: "worker_id is required" },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        { error: "A valid payment amount is required" },
        { status: 400 }
      );
    }

    if (!paymentReference) {
      return NextResponse.json(
        { error: "Payment reference is required" },
        { status: 400 }
      );
    }

    /*
     * Get current approved earnings.
     */
    const {
      data: approvedRecordings,
      error: recordingsError,
    } = await admin
      .from("recordings")
      .select("earnings, is_approved")
      .eq("worker_id", workerId)
      .eq("is_approved", true);

    if (recordingsError) {
      console.error(
        "Payment recordings lookup failed:",
        recordingsError.message
      );

      return NextResponse.json(
        { error: "Could not verify worker earnings" },
        { status: 500 }
      );
    }

    const approvedTotal =
      (approvedRecordings || []).reduce(
        (sum, recording) => {
          if (recording.is_approved !== true) {
            return sum;
          }

          const value = Number(
            recording.earnings || 0
          );

          return Number.isFinite(value)
            ? sum + value
            : sum;
        },
        0
      );

    /*
     * Get existing paid total.
     */
    const {
      data: existingPayments,
      error: paymentsError,
    } = await admin
      .from("payments")
      .select("amount, status")
      .eq("worker_id", workerId);

    if (paymentsError) {
      console.error(
        "Payment history lookup failed:",
        paymentsError.message
      );

      return NextResponse.json(
        { error: "Could not verify previous payments" },
        { status: 500 }
      );
    }

    const paidTotal =
      (existingPayments || []).reduce(
        (sum, payment) => {
          const status =
            String(
              payment.status || ""
            ).toLowerCase();

          if (
            status !== "paid" &&
            status !== "completed"
          ) {
            return sum;
          }

          const value = Number(
            payment.amount || 0
          );

          return Number.isFinite(value)
            ? sum + value
            : sum;
        },
        0
      );

    const outstanding = Math.max(
      approvedTotal - paidTotal,
      0
    );

    /*
     * Never allow payment above outstanding.
     */
    if (amount > outstanding) {
      return NextResponse.json(
        {
          error:
            "Payment amount is greater than the worker's outstanding balance.",
          approved_earnings: approvedTotal,
          already_paid: paidTotal,
          outstanding,
        },
        { status: 400 }
      );
    }

    /*
     * Minimum payout rule.
     */
    if (outstanding < 5000) {
      return NextResponse.json(
        {
          error:
            "Worker is below the ₦5,000 minimum payout.",
          outstanding,
          minimum_payout: 5000,
        },
        { status: 400 }
      );
    }

    /*
     * Do not allow a payment that leaves an invalid
     * negative balance.
     */
    if (amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than zero." },
        { status: 400 }
      );
    }

    /*
     * Duplicate transfer reference check.
     */
    const {
      data: duplicatePayment,
      error: duplicateError,
    } = await admin
      .from("payments")
      .select("id")
      .eq(
        "payment_reference",
        paymentReference
      )
      .maybeSingle();

    if (duplicateError) {
      console.error(
        "Duplicate payment reference check failed:",
        duplicateError.message
      );

      return NextResponse.json(
        {
          error:
            "Could not verify payment reference. Payment was not created.",
        },
        { status: 500 }
      );
    }

    if (duplicatePayment) {
      return NextResponse.json(
        {
          error:
            "This payment reference has already been used.",
        },
        { status: 409 }
      );
    }

    /*
     * Create payment record.
     */
    const {
      data: payment,
      error: insertError,
    } = await admin
      .from("payments")
      .insert({
        worker_id: workerId,
        amount,
        payment_reference: paymentReference,
        payment_method: paymentMethod,
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .select(
        "id, worker_id, amount, payment_reference, payment_method, status, paid_at"
      )
      .single();

    if (insertError) {
      console.error(
        "Payment insert failed:",
        insertError.message
      );

      return NextResponse.json(
        {
          error:
            "Payment could not be recorded.",
        },
        { status: 500 }
      );
    }

    const remaining =
      Math.max(outstanding - amount, 0);

    return NextResponse.json({
      success: true,
      payment,
      approved_earnings: approvedTotal,
      previous_paid: paidTotal,
      amount_paid: amount,
      remaining_outstanding: remaining,
    });
  } catch (error) {
    console.error(
      "POST /api/admin/payments failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not process payment",
      },
      { status: 500 }
    );
  }
}