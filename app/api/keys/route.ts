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
if (!supabaseUrl || !anonKey || !serviceRoleKey) {
return NextResponse.json(
{ success: false, error: "Server configuration is incomplete." },
{ status: 500 }
);
}

// Verify the customer's login token.
const authorization = request.headers.get("authorization");

if (!authorization?.startsWith("Bearer ")) {
  return NextResponse.json(
    { success: false, error: "Please log in to collect your free API key." },
    { status: 401 }
  );
}

const token = authorization.slice(7);

const authClient = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { data: authData, error: authError } =
  await authClient.auth.getUser(token);

if (authError || !authData.user) {
  return NextResponse.json(
    { success: false, error: "Your session has expired. Please log in again." },
    { status: 401 }
  );
}

const userId = authData.user.id;

// Service-role client stays on the server.
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Check whether this customer already has a free key.
const { data: existing, error: existingError } = await admin
  .from("api_keys")
  .select("id, key, key_prefix, free_requests_remaining, is_active, is_free")
  .eq("user_id", userId)
  .eq("is_free", true)
  .maybeSingle();

if (existingError) {
  console.error("Free key lookup failed:", existingError);
  return NextResponse.json(
    { success: false, error: "Unable to check your existing API key." },
    { status: 500 }
  );
}

if (existing) {
  return NextResponse.json({
    success: true,
    existing: true,
    api_key: existing.key || null,
    key_prefix: existing.key_prefix,
    free_requests_remaining: existing.free_requests_remaining ?? 0,
    is_active: existing.is_active,
    message: existing.key
      ? "You already have a free API key."
      : "You already have a free API key. Contact support if you need the full key again.",
  });
}

// Generate a cryptographically secure key.
const apiKey = `sk_live_${randomBytes(32).toString("hex")}`;
const keyPrefix = apiKey.slice(0, 15);

// Create the customer's 100-request free key.
const { data: newKey, error: insertError } = await admin
  .from("api_keys")
  .insert({
    user_id: userId,
    name: "Free Starter API",
    key: apiKey,
    key_prefix: keyPrefix,
    free_requests_remaining: 100,
    paid_requests_remaining: 0,
    is_active: true,
    is_free: true,
  })
  .select("id, key_prefix, free_requests_remaining, is_active")
  .single();

if (insertError) {
  console.error("Free key creation failed:", insertError);

  // A concurrent request may have created the key first.
  if (insertError.code === "23505") {
    return NextResponse.json(
      {
        success: false,
        error: "A free API key already exists for your account. Refresh your dashboard.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: "Unable to create your free API key. Please check the database setup.",
    },
    { status: 500 }
  );
}

return NextResponse.json({
  success: true,
  existing: false,
  api_key: apiKey,
  key_prefix: newKey.key_prefix,
  free_requests_remaining: newKey.free_requests_remaining,
  is_active: newKey.is_active,
  message: "Your 100 free API requests are ready!",
});

} catch (error) {
console.error("Free API key error:", error);

return NextResponse.json(
  { success: false, error: "An unexpected error occurred. Please try again." },
  { status: 500 }
);

}
}

// Public key listing is not allowed.
export async function GET() {
return NextResponse.json(
{
success: false,
error: "Please use the authenticated API dashboard.",
},
{ status: 401 }
);
}