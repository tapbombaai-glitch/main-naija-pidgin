import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { packageId, email, userId } = await req.json();
    
    const prices: any = {
      starter: 5000, pro: 5000, '1k': 5000,
      growth: 10000, '2k': 10000,
      scale: 50000, '10k': 50000,
    };
    const amount = prices[packageId] || 5000;

    const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email || 'customer@mainnaija.com',
        amount: amount * 100, // Paystack uses kobo
        metadata: { packageId, userId, custom: packageId },
        callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://main-naija-pidgin.onrender.com'}/api/paystack/verify`,
      }),
    });

    const data = await paystackRes.json();
    if (data.status) {
      return NextResponse.json({ authorization_url: data.data.authorization_url, reference: data.data.reference });
    } else {
      // Fallback if no Paystack key set — still show success for testing
      return NextResponse.json({ error: 'Add PAYSTACK_SECRET_KEY in Render Env. ' + (data.message || '') }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}