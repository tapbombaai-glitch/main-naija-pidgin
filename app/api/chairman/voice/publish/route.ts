// app/api/chairman/voice/publish/route.ts - V11 FINAL - DO NOT DEPLOY UNTIL TTS CONFIRMED
// mn_voices: voice_id (ElevenLabs ID), name, price, enabled - ONLY 4 columns
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const PROTECTED_NAMES = ["main naija pidgin", "main naija pidgin male", "warri babe", "warri boy"];

function json(d: any, s = 200) { return NextResponse.json(d, { status: s, headers: { "Cache-Control": "no-store" } }); }

// FIXED 1: Auth error with correct status
class AuthError extends Error {
  status: number;
  constructor(msg: string, status: number) { super(msg); this.status = status; }
}

async function requireChairman(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new AuthError("Login as Chairman.", 401);
  const token = auth.slice(7).trim();
  if (!token) throw new AuthError("Login as Chairman.", 401);
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) throw new AuthError("Invalid session. Login again.", 401);
  if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) throw new AuthError("Chairman only.", 403);
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { admin, elevenKey: process.env.ELEVENLABS_API_KEY! };
}

function errStatus(e: any) {
  if (e instanceof AuthError) return e.status;
  return 500;
}

// ---------- PUBLISH ----------
export async function POST(req: NextRequest) {
  try {
    const { admin, elevenKey } = await requireChairman(req);
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "").trim();
    const elevenlabsVoiceId = String(body.elevenlabs_voice_id || body.voice_id || "").trim();
    const name = String(body.name || "").trim();
    if (!id && !elevenlabsVoiceId && !name) return json({ success: false, error: "Provide id, elevenlabs_voice_id, or name." }, 400);

    let q = admin.from("chairman_voices").select("*");
    if (id) q = q.eq("id", id); else if (elevenlabsVoiceId) q = q.eq("elevenlabs_voice_id", elevenlabsVoiceId); else q = q.ilike("name", name);
    const { data: voice, error } = await q.maybeSingle();
    if (error || !voice) return json({ success: false, error: "Voice not found in Chairman catalogue." }, 404);

    const originalIsActive = voice.is_active;
    const originalIsPublished = voice.is_published;
    const rollback = async () => {
      await admin.from("chairman_voices").update({ is_published: originalIsPublished, is_active: originalIsActive }).eq("id", voice.id);
    };

    const lowerName = String(voice.name || "").toLowerCase().trim();
    const marketplaceName = `${voice.name} Voice`;

    if (PROTECTED_NAMES.includes(lowerName)) return json({ success: false, error: `PROTECTED: "${voice.name}" is protected. Cannot publish / overwrite Main Naija Pidgin / Warri Babe.` }, 403);
    if (voice.requires_verification) return json({ success: false, error: `Voice "${voice.name}" needs verification at elevenlabs.io first.` }, 400);
    if (voice.is_published === true) return json({ success: false, error: `Already published.` }, 409);
    if (!voice.elevenlabs_voice_id) return json({ success: false, error: "No ElevenLabs ID." }, 400);
    if (!voice.category || !["male", "female"].includes(String(voice.category).toLowerCase())) return json({ success: false, error: `Category invalid (${voice.category}).` }, 400);

    const { data: existingByName } = await admin.from("mn_voices").select("voice_id, name").ilike("name", marketplaceName).maybeSingle();
    if (existingByName) {
      if (existingByName.voice_id === voice.elevenlabs_voice_id) return json({ success: false, error: "Already published." }, 409);
      return json({ success: false, error: `Marketplace name "${marketplaceName}" already exists.` }, 409);
    }
    const { data: existingById } = await admin.from("mn_voices").select("voice_id, name").eq("voice_id", voice.elevenlabs_voice_id).maybeSingle();
    if (existingById) return json({ success: false, error: `This ElevenLabs voice already published as "${existingById.name}".` }, 409);

    const check = await fetch(`https://api.elevenlabs.io/v1/voices/${voice.elevenlabs_voice_id}`, { headers: { "xi-api-key": elevenKey }, cache: "no-store" });
    if (!check.ok) return json({ success: false, error: "Voice not found on ElevenLabs." }, 400);

    // Atomic claim - only one request fit win
    const { data: claimed, error: pubErr } = await admin
      .from("chairman_voices")
      .update({ is_published: true, is_active: true })
      .eq("id", voice.id)
      .or("is_published.eq.false,is_published.is.null")
      .select("id")
      .maybeSingle();
    if (pubErr) return json({ success: false, error: pubErr.message }, 500);
    if (!claimed) return json({ success: false, error: "This voice is already published or another request is processing it." }, 409);

    // insert() NOT upsert() - never overwrite
    const { error: mnErr } = await admin.from("mn_voices").insert({
      voice_id: voice.elevenlabs_voice_id,
      name: marketplaceName,
      price: 1000,
      enabled: true,
    });
    if (mnErr) {
      await rollback();
      if (String(mnErr.code) === "23505" || String(mnErr.message || "").includes("duplicate")) {
        return json({ success: false, error: `Marketplace voice already exists (race / duplicate). Rolled back, no overwrite.` }, 409);
      }
      return json({ success: false, error: `Marketplace sync failed, rolled back. Detail: ${mnErr.message}` }, 500);
    }

    const { data: verify } = await admin.from("mn_voices").select("voice_id, name").eq("voice_id", voice.elevenlabs_voice_id).maybeSingle();
    if (!verify) {
      await rollback();
      await admin.from("mn_voices").delete().eq("voice_id", voice.elevenlabs_voice_id);
      return json({ success: false, error: "Publish verification failed. Rolled back." }, 500);
    }

    return json({
      success: true, message: `"${voice.name}" published. Test Console go now see am and speak.`,
      marketplace_voice_id: voice.elevenlabs_voice_id, marketplace_name: marketplaceName,
      elevenlabs_voice_id: voice.elevenlabs_voice_id, category: voice.category, accent: voice.accent || "Naija Pidgin",
      is_active: true, is_published: true,
    });
  } catch (e: any) { return json({ success: false, error: e.message }, errStatus(e)); }
}

// ---------- UNPUBLISH ----------
export async function DELETE(req: NextRequest) {
  try {
    const { admin } = await requireChairman(req);
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();
    const elevenlabsVoiceId = String(searchParams.get("elevenlabs_voice_id") || searchParams.get("voice_id") || "").trim();
    const name = String(searchParams.get("name") || "").trim();
    if (!id && !elevenlabsVoiceId && !name) return json({ success: false, error: "Provide id, elevenlabs_voice_id, or name." }, 400);

    let q = admin.from("chairman_voices").select("*");
    if (id) q = q.eq("id", id); else if (elevenlabsVoiceId) q = q.eq("elevenlabs_voice_id", elevenlabsVoiceId); else q = q.ilike("name", name);
    const { data: voice, error } = await q.maybeSingle();
    if (error || !voice) return json({ success: false, error: "Voice not found in Chairman catalogue." }, 404);

    const lowerName = String(voice.name || "").toLowerCase().trim();
    if (PROTECTED_NAMES.includes(lowerName)) return json({ success: false, error: `PROTECTED: "${voice.name}" cannot be unpublished. It must stay live.` }, 403);
    if (!voice.is_published) return json({ success: false, error: `Voice "${voice.name}" is not published.` }, 409);
    if (!voice.elevenlabs_voice_id) return json({ success: false, error: "No ElevenLabs ID." }, 400);

    // FIXED 2: Save Marketplace row BEFORE delete, so we fit restore am if step 2 fail
    const { data: mnRow } = await admin.from("mn_voices").select("voice_id, name, price, enabled").eq("voice_id", voice.elevenlabs_voice_id).maybeSingle();

    if (mnRow) {
      const { error: delErr } = await admin.from("mn_voices").delete().eq("voice_id", voice.elevenlabs_voice_id);
      if (delErr) return json({ success: false, error: `Unpublish failed: ${delErr.message}` }, 500);
    }

    // Step 2: Mark unpublished
    const { error: updErr } = await admin.from("chairman_voices").update({ is_published: false }).eq("id", voice.id);
    if (updErr) {
      // ROLLBACK: Restore Marketplace row, so tables no go out of sync
      if (mnRow) {
        await admin.from("mn_voices").insert({ voice_id: mnRow.voice_id, name: mnRow.name, price: mnRow.price, enabled: mnRow.enabled });
      }
      return json({ success: false, error: `Unpublish failed, rolled back - voice still live in Marketplace: ${updErr.message}` }, 500);
    }

    return json({ success: true, message: `Unpublished "${voice.name}". Voice still dey Chairman catalogue, not deleted.`, elevenlabs_voice_id: voice.elevenlabs_voice_id, is_published: false });
  } catch (e: any) { return json({ success: false, error: e.message }, errStatus(e)); }
}

export async function GET() {
  return json({ success: true, message: "Publish V11 - POST publish, DELETE unpublish", flow: "Auth 401/403 correct + atomic claim + insert-only + unpublish rollback" });
}