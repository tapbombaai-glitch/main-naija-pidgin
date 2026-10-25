// app/api/paystack/verify/route.ts
// Main Naija Pidgin — Paystack callback
// Delegates payment verification and API-key creation to /api/paystack.

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (!configured) {
    throw new Error('NEXT_PUBLIC_SITE_URL is not configured.');
  }

  return configured.replace(/\/+$/, '');
}

export async function GET(req: NextRequest) {
  try {
    const siteUrl = getSiteUrl();
    const reference = req.nextUrl.searchParams.get('reference');

    if (!reference) {
      return NextResponse.redirect(
        new URL('/api-access?error=no_reference', siteUrl)
      );
    }

    // Paystack must have a configured secret before verification.
    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error('PAYSTACK_SECRET_KEY is missing.');

      return NextResponse.redirect(
        new URL('/api-access?error=payment_configuration', siteUrl)
      );
    }

    // Do not generate or store API keys in this callback.
    // The payment verification endpoint is the single key-creation path.
    const response = await fetch(
      new URL('/api/paystack', siteUrl),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference,
          email: req.nextUrl.searchParams.get('email') ?? '',
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(20000),
      }
    );

    const result = await response.json();

    if (!response.ok || result.success !== true) {
      const errorCode =
        response.status === 409
          ? 'payment_already_processed'
          : 'payment_verification_failed';

      return NextResponse.redirect(
        new URL(`/api-access?error=${errorCode}`, siteUrl)
      );
    }

    // Do not place the raw API key in a URL.
    // The success page should retrieve the result through a secure,
    // authenticated flow instead of accepting a key query parameter.
    return NextResponse.redirect(
      new URL('/success?payment=verified', siteUrl)
    );
  } catch (error) {
    console.error(
      'Paystack callback failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (configuredUrl) {
      return NextResponse.redirect(
        new URL('/api-access?error=verification_error', configuredUrl)
      );
    }

    return NextResponse.json(
      { success: false, error: 'Payment verification could not be completed.' },
      { status: 500 }
    );
  }
}