import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const reference = searchParams.get("reference")
    
    if (!reference) {
      return NextResponse.redirect(`https://pidgin-voice.vercel.app/pricing?error=no_reference`)
    }

    const secret = process.env.PAYSTACK_SECRET_KEY
    
    if (!secret) {
      console.error("PAYSTACK_SECRET_KEY missing")
      return NextResponse.redirect(`https://pidgin-voice.vercel.app/pricing?error=config`)
    }

    // Verify payment from Paystack
    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { 
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json"
      }
    })

    const data = await res.json()
    console.log("Paystack verify:", data)

    if (data.data?.status === "success") {
      const plan = data.data.metadata?.plan || "Starter"
      const email = data.data.customer?.email || "unknown@email.com"
      
      let limit = 10000
      if (plan === "Pro") limit = 50000
      if (plan === "Enterprise") limit = 1000000

      // Generate API Key
      const apiKey = `verify_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`

      // Save to Supabase api_users table
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { error } = await supabase.from('api_users').insert({
          email: email,
          api_key: apiKey,
          plan: plan,
          request_limit: limit,
          requests_used: 0
        })

        if (error) {
          console.error("Supabase save error:", error)
        } else {
          console.log("Saved to api_users:", email, apiKey)
        }
      }

      // Redirect to success page
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pidgin-voice.vercel.app"
      return NextResponse.redirect(`${siteUrl}/success?key=${apiKey}&plan=${plan}`)
    }

    // Payment failed
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pidgin-voice.vercel.app"
    return NextResponse.redirect(`${siteUrl}/pricing?error=payment_failed`)

  } catch (error) {
    console.error("Verify error:", error)
    return NextResponse.redirect(`https://pidgin-voice.vercel.app/pricing?error=server`)
  }
}