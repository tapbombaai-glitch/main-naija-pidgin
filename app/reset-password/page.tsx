"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import "../login/login.css";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("Invalid or expired reset link. Request new link.");
      }
    };
    checkSession();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords no match");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else {
        setMessage("Password don reset! Redirecting to login...");
        setTimeout(() => router.push("/login"), 2000);
      }
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
            <div className="crownIcon">🔒</div>
            <div className="adminLabel">SET NEW PASSWORD</div>
            <h1>Reset Password</h1>
            <p>Enter your new password</p>
          </div>
          <form onSubmit={handleUpdate} className="loginForm">
            <div className="inputGroup">
              <label>New Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
            </div>
            <div className="inputGroup">
              <label>Confirm Password</label>
              <input type="password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={loading} />
            </div>
            {error && <p style={{color:'#ff4444', background:'#3a1717', padding:'10px', borderRadius:'8px', fontSize:'13px'}}>{error}</p>}
            {message && <p style={{color:'#00d084', background:'#0a2a1a', padding:'10px', borderRadius:'8px', fontSize:'13px'}}>{message}</p>}
            <button type="submit" className="loginBtn" disabled={loading}>{loading ? "Updating..." : "Update Password →"}</button>
          </form>
          <div style={{textAlign:'center', marginTop:'16px'}}>
            <Link href="/forgot-password" style={{color:'#aaa', fontSize:'13px'}}>Request new link</Link>
          </div>
        </div>
      </div>
    </main>
  );
}