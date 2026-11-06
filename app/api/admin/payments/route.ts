import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MINIMUM_PAYOUT = 5000;

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

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return {
        error: NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        ),
      };
    }

    const token = authorization
      .replace("Bearer ", "")
      .trim();

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

    if (
      user.email?.toLowerCase() !==
      CHAIRMAN_EMAIL.toLowerCase()
    ) {
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

    const {
      data: profile,
      error: profileError,
    } = await admin
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
          {
            error:
              "Unable to verify Chairman account",
          },
          { status: 500 }
        ),
      };
    }

    if (
      !profile ||
      profile.is_chairman !== true ||
      profile.email?.toLowerCase() !==
        CHAIRMAN_EMAIL.toLowerCase()
    ) {
      return {
        error: NextResponse.json(
          { error: "Chairman access required" },
          { status: 403 }
        ),
      };
    }

    return {
      admin,
      user,
    };
  } catch (error) {
    console.error(
      "Chairman authentication error:",
      error
    );

    return {
      error: NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      ),
    };
  }
}

/* =========================================================
   GET
   ========================================================= */

export async function GET(request: NextRequest) {
  const chairman = await getChairman(request);

  if ("error" in chairman) {
    return chairman.error;
  }

  const { admin } = chairman;

  try {
    /*
     * REAL worker_profiles SCHEMA
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
        {
          error:
            "Could not load worker profiles",
        },
        { status: 500 }
      );
    }

    /*
     * REAL workers SCHEMA
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
        {
          error:
            "Could not load worker payment accounts",
        },
        { status: 500 }
      );
    }

    /*
     * REAL recordings SCHEMA
     *
     * worker_id = text
     * earnings = numeric
     * is_approved = boolean
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
        {
          error:
            "Could not load approved recordings",
        },
        { status: 500 }
      );
    }

    /*
     * REAL payments SCHEMA
     *
     * There is NO status column.
     *
     * A row in payments represents a recorded
     * manual payment.
     */
    const {
      data: payments,
      error: paymentsError,
    } = await admin
      .from("payments")
      .select(
        "id, worker_id, amount, payment_reference, payment_method, notes, paid_by, paid_at"
      )
      .order("paid_at", {
        ascending: false,
      });

    if (paymentsError) {
      console.error(
        "payments error:",
        paymentsError.message
      );

      return NextResponse.json(
        {
          error:
            "Could not load payment history",
        },
        { status: 500 }
      );
    }

    /*
     * Build worker map.
     */
    const workerMap = new Map<
      string,
      {
        worker_id: string;
        full_name: string;
        email: string;
        state: string;
        city: string;
        bank_name: string;
        account_number: string;
        account_name: string;
      }
    >();

    for (const worker of workerProfiles || []) {
      if (!worker.worker_id) continue;

      workerMap.set(worker.worker_id, {
        worker_id: worker.worker_id,
        full_name: worker.full_name || "",
        email: worker.email || "",
        state: worker.state || "",
        city: worker.city || "",
        bank_name: "",
        account_number: "",
        account_name: "",
      });
    }

    /*
     * Add bank information.
     */
    for (const worker of workers || []) {
      if (!worker.worker_id) continue;

      const existing =
        workerMap.get(worker.worker_id);

      workerMap.set(worker.worker_id, {
        worker_id: worker.worker_id,
        full_name:
          existing?.full_name ||
          worker.full_name ||
          "",
        email: existing?.email || "",
        state: existing?.state || "",
        city: existing?.city || "",
        bank_name:
          worker.bank_name || "",
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
      if (!recording.worker_id) continue;

      if (recording.is_approved !== true) {
        continue;
      }

      const earnings = Number(
        recording.earnings || 0
      );

      if (
        !Number.isFinite(earnings) ||
        earnings <= 0
      ) {
        continue;
      }

      const current =
        approvedByWorker.get(
          recording.worker_id
        ) || 0;

      approvedByWorker.set(
        recording.worker_id,
        current + earnings
      );
    }

    /*
     * Calculate paid amounts.
     *
     * IMPORTANT:
     * payments has no status column.
     * Every payment row counts as a recorded
     * manual payment.
     */
    const paidByWorker =
      new Map<string, number>();

    for (const payment of payments || []) {
      if (!payment.worker_id) continue;

      const amount = Number(
        payment.amount || 0
      );

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        continue;
      }

      const current =
        paidByWorker.get(
          payment.worker_id
        ) || 0;

      paidByWorker.set(
        payment.worker_id,
        current + amount
      );
    }

    /*
     * Include every worker.
     */
    const workerIds = new Set<string>();

    for (const id of workerMap.keys()) {
      workerIds.add(id);
    }

    for (const id of approvedByWorker.keys()) {
      workerIds.add(id);
    }

    for (const id of paidByWorker.keys()) {
      workerIds.add(id);
    }

    const workerResults = Array.from(
      workerIds
    ).map((workerId) => {
      const worker =
        workerMap.get(workerId) || {
          worker_id: workerId,
          full_name: "",
          email: "",
          state: "",
          city: "",
          bank_name: "",
          account_number: "",
          account_name: "",
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
        full_name: worker.full_name,
        email: worker.email,
        state: worker.state,
        city: worker.city,

        bank_name: worker.bank_name,
        account_number:
          worker.account_number,
        account_name:
          worker.account_name,

        approved_earnings: approved,
        paid_amount: paid,
        outstanding_amount: outstanding,

        minimum_payout: MINIMUM_PAYOUT,

        eligible_for_payment:
          outstanding >= MINIMUM_PAYOUT,
      };
    });

    /*
     * Format payment history.
     */
    const paymentHistory =
      (payments || []).map((payment) => ({
        id: payment.id,
        worker_id: payment.worker_id,
        amount: Number(
          payment.amount || 0
        ),
        payment_reference:
          payment.payment_reference || "",
        payment_method:
          payment.payment_method || "",
        notes: payment.notes || "",
        paid_by: payment.paid_by || "",
        paid_at: payment.paid_at || null,
      }));

    /*
     * Totals for Chairman dashboard.
     */
    const totalApproved =
      workerResults.reduce(
        (sum, worker) =>
          sum +
          Number(
            worker.approved_earnings || 0
          ),
        0
      );

    const totalPaid =
      workerResults.reduce(
        (sum, worker) =>
          sum +
          Number(
            worker.paid_amount || 0
          ),
        0
      );

    const totalOutstanding =
      Math.max(
        totalApproved - totalPaid,
        0
      );

    return NextResponse.json({
      success: true,

      workers: workerResults,

      payments: paymentHistory,

      totals: {
        approved_earnings: totalApproved,
        paid_amount: totalPaid,
        outstanding_amount:
          totalOutstanding,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/admin/payments failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Could not load payment information",
      },
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

  const { admin, user } = chairman;

  try {
    const body = await request.json();

    const workerId = String(
      body.worker_id || ""
    ).trim();

    const amount = Number(body.amount);

    const paymentReference = String(
      body.payment_reference || ""
    ).trim();

    const paymentMethod = String(
      body.payment_method ||
        "Bank transfer"
    ).trim();

    const notes = String(
      body.notes || ""
    ).trim();

    if (!workerId) {
      return NextResponse.json(
        {
          error:
            "worker_id is required",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "A valid payment amount is required",
        },
        { status: 400 }
      );
    }

    if (!paymentReference) {
      return NextResponse.json(
        {
          error:
            "Bank transfer reference is required",
        },
        { status: 400 }
      );
    }

    /*
     * Verify worker exists.
     */
    const {
      data: worker,
      error: workerError,
    } = await admin
      .from("workers")
      .select("worker_id")
      .eq("worker_id", workerId)
      .maybeSingle();

    if (workerError) {
      console.error(
        "Worker lookup failed:",
        workerError.message
      );

      return NextResponse.json(
        {
          error:
            "Could not verify worker",
        },
        { status: 500 }
      );
    }

    if (!worker) {
      return NextResponse.json(
        {
          error:
            "Worker account not found",
        },
        { status: 404 }
      );
    }

    /*
     * Approved earnings.
     */
    const {
      data: approvedRecordings,
      error: recordingsError,
    } = await admin
      .from("recordings")
      .select(
        "earnings, is_approved"
      )
      .eq("worker_id", workerId)
      .eq("is_approved", true);

    if (recordingsError) {
      console.error(
        "Approved earnings lookup failed:",
        recordingsError.message
      );

      return NextResponse.json(
        {
          error:
            "Could not verify worker earnings",
        },
        { status: 500 }
      );
    }

    const approvedTotal =
      (approvedRecordings || []).reduce(
        (sum, recording) => {
          if (
            recording.is_approved !== true
          ) {
            return sum;
          }

          const earnings = Number(
            recording.earnings || 0
          );

          if (
            !Number.isFinite(earnings)
          ) {
            return sum;
          }

          return sum + earnings;
        },
        0
      );

    /*
     * Existing payments.
     */
    const {
      data: previousPayments,
      error: previousPaymentsError,
    } = await admin
      .from("payments")
      .select("amount")
      .eq("worker_id", workerId);

    if (previousPaymentsError) {
      console.error(
        "Previous payments lookup failed:",
        previousPaymentsError.message
      );

      return NextResponse.json(
        {
          error:
            "Could not verify previous payments",
        },
        { status: 500 }
      );
    }

    const paidTotal =
      (previousPayments || []).reduce(
        (sum, payment) => {
          const value = Number(
            payment.amount || 0
          );

          if (!Number.isFinite(value)) {
            return sum;
          }

          return sum + value;
        },
        0
      );

    const outstanding = Math.max(
      approvedTotal - paidTotal,
      0
    );

    /*
     * Minimum payout.
     */
    if (
      outstanding <
      MINIMUM_PAYOUT
    ) {
      return NextResponse.json(
        {
          error:
            "Worker is below the ₦5,000 minimum payout.",
          approved_earnings:
            approvedTotal,
          already_paid:
            paidTotal,
          outstanding,
          minimum_payout:
            MINIMUM_PAYOUT,
        },
        { status: 400 }
      );
    }

    /*
     * Never pay more than outstanding.
     */
    if (amount > outstanding) {
      return NextResponse.json(
        {
          error:
            "Payment amount is greater than the worker's outstanding balance.",
          approved_earnings:
            approvedTotal,
          already_paid:
            paidTotal,
          outstanding,
          requested_payment:
            amount,
        },
        { status: 400 }
      );
    }

    /*
     * Check duplicate bank reference.
     */
    const {
      data: duplicate,
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
        "Payment reference check failed:",
        duplicateError.message
      );

      return NextResponse.json(
        {
          error:
            "Could not verify payment reference. Payment was not recorded.",
        },
        { status: 500 }
      );
    }

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "This bank transfer reference has already been recorded.",
        },
        { status: 409 }
      );
    }

    /*
     * Record manual payment.
     *
     * REAL payments schema:
     * worker_id
     * amount
     * payment_reference
     * payment_method
     * notes
     * paid_by
     * paid_at
     */
    const {
      data: payment,
      error: insertError,
    } = await admin
      .from("payments")
      .insert({
        worker_id: workerId,
        amount,
        payment_reference:
          paymentReference,
        payment_method:
          paymentMethod,
        notes,
        paid_by:
          user.email ||
          CHAIRMAN_EMAIL,
        paid_at:
          new Date().toISOString(),
      })
      .select(
        "id, worker_id, amount, payment_reference, payment_method, notes, paid_by, paid_at"
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
            "Payment could not be recorded",
        },
        { status: 500 }
      );
    }

    const remaining =
      Math.max(
        outstanding - amount,
        0
      );

    return NextResponse.json({
      success: true,

      payment,

      approved_earnings:
        approvedTotal,

      previous_paid:
        paidTotal,

      amount_paid:
        amount,

      remaining_outstanding:
        remaining,
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