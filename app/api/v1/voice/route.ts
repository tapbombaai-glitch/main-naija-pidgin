// app/api/v1/voice/route.ts
// Main Naija Pidgin — Public Customer Voice API
// Secure API-key authentication
// Approved recordings only
// Private Storage signed URLs
// Atomic credit deduction
// One credit per successful voice response

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
  throw new Error(
    'Missing server-side Supabase environment variables.'
  );
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
    'Content-Type': 'application/json',
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

function isSafeStoragePath(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const path = value.trim();

  if (!path) {
    return false;
  }

  // Storage object paths must be relative paths,
  // not public URLs or filesystem paths.
  if (
    path.startsWith('/') ||
    path.includes('..') ||
    path.includes('//') ||
    path.includes('\\') ||
    /^https?:\/\//i.test(path)
  ) {
    return false;
  }

  return true;
}

export async function GET(req: NextRequest) {
  try {
    // --------------------------------------------------
    // 1. Authenticate the customer using the API key.
    // Send the key in the x-api-key HTTP header.
    // --------------------------------------------------

    const apiKey = req.headers.get('x-api-key')?.trim() ?? '';

    if (!apiKey) {
      return jsonResponse(
        {
          success: false,
          error: 'Missing x-api-key header.',
        },
        401
      );
    }

    if (
      apiKey.length > 200 ||
      !/^mnp_[A-Za-z0-9_-]+$/.test(apiKey)
    ) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid API key format.',
        },
        400
      );
    }

    // --------------------------------------------------
    // 2. Find the API key.
    //
    // This uses the "key" column because that is the
    // column name shown in your earlier api_keys schema.
    // --------------------------------------------------

    const {
      data: keyData,
      error: keyError,
    } = await supabaseAdmin
      .from('api_keys')
      .select(
        'id, key, is_active, credits_remaining, credits_used, credits_total, name, key_prefix'
      )
      .eq('key', apiKey)
      .maybeSingle();

    if (keyError) {
      console.error(
        'API key lookup failed:',
        keyError.message
      );

      return jsonResponse(
        {
          success: false,
          error: 'Could not verify API key.',
        },
        500
      );
    }

    if (!keyData) {
      return jsonResponse(
        {
          success: false,
          error: 'Invalid API key.',
        },
        401
      );
    }

    if (keyData.is_active !== true) {
      return jsonResponse(
        {
          success: false,
          error:
            'API key is inactive. Contact tapbomba.ai@gmail.com.',
        },
        403
      );
    }

    if (
      !Number.isInteger(keyData.credits_remaining) ||
      keyData.credits_remaining <= 0
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            'No credits remaining. Please purchase more credits.',
        },
        403
      );
    }

    // --------------------------------------------------
    // 3. Find approved recordings with valid storage paths.
    // --------------------------------------------------

    const {
      data: recordings,
      error: recordingsError,
    } = await supabaseAdmin
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
        'Approved recording lookup failed:',
        recordingsError.message
      );

      return jsonResponse(
        {
          success: false,
          error: 'Could not retrieve available voices.',
        },
        500
      );
    }

    const eligibleRecordings = (recordings ?? []).filter(
      (recording) =>
        isSafeStoragePath(recording.audio_path)
    );

    if (eligibleRecordings.length === 0) {
      return jsonResponse(
        {
          success: false,
          error: 'No approved voices are currently available.',
        },
        503
      );
    }

    // --------------------------------------------------
    // 4. Choose a recording and generate its signed URL.
    //
    // The "voices" bucket must be private.
    // The URL expires after 60 seconds.
    // No credit has been deducted yet.
    // --------------------------------------------------

    const recording =
      eligibleRecordings[
        Math.floor(Math.random() * eligibleRecordings.length)
      ];

    const {
      data: signedAudio,
      error: signedUrlError,
    } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(
        recording.audio_path,
        SIGNED_URL_TTL_SECONDS
      );

    if (signedUrlError || !signedAudio?.signedUrl) {
      console.error(
        'Signed audio URL creation failed:',
        signedUrlError?.message ?? 'No signed URL returned'
      );

      return jsonResponse(
        {
          success: false,
          error: 'Could not prepare the audio file. No credits were charged.',
        },
        500
      );
    }

    // --------------------------------------------------
    // 5. Atomically deduct one credit.
    //
    // This function must enforce active-key status and
    // sufficient balance inside the database transaction.
    // The RPC returns a TABLE, so its data is an array.
    // --------------------------------------------------

    const {
      data: deductionResult,
      error: deductionError,
    } = await supabaseAdmin.rpc(
      'atomic_credit_deduct',
      {
        p_key_id: keyData.id,
        p_amount: 1,
      }
    );

    if (deductionError) {
      console.error(
        'Atomic credit deduction failed:',
        deductionError.message
      );

      const message = deductionError.message.toLowerCase();

      if (
        message.includes('insufficient credits') ||
        message.includes('api key is inactive') ||
        message.includes('api key inactive')
      ) {
        return jsonResponse(
          {
            success: false,
            error: message.includes('insufficient')
              ? 'Insufficient credits.'
              : 'API key is inactive.',
          },
          403
        );
      }

      return jsonResponse(
        {
          success: false,
          error: 'Credit deduction failed. Please retry.',
        },
        500
      );
    }

    const deductionRow = Array.isArray(deductionResult)
      ? deductionResult[0]
      : null;

    if (
      !deductionRow ||
      typeof deductionRow.credits_remaining !== 'number'
    ) {
      console.error(
        'Atomic deduction returned no valid result.'
      );

      return jsonResponse(
        {
          success: false,
          error: 'Credit deduction could not be confirmed.',
        },
        500
      );
    }

    // --------------------------------------------------
    // 6. Return the voice and the updated credit balance.
    // --------------------------------------------------

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
        audio_url_expires_in_seconds:
          SIGNED_URL_TTL_SECONDS,
      },
      credits: {
        charged: 1,
        remaining: deductionRow.credits_remaining,
        used: deductionRow.credits_used,
        total: deductionRow.credits_total,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown error';

    console.error(
      'Public Voice API unexpected error:',
      message
    );

    return jsonResponse(
      {
        success: false,
        error: 'Internal server error.',
      },
      500
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getHeaders(),
  });
}