"use client";
import { useState } from "react";
import Link from "next/link";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export default function ChairmanLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (email.trim().toLowerCase() !== CHAIRMAN_EMAIL) {
      setError("This panel na Chairman only. Worker use Worker login.");
      return;
    }

    if (email && password) {
      window.location.href = "/admin";
    } else {
      setError("Fill email and password");
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#000", color: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <Link href="/" style={{ color: "#22c55e", fontSize: "14px", textDecoration: "none" }}>← Back to Home</Link>
        
        <div style={{ marginTop: "20px", border: "1px solid #222", borderRadius: "16px", padding: "24px", background: "#0a0a0a" }}>
          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "40px" }}>👑</div>
            <div style={{ color: "#22c55e", fontSize: "12px", letterSpacing: "2px", marginTop: "8px" }}>ADMINISTRATION</div>
            <h1 style={{ fontSize: "24px", marginTop: "8px" }}>Chairman Panel</h1>
            <p style={{ color: "#888", fontSize: "13px", marginTop: "4px" }}>Chairman only - tapbomba.ai@gmail.com</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "13px", color: "#aaa" }}>Chairman Email</label>
              <input type="email" placeholder="tapbomba.ai@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", marginTop: "6px", padding: "12px", borderRadius: "10px", border: "1px solid #333", background: "#111", color: "white" }} />
            </div>
            <div>
              <label style={{ fontSize: "13px", color: "#aaa" }}>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", marginTop: "6px", padding: "12px", borderRadius: "10px", border: "1px solid #333", background: "#111", color: "white" }} />
            </div>

            {error && <p style={{ color: '#ff5555', background: '#2a1212', padding: '10px', borderRadius: '8px', fontSize: '13px', border: '1px solid #5a2222' }}>{error}</p>}

            <button type="submit" style={{ padding: "14px", background: "#22c55e", color: "black", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
              Chairman Login →
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "16px", color: "#555", fontSize: "11px" }}>MAIN NAIJA PIDGIN © 2026 - Build Fixed ✅</div>
        </div>
      </div>
    </main>
  );
}