// app/api/admin/credits/route.ts
// Main Naija Pidgin — Secure Chairman Credit Management
// Uses atomic_credit_change() only. No non-atomic fallback.

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const CHAIRMAN_EMAIL = 'tapbomba.ai@gmail.com';
const ALLOWED_ORIGIN = 'https://main-naija-pidgin.onrender.com';

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };

  if (origin === ALLOWED_ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGIN;
  }

  return headers;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null
) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders(origin),
  });
}

function getBearerToken(req: NextRequest): string {
  const authorization = req.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match ? match[1].trim() : '';
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');

  if (origin && origin !== ALLOWED_ORIGIN) {
    return new NextResponse(null, {
      status: 403,
      headers: corsHeaders(origin),
    });
  }

  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');

  // CORS is an additional browser restriction, not authentication.
  if (origin && origin !== ALLOWED_ORIGIN) {
    return jsonResponse(
      { success: false, error: 'Origin not allowed' },
      403,
      origin
    );
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Admin credit route: missing server environment variables');

    return jsonResponse(
      { success: false, error: 'Server configuration error' },
      500,
      origin
    );
  }

  const token = getBearerToken(req);

  if (!token) {
    return jsonResponse(
      { success: false, error: 'Authentication required' },
      401,
      origin
    );
  }

  try {
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

    // Verify the actual Supabase session; never trust an email in the body.
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        { success: false, error: 'Invalid or expired session' },
        401,
        origin
      );
    }

    if (
      String(user.email || '').trim().toLowerCase() !==
      CHAIRMAN_EMAIL.toLowerCase()
    ) {
      return jsonResponse(
        { success: false, error: 'Chairman access only' },
        403,
        origin
      );
    }

    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, error: 'Invalid JSON request body' },
        400,
        origin
      );
    }

    const apiKeyId = String(
      body.api_key_id ?? body.keyId ?? body.id ?? ''
    ).trim();

    const action = String(body.action ?? '').trim();
    const amount = Number(body.amount);

    if (!apiKeyId) {
      return jsonResponse(
        { success: false, error: 'API key ID required' },
        400,
        origin
      );
    }

    if (action !== 'add' && action !== 'deduct') {
      return jsonResponse(
        { success: false, error: 'Action must be add or deduct' },
        400,
        origin
      );
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount < 1 ||
      amount > 1_000_000
    ) {
      return jsonResponse(
        {
          success: false,
          error: 'Amount must be a whole number between 1 and 1000000',
        },
        400,
        origin
      );
    }

    const change = action === 'add' ? amount : -amount;

    // This function must exist in Supabase and perform the update atomically.
    const { data, error } = await supabaseAdmin.rpc(
      'atomic_credit_change',
      {
        p_key_id: apiKeyId,
        p_change: change,
      }
    );

    if (error) {
      const message = String(error.message || '').toLowerCase();
      const code = String(error.code || '');

      console.error('atomic_credit_change failed:', {
        code,
        message: error.message,
      });

      if (
        code === 'PGRST202' ||
        code === '42883' ||
        message.includes('function') && message.includes('does not exist')
      ) {
        return jsonResponse(
          {
            success: false,
            error: 'Atomic credit function unavailable. Check the Supabase SQL function and API schema cache.',
          },
          500,
          origin
        );
      }

      if (message.includes('insufficient credits')) {
        return jsonResponse(
          { success: false, error: 'Insufficient credits to deduct' },
          400,
          origin
        );
      }

      if (message.includes('api key record not found')) {
        return jsonResponse(
          { success: false, error: 'API key not found' },
          404,
          origin
        );
      }

      return jsonResponse(
        { success: false, error: 'Could not update credits' },
        500,
        origin
      );
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (
      !row ||
      row.previous_credits === undefined ||
      row.credits_remaining === undefined
    ) {
      console.error('Atomic credit function returned an unexpected result');

      return jsonResponse(
        { success: false, error: 'Unexpected credit function response' },
        500,
        origin
      );
    }

    return jsonResponse(
      {
        success: true,
        message:
          action === 'add'
            ? 'Credits added successfully'
            : 'Credits deducted successfully',
        api_key_id: apiKeyId,
        keyId: apiKeyId,
        previous_credits: Number(row.previous_credits),
        credits: Number(row.credits_remaining),
        credits_remaining: Number(row.credits_remaining),
        credits_used:
          row.credits_used == null ? null : Number(row.credits_used),
        credits_total:
          row.credits_total == null ? null : Number(row.credits_total),
        change,
        atomic: true,
        method: 'atomic_credit_change',
      },
      200,
      origin
    );
  } catch (err) {
    console.error('Admin credit endpoint failed:', err);

    return jsonResponse(
      { success: false, error: 'An unexpected server error occurred' },
      500,
      origin
    );
  }
}