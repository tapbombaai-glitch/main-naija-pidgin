import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

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
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://main-naija-pidgin.onrender.com").replace(/\/+$/, "");
  const url = new URL("/marketplace", baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

function generateApiKey() {
  return `np_${crypto.randomBytes(24).toString("hex")}`;
}

export async function GET(request: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return redirectToMarketplace(request, { error: "payment_configuration" });

  const reference = request.nextUrl.searchParams.get("reference");
  if (!reference) return redirectToMarketplace(request, { error: "missing_reference" });

  try {
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { method: "GET", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, cache: "no-store" }
    );
    const verification: any = await verifyResponse.json();
    if (!verifyResponse.ok || !verification.status || verification.data?.status !== "success") {
      return redirectToMarketplace(request, { error: "payment_verification_failed" });
    }

    const payData = verification.data;
    const meta = payData?.metadata || {};
    const customFields: any[] = meta.custom_fields || [];
    const getCustom = (name: string) => customFields.find((f: any) => f.variable_name === name || f.display_name === name)?.value;

    let userId = meta.userId || meta.user_id || getCustom("userId") || getCustom("user_id");
    let packageId = (meta.packageId || meta.package_id || getCustom("packageId") || getCustom("package_id") || "").toLowerCase();
    let credits = Number(meta.credits || getCustom("credits") || 0);
    let amount = Math.round((payData.amount || 0) / 100);

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
      return redirectToMarketplace(request, { error: "invalid_payment_record" });
    }

    const pkg = PACKAGES[packageId];
    if (pkg) {
      if (!credits) credits = pkg.credits;
      if (!amount) amount = pkg.amount;
    }

    const alreadySuccess = dbPayment?.payment_status === "success";
    let credited = false;

    if (!alreadySuccess) {
      const { data: result, error: rpcError } = await supabaseAdmin.rpc("complete_api_payment", {
        p_reference: reference,
        p_paystack_transaction_id: String(payData.id),
      });
      if (!rpcError && result?.success) {
        credited = true;
        credits = result.credits || credits;
      }
    } else {
      credited = true;
    }

    // --- SAVE PAYMENT + AUTO-CREATE KEY IF NO KEY ---
    if (!credited || alreadySuccess) {
      if (!dbPayment) {
        await supabaseAdmin.from("api_payments").insert({
          user_id: userId, package_id: packageId, reference, amount, currency: "NGN", credits,
          payment_status: "success", paystack_transaction_id: String(payData.id),
        });
      } else {
        await supabaseAdmin.from("api_payments").update({
          payment_status: "success", paystack_transaction_id: String(payData.id), amount, credits,
        }).eq("reference", reference);
      }

      // Find key
      let key: any = null;
      const { data: activeKey } = await supabaseAdmin.from("api_keys")
        .select("id, paid_requests_remaining")
        .eq("user_id", userId).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      key = activeKey;

      if (!key) {
        const { data: anyKey } = await supabaseAdmin.from("api_keys")
          .select("id, paid_requests_remaining")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        key = anyKey;
      }

      if (key) {
        if (!alreadySuccess) {
          await supabaseAdmin.from("api_keys")
            .update({ paid_requests_remaining: (key.paid_requests_remaining || 0) + credits })
            .eq("id", key.id);
        }
        credited = true;
      } else {
        // *** NEW: NO KEY? CREATE ONE AUTOMATICALLY ***
        const newKey = generateApiKey();
        const { error: createErr } = await supabaseAdmin.from("api_keys").insert({
          user_id: userId,
          key: newKey,
          name: `${pkg?.name || packageId} Key`,
          is_active: true,
          paid_requests_remaining: credits,
          free_requests_remaining: 0,
        });
        if (createErr) {
          console.error("AUTO CREATE KEY FAILED:", createErr.message);
          // Try with api_key column name if your table uses api_key instead of key
          const { error: retryErr } = await supabaseAdmin.from("api_keys").insert({
            user_id: userId,
            api_key: newKey,
            name: `${pkg?.name || packageId} Key`,
            is_active: true,
            paid_requests_remaining: credits,
          });
          if (retryErr) console.error("AUTO CREATE KEY RETRY FAILED:", retryErr.message);
          else credited = true;
        } else {
          credited = true;
        }
      }
    }

    if (!credited) return redirectToMarketplace(request, { error: "credit_processing_failed" });
    return redirectToMarketplace(request, { success: packageId, credits: String(credits) });
  } catch (error: any) {
    console.error("PAYSTACK VERIFY ERROR:", error?.message || error);
    return redirectToMarketplace(request, { error: "verification_unavailable" });
  }
}