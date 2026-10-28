"use client";
import { useState } from "react";
import Link from "next/link";
import "./login.css";

export default function WorkerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (email.trim().toLowerCase() === "tapbomba.ai@gmail.com") {
      setError("Chairman no fit use Worker login. Use Chairman Panel.");
      return;
    }

    if (email && password) {
      window.location.href = "/worker/dashboard";
    } else {
      setError("Fill email and password");
    }
  };

  return (
    <main className="workerLoginPage">
      <div className="loginContent">
        <Link href="/" className="backLink">← Back to Home</Link>
        <div className="loginCard">
          <div className="loginHeader">
            <div className="micIcon">🎙️</div>
            <div className="workerLabel">WORKER PANEL - SEPARATE</div>
            <h1>Worker Login</h1>
            <p>Worker only - Separate from Chairman</p>
          </div>
          <form onSubmit={handleLogin} className="loginForm">
            <div className="inputGroup">
              <label>Worker Email</label>
              <input type="email" placeholder="worker@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="inputGroup">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p style={{color:'#ff4444', background:'#3a1717', padding:'10px', borderRadius:'8px', fontSize:'13px'}}>{error}</p>}
            <button type="submit" className="workerBtn">Open Worker Workspace →</button>
          </form>
          <div className="loginFooter">Separate login - No Chairman clash</div>
        </div>
      </div>
    </main>
  );
}