"use client"
import { useState } from "react"
export default function Pricing() {
  const [loading, setLoading] = useState("")
  const plans = [
    { name: "Starter", price: 5000, limit: "10k requests" },
    { name: "Pro", price: 15000, limit: "50k requests" },
    { name: "Enterprise", price: 50000, limit: "1M requests" }
  ]
  const buy = async (plan: any) => {
    setLoading(plan.name)
    const res = await fetch("/api/paystack/init", {
      method: "POST",
      body: JSON.stringify({ name: plan.name, price: plan.price })
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setLoading("")
  }
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Choose Your Plan</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((p) => (
          <div key={p.name} className="border border-white/20 p-6 rounded-2xl text-center">
            <h2 className="text-2xl font-bold mb-2">{p.name}</h2>
            <p className="text-3xl mb-2">₦{p.price.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mb-6">{p.limit}</p>
            <button onClick={() => buy(p)} className="w-full bg-white text-black py-3 rounded-xl font-bold">
              {loading === p.name ? "Loading..." : "Buy Now"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}