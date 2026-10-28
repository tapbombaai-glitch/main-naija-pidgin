"use client";
import { useState } from "react";
import Link from "next/link";
import "./login.css";

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
      window.location.href = "/admin/dashboard";
    } else {
      setError("Fill email and password");
    }
  };

  return (
    <main className="loginPage">
      <div className="loginContent">
        <Link href="/" className="backLink">← Back to Home</Link>
        <div className="loginCard">
          <div className="loginHeader">
            <div className="crownIcon">👑</div>
            <div className="adminLabel">ADMINISTRATION</div>
            <h1>Chairman Panel</h1>
            <p>Chairman only - tapbomba.ai@gmail.com</p>
          </div>
          <form onSubmit={handleLogin} className="loginForm">
            <div className="inputGroup">
              <label>Chairman Email</label>
              <input type="email" placeholder="tapbomba.ai@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="inputGroup">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p style={{color:'#ff4444', background:'#3a1717', padding:'10px', borderRadius:'8px', fontSize:'13px'}}>{error}</p>}
            <button type="submit" className="loginBtn">Chairman Login →</button>
          </form>
          <div className="loginFooter">MAIN NAIJA PIDGIN © 2026 - No Supabase needed now</div>
        </div>
      </div>
    </main>
  );
}