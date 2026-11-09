import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "crypto";

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

export async function POST(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY;

  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !paystackSecret) {
    console.error("PAYMENT CONFIGURATION ERROR:", {
      supabaseUrl: !!supabaseUrl,
      anonKey: !!anonKey,
      serviceRoleKey: !!serviceRoleKey,
      paystackSecret: !!paystackSecret,
    });

    return NextResponse.json(
      { success: false, error: "Server payment configuration is incomplete." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, error: "Please log in first." },
      { status: 401 }
    );
  }

  try {
    const token = authorization.slice(7);

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } =
      await authClient.auth.getUser(token);

    const user = authData.user;

    if (authError || !user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Your session has expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const packageId =
      typeof body.packageId === "string"
        ? body.packageId.trim().toLowerCase()
        : "";

    const selectedPackage = PACKAGES[packageId];

    if (!selectedPackage) {
      return NextResponse.json(
        { success: false, error: "Please select a valid package." },
        { status: 400 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Confirm that this authenticated customer owns an active API key.
    const { data: activeKey, error: keyError } = await admin
      .from("api_keys")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (keyError) {
      console.error("ACTIVE API KEY CHECK ERROR:", {
        message: keyError.message,
        code: keyError.code,
        details: keyError.details,
        hint: keyError.hint,
      });

      return NextResponse.json(
        { success: false, error: "Could not verify your API key." },
        { status: 500 }
      );
    }

    if (!activeKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Please claim your free API key before purchasing credits.",
        },
        { status: 409 }
      );
    }

    // Generate a unique payment reference and explicit UUID.
    const paymentId = randomUUID();
    const reference = `MNP${Date.now()}${randomBytes(12).toString("hex")}`;

    // Save the pending payment before contacting Paystack.
    const { data: payment, error: paymentError } = await admin
      .from("api_payments")
      .insert({
        id: paymentId,
        user_id: user.id,
        package_id: packageId,
        reference,
        amount: selectedPackage.amount,
        currency: "NGN",
        credits: selectedPackage.credits,
        payment_status: "pending",
      })
      .select("id, reference")
      .single();

    if (paymentError || !payment) {
      console.error("PAYMENT RECORD ERROR:", {
        message: paymentError?.message,
        code: paymentError?.code,
        details: paymentError?.details,
        hint: paymentError?.hint,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Could not save your payment record. Please try again.",
        },
        { status: 500 }
      );
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_URL ||
      "https://main-naija-pidgin.onrender.com"
    ).replace(/\/+$/, "");

    // Paystack expects the amount in kobo.
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email.trim().toLowerCase(),
          amount: selectedPackage.amount * 100,
          currency: "NGN",
          reference,
          callback_url: `${baseUrl}/api/paystack/verify`,
          metadata: {
            userId: user.id,
            packageId,
            packageName: selectedPackage.name,
            credits: selectedPackage.credits,
            customerEmail: user.email,
            brand: "Main Naija Pidgin",
          },
        }),
      }
    );

    const paystackData = await paystackResponse.json();

    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      !paystackData.data?.authorization_url
    ) {
      console.error("PAYSTACK INITIALIZATION ERROR:", {
        message: paystackData.message,
        reference,
      });

      await admin
        .from("api_payments")
        .update({ payment_status: "failed" })
        .eq("id", payment.id);

      return NextResponse.json(
        {
          success: false,
          error: paystackData.message || "Paystack initialization failed.",
        },
        { status: 400 }
      );
    }

    if (paystackData.data.reference !== reference) {
      console.error("PAYSTACK REFERENCE MISMATCH:", reference);

      return NextResponse.json(
        {
          success: false,
          error: "Payment reference verification failed.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference,
      package: selectedPackage.name,
      credits: selectedPackage.credits,
      amount: selectedPackage.amount,
      currency: "NGN",
    });
  } catch (error) {
    console.error("PAYMENT INITIALIZATION UNEXPECTED ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to initialize payment. Please try again.",
      },
      { status: 500 }
    );
  }
}