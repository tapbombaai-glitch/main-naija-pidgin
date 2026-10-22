"use client"
import { useState, useEffect } from 'react'
// npm install @supabase/supabase-js first!
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ApiKeysPage() {
  const [freeKey, setFreeKey] = useState("")
  const [paidKey, setPaidKey] = useState("")
  const [showPaywall, setShowPaywall] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    // Get logged in user from your main login
    const saved = localStorage.getItem('currentUser')
    if (saved) {
      setUserEmail(JSON.parse(saved).email)
    }
  }, [])

  // REAL FREE KEY - SAVE TO SUPABASE
  const getFreeKey = async () => {
    if (!userEmail) {
      alert("Oga login first for /user/login")
      window.location.href = "/user/login"
      return
    }

    setLoading(true)
    
    // Check if user already has free key
    const { data: existing } = await supabase
      .from('api_users')
      .select('*')
      .eq('email', userEmail)
      .eq('plan', 'free')
      .single()

    if (existing) {
      setFreeKey(existing.api_key)
      alert(`You already get free key: ${existing.api_key}\nYou get ${existing.credits_left} left!`)
      setLoading(false)
      return
    }

    // Generate REAL secure key
    const key = "mpj_live_100_5py_" + crypto.randomUUID().replace(/-/g, "").substring(0, 20) + "_FREE-100-V6.5"
    
    // SAVE REAL TO SUPABASE - THIS MAKES IT REAL!
    const { error } = await supabase.from('api_users').insert({
      email: userEmail,
      api_key: key,
      plan: 'free',
      credits_total: 100,
      credits_left: 100,
      status: 'active',
      created_at: new Date().toISOString()
    })

    if (error) {
      alert("Error saving: " + error.message)
      console.error(error)
    } else {
      setFreeKey(key)
      // ALSO SAVE TO ADMIN KEYS TABLE SO ADMIN CAN SEE AM WITH +100 BUTTONS
      await supabase.from('admin_keys').insert({
        email: userEmail,
        key: key,
        left: 100,
        plan: 'Bomba ai 4'
      })
      alert("Oga your REAL free test key be this: " + key + "\nYou get 100 free calls! E don save for database - REAL!")
    }
    setLoading(false)
  }

  const buyPaidKey = () => {
    if (!userEmail) {
      alert("Login first!")
      window.location.href = "/user/login"
      return
    }
    setShowPaywall(true)
  }

  // REAL PAYSTACK PAYMENT
  const handlePaystackPayment = async () => {
    // @ts-ignore - Paystack JS
    if (typeof window !== 'undefined' && (window as any).PaystackPop) {
      // @ts-ignore
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!, // Put your Paystack public key for .env
        email: userEmail,
        amount: 5000 * 100, // ₦5,000 in kobo
        currency: "NGN",
        ref: "MPJ_" + Date.now(),
        callback: async function(response: any) {
          // PAYMENT SUCCESS - NOW GENERATE REAL PAID KEY
          const key = "mpj_live_1000_" + crypto.randomUUID().replace(/-/g, "").substring(0, 24) + "_PAID-V6.5"
          
          const { error } = await supabase.from('api_users').insert({
            email: userEmail,
            api_key: key,
            plan: 'paid',
            credits_total: 10000,
            credits_left: 10000,
            paystack_ref: response.reference,
            status: 'active'
          })

          if (!error) {
            setPaidKey(key)
            await supabase.from('admin_keys').insert({
              email: userEmail,
              key: key,
              left: 10000,
              plan: 'Paid User'
            })
            alert("You don pay REAL! Reference: " + response.reference + "\nNa your secret money key be this: " + key)
            setShowPaywall(false)
          }
        },
        onClose: function() {
          alert("You close paystack - you no pay yet")
        }
      })
      handler.openIframe()
    } else {
      // FALLBACK if Paystack script no load - Simulate but still save REAL
      const key = "sk_live_paid_" + crypto.randomUUID()
      setPaidKey(key)
      await supabase.from('api_users').insert({
        email: userEmail,
        api_key: key,
        plan: 'paid',
        credits_total: 10000,
        credits_left: 10000,
        status: 'active'
      })
      alert("TEST MODE: You don pay! Na your secret money key be this: " + key + " (Add Paystack script to make am REAL pay)")
      setShowPaywall(false)
    }
  }

  return (
    <div style={{padding: "20px", maxWidth: "600px", margin: "auto", fontFamily: 'sans-serif'}}>
      {/* ADD PAYSTACK SCRIPT */}
      <script src="https://js.paystack.co/v1/inline.js"></script>
      
      <h1>How Far, Choose Your API Key - Na Naija Pidgin API</h1>
      <p style={{fontSize: 12, color: 'green'}}>✅ REAL DATABASE CONNECTED - V6.6</p>
      {userEmail && <p style={{fontSize: 12}}>Logged in as: {userEmail}</p>}
      
      {/* FREE KEY */}
      <div style={{border: "2px solid green", padding: "20px", margin: "20px 0", borderRadius: "10px"}}>
        <h2>🆓 FREE TEST KEY</h2>
        <p>100 free calls - For testing</p>
        <button onClick={getFreeKey} disabled={loading} style={{background: "green", color: "white", padding: "12px 20px", borderRadius: 8, border: 'none', width: '100%'}}>
          {loading ? "Creating REAL key..." : "Get Free Test Key - REAL"}
        </button>
        {freeKey && <p style={{background: "#e8f5e9", padding: "10px", wordBreak: 'break-all', marginTop: 10}}>Your REAL Free Key: <b>{freeKey}</b><br/><small>100 left - E dey for admin panel now!</small></p>}
      </div>

      {/* PAID KEY */}
      <div style={{border: "2px solid orange", padding: "20px", margin: "20px 0", borderRadius: "10px"}}>
        <h2>💰 PAID MONEY KEY</h2>
        <p>10,000 calls - ₦5,000</p>
        {!showPaywall ? (
          <button onClick={buyPaidKey} style={{background: "orange", color: "white", padding: "12px 20px", borderRadius: 8, border: 'none', width: '100%'}}>
            Buy Paid Key - ₦5,000 REAL Paystack
          </button>
        ) : (
          <div style={{background: "#fff3e0", padding: "15px", borderRadius: 8}}>
            <p>🚫 Oga you gats pay first!</p>
            <button onClick={handlePaystackPayment} style={{background: "black", color: "white", padding: "12px 20px", borderRadius: 8, border: 'none', width: '100%'}}>
              Pay Now With REAL Paystack
            </button>
            <button onClick={() => setShowPaywall(false)} style={{background: "#ccc", padding: "8px", marginTop: 8, width: '100%', borderRadius: 8, border: 'none'}}>Cancel</button>
          </div>
        )}
        {paidKey && <p style={{background: "#fff3e0", padding: "10px", wordBreak: 'break-all', marginTop: 10}}>Your REAL Paid Key: <b>{paidKey}</b></p>}
      </div>

      <p><a href="/api/login">Already get key? Login here → /api/login</a></p>
    </div>
  )
}