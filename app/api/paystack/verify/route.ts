import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function redirectToMarketplace(
request: NextRequest,
params: Record<string, string>
) {
const url = new URL("/marketplace", request.url);

for (const [key, value] of Object.entries(params)) {
url.searchParams.set(key, value);
}

return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
const secret = process.env.PAYSTACK_SECRET_KEY;

if (!secret) {
console.error("PAYSTACK_SECRET_KEY is missing.");

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
// Retrieve the original order created before Paystack checkout.
const { data: payment, error: paymentError } = await supabaseAdmin
.from("api_payments")
.select(
"reference, user_id, package_id, amount, currency, credits, payment_status"
)
.eq("reference", reference)
.maybeSingle();

if (paymentError) {
  console.error("PAYMENT LOOKUP ERROR:", paymentError.message);

  return redirectToMarketplace(request, {
    error: "payment_lookup_failed",
  });
}

if (!payment) {
  return redirectToMarketplace(request, {
    error: "payment_not_found",
  });
}

if (
  !payment.user_id ||
  !payment.credits ||
  payment.credits <= 0 ||
  payment.amount <= 0 ||
  payment.currency !== "NGN"
) {
  return redirectToMarketplace(request, {
    error: "invalid_payment_record",
  });
}

// Verify the transaction directly with Paystack.
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
  console.error("PAYSTACK VERIFICATION FAILED:", {
    reference,
    message: verification.message,
  });

  return redirectToMarketplace(request, {
    error: "payment_verification_failed",
  });
}

// Use the same atomic function as the webhook.
// It adds credits once and marks the payment successful.
const { data: result, error: rpcError } = await supabaseAdmin.rpc(
  "complete_api_payment",
  {
    p_reference: reference,
    p_paystack_transaction_id: String(verification.data.id),
  }
);

if (rpcError) {
  console.error("PAYMENT COMPLETION ERROR:", rpcError.message);

  return redirectToMarketplace(request, {
    error: "credit_processing_failed",
  });
}

if (!result?.success) {
  console.error("PAYMENT RPC FAILED:", result);

  return redirectToMarketplace(request, {
    error: result?.error || "payment_processing_failed",
  });
}

console.log("PAYMENT VERIFIED:", {
  reference,
  packageId: payment.package_id,
  credits: result.credits,
  alreadyProcessed: result.already_processed,
});

return redirectToMarketplace(request, {
  success: payment.package_id,
  credits: String(result.credits),
});

} catch (error) {
console.error("PAYSTACK VERIFY ERROR:", error);

return redirectToMarketplace(request, {
  error: "verification_unavailable",
});

}
}