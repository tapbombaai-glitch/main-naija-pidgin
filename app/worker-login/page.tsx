"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "./login.css";

export default function WorkerLogin() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Chairman no fit use worker login
    if (email.trim().toLowerCase() === "tapbomba.ai@gmail.com") {
      setError("Chairman no fit use Worker login. Use Chairman Panel.");
      setLoading(false);
      return;
    }

    if (!email || !password) {
      setError("Fill email and password");
      setLoading(false);
      return;
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (loginError) {
      setError("❌ " + loginError.message + " — If you forget password, click Forgot Password below");
      setLoading(false);
      return;
    }

    if (data.user) {
      window.location.href = "/worker/dashboard";
    }

    setLoading(false);
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
              {/* FORGOT PASSWORD LINK - FOR ALL WORKERS */}
              <div style={{textAlign:'right', marginTop:'8px'}}>
                <Link href="/forgot-password" style={{color:'#00d084', fontSize:'13px', textDecoration:'underline'}}>
                  Forgot Password?
                </Link>
              </div>
            </div>
            {error && <p style={{color:'#ff4444', background:'#3a1717', padding:'10px', borderRadius:'8px', fontSize:'13px'}}>{error}</p>}
            <button type="submit" className="workerBtn" disabled={loading}>
              {loading ? "Checking..." : "Open Worker Workspace →"}
            </button>
          </form>
          <div className="loginFooter">
            <p>Separate login - No Chairman clash</p>
            <p style={{marginTop:'8px', fontSize:'12px', opacity:0.7}}>
              Forgot password? <Link href="/forgot-password" style={{color:'#00d084'}}>Reset am here</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}