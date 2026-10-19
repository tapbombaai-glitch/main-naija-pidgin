"use client"
import { useSearchParams } from "next/navigation"

export default function Success() {
  const params = useSearchParams()
  const key = params.get("key")
  const plan = params.get("plan")

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="border border-white/20 p-8 rounded-2xl max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4">Payment Successful! 🎉</h1>
        <p className="mb-4">Plan: {plan}</p>
        <p className="text-sm text-gray-400 mb-2">Your API Key:</p>
        <div className="bg-white text-black p-3 rounded-lg font-mono text-sm break-all">
          {key}
        </div>
        <p className="text-xs text-gray-500 mt-4">Copy this key and keep it safe!</p>
      </div>
    </div>
  )
}