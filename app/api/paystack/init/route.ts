// app/api/paystack/init/route.ts
// Main Naija Pidgin — Secure Paystack Checkout Initialization

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PACKAGES = {
  '1k': { amount: 500000, name: 'Starter 1k', credits: 1000 },
  '2k': { amount: 1000000, name: 'Standard 2k', credits: 2000 },
  '5k': { amount: 2500000, name: 'Professional 5k', credits: 5000 },
  '10k': { amount: 5000000, name: 'Professional 10k', credits: 10000 },
} as const;

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!secret || !siteUrl) {
      console.error('Paystack secret or site URL is missing.');

      return json({
        success: false,
        error: 'Payment service is not configured.',
      }, 500);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return json({
        success: false,
        error: 'Invalid request body.',
      }, 400);
    }

    if (!body || typeof body !== 'object') {
      return json({
        success: false,
        error: 'Invalid request.',
      }, 400);
    }

    const input = body as Record<string, unknown>;

    const email =
      typeof input.email === 'string'
        ? input.email.trim().toLowerCase()
        : '';

    const packageId =
      typeof input.packageId === 'string'
        ? input.packageId
        : typeof input.name === 'string'
          ? input.name
          : '';

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return json({
        success: false,
        error: 'Enter a valid email address.',
      }, 400);
    }

    if (!Object.prototype.hasOwnProperty.call(PACKAGES, packageId)) {
      return json({
        success: false,
        error: 'Select a valid paid package.',
      }, 400);
    }

    const selectedPackage =
      PACKAGES[packageId as keyof typeof PACKAGES];

    const baseUrl = siteUrl.replace(/\/+$/, '');
    const callbackUrl = `${baseUrl}/api/paystack/verify`;

    const response = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: selectedPackage.amount,
          currency: 'NGN',
          callback_url: callbackUrl,
          metadata: {
            package_id: packageId,
            package_name: selectedPackage.name,
            credits: selectedPackage.credits,
          },
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      }
    );

    const result = await response.json();

    if (
      !response.ok ||
      result.status !== true ||
      !result.data?.authorization_url ||
      !result.data?.reference
    ) {
      console.error('Paystack initialization failed:', result.message);

      return json({
        success: false,
        error: 'Could not initialize payment. Please try again.',
      }, 502);
    }

    return json({
      success: true,
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
      package: selectedPackage.name,
      amount: selectedPackage.amount / 100,
    });
  } catch (error) {
    console.error(
      'Payment initialization error:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return json({
      success: false,
      error: 'An unexpected payment initialization error occurred.',
    }, 500);
  }
}