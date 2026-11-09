import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Approved Main Naija Pidgin packages.
// Prices are in Naira.
const PACKAGES: Record<
  string,
  { name: string; credits: number; amount: number }
> = {
  starter: {
    name: "Starter",
    credits: 5000,
    amount: 1500,
  },
  basic: {
    name: "Basic",
    credits: 10000,
    amount: 3000,
  },
  standard: {
    name: "Standard",
    credits: 20000,
    amount: 6000,
  },
  business: {
    name: "Business",
    credits: 50000,
    amount: 15000,
  },
  premium: {
    name: "Premium",
    credits: 100000,
    amount: 30000,
  },
};

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !paystackSecret) {
    return NextResponse.json(
      {
        success: false,
        error: "Server configuration is missing.",
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

    // Authenticate the customer using Supabase.
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authData, error: authError } =
      await authClient.auth.getUser(token);

    const user = authData.user;

    if (authError || !user || !user.email) {
      return NextResponse.json(
        {
          success: false,
          error: "Your session is invalid or expired. Please log in again.",
        },
        { status: 401 }
      );
    }

    const userId = user.id;
    const email = user.email.trim().toLowerCase();

    // Read only the package ID from the browser.
    const body = await request.json();
    const packageId =
      typeof body.packageId === "string"
        ? body.packageId.toLowerCase()
        : "";

    const selectedPackage = PACKAGES[packageId];

    if (!selectedPackage) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid package. Please select an approved paid package.",
        },
        { status: 400 }
      );
    }

    // Use the server-side service-role client.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // A customer must have an active API key before purchasing credits.
    const { data: activeKey, error: keyError } = await admin
      .from("api_keys")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (keyError) {
      console.error("ACTIVE API KEY CHECK:", keyError.message);

      return NextResponse.json(
        {
          success: false,
          error: "Could not check your API key.",
        },
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

    // Generate our own reference.
    // Save the pending payment BEFORE contacting Paystack.
    const reference = randomUUID();

    const { error: paymentError } = await admin
      .from("api_payments")
      .insert({
        user_id: userId,
        package_id: packageId,
        reference,
        amount: selectedPackage.amount,
        currency: "NGN",
        credits: selectedPackage.credits,
        payment_status: "pending",
      });

    if (paymentError) {
      console.error("PAYMENT RECORD ERROR:", paymentError.message);

      return NextResponse.json(
        {
          success: false,
          error: "Could not create your payment record. Please try again.",
        },
        { status: 500 }
      );
    }

    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_URL ||
      "https://main-naija-pidgin.onrender.com"
    ).replace(/\/+$/, "");

    // Initialize Paystack using server-verified customer details.
    const paystackResponse = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: selectedPackage.amount * 100,
          currency: "NGN",
          reference,
          callback_url: `${baseUrl}/api/paystack/verify`,
          metadata: {
            userId,
            packageId,
            packageName: selectedPackage.name,
            credits: selectedPackage.credits,
            customerEmail: email,
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
      console.error(
        "PAYSTACK INITIALIZATION ERROR:",
        paystackData.message
      );

      await admin
        .from("api_payments")
        .update({ payment_status: "failed" })
        .eq("reference", reference);

      return NextResponse.json(
        {
          success: false,
          error: paystackData.message || "Paystack initialization failed.",
        },
        { status: 400 }
      );
    }

    // Confirm Paystack returned the reference we saved.
    if (paystackData.data.reference !== reference) {
      console.error("PAYSTACK REFERENCE MISMATCH:", {
        expected: reference,
        received: paystackData.data.reference,
      });

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
    console.error("PAYSTACK INITIALIZATION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to initialize payment. Please try again.",
      },
      { status: 500 }
    );
  }
}