import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Server env missing" }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const bodyUserId = body.userId;

    // Try get user from auth header OR from body (your frontend sends body)
    let userId: string | null = bodyUserId || null;
    let userEmail = "";

    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
      const { data } = await authClient.auth.getUser(token);
      if (data.user) {
        userId = data.user.id;
        userEmail = data.user.email || "";
      }
    }

    // If still no userId from token, fetch email from supabase using bodyUserId
    if (!userId) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Get user email if we don't have it
    if (!userEmail && bodyUserId) {
      try {
        const { data: userData } = await admin.auth.admin.getUserById(bodyUserId);
        userEmail = userData.user?.email || "";
      } catch {}
    }

    // 1. CHECK IF KEY ALREADY EXISTS - return it
    const { data: existing } = await admin
      .from("api_keys")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const fullKey = existing.key || existing.api_key;
      return NextResponse.json({
        success: true,
        api_key: fullKey,
        key: fullKey, // For your frontend compatibility
        key_prefix: existing.key_prefix,
        free_requests_remaining: existing.free_requests_remaining ?? 100,
      });
    }

    // 2. CREATE NEW KEY
    const fullKey = `sk_live_${randomBytes(32).toString("hex")}`;
    const keyPrefix = fullKey.slice(0, 20) + "...";

    // Insert with BOTH 'key' and 'api_key' columns so your frontend (keys[0].key) will see it
    const { data: newRow, error } = await admin
      .from("api_keys")
      .insert({
        user_id: userId,
        email: userEmail,
        key: fullKey, // Your frontend uses this
        api_key: fullKey, // Backup
        key_prefix: keyPrefix,
        key_hash: keyPrefix,
        free_requests_remaining: 100,
        paid_requests_remaining: 0,
        is_active: true,
        is_free: true,
      })
      .select("*")
      .single();

    if (error) {
      console.error("INSERT FAILED:", error);
      // Try minimal insert if columns don't exist
      const { data: retry, error: retryError } = await admin
        .from("api_keys")
        .insert({
          user_id: userId,
          key: fullKey,
          key_prefix: keyPrefix,
          free_requests_remaining: 100,
          paid_requests_remaining: 0,
          is_active: true,
        })
        .select("*")
        .single();
      
      if (retryError) {
        return NextResponse.json({ error: retryError.message }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        api_key: fullKey,
        key: fullKey,
        key_prefix: keyPrefix,
        free_requests_remaining: 100,
      });
    }

    return NextResponse.json({
      success: true,
      api_key: fullKey,
      key: fullKey,
      key_prefix: newRow.key_prefix,
      free_requests_remaining: 100,
    });

  } catch (e: any) {
    console.error("CREATE-FREE CRASH:", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}