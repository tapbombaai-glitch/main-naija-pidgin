"use client";
import { useState } from "react";
import Link from "next/link";
import "../admin/login/login.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email) {
      setError("Put your email first");
      return;
    }

    // === FOR NOW - MOCK (no Supabase) ===
    setMessage(`Reset link don send to ${email} — Check your email! (MOCK - when Supabase dey, real email go send)`);

    // === WHEN SUPABASE DEY - UNCOMMENT THIS ===
    // const { error } = await supabase.auth.resetPasswordForEmail(email, {
    //   redirectTo: `${window.location.origin}/reset-password`,
    // });
    // if (error) setError(error.message);
    // else setMessage("Check your email for reset link!");
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
              <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {error && <p style={{color:'#ff4444', background:'#3a1717', padding:'10px', borderRadius:'8px', fontSize:'13px'}}>{error}</p>}
            {message && <p style={{color:'#00d084', background:'#0a2a1a', padding:'10px', borderRadius:'8px', fontSize:'13px'}}>{message}</p>}
            <button type="submit" className="loginBtn">Send Reset Link →</button>
          </form>
          <div style={{textAlign:'center', marginTop:'16px'}}>
            <Link href="/admin/login" style={{color:'#d4af37', fontSize:'13px', marginRight:'15px'}}>Chairman Login</Link>
            <Link href="/worker-login" style={{color:'#00d084', fontSize:'13px'}}>Worker Login</Link>
          </div>
          <div className="loginFooter">Reset link go expire for 1 hour</div>
        </div>
      </div>
    </main>
  );
}