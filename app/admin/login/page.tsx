"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import "./login.css";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export default function ChairmanLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!isSupabaseConfigured) {
      setError("Supabase not configured in Render");
      setLoading(false);
      return;
    }

    // Check Chairman email first - Worker no fit enter here
    if (email.trim().toLowerCase() !== CHAIRMAN_EMAIL) {
      setError("This panel na Chairman only. Worker use Worker login.");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Success - go to Chairman dashboard ONLY
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <main className="loginPage">
      <div className="loginContent">
        <Link href="/" className="backLink">← Back to Home</Link>
        
        <div className="loginCard">
          <div className="loginHeader">
            <div className="crownIcon">👑</div>
            <div className="adminLabel">ADMINISTRATION - SEPARATE FROM WORKER</div>
            <h1>Chairman Panel</h1>
            <p>Login to review recordings and manage platform</p>
          </div>

          <form onSubmit={handleLogin} className="loginForm">
            <div className="inputGroup">
              <label>Chairman Email</label>
              <input 
                type="email" 
                placeholder="tapbomba.ai@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="inputGroup">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p style={{color:'#ff4444', fontSize:'13px', marginBottom:'10px', background:'#3a1717', padding:'10px', borderRadius:'8px'}}>{error}</p>}

            <button type="submit" className="loginBtn" disabled={loading}>
              {loading ? "Checking Chairman..." : "Chairman Login →"}
            </button>
          </form>

          <div className="loginFooter">
            <span>MAIN NAIJA PIDGIN © 2026 - Chairman Only</span>
          </div>
        </div>
      </div>
    </main>
  );
}