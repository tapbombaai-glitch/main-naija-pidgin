"use client";
import Link from "next/link";

export default function WorkerPanelTest() {
  return (
    <div style={{ minHeight: "100vh", background: "black", color: "white", padding: "20px" }}>
      <Link href="/" style={{ color: "#22c55e" }}>← Back Home</Link>
      <h1 style={{ marginTop: "30px", color: "#22c55e" }}>LEVEL 1 TEST - WORKER PANEL</h1>
      <p style={{ marginTop: "10px" }}>If you see this page, 404 don comot! ✅</p>
      <div style={{ marginTop: "20px", padding: "20px", background: "#111", borderRadius: "10px" }}>
        <p>Workers Panel is ALIVE!</p>
        <p>Next we go add login and mic.</p>
      </div>
    </div>
  );
}