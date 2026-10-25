// app/api/v1/voice/route.ts - Public Customer API - Balanced
// Secure API-key authentication, approved voices, atomic credit deduction
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing server-side Supabase environment variables');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function getHeaders(){
  return {
    'Cache-Control': 'private, no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'x-api-key, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
}

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate API key - Prefer header, query can leak via logs
    const headerKey = req.headers.get('x-api-key');
    const queryKey = req.nextUrl.searchParams.get('api_key');
    const apiKey = headerKey?.trim() ? headerKey.trim() : queryKey?.trim() ? queryKey.trim() : '';

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Missing x-api-key header' }, { status: 401, headers: getHeaders() });
    }
    if (apiKey.length > 200) {
      return NextResponse.json({ success: false, error: 'Invalid API key format' }, { status: 400, headers: getHeaders() });
    }

    // 2. Find API key using actual DB column
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select('id, api_key, is_active, credits_remaining, credits_used, name, key_prefix')
      .eq('api_key', apiKey)
      .maybeSingle();

    if (keyError) {
      console.error('API key lookup failed:', keyError.message);
      return NextResponse.json({ success: false, error: 'Could not verify API key' }, { status: 500, headers: getHeaders() });
    }
    if (!keyData) return NextResponse.json({ success: false, error: 'Invalid API key' }, { status: 401, headers: getHeaders() });
    if (keyData.is_active !== true) {
      return NextResponse.json({ success: false, error: 'API key is not active. Contact tapbomba.ai@gmail.com' }, { status: 403, headers: getHeaders() });
    }
    if (!Number.isInteger(keyData.credits_remaining) || keyData.credits_remaining <= 0) {
      return NextResponse.json({ success: false, error: 'No credits remaining. Please purchase more credits.' }, { status: 403, headers: getHeaders() });
    }

    // 3. Find approved recording before charging
    const { data: voices, error: voiceError } = await supabaseAdmin
      .from('recordings')
      .select('id, file_name, audio_path, audio_url, pidgin_text, transcription, language, api_number, word_count')
      .eq('admin_status', 'approved')
      .not('audio_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (voiceError) {
      console.error('Voice lookup failed:', voiceError.message);
      return NextResponse.json({ success: false, error: 'Could not retrieve available voices' }, { status: 500, headers: getHeaders() });
    }

    const eligibleVoices = (voices || []).filter((voice) => {
      const path = typeof voice.audio_path === 'string' ? voice.audio_path.trim() : '';
      return path.length > 0 && !path.startsWith('/') && !path.includes('..') && !path.includes('//') && !path.includes('\\');
    });

    if (eligibleVoices.length === 0) {
      return NextResponse.json({ success: false, error: 'No approved voices are currently available' }, { status: 503, headers: getHeaders() });
    }

    const voice = eligibleVoices[Math.floor(Math.random() * eligibleVoices.length)];

    // 4. Deduct exactly one credit using atomic RPC
    const { data: deductionResult, error: deductionError } = await supabaseAdmin.rpc('deduct_credit_atomic', {
      key_id: keyData.id,
      deduct_amount: 1
    });

    if (deductionError) {
      console.error('Atomic credit deduction failed:', deductionError.message);
      return NextResponse.json({ success: false, error: 'Credit deduction failed. Please retry.' }, { status: 402, headers: getHeaders() });
    }

    if (deductionResult === false || (deductionResult && typeof deductionResult === 'object' && (deductionResult as any).success === false)) {
      return NextResponse.json({ success: false, error: 'Insufficient credits' }, { status: 403, headers: getHeaders() });
    }

    // 5. Return selected recording metadata
    return NextResponse.json({
      success: true,
      message: 'Voice retrieved successfully',
      voice: {
        id: voice.id,
        pidgin_text: voice.pidgin_text,
        transcription: voice.transcription,
        language: voice.language,
        api_number: voice.api_number,
        word_count: voice.word_count,
        file_name: voice.file_name
      },
      credits: { charged: 1 }
    }, { headers: getHeaders() });

  } catch (error: any) {
    console.error('Voice API unexpected error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: getHeaders() });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: getHeaders() });
}