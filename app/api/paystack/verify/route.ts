import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const reference = searchParams.get("reference")
  if (!reference) return NextResponse.redirect("https://pidgin-voice.vercel.app/pricing?error=no_ref")
  const secret = process.env.PAYSTACK_SECRET_KEY
  const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}` }
  })
  const data = await res.json()
  if (data.data?.status === "success") {
    const plan = data.data.metadata?.plan || "Starter"
    const email = data.data.customer?.email || "customer@verify.ng"
    let limit = 10000
    if (plan === "Pro") limit = 50000
    if (plan === "Enterprise") limit = 1000000
    const apiKey = `verify_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    await supabase.from('api_users').insert({ email, api_key: apiKey, plan, request_limit: limit, requests_used: 0 })
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pidgin-voice.vercel.app"
    return NextResponse.redirect(`${siteUrl}/success?key=${apiKey}&plan=${plan}`)
  }
  return NextResponse.redirect("https://pidgin-voice.vercel.app/pricing?error=failed")
}