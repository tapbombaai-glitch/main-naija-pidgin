import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function POST(req: Request) {
  try {
    // CHECK API KEY
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer mn_live_")) {
      return NextResponse.json({ 
        error: "Unauthorized. Get API Key at /keys",
        hint: "Add header: Authorization: Bearer YOUR_KEY"
      }, { status: 401 });
    }

    const apiKey = auth.replace("Bearer ", "").trim();
    const hash = hashKey(apiKey);

    const { data: keyData } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", hash)
      .eq("is_active", true)
      .single();

    if (!keyData) {
      return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
    }

    // Update usage
    await supabase.from("api_keys").update({
      last_used_at: new Date().toISOString(),
      usage_count: (keyData.usage_count || 0) + 1
    }).eq("id", keyData.id);

    // GET TEXT TO SPEAK
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Text required" }, { status: 400 });
    }

    // SUCCESS - VOICE WILL SPEAK
    return NextResponse.json({
      success: true,
      text: text,
      voice: "Emaka Voice",
      message: "API Key valid! Here you will add your ElevenLabs call.",
      usage: keyData.usage_count + 1
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}