// app/api/paystack/route.ts
// Main Naija Pidgin — Secure Paystack Payment Verification
// Server-side verification, fixed package prices, hashed API keys,
// duplicate-payment protection, and chairman approval workflow.

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

const PACKAGES = {
  '1k': {
    credits: 1000,
    amountKobo: 500000,
    name: 'Starter 1k',
  },
  '2k': {
    credits: 2000,
    amountKobo: 1000000,
    name: 'Standard 2k',
  },
  '5k': {
    credits: 5000,
    amountKobo: 2500000,
    name: 'Professional 5k',
  },
  '10k': {
    credits: 10000,
    amountKobo: 5000000,
    name: 'Professional 10k',
  },
} as const;

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
  });
}

function validEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('Paystack route: Supabase server configuration missing.');
      return json(
        { success: false, error: 'Payment service is not configured.' },
        500
      );
    }

    if (!PAYSTACK_SECRET_KEY) {
      console.error('Paystack route: Paystack secret is missing.');
      return json(
        { success: false, error: 'Payment service is not configured.' },
        500
      );
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return json(
        { success: false, error: 'Invalid JSON request.' },
        400
      );
    }

    if (!body || typeof body !== 'object') {
      return json(
        { success: false, error: 'Invalid request.' },
        400
      );
    }

    const input = body as Record<string, unknown>;

    const reference =
      typeof input.reference === 'string'
        ? input.reference.trim()
        : typeof input.payment_ref === 'string'
          ? input.payment_ref.trim()
          : '';

    const suppliedEmail =
      typeof input.email === 'string'
        ? input.email.trim().toLowerCase()
        : '';

    if (
      !reference ||
      reference.length > 200 ||
      !/^[a-zA-Z0-9._=-]+$/.test(reference)
    ) {
      return json(
        { success: false, error: 'A valid payment reference is required.' },
        400
      );
    }

    if (!validEmail(suppliedEmail)) {
      return json(
        { success: false, error: 'A valid customer email is required.' },
        400
      );
    }

    // Verify the transaction directly with Paystack.
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!verifyResponse.ok) {
      console.error('Paystack verification request failed:', verifyResponse.status);

      return json(
        { success: false, error: 'Unable to verify payment. Please try again.' },
        502
      );
    }

    const result = await verifyResponse.json();
    const transaction = result?.data;

    if (
      result?.status !== true ||
      transaction?.status !== 'success' ||
      transaction?.reference !== reference
    ) {
      return json(
        { success: false, error: 'Payment has not been verified as successful.' },
        400
      );
    }

    if (transaction.currency !== 'NGN') {
      return json(
        { success: false, error: 'Payment currency must be NGN.' },
        400
      );
    }

    const verifiedEmail =
      typeof transaction.customer?.email === 'string'
        ? transaction.customer.email.trim().toLowerCase()
        : '';

    if (!verifiedEmail || verifiedEmail !== suppliedEmail) {
      return json(
        { success: false, error: 'The payment email does not match.' },
        400
      );
    }

    // Derive credits exclusively from the verified amount.
    // Do not accept credits or prices from the browser.
    const amountKobo = transaction.amount;

    const packageEntry = Object.entries(PACKAGES).find(
      ([, item]) => item.amountKobo === amountKobo
    );

    if (!packageEntry) {
      return json(
        {
          success: false,
          error: 'The verified amount does not match an approved package.',
        },
        400
      );
    }

    const [packageId, selectedPackage] = packageEntry;

    // Idempotency check. A database UNIQUE constraint on payment_ref
    // is also required to protect against concurrent requests.
    const { data: existing, error: lookupError } =
      await supabaseAdmin
        .from('api_keys')
        .select('id, email, key_prefix, credits_total, is_active')
        .eq('payment_ref', reference)
        .maybeSingle();

    if (lookupError) {
      console.error('Payment reference lookup failed:', lookupError.message);

      return json(
        { success: false, error: 'Unable to check payment record.' },
        500
      );
    }

    if (existing) {
      return json(
        {
          success: false,
          error: 'This payment has already been processed.',
          reference,
        },
        409
      );
    }

    // Generate the API key and store only its SHA-256 hash.
    // The customer sees the raw key only in this successful response.
    const rawKey = `mnp_${crypto.randomBytes(32).toString('hex')}`;

    const keyHash = crypto
      .createHash('sha256')
      .update(rawKey, 'utf8')
      .digest('hex');

    const keyPrefix = rawKey.slice(0, 12);

    const { error: insertError } = await supabaseAdmin
      .from('api_keys')
      .insert({
        name: `${selectedPackage.name} - ${verifiedEmail}`,
        email: verifiedEmail,

        // This column stores the hash, not the raw API key.
        key_hash_sha256: keyHash,
        key_prefix: keyPrefix,

        credits_total: selectedPackage.credits,
        credits_remaining: selectedPackage.credits,
        credits_used: 0,

        is_active: false,
        is_exhausted: false,
        payment_ref: reference,
      });

    if (insertError) {
      // A UNIQUE constraint on payment_ref must be added in the database.
      if (insertError.code === '23505') {
        return json(
          {
            success: false,
            error: 'This payment has already been processed.',
          },
          409
        );
      }

      console.error('API key insert failed:', insertError.message);

      return json(
        {
          success: false,
          error: 'Payment was verified, but key creation failed. Contact support with your payment reference.',
          reference,
        },
        500
      );
    }

    return json({
      success: true,
      api_key: rawKey,
      email: verifiedEmail,
      credits: selectedPackage.credits,
      package: selectedPackage.name,
      package_id: packageId,
      amount: amountKobo / 100,
      reference,
      status: 'pending_approval',
      message: 'Payment verified. Your API key is awaiting chairman approval. Save your key securely now.',
    });
  } catch (error) {
    console.error(
      'Paystack verification error:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return json(
      { success: false, error: 'An unexpected payment error occurred.' },
      500
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}