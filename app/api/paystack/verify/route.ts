import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PACKAGES: Record<
  string,
  { name: string; credits: number; amount: number }
> = {
  starter: { name: "Starter", credits: 5000, amount: 1500 },
  basic: { name: "Basic", credits: 10000, amount: 3000 },
  standard: { name: "Standard", credits: 20000, amount: 6000 },
  business: { name: "Business", credits: 50000, amount: 15000 },
  premium: { name: "Premium", credits: 100000, amount: 30000 },
};

function redirectToMarketplace(
  request: NextRequest,
  params: Record<string, string>
) {
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://main-naija-pidgin.onrender.com"
  ).replace(/\/+$/, "");

  const url = new URL("/marketplace", baseUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    return redirectToMarketplace(request, {
      error: "payment_configuration",
    });
  }

  const reference = request.nextUrl.searchParams.get("reference");

  if (!reference) {
    return redirectToMarketplace(request, {
      error: "missing_reference",
    });
  }

  try {
    // STEP 1: Verify the transaction directly with Paystack.
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        reference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const verification: any = await verifyResponse.json();

    if (
      !verifyResponse.ok ||
      !verification.status ||
      verification.data?.status !== "success"
    ) {
      console.error("PAYSTACK VERIFICATION FAILED:", {
        reference,
        message: verification.message,
      });

      return redirectToMarketplace(request, {
        error: "payment_verification_failed",
      });
    }

    const payData = verification.data;

    // STEP 2: Confirm the Paystack reference matches our request.
    if (payData.reference !== reference) {
      console.error("PAYMENT REFERENCE MISMATCH:", reference);

      return redirectToMarketplace(request, {
        error: "reference_mismatch",
      });
    }

    // STEP 3: Find the pending payment created during initialization.
    const {
      data: dbPayment,
      error: paymentLookupError,
    } = await supabaseAdmin
      .from("api_payments")
      .select(`
        id,
        user_id,
        package_id,
        reference,
        amount,
        currency,
        credits,
        payment_status
      `)
      .eq("reference", reference)
      .maybeSingle();

    if (paymentLookupError) {
      console.error(
        "PAYMENT RECORD LOOKUP ERROR:",
        paymentLookupError.message
      );

      return redirectToMarketplace(request, {
        error: "payment_record_lookup_failed",
      });
    }

    // Never credit a transaction without its original payment record.
    if (!dbPayment || !dbPayment.user_id) {
      console.error("PAYMENT RECORD NOT FOUND:", reference);

      return redirectToMarketplace(request, {
        error: "payment_record_not_found",
      });
    }

    // STEP 4: Check the package against our approved package list.
    const packageId = String(dbPayment.package_id || "").toLowerCase();
    const selectedPackage = PACKAGES[packageId];

    if (!selectedPackage) {
      return redirectToMarketplace(request, {
        error: "invalid_package",
      });
    }

    // STEP 5: Confirm the actual Paystack amount and currency.
    const expectedAmountInKobo = Number(dbPayment.amount) * 100;
    const actualAmountInKobo = Number(payData.amount);

    if (
      !Number.isFinite(expectedAmountInKobo) ||
      expectedAmountInKobo <= 0 ||
      actualAmountInKobo !== expectedAmountInKobo ||
      String(payData.currency).toUpperCase() !== "NGN" ||
      String(dbPayment.currency || "NGN").toUpperCase() !== "NGN"
    ) {
      console.error("PAYMENT AMOUNT OR CURRENCY MISMATCH:", {
        reference,
        expectedAmountInKobo,
        actualAmountInKobo,
        paystackCurrency: payData.currency,
        databaseCurrency: dbPayment.currency,
      });

      return redirectToMarketplace(request, {
        error: "payment_amount_mismatch",
      });
    }

    // STEP 6: Confirm the recorded credits match the selected package.
    if (
      Number(dbPayment.credits) !== selectedPackage.credits ||
      Number(dbPayment.amount) !== selectedPackage.amount
    ) {
      console.error("PAYMENT PACKAGE DATA MISMATCH:", {
        reference,
        packageId,
        recordedCredits: dbPayment.credits,
        expectedCredits: selectedPackage.credits,
        recordedAmount: dbPayment.amount,
        expectedAmount: selectedPackage.amount,
      });

      return redirectToMarketplace(request, {
        error: "payment_package_mismatch",
      });
    }

    // STEP 7: If already successful, do not credit again.
    if (dbPayment.payment_status === "successful") {
      return redirectToMarketplace(request, {
        success: packageId,
        credits: String(dbPayment.credits),
      });
    }

    if (dbPayment.payment_status !== "pending") {
      console.error("PAYMENT IS NOT PENDING:", {
        reference,
        status: dbPayment.payment_status,
      });

      return redirectToMarketplace(request, {
        error: "payment_not_pending",
      });
    }

    // STEP 8: Complete payment and credit through the atomic RPC.
    // The RPC locks the payment row and prevents duplicate crediting.
    const {
      data: result,
      error: rpcError,
    } = await supabaseAdmin.rpc("complete_api_payment", {
      p_reference: reference,
      p_paystack_transaction_id: String(payData.id),
    });

    if (rpcError) {
      console.error("COMPLETE API PAYMENT RPC ERROR:", {
        reference,
        message: rpcError.message,
      });

      return redirectToMarketplace(request, {
        error: "credit_processing_failed",
      });
    }

    if (!result?.success) {
      console.error("PAYMENT CREDITING NOT COMPLETED:", {
        reference,
        result,
      });

      return redirectToMarketplace(request, {
        error: "credit_processing_failed",
      });
    }

    // STEP 9: Payment is now successfully completed.
    return redirectToMarketplace(request, {
      success: packageId,
      credits: String(result.credits || dbPayment.credits),
    });
  } catch (error: any) {
    console.error(
      "PAYSTACK VERIFY ERROR:",
      error?.message || error
    );

    return redirectToMarketplace(request, {
      error: "verification_unavailable",
    });
  }
}