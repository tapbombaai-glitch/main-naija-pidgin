import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PACKAGES: Record<string, { name: string; credits: number; amount: number }> = {
  starter: { name: "Starter", credits: 5000, amount: 1500 },
  basic: { name: "Basic", credits: 10000, amount: 3000 },
  standard: { name: "Standard", credits: 20000, amount: 6000 },
  business: { name: "Business", credits: 50000, amount: 15000 },
  premium: { name: "Premium", credits: 100000, amount: 30000 },
};

function redirectToMarketplace(request: NextRequest, params: Record<string, string>) {
  // Force live domain, never localhost — this fixes the localhost:10000 wahala
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://gin.onrender.com").replace(/\/+$/, "");
  const url = new URL("/marketplace", baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return redirectToMarketplace(request, { error: "payment_configuration" });
  }

  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference) {
    return redirectToMarketplace(request, { error: "missing_reference" });
  }

  try {
    // 1. Verify with Paystack FIRST — Paystack is the truth
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        cache: "no-store",
      }
    );
    const verification: any = await verifyResponse.json();

    if (!verifyResponse.ok || !verification.status || verification.data?.status !== "success") {
      console.error("PAYSTACK VERIFICATION FAILED:", verification.message);
      return redirectToMarketplace(request, { error: "payment_verification_failed" });
    }

    const payData = verification.data;
    const meta = payData?.metadata || {};

    // 2. Get user + package from Paystack metadata (NEW pattern)
    // Fallback: try DB if metadata missing (OLD pattern)
    let userId = meta.userId;
    let packageId = (meta.packageId || "").toLowerCase();
    let credits = Number(meta.credits || 0);
    let amount = Math.round((payData.amount || 0) / 100);

    let existingPayment = null;
    const { data: dbPayment } = await supabaseAdmin
      .from("api_payments")
      .select("reference, user_id, package_id, amount, currency, credits, payment_status")
      .eq("reference", reference)
      .maybeSingle();

    if (dbPayment) existingPayment = dbPayment;

    if ((!userId || !packageId) && existingPayment) {
      userId = existingPayment.user_id;
      packageId = existingPayment.package_id;
      credits = existingPayment.credits;
      amount = existingPayment.amount;
    }

    if (!userId || !packageId) {
      console.error("VERIFY METADATA MISSING:", meta);
      return redirectToMarketplace(request, { error: "invalid_payment_record" });
    }

    const pkg = PACKAGES[packageId];
    if (pkg) {
      if (!credits) credits = pkg.credits;
      if (!amount) amount = pkg.amount;
    }

    // 3. If already credited, no double credit
    if (existingPayment?.payment_status === "success") {
      return redirectToMarketplace(request, { success: packageId, credits: String(credits) });
    }

    // 4. Try RPC first (your old function), if e fail, do direct credit (fallback)
    let credited = false;
    const { data: result, error: rpcError } = await supabaseAdmin.rpc("complete_api_payment", {
      p_reference: reference,
      p_paystack_transaction_id: String(payData.id),
    });

    if (!rpcError && result?.success) {
      credited = true;
      credits = result.credits || credits;
    } else {
      console.log("RPC fallback to direct credit:", rpcError?.message);
      // Direct: save payment if no record
      if (!existingPayment) {
        await supabaseAdmin.from("api_payments").insert({
          user_id: userId,
          package_id: packageId,
          reference,
          amount,
          currency: "NGN",
          credits,
          payment_status: "success",
        });
      } else {
        await supabaseAdmin.from("api_payments").update({ payment_status: "success" }).eq("reference", reference);
      }

      // Direct: add credits to active key
      const { data: key } = await supabaseAdmin
        .from("api_keys")
        .select("id, paid_requests_remaining")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (key) {
        await supabaseAdmin
          .from("api_keys")
          .update({ paid_requests_remaining: (key.paid_requests_remaining || 0) + credits })
          .eq("id", key.id);
        credited = true;
      }
    }

    if (!credited) {
      return redirectToMarketplace(request, { error: "credit_processing_failed" });
    }

    return redirectToMarketplace(request, { success: packageId, credits: String(credits) });
  } catch (error) {
    console.error("PAYSTACK VERIFY ERROR:", error);
    return redirectToMarketplace(request, { error: "verification_unavailable" });
  }
}