"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const searchParams = useSearchParams();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const status = searchParams.get("status");

  useEffect(() => {
    let cancelled = false;
    async function loadKey() {
      if (status !== "pending_approval") return;
      setLoading(true);
      try {
        const r = await fetch("/api/keys/deliver-once", { cache: "no-store" });
        const d = await r.json();
        if (cancelled) return;
        if (r.ok && d.api_key) setApiKey(d.api_key);
        else setMessage(d.error || "Key already delivered.");
      } catch {
        if (!cancelled) setMessage("Failed to load key.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadKey();
    return () => { cancelled = true; };
  }, [status]);

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setMessage("Copied!");
    } catch {
      setMessage("Copy failed. Copy manually.");
    }
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <h1 className="text-2xl font-bold">Payment Status</h1>
      {status === "pending_approval" && (
        <div className="mt-4 border border-yellow-600 bg-yellow-900/30 p-4 rounded">
          <h2 className="font-bold text-yellow-400">Payment Verified</h2>
          <p className="text-sm mt-2">Pending Chairman tapbomba.ai@gmail.com approval.</p>
        </div>
      )}
      {loading && <p className="mt-6 text-zinc-400">Loading key...</p>}
      {apiKey && (
        <div className="mt-6 border border-zinc-700 bg-zinc-900 p-4 rounded">
          <p className="text-green-400 font-bold">Your Key - Copy Now (One-Time)</p>
          <p className="mt-3 font-mono text-sm break-all">{apiKey}</p>
          <button onClick={copyKey} className="mt-4 bg-green-700 px-4 py-2 rounded">Copy</button>
        </div>
      )}
      {message && <p className="mt-6 text-zinc-400">{message}</p>}
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black p-8 text-white">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}