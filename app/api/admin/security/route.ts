import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

export async function GET(request: NextRequest) {
  try {
    // 1. Verify Chairman login token
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized access." },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing authentication token." },
        { status: 401 }
      );
    }

    // 2. Verify Supabase authentication
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: authData, error: authError } =
      await authClient.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: "Invalid login session." },
        { status: 401 }
      );
    }

    const user = authData.user;

    // 3. Only Chairman email is allowed
    if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, error: "Chairman access only." },
        { status: 403 }
      );
    }

    // 4. Verify Chairman profile
    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id,email,is_chairman")
        .eq("id", user.id)
        .maybeSingle();

    if (
      profileError ||
      !profile ||
      profile.email?.toLowerCase() !== ADMIN_EMAIL ||
      profile.is_chairman !== true
    ) {
      return NextResponse.json(
        { success: false, error: "Chairman permission not confirmed." },
        { status: 403 }
      );
    }

    // 5. Read API key security information
    const { data: apiKeys, error: apiError } = await supabaseAdmin
      .from("api_keys")
      .select("id,email,key_prefix,is_active,status,is_free,created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (apiError) {
      throw apiError;
    }

    const keys = apiKeys || [];

    const activeKeys = keys.filter(
      (key) => key.is_active === true && key.status !== "inactive"
    ).length;

    const inactiveKeys = keys.filter(
      (key) => key.is_active === false || key.status === "inactive"
    ).length;

    // 6. Return security overview
    return NextResponse.json({
      success: true,
      security: {
        chairman_email: ADMIN_EMAIL,
        chairman_verified: true,
        admin_protection: "ACTIVE",
        api_key_monitoring: "ACTIVE",
        total_keys_checked: keys.length,
        active_keys: activeKeys,
        inactive_keys: inactiveKeys,
        last_checked: new Date().toISOString(),
      },
      api_keys: keys.map((key) => ({
        id: key.id,
        email: key.email,
        key_prefix: key.key_prefix,
        is_active: key.is_active,
        status: key.status,
        is_free: key.is_free,
        created_at: key.created_at,
      })),
    });
  } catch (error) {
    console.error("Chairman security error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load security information.",
      },
      { status: 500 }
    );
  }
}