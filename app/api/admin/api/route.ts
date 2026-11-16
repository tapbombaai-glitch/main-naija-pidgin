import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Chairman authentication required.",
        },
        { status: 401 }
      );
    }

    const token = authorization.slice(7);

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL;

    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase configuration missing.",
        },
        { status: 500 }
      );
    }

    // Verify the Chairman's Supabase session.
    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (
      authError ||
      !user ||
      user.email?.trim().toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Chairman access only.",
        },
        { status: 403 }
      );
    }

    // Verify Chairman flag in profiles.
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("email, is_chairman")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "CHAIRMAN PROFILE ERROR:",
        profileError.message
      );

      return NextResponse.json(
        {
          success: false,
          error: "Could not verify Chairman profile.",
        },
        { status: 500 }
      );
    }

    if (
      !profile ||
      profile.is_chairman !== true ||
      profile.email?.trim().toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Chairman access only.",
        },
        { status: 403 }
      );
    }

    // IMPORTANT:
    // Never send the full API key or key_hash to the browser.
    const { data: apiKeys, error: keysError } =
      await supabaseAdmin
        .from("api_keys")
        .select(
          `
          id,
          user_id,
          email,
          name,
          business_name,
          key_prefix,
          credits,
          credits_remaining,
          credits_total,
          credits_used,
          total_credits,
          remaining_credits,
          used_credits,
          free_requests_remaining,
          paid_requests_remaining,
          plan,
          tier,
          type,
          status,
          amount_paid,
          paystack_ref,
          payment_ref,
          payment_status,
          is_active,
          is_approved,
          is_free,
          has_claimed_free,
          created_at
        `
        )
        .order("created_at", {
          ascending: false,
        });

    if (keysError) {
      console.error(
        "API KEYS LOOKUP ERROR:",
        keysError.message
      );

      return NextResponse.json(
        {
          success: false,
          error: "Could not load API customers.",
        },
        { status: 500 }
      );
    }

    const customers = (apiKeys || []).map((key) => ({
      id: key.id,
      user_id: key.user_id,
      email: key.email,
      name: key.name,
      business_name: key.business_name,
      key_prefix: key.key_prefix,

      // Current billing values used by atomic_credit_deduct.
      credits_remaining:
        key.credits_remaining ?? 0,
      credits_used:
        key.credits_used ?? 0,
      credits_total:
        key.credits_total ?? 0,

      // Existing free/paid balances.
      free_requests_remaining:
        key.free_requests_remaining ?? 0,
      paid_requests_remaining:
        key.paid_requests_remaining ?? 0,

      plan: key.plan,
      tier: key.tier,
      type: key.type,

      status: key.status,
      is_active: key.is_active === true,
      is_approved: key.is_approved === true,
      is_free: key.is_free === true,
      has_claimed_free:
        key.has_claimed_free === true,

      amount_paid: key.amount_paid ?? 0,
      paystack_ref: key.paystack_ref,
      payment_ref: key.payment_ref,
      payment_status: key.payment_status,

      created_at: key.created_at,
    }));

    const totalKeys = customers.length;

    const activeKeys = customers.filter(
      (customer) =>
        customer.is_active &&
        (!customer.status ||
          customer.status === "active")
    ).length;

    const inactiveKeys =
      totalKeys - activeKeys;

    const totalRemainingCredits =
      customers.reduce(
        (sum, customer) =>
          sum + customer.credits_remaining,
        0
      );

    const totalUsedCredits =
      customers.reduce(
        (sum, customer) =>
          sum + customer.credits_used,
        0
      );

    const freeCustomers =
      customers.filter(
        (customer) => customer.is_free
      ).length;

    const paidCustomers =
      customers.filter(
        (customer) => !customer.is_free
      ).length;

    return NextResponse.json({
      success: true,

      summary: {
        total_keys: totalKeys,
        active_keys: activeKeys,
        inactive_keys: inactiveKeys,
        free_customers: freeCustomers,
        paid_customers: paidCustomers,
        total_remaining_credits:
          totalRemainingCredits,
        total_used_credits:
          totalUsedCredits,
      },

      customers,
    });
  } catch (error) {
    console.error(
      "CHAIRMAN API MANAGEMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load API Management.",
      },
      { status: 500 }
    );
  }
}