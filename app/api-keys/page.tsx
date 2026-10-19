"use client"
import { useState } from 'react'

export default function ApiKeysPage() {
  const [freeKey, setFreeKey] = useState("")
  const [paidKey, setPaidKey] = useState("")
  const [showPaywall, setShowPaywall] = useState(false)

  const getFreeKey = async () => {
    // Free key - No pay!
    const key = "sk_test_free_" + Math.random().toString(36).substring(7)
    setFreeKey(key)
    // Save to Supabase: api_users table with plan: free, credits: 100
    alert("Oga your free test key be this: " + key + "\nYou get 100 free calls for testing!")
  }

  const buyPaidKey = () => {
    // Show Paystack paywall
    setShowPaywall(true)
  }

  const handlePaystackPayment = () => {
    // After Paystack success
    const key = "sk_live_paid_" + Math.random().toString(36).substring(7)
    setPaidKey(key)
    alert("You don pay! Na your secret money key be this: " + key)
    setShowPaywall(false)
  }

  return (
    <div style={{padding: "20px", maxWidth: "600px", margin: "auto"}}>
      <h1>How Far, Choose Your API Key - Na Naija Pidgin API</h1>
      
      {/* FREE KEY */}
      <div style={{border: "2px solid green", padding: "20px", margin: "20px 0", borderRadius: "10px"}}>
        <h2>🆓 FREE TEST KEY</h2>
        <p>100 free calls - For testing your website</p>
        <p>No need to pay!</p>
        <button onClick={getFreeKey} style={{background: "green", color: "white", padding: "10px 20px"}}>
          Get Free Test Key
        </button>
        {freeKey && <p style={{background: "#e8f5e9", padding: "10px"}}>Your Free Key: <b>{freeKey}</b></p>}
      </div>

      {/* PAID KEY */}
      <div style={{border: "2px solid orange", padding: "20px", margin: "20px 0", borderRadius: "10px"}}>
        <h2>💰 PAID MONEY KEY</h2>
        <p>10,000 calls - ₦5,000 - For real business</p>
        {!showPaywall ? (
          <button onClick={buyPaidKey} style={{background: "orange", color: "white", padding: "10px 20px"}}>
            Buy Paid Key - ₦5,000
          </button>
        ) : (
          <div style={{background: "#fff3e0", padding: "15px"}}>
            <p>🚫 Oga you gats pay first before you collect secret key!</p>
            <button onClick={handlePaystackPayment} style={{background: "black", color: "white", padding: "10px 20px"}}>
              Pay Now With Paystack
            </button>
          </div>
        )}
        {paidKey && <p style={{background: "#fff3e0", padding: "10px"}}>Your Paid Secret Key: <b>{paidKey}</b></p>}
      </div>

      <p><a href="/api/login">Already get key? Login here → /api/login</a></p>
    </div>
  )
}