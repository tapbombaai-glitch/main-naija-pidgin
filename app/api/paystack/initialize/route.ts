import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { packageId, email, userId } = await req.json();

    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: "Add PAYSTACK_SECRET_KEY in Render Environment Variables" },
        { status: 400 }
      );
    }

    const prices: Record<string, number> = {
      starter: 5000,
      growth: 10000,
      scale: 50000,
      pro: 5000,
    };

    const amountNaira = prices[packageId] || 5000;
    const amountKobo = amountNaira * 100;

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_URL ||
      "https://main-naija-pidgin.onrender.com";

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email || "customer@mainnaija.com",
        amount: amountKobo,
        currency: "NGN",
        callback_url: `${baseUrl}/api/paystack/verify?packageId=${packageId}&userId=${userId}`,
        metadata: { packageId, userId },
      }),
    });

    const data = await res.json();

    if (!data.status) {
      return NextResponse.json(
        { error: data.message || "Paystack init failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}