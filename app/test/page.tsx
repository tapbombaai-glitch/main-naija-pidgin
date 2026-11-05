"use client";
import { useState } from "react";

export default function Test() {
  const [msg, setMsg] = useState("Click to test");
  const check = async () => {
    const r = await fetch("/samples/warri-babe.mp3", { method: "HEAD" });
    if (r.ok) setMsg("✅ YES! warri-babe.mp3 dey for public! E go play now.");
    else setMsg("❌ NO! warri-babe.mp3 never dey for public. Upload am.");
  };
  return (
    <div style={{ padding: 30, background: "#080C08", color: "white", minHeight: "100vh", textAlign: "center" }}>
      <h2>Warri Babe Test</h2>
      <button onClick={check} style={{ background: "#00E676", padding: 15, border: "none", borderRadius: 10, fontWeight: 900 }}>TEST WARRI BABE</button>
      <p style={{ marginTop: 20 }}>{msg}</p>
      <audio controls src="/samples/warri-babe.mp3" style={{ width: "100%", marginTop: 20 }} />
    </div>
  );
}