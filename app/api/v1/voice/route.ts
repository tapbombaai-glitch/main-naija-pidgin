// app/api/v1/voice/route.ts
// Main Naija Pidgin — Public Customer Voice API
// Secure API-key authentication + Private Storage signed URLs + Atomic credit deduction

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const STORAGE_BUCKET = 'voices';
const SIGNED_URL_TTL_SECONDS = 60;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing server-side Supabase environment variables.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function getHeaders() {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'Pragma': 'no-cache',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'x-api-key, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: getHeaders() });
}

function isSafeStoragePath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const path = value.trim();
  if (!path) return false;
  if (path.startsWith('/') || path.includes('..') || path.includes('//') || path.includes('\\') || /^https?:\/\//i.test(path)) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key')?.trim() ?? '';
    if (!apiKey) return jsonResponse({ success: false, error: 'Missing x-api-key header.' }, 401);
    if (apiKey.length > 200 || !/^mnp_[A-Za-z0-9_-]+$/.test(apiKey)) {
      return jsonResponse({ success: false, error: 'Invalid API key format.' }, 400);
    }

    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, key, is_active, credits_remaining, credits_used, credits_total, name, key_prefix')
      .eq('key', apiKey)
      .maybeSingle();

    if (keyError) return jsonResponse({ success: false, error: 'Could not verify API key.' }, 500);
    if (!keyData) return jsonResponse({ success: false, error: 'Invalid API key.' }, 401);
    if (keyData.is_active !== true) return jsonResponse({ success: false, error: 'API key is inactive. Contact tapbomba.ai@gmail.com.' }, 403);
    if (!Number.isInteger(keyData.credits_remaining) || keyData.credits_remaining <= 0) {
      return jsonResponse({ success: false, error: 'No credits remaining. Please purchase more credits.' }, 403);
    }

    const { data: recordings, error: recordingsError } = await supabaseAdmin
      .from('recordings')
      .select('id, file_name, audio_path, pidgin_text, transcription, language, api_number, word_count')
      .eq('admin_status', 'approved')
      .not('audio_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (recordingsError) return jsonResponse({ success: false, error: 'Could not retrieve available voices.' }, 500);

    const eligibleRecordings = (recordings ?? []).filter((r) => isSafeStoragePath(r.audio_path));
    if (eligibleRecordings.length === 0) {
      return jsonResponse({ success: false, error: 'No approved voices are currently available.' }, 503);
    }

    const recording = eligibleRecordings[Math.floor(Math.random() * eligibleRecordings.length)];

    const { data: signedAudio, error: signedUrlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(recording.audio_path, SIGNED_URL_TTL_SECONDS);

    if (signedUrlError || !signedAudio?.signedUrl) {
      return jsonResponse({ success: false, error: 'Could not prepare the audio file. No credits were charged.' }, 500);
    }

    const { data: deductionResult, error: deductionError } = await supabaseAdmin.rpc('atomic_credit_deduct', {
      p_key_id: keyData.id,
      p_amount: 1,
    });

    if (deductionError) {
      const message = deductionError.message.toLowerCase();
      if (message.includes('insufficient credits') || message.includes('api key is inactive')) {
        return jsonResponse({ success: false, error: message.includes('insufficient') ? 'Insufficient credits.' : 'API key is inactive.' }, 403);
      }
      return jsonResponse({ success: false, error: 'Credit deduction failed. Please retry.' }, 500);
    }

    const deductionRow = Array.isArray(deductionResult) ? deductionResult[0] : null;
    if (!deductionRow || typeof deductionRow.credits_remaining !== 'number') {
      return jsonResponse({ success: false, error: 'Credit deduction could not be confirmed.' }, 500);
    }

    return jsonResponse({
      success: true,
      message: 'Voice retrieved successfully.',
      voice: {
        id: recording.id,
        pidgin_text: recording.pidgin_text,
        transcription: recording.transcription,
        language: recording.language,
        api_number: recording.api_number,
        word_count: recording.word_count,
        file_name: recording.file_name,
        audio_url: signedAudio.signedUrl,
        audio_url_expires_in_seconds: SIGNED_URL_TTL_SECONDS,
      },
      credits: {
        charged: 1,
        remaining: deductionRow.credits_remaining,
        used: deductionRow.credits_used,
        total: deductionRow.credits_total,
      },
    });
  } catch (error: unknown) {
    console.error('Public Voice API unexpected error:', error);
    return jsonResponse({ success: false, error: 'Internal server error.' }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: getHeaders() });
}