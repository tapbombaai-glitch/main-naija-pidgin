import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaystackEvent = {
  event?: string;
  data?: {
    id?: number | string;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
  };
};

type PaystackVerification = {
  status?: boolean;
  message?: string;
  data?: {
    id?: number | string;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
  };
};

export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    console.error("PAYSTACK_SECRET_KEY is missing.");

    return NextResponse.json(
      { success: false, error: "Payment configuration is missing." },
      { status: 500 }
    );
  }

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not read webhook body." },
      { status: 400 }
    );
  }

  const signature = request.headers.get("x-paystack-signature") || "";

  const expectedSignature = createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  if (!/^[a-fA-F0-9]{128}$/.test(signature)) {
    return NextResponse.json(
      { success: false, error: "Invalid signature." },
      { status: 401 }
    );
  }

  const receivedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (!timingSafeEqual(receivedBuffer, expectedBuffer)) {
    return NextResponse.json(
      { success: false, error: "Invalid signature." },
      { status: 401 }
    );
  }

  let event: PaystackEvent;

  try {
    event = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid webhook payload." },
      { status: 400 }
    );
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const reference = event.data?.reference;

  if (
    !reference ||
    event.data?.status !== "success" ||
    typeof event.data.amount !== "number" ||
    !event.data.currency
  ) {
    return NextResponse.json(
      { success: false, error: "Incomplete payment information." },
      { status: 400 }
    );
  }

  try {
    // Find the payment order saved by our initialization route.
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("api_payments")
      .select(
        "reference, user_id, package_id, amount, currency, credits, payment_status"
      )
      .eq("reference", reference)
      .maybeSingle();

    if (paymentError) {
      console.error("PAYMENT LOOKUP ERROR:", paymentError.message);

      return NextResponse.json(
        { success: false, error: "Could not check payment record." },
        { status: 500 }
      );
    }

    if (!payment) {
      console.error("PAYMENT RECORD NOT FOUND:", reference);

      return NextResponse.json(
        { success: false, error: "Payment record not found." },
        { status: 404 }
      );
    }

    // Our database stores the amount in Naira.
    // Paystack sends the amount in kobo.
    if (
      event.data.amount !== payment.amount * 100 ||
      event.data.currency !== payment.currency ||
      payment.currency !== "NGN"
    ) {
      console.error("PAYMENT AMOUNT/CURRENCY MISMATCH:", reference);

      return NextResponse.json(
        { success: false, error: "Payment amount or currency mismatch." },
        { status: 400 }
      );
    }

    // Independently verify the transaction directly with Paystack.
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const verification =
      (await verifyResponse.json()) as PaystackVerification;

    if (
      !verifyResponse.ok ||
      !verification.status ||
      verification.data?.status !== "success" ||
      verification.data?.reference !== reference ||
      verification.data?.amount !== payment.amount * 100 ||
      verification.data?.currency !== payment.currency ||
      verification.data?.id === undefined
    ) {
      console.error("PAYSTACK VERIFICATION FAILED:", reference);

      return NextResponse.json(
        { success: false, error: "Paystack could not confirm this payment." },
        { status: 400 }
      );
    }

    // Add credits and mark payment successful atomically.
    // The database function prevents duplicate crediting.
    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      "complete_api_payment",
      {
        p_reference: reference,
        p_paystack_transaction_id: String(verification.data.id),
      }
    );

    if (rpcError) {
      console.error("PAYMENT COMPLETION ERROR:", rpcError.message);

      return NextResponse.json(
        { success: false, error: "Could not complete payment processing." },
        { status: 500 }
      );
    }

    if (!result?.success) {
      console.error("PAYMENT RPC FAILED:", result);

      return NextResponse.json(
        {
          success: false,
          error: result?.error || "Payment processing failed.",
        },
        { status: 500 }
      );
    }

    console.log("PAYMENT PROCESSED:", {
      reference,
      userId: payment.user_id,
      credits: result.credits,
      alreadyProcessed: result.already_processed,
    });

    return NextResponse.json({
      success: true,
      credits: result.credits,
      already_processed: Boolean(result.already_processed),
    });
  } catch (error) {
    console.error("PAYSTACK WEBHOOK ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}