import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

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
      {
        success: false,
        error: "Server payment configuration is incomplete.",
      },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        success: false,
        error: "Please log in first.",
      },
      { status: 401 }
    );
  }

  try {
    const token = authorization.slice(7);

    // Verify the customer's login token.
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
        {
          success: false,
          error: "Please select a valid package.",
        },
        { status: 400 }
      );
    }

    const customerEmail = user.email.trim().toLowerCase();

    /*
     * Generate our own unique payment reference.
     * This same reference will be used by:
     *
     * 1. api_payments
     * 2. Paystack
     * 3. /api/paystack/verify
     * 4. Chairman API Management
     */
    const reference = `MNP${Date.now()}${randomBytes(12).toString("hex")}`;

    /*
     * SERVER-ONLY Supabase client.
     * The service role key is never sent to the browser.
     */
    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
     * STEP 1:
     * Save the payment BEFORE sending the customer to Paystack.
     *
     * Initial status MUST be "pending".
     */
    const { error: paymentInsertError } = await adminClient
      .from("api_payments")
      .insert({
        user_id: user.id,
        package_id: packageId,
        reference,
        amount: selectedPackage.amount,
        currency: "NGN",
        credits: selectedPackage.credits,
        payment_status: "pending",
      });

    if (paymentInsertError) {
      console.error("API PAYMENT RECORD INSERT ERROR:", {
        message: paymentInsertError.message,
        code: paymentInsertError.code,
        details: paymentInsertError.details,
        reference,
        userId: user.id,
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

    /*
     * STEP 2:
     * Send the exact same reference to Paystack.
     */
    let paystackResponse: Response;

    try {
      paystackResponse = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: customerEmail,
            amount: selectedPackage.amount * 100,
            currency: "NGN",
            reference,
            callback_url: `${baseUrl}/api/paystack/verify?reference=${reference}`,
            metadata: {
              userId: user.id,
              packageId,
              packageName: selectedPackage.name,
              credits: selectedPackage.credits,
              customerEmail,
              brand: "Main Naija Pidgin",
            },
          }),
        }
      );
    } catch (paystackNetworkError) {
      /*
       * We do NOT mark this payment as failed here.
       *
       * A network error does not prove that Paystack did not
       * receive the request.
       *
       * Leaving it as pending is safer than incorrectly marking
       * a potentially valid payment as failed.
       */
      console.error("PAYSTACK NETWORK ERROR:", {
        reference,
        error: paystackNetworkError,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Unable to connect to Paystack. Please try again.",
          reference,
        },
        { status: 502 }
      );
    }

    let paystackData: any;

    try {
      paystackData = await paystackResponse.json();
    } catch (jsonError) {
      console.error("PAYSTACK RESPONSE JSON ERROR:", {
        reference,
        error: jsonError,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Paystack returned an invalid response. Please try again.",
          reference,
        },
        { status: 502 }
      );
    }

    /*
     * STEP 3:
     * If Paystack definitely rejected initialization,
     * mark this pending record as failed.
     */
    if (
      !paystackResponse.ok ||
      !paystackData.status ||
      !paystackData.data?.authorization_url
    ) {
      console.error("PAYSTACK INITIALIZATION ERROR:", {
        message: paystackData.message,
        reference,
        status: paystackResponse.status,
      });

      const { error: failedUpdateError } = await adminClient
        .from("api_payments")
        .update({
          payment_status: "failed",
        })
        .eq("reference", reference)
        .eq("payment_status", "pending");

      if (failedUpdateError) {
        console.error("FAILED PAYMENT STATUS UPDATE ERROR:", {
          message: failedUpdateError.message,
          reference,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            paystackData.message ||
            "Paystack initialization failed.",
          reference,
        },
        { status: 400 }
      );
    }

    /*
     * STEP 4:
     * Payment is still PENDING.
     *
     * It becomes SUCCESSFUL only after Paystack verification
     * in /api/paystack/verify.
     */
    return NextResponse.json({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference,
      package: selectedPackage.name,
      credits: selectedPackage.credits,
      amount: selectedPackage.amount,
      currency: "NGN",
      payment_status: "pending",
    });
  } catch (error) {
    console.error(
      "PAYMENT INITIALIZATION UNEXPECTED ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to initialize payment. Please try again.",
      },
      { status: 500 }
    );
  }
}