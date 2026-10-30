"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SimpleLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const login = async () => {
    if (!email || !password) return setMsg("Add email & password");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMsg(error.message);
    else window.location.href = "/marketplace";
  };

  const signup = async () => {
    if (!email || !password) return setMsg("Add email & password");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setMsg(error.message);
    else setMsg("✅ Check email to confirm, then login");
  };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px" }}>
      <div style={{ maxWidth: "360px", width: "100%", background: "#050A05", border: "2px solid #1A231A", borderRadius: "20px", padding: "20px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "white" }}>Login</div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>Marketplace Customer Login</div>
        </div>

        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email"
          style={{ width: "100%", marginTop: "16px", background: "#0F1A0F", border: "1px solid #1E4D2B", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: "none" }} />
        
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password"
          style={{ width: "100%", marginTop: "10px", background: "#0F1A0F", border: "1px solid #1E4D2B", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: "none" }} />

        {msg && <div style={{ marginTop: "10px", fontSize: "11px", color: msg.includes("✅") ? "#00E676" : "#FF5252", textAlign: "center" }}>{msg}</div>}

        <button onClick={login} disabled={loading} style={{ width: "100%", marginTop: "14px", background: "#00C853", color: "white", border: "none", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "800" }}>
          {loading ? "..." : "Login"}
        </button>

        <button onClick={signup} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #1E4D2B", color: "#A5D6A7", padding: "12px", borderRadius: "10px", fontSize: "13px", fontWeight: "700" }}>
          Create Account
        </button>

        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <a href="/marketplace" style={{ fontSize: "11px", color: "#666", textDecoration: "none" }}>← Back to Marketplace</a>
        </div>
      </div>
    </div>
  );
}