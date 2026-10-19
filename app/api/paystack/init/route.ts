import { NextResponse } from "next/server"
export async function POST(req: Request) {
  const { name, price } = await req.json()
  const secret = process.env.PAYSTACK_SECRET_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pidgin-voice.vercel.app"
  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "customer@verify.ng", amount: price * 100, metadata: { plan: name }, callback_url: `${siteUrl}/api/paystack/verify` })
  })
  const data = await res.json()
  return NextResponse.json({ url: data.data.authorization_url })
}