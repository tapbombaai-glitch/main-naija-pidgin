import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ success: false, error: "No login token" }, { status: 401 });

    const supabaseAuth = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user } } = await supabaseAuth.auth.getUser(token);
    if (!user) return NextResponse.json({ success: false, error: "Please login again" }, { status: 401 });

    const { text, voice } = await req.json();
    
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    // Check credits
    const { data: key } = await supabaseAdmin.from("api_keys").select("*").eq("user_id", user.id).eq("is_active", true).single();
    if (!key || (key.free_requests_remaining + key.paid_requests_remaining) <= 0) {
      return NextResponse.json({ success: false, error: "No credits left, buy more" }, { status: 403 });
    }

    // === HERE YOU CONNECT YOUR REAL VOICE ENGINE ===
    // For now I go use a demo audio so you can test frontend
    // Replace this with ElevenLabs / PlayHT later
    const demoAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"; 
    // TODO: Call your real TTS here and get real audio_url

    // Deduct 1 credit AFTER success
    const newFree = key.free_requests_remaining > 0 ? key.free_requests_remaining - 1 : 0;
    const newPaid = key.free_requests_remaining > 0 ? key.paid_requests_remaining : key.paid_requests_remaining - 1;
    
    await supabaseAdmin.from("api_keys").update({ free_requests_remaining: newFree, paid_requests_remaining: newPaid }).eq("id", key.id);

    return NextResponse.json({ 
      success: true, 
      audio_url: demoAudioUrl, 
      remaining_credits: newFree + newPaid 
    });

  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}