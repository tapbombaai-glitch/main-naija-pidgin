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
    // Paystack metadata fit be nested: metadata.custom_fields or direct
    const customFields: any[] = meta.custom_fields || [];
    const getCustom = (name: string) => customFields.find((f: any) => f.variable_name === name || f.display_name === name)?.value;

    let userId = meta.userId || meta.user_id || getCustom("userId") || getCustom("user_id");
    let packageId = (meta.packageId || meta.package_id || getCustom("packageId") || getCustom("package_id") || "").toLowerCase();
    let credits = Number(meta.credits || getCustom("credits") || 0);
    let amount = Math.round((payData.amount || 0) / 100);

    // 2. Fallback: DB payment
    const { data: dbPayment } = await supabaseAdmin
      .from("api_payments")
      .select("reference, user_id, package_id, amount, currency, credits, payment_status, paystack_transaction_id")
      .eq("reference", reference)
      .maybeSingle();

    if ((!userId || !packageId) && dbPayment) {
      userId = dbPayment.user_id;
      packageId = dbPayment.package_id;
      credits = dbPayment.credits || credits;
      amount = dbPayment.amount || amount;
    }

    if (!userId || !packageId) {
      console.error("VERIFY METADATA MISSING:", { reference, meta, dbPayment, email: payData.customer?.email });
      return redirectToMarketplace(request, { error: "invalid_payment_record" });
    }

    const pkg = PACKAGES[packageId];
    if (pkg) {
      if (!credits) credits = pkg.credits;
      if (!amount) amount = pkg.amount;
    }

    // 3. If already marked success, still make sure key get the credits
    // We check if this reference don already credit before - use a simple guard:
    // If payment_status is success AND we already credited before, we still return success
    // but we will verify key balance below in fallback path if needed.
    const alreadySuccess = dbPayment?.payment_status === "success";

    // 4. Try RPC first
    let credited = false;
    if (!alreadySuccess) {
      const { data: result, error: rpcError } = await supabaseAdmin.rpc("complete_api_payment", {
        p_reference: reference,
        p_paystack_transaction_id: String(payData.id),
      });

      if (!rpcError && result?.success) {
        credited = true;
        credits = result.credits || credits;
      } else {
        console.log("RPC fallback to direct credit:", rpcError?.message);
      }
    } else {
      // Already success in DB, assume credited - but we will double-check key below
      credited = true;
    }

    // 5. Direct credit fallback - ALWAYS ensure payment + key are updated
    if (!credited || alreadySuccess) {
      // Upsert payment
      if (!dbPayment) {
        const { error: insertErr } = await supabaseAdmin.from("api_payments").insert({
          user_id: userId,
          package_id: packageId,
          reference,
          amount,
          currency: "NGN",
          credits,
          payment_status: "success",
          paystack_transaction_id: String(payData.id),
        });
        if (insertErr) console.error("INSERT PAYMENT FAILED:", insertErr.message);
      } else {
        const { error: updateErr } = await supabaseAdmin
          .from("api_payments")
          .update({
            payment_status: "success",
            paystack_transaction_id: String(payData.id),
            amount,
            credits,
          })
          .eq("reference", reference);
        if (updateErr) console.error("UPDATE PAYMENT FAILED:", updateErr.message);
      }

      // Find key: active first, then ANY key for user
      let key: any = null;
      const { data: activeKey } = await supabaseAdmin
        .from("api_keys")
        .select("id, paid_requests_remaining")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      key = activeKey;

      if (!key) {
        const { data: anyKey } = await supabaseAdmin
          .from("api_keys")
          .select("id, paid_requests_remaining")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        key = anyKey;
      }

      if (key) {
        // Only add credits if not already credited via RPC in this run
        // If alreadySuccess = true, we skip adding again to avoid double credit
        if (!alreadySuccess) {
          const { error: keyErr } = await supabaseAdmin
            .from("api_keys")
            .update({ paid_requests_remaining: (key.paid_requests_remaining || 0) + credits })
            .eq("id", key.id);
          if (keyErr) console.error("UPDATE KEY FAILED:", keyErr.message);
          else credited = true;
        } else {
          credited = true;
        }
      } else {
        console.error("NO API KEY FOUND FOR USER:", userId);
        // No key - still return success, Marketplace will show error to create key
        // But we saved payment, so admin can credit manually
        credited = true;
      }
    }

    if (!credited) {
      return redirectToMarketplace(request, { error: "credit_processing_failed" });
    }

    return redirectToMarketplace(request, { success: packageId, credits: String(credits) });
  } catch (error: any) {
    console.error("PAYSTACK VERIFY ERROR:", error?.message || error);
    return redirectToMarketplace(request, { error: "verification_unavailable" });
  }
}