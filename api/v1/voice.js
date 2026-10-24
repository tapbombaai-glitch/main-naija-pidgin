// api/v1/voice.js
// Main Naija Pidgin — Public Customer API
// Secure API-key authentication, approved voices, atomic credit deduction

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing server-side Supabase environment variables');
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

function sendError(res, status, error) {
  return res.status(status).json({ success: false, error });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'x-api-key, Content-Type'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    // 1. Authenticate API key.
    // Prefer the header. Query-string keys can leak through logs.
    const headerKey = req.headers['x-api-key'];
    const queryKey = req.query?.api_key;

    const apiKey =
      typeof headerKey === 'string' && headerKey.trim()
        ? headerKey.trim()
        : typeof queryKey === 'string'
          ? queryKey.trim()
          : '';

    if (!apiKey) {
      return sendError(res, 401, 'Missing x-api-key header');
    }

    if (apiKey.length > 200) {
      return sendError(res, 400, 'Invalid API key format');
    }

    // 2. Find the API key using the actual database column.
    const { data: keyData, error: keyError } = await supabaseAdmin
      .from('api_keys')
      .select(
        'id, api_key, is_active, credits_remaining, credits_used, name, key_prefix'
      )
      .eq('api_key', apiKey)
      .maybeSingle();

    if (keyError) {
      console.error('API key lookup failed:', keyError.message);
      return sendError(res, 500, 'Could not verify API key');
    }

    if (!keyData) {
      return sendError(res, 401, 'Invalid API key');
    }

    if (keyData.is_active !== true) {
      return sendError(
        res,
        403,
        'API key is not active. Contact tapbomba.ai@gmail.com'
      );
    }

    if (
      !Number.isInteger(keyData.credits_remaining) ||
      keyData.credits_remaining <= 0
    ) {
      return sendError(
        res,
        403,
        'No credits remaining. Please purchase more credits.'
      );
    }

    // 3. Find an approved recording before charging.
    const { data: voices, error: voiceError } = await supabaseAdmin
      .from('recordings')
      .select(
        'id, file_name, audio_path, audio_url, pidgin_text, transcription, language, api_number, word_count'
      )
      .eq('admin_status', 'approved')
      .not('audio_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (voiceError) {
      console.error('Voice lookup failed:', voiceError.message);
      return sendError(res, 500, 'Could not retrieve available voices');
    }

    const eligibleVoices = (voices || []).filter((voice) => {
      const path =
        typeof voice.audio_path === 'string'
          ? voice.audio_path.trim()
          : '';

      return (
        path.length > 0 &&
        !path.startsWith('/') &&
        !path.includes('..') &&
        !path.includes('//') &&
        !path.includes('\\')
      );
    });

    if (eligibleVoices.length === 0) {
      return sendError(res, 503, 'No approved voices are currently available');
    }

    // Select a voice from the available approved recordings.
    const voice =
      eligibleVoices[Math.floor(Math.random() * eligibleVoices.length)];

    // 4. Deduct exactly one credit using the existing atomic database function.
    // This endpoint assumes the RPC returns without error on success.
    // Verify the function's return contract before production deployment.
    const { data: deductionResult, error: deductionError } =
      await supabaseAdmin.rpc('deduct_credit_atomic', {
        key_id: keyData.id,
        deduct_amount: 1
      });

    if (deductionError) {
      console.error(
        'Atomic credit deduction failed:',
        deductionError.message
      );

      return sendError(
        res,
        402,
        'Credit deduction failed. Please retry.'
      );
    }

    // IMPORTANT:
    // If the function returns false or a structured failure result when
    // credits are insufficient, that result MUST be checked here according
    // to the actual SQL function's return type before serving the voice.
    if (
      deductionResult === false ||
      (
        deductionResult &&
        typeof deductionResult === 'object' &&
        deductionResult.success === false
      )
    ) {
      return sendError(res, 403, 'Insufficient credits');
    }

    // 5. Return the selected recording metadata.
    // Do not expose storage service-role credentials or private bucket URLs.
    // The client should use the authenticated playback endpoint to obtain
    // a short-lived signed URL when the bucket is private.
    return res.status(200).json({
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
      credits: {
        charged: 1
      }
    });
  } catch (error) {
    console.error('Voice API unexpected error:', error.message);
    return sendError(res, 500, 'Internal server error');
  }
}