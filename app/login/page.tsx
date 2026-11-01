"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [wid, setWid] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const confirmLogin = () => {
    if (!wid || !pass) { setErr("Fill ID + Password!"); return; }
    if (wid.length < 6) { setErr("ID too short! Use WORKER-1234 format"); return; }
    
    localStorage.setItem("gin_worker_id", wid.toUpperCase());
    localStorage.setItem("isLoggedIn", "true");
    // Don't save raw password for security, just ID
    router.push("/worker");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080C08", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 20, padding: 20, width: "100%", maxWidth: 320 }}>
        <h2 style={{ fontWeight: 900, textAlign: "center" }}>🔐 LOGIN</h2>
        <p style={{ fontSize: 11, color: "#666", textAlign: "center", marginBottom: 12 }}>Enter your Worker ID to access your earnings</p>
        <label style={{ fontSize: 10, fontWeight: 800 }}>YOUR WORKER ID</label>
        <input value={wid} onChange={e=>setWid(e.target.value)} placeholder="WORKER-1234" style={{ width: "100%", padding: 12, borderRadius: 8, border: "2px solid black", marginBottom: 10, fontWeight: 700 }} />
        <label style={{ fontSize: 10, fontWeight: 800 }}>PASSWORD</label>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Enter password" style={{ width: "100%", padding: 12, borderRadius: 8, border: "2px solid black", marginBottom: 10 }} />
        {err && <div style={{ background: "#FFEBEE", color: "red", padding: 8, borderRadius: 8, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>{err}</div>}
        <button onClick={confirmLogin} style={{ width: "100%", background: "black", color: "#00E676", padding: 14, borderRadius: 10, fontWeight: 900, border: "none" }}>✅ LOGIN TO EARN</button>
        <div style={{ textAlign: "center", fontSize: 10, color: "#888", marginTop: 10 }}>Your earnings saved to Supabase with this ID</div>
      </div>
    </div>
  );
}