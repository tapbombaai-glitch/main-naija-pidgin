import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { name, price } = await req.json()
  
  // Try all possible env names
  const secret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET || process.env.NEXT_PUBLIC_PAYSTACK_SECRET || process.env.NEXT_PUBLIC_PAYSTACK_KEY

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "customer@verify.ng", // You can collect email from form
      amount: price * 100, // Paystack uses kobo
      metadata: { plan: name },
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://your-site.vercel.app"}/api/paystack/verify`
    })
  })

  const data = await res.json()
  return NextResponse.json({ url: data.data?.authorization_url })
}