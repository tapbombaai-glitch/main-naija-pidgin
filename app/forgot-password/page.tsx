"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import "../login/login.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Put your email first");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setMessage(`Reset link don send to ${normalizedEmail} — Check email (and spam folder)!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="loginPage">
      <div className="loginContent">
        <Link href="/" className="backLink">← Back to Home</Link>
        <div className="loginCard">
          <div className="loginHeader">
            <div className="crownIcon">🔑</div>
            <div className="adminLabel">PASSWORD RESET</div>
            <h1>Forgot Password?</h1>
            <p>We go send reset link to your email</p>
          </div>
          <form onSubmit={handleReset} className="loginForm">
            <div className="inputGroup">
              <label>Your Email</label>
              <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
            </div>
            {error && <p style={{color:'#ff4444', background:'#3a1717', padding:'10px', borderRadius:'8px', fontSize:'13px'}}>{error}</p>}
            {message && <p style={{color:'#00d084', background:'#0a2a1a', padding:'10px', borderRadius:'8px', fontSize:'13px'}}>{message}</p>}
            <button type="submit" className="loginBtn" disabled={loading}>{loading ? "Sending..." : "Send Reset Link →"}</button>
          </form>
          <div style={{textAlign:'center', marginTop:'16px'}}>
            <Link href="/login" style={{color:'#d4af37', fontSize:'13px', marginRight:'15px'}}>Chairman Login</Link>
            <Link href="/worker-login" style={{color:'#00d084', fontSize:'13px'}}>Worker Login</Link>
          </div>
        </div>
      </div>
    </main>
  );
}