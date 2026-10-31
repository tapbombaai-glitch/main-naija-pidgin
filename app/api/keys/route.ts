import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, error: "Please log in" }, { status: 401 });
    }
    const token = authorization.slice(7);
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData } = await authClient.auth.getUser(token);
    if (!authData.user) return NextResponse.json({ success: false, error: "Session expired" }, { status: 401 });

    const userId = authData.user.id;
    const userEmail = authData.user.email;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

    // Check existing free key using user_id OR email (for old records)
    const { data: existing } = await admin
      .from("api_keys")
      .select("id, api_key, key, key_prefix, free_requests_remaining, is_active, is_free")
      .or(`user_id.eq.${userId},email.eq.${userEmail}`)
      .eq("is_free", true)
      .maybeSingle();

    if (existing) {
      const fullKey = (existing as any).api_key || (existing as any).key;
      return NextResponse.json({
        success: true, existing: true,
        api_key: fullKey,
        key_prefix: existing.key_prefix,
        free_requests_remaining: existing.free_requests_remaining ?? 0,
        is_active: existing.is_active,
        message: "You already have a free API key."
      });
    }

    const apiKey = `sk_live_${randomBytes(32).toString("hex")}`;
    const keyPrefix = apiKey.slice(0, 15);

    const { data: newKey, error: insertError } = await admin
      .from("api_keys")
      .insert({
        user_id: userId,
        email: userEmail,
        api_key: apiKey,
        key: apiKey,
        key_hash: apiKey,
        key_prefix: keyPrefix,
        name: "Free Starter API",
        free_requests_remaining: 100,
        paid_requests_remaining: 0,
        credits_remaining: 100,
        credits_total: 100,
        remaining_credits: 100,
        total_credits: 100,
        is_active: true,
        is_free: true,
        has_claimed_free: true,
        status: "active",
        plan: "free"
      })
      .select("key_prefix, free_requests_remaining, is_active")
      .single();

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true, existing: false,
      api_key: apiKey,
      key_prefix: newKey.key_prefix,
      free_requests_remaining: newKey.free_requests_remaining,
      is_active: newKey.is_active,
      message: "Your 100 free API requests are ready!"
    });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Unexpected error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: false, error: "Use dashboard" }, { status: 401 });
}