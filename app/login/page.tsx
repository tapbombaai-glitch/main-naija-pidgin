"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MarketplaceLoginSimple() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async () => {
    if (!email) return setMsg("Fill email");
    if (!pass) return setMsg("Fill password like 123456");
    if (pass !== pass2) return setMsg("Password no match - recheck");
    if (pass.length < 6) return setMsg("Use 6 digits like 123456");

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: pass });
    setLoading(false);
    if (error) setMsg(error.message);
    else {
      setMsg("✅ Saved! Now click Login");
    }
  };

  const login = async () => {
    if (!email || !pass) return setMsg("Fill email & password");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) setMsg(error.message);
    else window.location.href = "/marketplace";
  };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "10px" }}>
      <div style={{ maxWidth: "360px", width: "100%", background: "#050A05", border: "2px solid #1A231A", borderRadius: "20px", padding: "20px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "white" }}>Login</div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>Marketplace — just email + 123456 + confirm</div>
        </div>

        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email" type="email"
          style={{ width: "100%", marginTop: "16px", background: "#0F1A0F", border: "1px solid #1E4D2B", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: "none" }} />
        
        <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password e.g 123456" type="text"
          style={{ width: "100%", marginTop: "10px", background: "#0F1A0F", border: "1px solid #1E4D2B", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: "none" }} />

        <input value={pass2} onChange={e=>setPass2(e.target.value)} placeholder="Recheck password 123456" type="text"
          style={{ width: "100%", marginTop: "10px", background: "#0F1A0F", border: "1px solid #1E4D2B", color: "white", padding: "12px", borderRadius: "10px", fontSize: "14px", outline: "none" }} />

        {msg && <div style={{ marginTop: "10px", fontSize: "11px", color: msg.includes("✅") ? "#00E676" : "#FF5252", textAlign: "center" }}>{msg}</div>}

        <button onClick={save} disabled={loading} style={{ width: "100%", marginTop: "14px", background: "#00E676", color: "black", border: "none", padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: "900" }}>
          {loading ? "..." : "Save"}
        </button>

        <button onClick={login} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #1E4D2B", color: "#A5D6A7", padding: "12px", borderRadius: "10px", fontSize: "13px", fontWeight: "700" }}>
          Login
        </button>

        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <a href="/marketplace" style={{ fontSize: "11px", color: "#666", textDecoration: "none" }}>← Back to Marketplace</a>
        </div>

        <div style={{ textAlign: "center", marginTop: "8px", fontSize: "10px", color: "#555" }}>Example: customer@gmail.com / 123456 / 123456 → Save → Login</div>
      </div>
    </div>
  );
}