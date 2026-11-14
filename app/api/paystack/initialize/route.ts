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
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } =
      await authClient.auth.getUser(token);

    const user = authData.user;

    if (authError || !user?.email) {
      return NextResponse.json(
        { success: false, error: "Your session has expired. Please log in again." },
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

    // OLD WORKING PATTERN: No save to Supabase before Paystack.
    // We only generate reference here. Saving + crediting happens in /api/paystack/verify AFTER Paystack confirms payment.
    // This is why old Marketplace worked and new one showed "Could not save your payment record".
    const paymentId = randomUUID();
    const reference = `MNP${Date.now()}${randomBytes(12).toString("hex")}`;

    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_URL ||
      "https://main-naija-pidgin.onrender.com"
    ).replace(/\/+$/, "");

    // Paystack expects amount in kobo.
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
          callback_url: `${baseUrl}/api/paystack/verify?reference=${reference}`,
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

      return NextResponse.json(
        {
          success: false,
          error: paystackData.message || "Paystack initialization failed.",
        },
        { status: 400 }
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
      { success: false, error: "Unable to initialize payment. Please try again." },
      { status: 500 }
    );
  }
}