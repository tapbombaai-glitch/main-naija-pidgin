import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FREE_CREDITS = 1000;

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Server configuration missing." },
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

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session." },
        { status: 401 }
      );
    }

    // Never trust a user ID supplied by the browser.
    const userId = user.id;
    const email = user.email.trim().toLowerCase();

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Check for an existing active key.
    const { data: existing, error: existingError } = await admin
      .from("api_keys")
      .select(
        "id, key, api_key, key_prefix, free_requests_remaining, paid_requests_remaining"
      )
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("KEY LOOKUP ERROR:", existingError.message);

      return NextResponse.json(
        { success: false, error: "Could not check your API key." },
        { status: 500 }
      );
    }

    // Existing key: return it without adding or resetting credits.
    if (existing) {
      const fullKey = existing.key || existing.api_key;

      return NextResponse.json({
        success: true,
        existing_key: true,
        api_key: fullKey,
        key: fullKey,
        key_prefix: existing.key_prefix,
        free_requests_remaining:
          existing.free_requests_remaining ?? 0,
        paid_requests_remaining:
          existing.paid_requests_remaining ?? 0,
        message: "Your existing API key was found. No extra free credits were added.",
      });
    }

    // Claim the one-time free allocation.
    const { error: claimError } = await admin
      .from("free_credit_claims")
      .insert({
        user_id: userId,
        email: email,
      });

    if (claimError) {
      if (claimError.code === "23505") {
        return NextResponse.json(
          {
            success: false,
            error: "This email has already claimed its free credits.",
          },
          { status: 409 }
        );
      }

      console.error("FREE CLAIM ERROR:", claimError.message);

      return NextResponse.json(
        { success: false, error: "Could not process your free credit claim." },
        { status: 500 }
      );
    }

    // Generate a new API key.
    const fullKey = `sk_live_${randomBytes(32).toString("hex")}`;
    const keyPrefix = fullKey.slice(0, 20) + "...";

    const keyHash = createHash("sha256")
      .update(fullKey)
      .digest("hex");

    const insertData = {
      user_id: userId,
      email,
      key: fullKey,
      api_key: fullKey,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      free_requests_remaining: FREE_CREDITS,
      paid_requests_remaining: 0,
      is_active: true,
      is_free: true,
    };

    const { data: newKey, error: insertError } = await admin
      .from("api_keys")
      .insert(insertData)
      .select(
        "id, key, key_prefix, free_requests_remaining, paid_requests_remaining"
      )
      .single();

    if (insertError || !newKey) {
      console.error("API KEY INSERT ERROR:", insertError?.message);

      // Allow this same account to retry if key creation failed.
      const { error: rollbackError } = await admin
        .from("free_credit_claims")
        .delete()
        .eq("user_id", userId);

      if (rollbackError) {
        console.error("CLAIM ROLLBACK ERROR:", rollbackError.message);
      }

      return NextResponse.json(
        {
          success: false,
          error: "API key creation failed. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      existing_key: false,
      api_key: newKey.key,
      key: newKey.key,
      key_prefix: newKey.key_prefix,
      free_requests_remaining: FREE_CREDITS,
      paid_requests_remaining: 0,
      message: "Your 1,000 free credits have been activated!",
    });
  } catch (error) {
    console.error("CREATE FREE KEY ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Unexpected server error." },
      { status: 500 }
    );
  }
}