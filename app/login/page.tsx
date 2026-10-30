"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""), 3000); };

  const loginWithEmail = async () => {
    if (!email || !password) return showToast("Add email & password");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) showToast(error.message);
    else { showToast("✅ Login success!"); window.location.href = "/marketplace"; }
  };

  const signUp = async () => {
    if (!email || !password) return showToast("Add email & password");
    if (password.length < 6) return showToast("Password min 6 chars");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/marketplace` } });
    setLoading(false);
    if (error) showToast(error.message);
    else showToast("✅ Check your email to confirm account!");
  };

  const magicLink = async () => {
    if (!email) return showToast("Add email first");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/marketplace` } });
    setLoading(false);
    if (error) showToast(error.message);
    else showToast("✅ Magic link sent! Check email");
  };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`* {box-sizing:border-box} input:focus{border-color:#00E676 !important}`}</style>
      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: toast.includes("✅") ? "#00E676" : "#FF5252", color: toast.includes("✅") ? "black" : "white", padding: "10px 18px", borderRadius: "20px", fontSize: "11px", fontWeight: "900", zIndex: 100, maxWidth: "90%", textAlign: "center" }}>{toast}</div>}
      
      <div style={{ maxWidth: "380px", width: "100%", border: "2px solid #1A231A", borderRadius: "28px", background: "#050A05", padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "4px", width: "28px", height: "20px", display: "flex", overflow: "hidden" }}><div style={{ flex: 1, background: "#008751" }}></div><div style={{ flex: 1, background: "white" }}></div><div style={{ flex: 1, background: "#008751" }}></div></div>
          <div style={{ fontWeight: "900", color: "white", fontSize: "15px" }}>MAIN NAIJA PIDGIN</div>
        </div>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "white" }}>Welcome Back Boss!</div>
          <div style={{ fontSize: "11px", color: "#9E9E9E", marginTop: "4px" }}>Login to manage your API keys & voices</div>
        </div>

        <div style={{ marginTop: "18px", background: "#121C12", borderRadius: "12px", padding: "14px", border: "1px solid #1E2F1E" }}>
          <div style={{ fontSize: "10px", color: "#A5D6A7", fontWeight: "700", marginBottom: "6px" }}>Email</div>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email" style={{ width: "100%", background: "#0A150A", border: "1px solid #1E4D2B", color: "white", padding: "12px", borderRadius: "10px", fontSize: "13px", outline: "none" }} />
          
          <div style={{ fontSize: "10px", color: "#A5D6A7", fontWeight: "700", marginTop: "12px", marginBottom: "6px" }}>Password</div>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters" style={{ width: "100%", background: "#0A150A", border: "1px solid #1E4D2B", color: "white", padding: "12px", borderRadius: "10px", fontSize: "13px", outline: "none" }} />
          
          <button onClick={loginWithEmail} disabled={loading} style={{ width: "100%", marginTop: "14px", background: "#00C853", color: "white", border: "none", padding: "12px", borderRadius: "10px", fontSize: "13px", fontWeight: "900" }}>{loading ? "..." : "Login →"}</button>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
            <button onClick={signUp} disabled={loading} style={{ background: "transparent", border: "1px solid #2A4A2A", color: "white", padding: "10px", borderRadius: "10px", fontSize: "11px", fontWeight: "800" }}>Sign Up</button>
            <button onClick={magicLink} disabled={loading} style={{ background: "transparent", border: "1px solid #FFB300", color: "#FFB300", padding: "10px", borderRadius: "10px", fontSize: "11px", fontWeight: "800" }}>Magic Link ✨</button>
          </div>
        </div>

        <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
          <Link href="/marketplace" style={{ flex: 1, textAlign: "center", background: "#1A231A", color: "#888", padding: "10px", borderRadius: "10px", fontSize: "11px", textDecoration: "none", fontWeight: "700" }}>Continue as Guest</Link>
          <Link href="/" style={{ flex: 1, textAlign: "center", background: "#1A231A", color: "#888", padding: "10px", borderRadius: "10px", fontSize: "11px", textDecoration: "none", fontWeight: "700" }}>Homepage</Link>
        </div>

        <div style={{ textAlign: "center", fontSize: "8px", color: "#444", marginTop: "14px" }}>Supabase Auth Secured • Encrypted • Guest ID saved for free key</div>
      </div>
    </div>
  );
}