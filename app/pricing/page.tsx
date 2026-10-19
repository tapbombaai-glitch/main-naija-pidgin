import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const reference = searchParams.get("reference")
  
  const secret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET || process.env.NEXT_PUBLIC_PAYSTACK_SECRET

  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}` }
  })

  const data = await res.json()
  
  if(data.data?.status === "success") {
    // Generate API key here
    const apiKey = `verify_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`
    // Save to your DB
    return NextResponse.redirect(`https://your-site.vercel.app/success?key=${apiKey}&plan=${data.data.metadata.plan}`)
  }

  return NextResponse.redirect(`https://your-site.vercel.app/pricing?error=payment_failed`)
}