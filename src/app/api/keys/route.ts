import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateApiKey } from "@/lib/keys";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const { fullKey, hash, prefix, hint } = generateApiKey();

    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        key_hash: hash,
        prefix: prefix,
        hint: hint,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      api_key: fullKey,
      prefix: prefix,
      hint: hint,
      id: data.id,
      message: "Copy this key now! You will never see it again!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const { data, error } = await supabase.from("api_keys").select("id, prefix, hint, is_active, created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, keys: data });
}