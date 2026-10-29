"use client";
import Link from "next/link";

export default function WorkerPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#000000", color: "white", padding: "20px", fontFamily: "sans-serif" }}>
      <Link href="/" style={{ color: "#22c55e", fontSize: "14px", textDecoration: "none" }}>← Back to Home</Link>
      
      <div style={{ maxWidth: "600px", margin: "40px auto", border: "1px solid #222", borderRadius: "16px", padding: "24px", background: "#0a0a0a" }}>
        <h1 style={{ color: "#22c55e", fontSize: "24px" }}>🎙️ Worker Panel</h1>
        <p style={{ color: "#aaa", marginTop: "8px" }}>Listen to assigned sentences, record your voice, and submit to the Chairman.</p>

        <div style={{ marginTop: "24px", padding: "16px", background: "#111", borderRadius: "12px", border: "1px solid #222" }}>
          <p style={{ fontWeight: "bold" }}>Today's Task:</p>
          <p style={{ fontSize: "18px", marginTop: "8px", color: "#22c55e" }}>"How you dey? How body?"</p>
          
          <button style={{ marginTop: "20px", width: "100%", padding: "16px", background: "#22c55e", color: "black", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "18px", cursor: "pointer" }}>
            🎤 Press to Record
          </button>
          <button style={{ marginTop: "12px", width: "100%", padding: "12px", background: "#222", color: "white", border: "1px solid #333", borderRadius: "12px" }}>
            Submit to Chairman
          </button>
        </div>

        <p style={{ marginTop: "20px", color: "#22c55e", fontSize: "12px", textAlign: "center" }}>✓ No more 404 - Worker workspace is live!</p>
      </div>
    </div>
  );
}