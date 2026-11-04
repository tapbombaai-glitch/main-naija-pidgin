// app/api/v1/voice/route.ts
// Main Naija Pidgin — Public Customer Voice API
// SHA-256 API-key authentication
// Private Storage signed URLs
// Atomic credit deduction

import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL =
process.env.SUPABASE_URL ||
process.env.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_ROLE_KEY =
process.env.SUPABASE_SERVICE_ROLE_KEY ||
process.env.SUPABASE_SERVICE_KEY;

const STORAGE_BUCKET = 'voices';
const SIGNED_URL_TTL_SECONDS = 60;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
throw new Error('Missing server-side Supabase environment variables.');
}

const supabaseAdmin = createClient(
SUPABASE_URL,
SERVICE_ROLE_KEY,
{
auth: {
autoRefreshToken: false,
persistSession: false,
},
}
);

function getHeaders() {
return {
'Cache-Control': 'private, no-store, max-age=0',
'Pragma': 'no-cache',
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Headers': 'x-api-key, Content-Type',
'Access-Control-Allow-Methods': 'GET, OPTIONS',
'Vary': 'Origin',
};
}

function jsonResponse(
body: Record<string, unknown>,
status = 200
) {
return NextResponse.json(body, {
status,
headers: getHeaders(),
});
}

function hashApiKey(apiKey: string): string {
return createHash('sha256')
.update(apiKey)
.digest('hex');
}

function isSafeStoragePath(value: unknown): value is string {
if (typeof value !== 'string') return false;

const path = value.trim();

if (
!path ||
path.startsWith('/') ||
path.includes('..') ||
path.includes('//') ||
path.includes('\') ||
/^https?:///i.test(path)
) {
return false;
}

return true;
}

export async function GET(req: NextRequest) {
try {
// 1. Read customer API key
const apiKey = req.headers.get('x-api-key')?.trim() ?? '';

if (!apiKey) {
  return jsonResponse({
    success: false,
    error: 'Missing x-api-key header.',
  }, 401);
}

// Your generated customer keys are mnp_ + 48 hexadecimal characters.
if (!/^mnp_[a-fA-F0-9]{48}$/.test(apiKey)) {
  return jsonResponse({
    success: false,
    error: 'Invalid API key format.',
  }, 401);
}

// 2. Hash the key before database lookup.
const keyHash = hashApiKey(apiKey);

const { data: keyData, error: keyError } =
  await supabaseAdmin
    .from('api_keys')
    .select('id, is_active')
    .eq('key_hash', keyHash)
    .maybeSingle();

if (keyError) {
  console.error('API key lookup failed:', keyError.message);

  return jsonResponse({
    success: false,
    error: 'Could not verify API key.',
  }, 500);
}

if (!keyData) {
  return jsonResponse({
    success: false,
    error: 'Invalid API key.',
  }, 401);
}

if (keyData.is_active !== true) {
  return jsonResponse({
    success: false,
    error: 'API key is inactive. Contact tapbomba.ai@gmail.com.',
  }, 403);
}

// 3. Retrieve approved recordings only.
const { data: recordings, error: recordingsError } =
  await supabaseAdmin
    .from('recordings')
    .select(
      'id, file_name, audio_path, pidgin_text, transcription, language, api_number, word_count'
    )
    .eq('admin_status', 'approved')
    .not('audio_path', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

if (recordingsError) {
  console.error(
    'Recording retrieval failed:',
    recordingsError.message
  );

  return jsonResponse({
    success: false,
    error: 'Could not retrieve available voices.',
  }, 500);
}

const eligibleRecordings = (recordings ?? [])
  .filter((recording) =>
    isSafeStoragePath(recording.audio_path)
  );

if (eligibleRecordings.length === 0) {
  return jsonResponse({
    success: false,
    error: 'No approved voices are currently available.',
  }, 503);
}

// 4. Select an approved recording.
const recording =
  eligibleRecordings[
    Math.floor(Math.random() * eligibleRecordings.length)
  ];

// 5. Create a short-lived private Storage URL.
// No credit has been deducted yet.
const { data: signedAudio, error: signedUrlError } =
  await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(
      recording.audio_path,
      SIGNED_URL_TTL_SECONDS
    );

if (signedUrlError || !signedAudio?.signedUrl) {
  console.error(
    'Signed URL creation failed:',
    signedUrlError?.message
  );

  return jsonResponse({
    success: false,
    error: 'Could not prepare the audio file. No credits were charged.',
  }, 500);
}

// 6. Atomically deduct exactly one credit.
const { data: deductionResult, error: deductionError } =
  await supabaseAdmin.rpc('atomic_credit_deduct', {
    p_key_id: keyData.id,
    p_amount: 1,
  });

if (deductionError) {
  const message = deductionError.message.toLowerCase();

  if (message.includes('insufficient credits')) {
    return jsonResponse({
      success: false,
      error: 'Insufficient credits. Please purchase more credits.',
    }, 403);
  }

  if (message.includes('api key is inactive')) {
    return jsonResponse({
      success: false,
      error: 'API key is inactive.',
    }, 403);
  }

  console.error(
    'Atomic credit deduction failed:',
    deductionError.message
  );

  return jsonResponse({
    success: false,
    error: 'Credit deduction failed. No audio was returned.',
  }, 500);
}

const deductionRow = Array.isArray(deductionResult)
  ? deductionResult[0]
  : null;

if (
  !deductionRow ||
  typeof deductionRow.credits_remaining !== 'number'
) {
  console.error(
    'Unexpected atomic credit deduction response:',
    deductionResult
  );

  return jsonResponse({
    success: false,
    error: 'Could not confirm credit deduction.',
  }, 500);
}

// 7. Return audio URL and updated credit balance.
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

return jsonResponse({
  success: false,
  error: 'Internal server error.',
}, 500);

}
}

export async function OPTIONS() {
return new NextResponse(null, {
status: 204,
headers: getHeaders(),
});
}