"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "./login.css"; // if you get css, if not remove this line

export default function ChairmanLogin() {
  const supabase = createClient();
  const [email, setEmail] = useState("tapbomba.ai@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Only Chairman fit use this login
    if (email.trim().toLowerCase() !== CHAIRMAN_EMAIL.toLowerCase()) {
      setError("❌ Only Chairman email allowed here. Workers use Worker Login.");
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
      setError("❌ " + loginError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // SUCCESS - Go Dashboard
      window.location.href = "/admin/dashboard";
    }

    setLoading(false);
  };

  return (
    <main className="workerLoginPage" style={{background:"#0a0a0a"}}>
      <div className="loginContent">
        <Link href="/" className="backLink">← Back to Home</Link>
        <div className="loginCard" style={{borderColor:"#d4af37"}}>
          <div className="loginHeader">
            <div className="micIcon">👑</div>
            <div className="workerLabel" style={{color:"#d4af37"}}>CHAIRMAN PANEL - SECURE</div>
            <h1>Chairman Login</h1>
            <p>Supabase Secured - Chairman Only</p>
          </div>
          <form onSubmit={handleLogin} className="loginForm">
            <div className="inputGroup">
              <label>Chairman Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{borderColor:"#d4af37"}} />
            </div>
            <div className="inputGroup">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p style={{color:'#ff4444', background:'#3a1717', padding:'10px', borderRadius:'8px', fontSize:'13px'}}>{error}</p>}
            <button type="submit" className="workerBtn" disabled={loading} style={{background:"#d4af37", color:"#000"}}>
              {loading ? "Checking Chairman..." : "Enter Chairman Dashboard →"}
            </button>
          </form>
          <div className="loginFooter">
            <p>Secured by Supabase Auth</p>
          </div>
        </div>
      </div>
    </main>
  );
}