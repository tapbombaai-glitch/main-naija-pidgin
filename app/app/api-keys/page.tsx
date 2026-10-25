"use client"
import { useState, useEffect } from 'react'

export default function ApiKeysPage() {
  const [freeKey, setFreeKey] = useState("")
  const [paidKey, setPaidKey] = useState("")
  const [showPaywall, setShowPaywall] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem('currentUser')
    if (saved) {
      try {
        const u = JSON.parse(saved)
        setUserEmail(u.email)
        setUserName(u.name || "Customer")
      } catch {}
    }
  }, [])

  // ✅ SECURE: Call backend /api/free/collect
  const getFreeKey = async () => {
    if (!userEmail) {
      alert("Oga login first for /user/login")
      window.location.href = "/user/login"
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/free/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, name: userName })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      setFreeKey(data.api_key)
      alert(`✅ REAL Free key: ${data.api_key}\n100 credits - E don save for api_keys table!`)
    } catch (e:any) {
      if (e.message.includes('already claimed') || e.message.includes('FREE_ALREADY_CLAIMED')) {
        alert("You don already claim free key before! Use your old key or buy paid!")
      } else {
        alert("Error: " + e.message)
      }
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

  // ✅ SECURE: Paystack frontend + backend verify /api/paystack
  const handlePaystackPayment = async () => {
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).PaystackPop) {
      // @ts-ignore
      const handler = (window as any).PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: userEmail,
        amount: 500000, // 5k - but SERVER will verify exact amount!
        currency: "NGN",
        ref: "MPJ_" + Date.now(),
        callback: async function(response: any) {
          // Now call YOUR SECURE backend to verify!
          const res = await fetch('/api/paystack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, payment_ref: response.reference, reference: response.reference })
          })
          const data = await res.json()
          if (res.ok) {
            setPaidKey(data.api_key || data.full_key)
            alert(`✅ Verified ₦${data.amount} - ${data.credits} credits!\nKey: ${data.api_key}\nStatus: ${data.status} - Wait Chairman approval!`)
            setShowPaywall(false)
          } else {
            alert("Paystack verify fail: " + data.error)
          }
        },
        onClose: function() { alert("You close paystack - you no pay yet") }
      })
      handler.openIframe()
    } else {
      alert("Paystack script no load - Add <script src='https://js.paystack.co/v1/inline.js'></script> to layout")
    }
  }

  return (
    <div style={{padding: "20px", maxWidth: "600px", margin: "auto", fontFamily: 'sans-serif'}}>
      <h1>How Far, Choose Your API Key - Na Naija Pidgin API</h1>
      <p style={{fontSize: 12, color: 'green'}}>✅ SECURE BACKEND CONNECTED - V7 BALANCED</p>
      {userEmail && <p style={{fontSize: 12}}>Logged in as: {userEmail}</p>}
      
      <div style={{border: "2px solid green", padding: "20px", margin: "20px 0", borderRadius: "10px"}}>
        <h2>🆓 FREE TEST KEY</h2>
        <p>100 free calls - For testing</p>
        <button onClick={getFreeKey} disabled={loading} style={{background: "green", color: "white", padding: "12px 20px", borderRadius: 8, border: 'none', width: '100%'}}>
          {loading ? "Creating SECURE key..." : "Get Free Test Key - SECURE"}
        </button>
        {freeKey && <p style={{background: "#e8f5e9", padding: "10px", wordBreak: 'break-all', marginTop: 10}}>Your SECURE Free Key: <b>{freeKey}</b></p>}
      </div>

      <div style={{border: "2px solid orange", padding: "20px", margin: "20px 0", borderRadius: "10px"}}>
        <h2>💰 PAID MONEY KEY</h2>
        <p>1k=₦5k, 5k=₦25k - Chairman approval</p>
        {!showPaywall ? (
          <button onClick={buyPaidKey} style={{background: "orange", color: "white", padding: "12px 20px", borderRadius: 8, border: 'none', width: '100%'}}>
            Buy Paid Key - SECURE Paystack
          </button>
        ) : (
          <div style={{background: "#fff3e0", padding: "15px", borderRadius: 8}}>
            <p>🚫 Oga you gats pay first - Server go verify amount!</p>
            <button onClick={handlePaystackPayment} style={{background: "black", color: "white", padding: "12px 20px", borderRadius: 8, border: 'none', width: '100%'}}>
              Pay Now With SECURE Paystack
            </button>
            <button onClick={() => setShowPaywall(false)} style={{background: "#ccc", padding: "8px", marginTop: 8, width: '100%', borderRadius: 8, border: 'none'}}>Cancel</button>
          </div>
        )}
        {paidKey && <p style={{background: "#fff3e0", padding: "10px", wordBreak: 'break-all', marginTop: 10}}>Your SECURE Paid Key: <b>{paidKey}</b></p>}
      </div>
    </div>
  )
}