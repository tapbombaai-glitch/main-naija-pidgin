// app/api/v1/speak/route.ts
// Main Naija Pidgin — TTS API with HIGH QUALITY CLEAR VOICE
// Fixed for Warri Guy & Lagos Male sales voice

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env vars');
}
if (!ELEVENLABS_API_KEY) {
  throw new Error('Missing ELEVENLABS_API_KEY');
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function getHeaders() {
  return {
    'Cache-Control': 'private, no-store, max-age=0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'x-api-key, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth
    const apiKey = req.headers.get('x-api-key')?.trim() ?? '';
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Missing x-api-key header.' }, { status: 401, headers: getHeaders() });
    }

    const { data: keyData } = await supabaseAdmin.from('api_keys').select('id, is_active, credits_remaining').eq('key', apiKey).maybeSingle();
    if (!keyData || keyData.is_active !== true) {
      return NextResponse.json({ success: false, error: 'Invalid or inactive API key.' }, { status: 401, headers: getHeaders() });
    }
    if (keyData.credits_remaining <= 0) {
      return NextResponse.json({ success: false, error: 'No credits remaining.' }, { status: 403, headers: getHeaders() });
    }

    // 2. Get body
    const body = await req.json();
    const text = (body.text as string)?.trim();
    const voiceId = (body.voiceId as string)?.trim();

    if (!text || text.length < 3) {
      return NextResponse.json({ success: false, error: 'Text is required (min 3 chars).' }, { status: 400, headers: getHeaders() });
    }
    if (!voiceId) {
      return NextResponse.json({ success: false, error: 'voiceId is required.' }, { status: 400, headers: getHeaders() });
    }
    if (text.length > 5000) {
      return NextResponse.json({ success: false, error: 'Text too long (max 5000 chars).' }, { status: 400, headers: getHeaders() });
    }

    // 3. CALL ELEVENLABS WITH HIGH QUALITY CLEAR VOICE SETTINGS
    // This fixes the muffled, not clear voice issue
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_192&optimize_streaming_latency=0`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          // WARRI GUY ENERGY SETTINGS - CLEAR + ENERGETIC
          voice_settings: {
            stability: 0.35,        // Low for Warri energy, use 0.65 for Lagos Male sales voice
            similarity_boost: 0.85, // High - keep original Naija tune
            style: 0.65,            // High for Warri swag, use 0.25 for clear sales voice
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errText = await ttsResponse.text();
      console.error('ElevenLabs TTS failed:', errText);
      return NextResponse.json({ success: false, error: 'TTS generation failed.', details: errText }, { status: 500, headers: getHeaders() });
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    // 4. Deduct credit only after success
    const { data: deductionResult, error: deductionError } = await supabaseAdmin.rpc('atomic_credit_deduct', {
      p_key_id: keyData.id,
      p_amount: 1,
    });

    if (deductionError) {
      console.error('Credit deduction failed:', deductionError.message);
      // Still return audio but log error - user already got voice
    }

    const deductionRow = Array.isArray(deductionResult) ? deductionResult[0] : null;

    // 5. Return audio as base64 + credits
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return NextResponse.json(
      {
        success: true,
        message: 'Voice generated successfully with clear Naija tune.',
        audio_base64: base64Audio,
        audio_mime: 'audio/mpeg',
        credits: deductionRow ? {
          remaining: deductionRow.credits_remaining,
          used: deductionRow.credits_used,
          total: deductionRow.credits_total,
        } : undefined,
      },
      { headers: getHeaders() }
    );

  } catch (error: any) {
    console.error('Speak API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error.', details: error.message }, { status: 500, headers: getHeaders() });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: getHeaders() });
}