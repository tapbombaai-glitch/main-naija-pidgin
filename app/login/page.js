"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "./login.css";

export default function ChairmanLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const ALLOWED_CHAIRMAN = ["tapbomba.ai@gmail.com"];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const normalizedEmail = email.trim().toLowerCase();

    // ONLY Chairman allowed here
    if (!ALLOWED_CHAIRMAN.includes(normalizedEmail)) {
      setError("Access Denied: Na Chairman email only dey allowed here! Workers use /worker-login");
      return;
    }

    if (!password) {
      setError("Abeg enter password");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        // SUCCESS — Force refresh so middleware saves session, then go dashboard
        router.refresh();
        // Use hard redirect to break any loop
        window.location.href = "/admin/dashboard";
      } else {
        setError("Login failed — no user returned");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
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
            <div className="adminLabel">CHAIRMAN ONLY</div>
            <h1>Chairman Login</h1>
          </div>
          <form onSubmit={handleLogin} className="loginForm">
            <div className="inputGroup">
              <label>Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="tapbomba.ai@gmail.com"
                required 
                disabled={loading} 
              />
            </div>
            <div className="inputGroup">
              <label>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password"
                required 
                disabled={loading} 
              />
            </div>
            {error && <p style={{color:'#ff4444', background:'#3a1717', padding:'12px', borderRadius:'8px', fontSize:'13px', border:'1px solid #5a1f1f'}}>{error}</p>}
            <button type="submit" className="loginBtn" disabled={loading}>
              {loading ? "Logging in..." : "Enter Chairman Panel →"}
            </button>
          </form>
          <div style={{textAlign:'center', marginTop:'16px'}}>
            <Link href="/worker-login" style={{color:'#00d084', fontSize:'13px'}}>Worker Login →</Link>
            <span style={{margin:'0 10px', color:'#666'}}>|</span>
            <Link href="/forgot-password" style={{color:'#aaa', fontSize:'13px'}}>Forgot Password?</Link>
          </div>
        </div>
      </div>
    </main>
  );
}