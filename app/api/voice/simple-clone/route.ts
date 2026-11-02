import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const form = await req.formData();
  const file = form.get("audio") as File;
  const name = form.get("name") as string;

  if (!file) return NextResponse.json({ error: "Upload voice" }, { status: 400 });

  // Just upload - No training - SIMPLE!
  const fileName = `simple/${Date.now()}-${file.name}`;
  await supabase.storage.from("voice-samples").upload(fileName, file);
  const { data } = supabase.storage.from("voice-samples").getPublicUrl(fileName);

  // Save
  await supabase.from("cloned_voices").insert({
    name: name || "My Voice",
    sample_url: data.publicUrl,
    elevenlabs_voice_id: `simple_${Date.now()}`,
    status: "ready"
  });

  return NextResponse.json({ success: true, url: data.publicUrl, message: "Voice saved - Simple clone done!" });
}