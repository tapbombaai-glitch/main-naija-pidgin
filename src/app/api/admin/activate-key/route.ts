import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const PACKAGE_AMOUNTS: Record<string, number> = {
  "1k": 500000,    // ₦5,000
  "2k": 1000000,   // ₦10,000
  "5k": 2500000,   // ₦25,000
  "10k": 5000000,  // ₦50,000
};

export async function POST(request: NextRequest) {
  try {
    // 1. Require an authenticated Supabase session.
    const authorization = request.headers.get("authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      return NextResponse.json(
        { error: "Login required." },
        { status: 401 }
      );
    }

    // 2. Validate the access token with Supabase.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      console.error("Missing Supabase public environment variables.");
      return NextResponse.json(
        { error: "Server authentication is not configured." },
        { status: 500 }
      );
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired login. Please sign in again." },
        { status: 401 }
      );
    }

    // 3. Restrict this action to the chairman account.
    if (user.email?.trim().toLowerCase() !== CHAIRMAN_EMAIL) {
      return NextResponse.json(
        { error: "Forbidden: chairman access only." },
        { status: 403 }
      );
    }

    // 4. Verify the chairman's profile and role.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, is_chairman")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Chairman profile lookup failed:", profileError.message);
      return NextResponse.json(
        { error: "Could not verify chairman permissions." },
        { status: 500 }
      );
    }

    if (
      !profile ||
      profile.email?.trim().toLowerCase() !== CHAIRMAN_EMAIL ||
      profile.is_chairman !== true
    ) {
      return NextResponse.json(
        { error: "Chairman permissions are not enabled for this account." },
        { status: 403 }
      );
    }

    // 5. Validate the requested API key ID.
    const body = await request.json().catch(() => null);
    const id = String(body?.id ?? "").trim();

    if (!id || id.length > 100) {
      return NextResponse.json(
        { error: "A valid API key ID is required." },
        { status: 400 }
      );
    }

    // 6. Find the key and its payment reference.
    const { data: apiKey, error: keyError } = await supabaseAdmin
      .from("api_keys")
      .select("id, is_active, email, payment_ref, package")
      .eq("id", id)
      .maybeSingle();

    if (keyError) {
      console.error("API key lookup failed:", keyError.message);
      return NextResponse.json(
        { error: "Could not retrieve the API key." },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not found." },
        { status: 404 }
      );
    }

    if (apiKey.is_active === true) {
      return NextResponse.json({
        success: true,
        message: "This API key is already active.",
      });
    }

    const paymentReference = String(apiKey.payment_ref ?? "").trim();
    const packageName = String(apiKey.package ?? "").trim();

    if (!paymentReference) {
      return NextResponse.json(
        { error: "This key has no payment reference." },
        { status: 400 }
      );
    }

    const expectedAmount = PACKAGE_AMOUNTS[packageName];

    if (!expectedAmount) {
      return NextResponse.json(
        { error: "Unsupported paid package." },
        { status: 400 }
      );
    }

    // 7. Verify payment directly with Paystack.
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret) {
      console.error("PAYSTACK_SECRET_KEY is missing.");
      return NextResponse.json(
        { error: "Payment verification is not configured." },
        { status: 500 }
      );
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(
        paymentReference
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!paystackResponse.ok) {
      console.error("Paystack verification HTTP status:", paystackResponse.status);
      return NextResponse.json(
        { error: "Paystack could not verify this payment." },
        { status: 502 }
      );
    }

    const paystackResult = await paystackResponse.json();
    const transaction = paystackResult?.data;

    if (
      paystackResult?.status !== true ||
      !transaction ||
      transaction.status !== "success" ||
      transaction.reference !== paymentReference ||
      transaction.currency !== "NGN" ||
      transaction.amount !== expectedAmount
    ) {
      return NextResponse.json(
        { error: "Payment is unsuccessful or does not match this package." },
        { status: 402 }
      );
    }

    // 8. If the API key has an email, match it to the Paystack customer.
    const keyEmail = String(apiKey.email ?? "").trim().toLowerCase();
    const paidEmail = String(
      transaction.customer?.email ?? ""
    ).trim().toLowerCase();

    if (keyEmail && keyEmail !== paidEmail) {
      return NextResponse.json(
        { error: "The payment email does not match the API key email." },
        { status: 402 }
      );
    }

    // 9. Activate only after all checks pass.
    // The is_active=false condition prevents overwriting an already active key.
    const { data: updatedKey, error: updateError } = await supabaseAdmin
      .from("api_keys")
      .update({ is_active: true })
      .eq("id", id)
      .eq("is_active", false)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("API key activation failed:", updateError.message);
      return NextResponse.json(
        { error: "Payment verified, but key activation failed." },
        { status: 500 }
      );
    }

    if (!updatedKey) {
      return NextResponse.json(
        {
          error:
            "The key was changed by another request or is already active. Refresh and check its status.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and API key activated successfully.",
      id: updatedKey.id,
    });
  } catch (error) {
    console.error(
      "API key activation error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}