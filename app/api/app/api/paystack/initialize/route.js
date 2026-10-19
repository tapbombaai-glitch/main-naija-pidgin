import { NextResponse } from "next/server"

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get("email")
  const amount = searchParams.get("amount") || "5000"
  
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    return NextResponse.json({ error: "PAYSTACK_SECRET_KEY missing" }, { status: 500 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://main-naija-pidgin.vercel.app"

  // Initialize Paystack transaction
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: email,
      amount: parseInt(amount) * 100, // kobo
      currency: "NGN",
      callback_url: `${siteUrl}/api/paystack/verify`,
      metadata: { plan: "sk_live_ ₦5,000", custom_fields: [{ display_name: "Plan", variable_name: "plan", value: "sk_live_ ₦5,000" }] }
    })
  })

  const data = await res.json()
  
  if (data.status && data.data?.authorization_url) {
    return NextResponse.redirect(data.data.authorization_url)
  } else {
    return NextResponse.json({ error: "Failed to initialize Paystack", details: data }, { status: 400 })
  }
}

export async function POST(req) {
  const { email, amount } = await req.json()
  const secret = process.env.PAYSTACK_SECRET_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://main-naija-pidgin.vercel.app"

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      amount: (amount || 5000) * 100,
      currency: "NGN",
      callback_url: `${siteUrl}/api/paystack/verify`,
      metadata: { plan: "sk_live_ ₦5,000" }
    })
  })
  const data = await res.json()
  return NextResponse.json(data)
}