import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const reference = searchParams.get("reference")
  
  if (!reference) {
    return NextResponse.redirect("https://main-naija-pidgin.vercel.app/api-access?error=no_ref")
  }
  
  const result = await verifyAndMakeKey(reference)
  
  if (result.success) {
    return NextResponse.redirect(`https://main-naija-pidgin.vercel.app/success?key=${encodeURIComponent(result.key)}&plan=${result.plan}&ref=${reference}`)
  } else {
    return NextResponse.redirect(`https://main-naija-pidgin.vercel.app/api-access?error=${encodeURIComponent(result.error)}`)
  }
}

export async function POST(req) {
  try {
    const { reference, email } = await req.json()
    
    if (!reference) {
      return NextResponse.json({ error: "No reference provided" }, { status: 400 })
    }
    
    const result = await verifyAndMakeKey(reference, email)
    
    if (result.success) {
      return NextResponse.json({ key: result.key, plan: result.plan, limit: result.limit, email: result.email })
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function verifyAndMakeKey(reference, emailFromClient) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  
  if (!secret) {
    return { success: false, error: "PAYSTACK_SECRET_KEY missing in Vercel Env Variables!" }
  }

  // 1. Verify from Paystack
  const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secret}` }
  })
  const verifyData = await verifyRes.json()
  
  if (verifyData.data?.status !== "success") {
    return { success: false, error: "Paystack verification failed: " + (verifyData.message || verifyData.data?.gateway_response || "failed") }
  }

  const email = verifyData.data.customer?.email || emailFromClient || "customer@bomba.ai"
  const amount = verifyData.data.amount // 500000 = ₦5,000
  
  // 2. Generate sk_live_ key for ₦5,000 - YOUR FORMAT!
  const random = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10)
  const apiKey = `sk_live_${random}${Date.now().toString(36)}`
  // Example: sk_live_6bc6cfbfcf9879abc...
  
  // 3. Save to Supabase - Support both tables
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  )

  // Save to api_keys table - For your sk_free_ / sk_live_ system
  try {
    await supabase.from("api_keys").insert({
      name: `PAID ₦5,000 - ${email}`,
      key_hash: apiKey,
      key_prefix: apiKey.substring(0, 20),
      hash: apiKey,
      is_active: true,
      credits: 1000,
      word_count: 0,
      email: email
    })
  } catch (err) {
    console.log("api_keys insert error:", err.message)
  }

  // Also save to api_users - For backward compatibility
  try {
    await supabase.from("api_users").insert({
      email: email,
      api_key: apiKey,
      plan: "sk_live_ ₦5,000",
      request_limit: 1000,
      requests_used: 0
    })
  } catch (err) {
    console.log("api_users insert error:", err.message)
  }

  return { success: true, key: apiKey, plan: "sk_live_ ₦5,000 - 1000 words", limit: 1000, email: email }
}