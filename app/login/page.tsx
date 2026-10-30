"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [wid, setWid] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");

  const confirmLogin = () => {
    if (!wid || !pass || !confirm) { setErr("Fill all 3 boxes!"); return; }
    if (pass !== confirm) { setErr("Passwords no match!"); return; }
    localStorage.setItem("worker_id", wid.toUpperCase());
    localStorage.setItem("worker_pass", pass);
    localStorage.setItem("isLoggedIn", "true");
    router.push("/marketplace");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080C08", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 20, padding: 20, width: "100%", maxWidth: 320 }}>
        <h2 style={{ fontWeight: 900, textAlign: "center" }}>🔐 SIMPLE LOGIN</h2>
        <p style={{ fontSize: 11, color: "#666", textAlign: "center", marginBottom: 12 }}>Passport + Confirm Password</p>
        <label style={{ fontSize: 10, fontWeight: 800 }}>YOUR PASSPORT / ID</label>
        <input value={wid} onChange={e=>setWid(e.target.value)} placeholder="WORKER-1234" style={{ width: "100%", padding: 12, borderRadius: 8, border: "2px solid black", marginBottom: 10, fontWeight: 700 }} />
        <label style={{ fontSize: 10, fontWeight: 800 }}>PASSWORD</label>
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Enter password" style={{ width: "100%", padding: 12, borderRadius: 8, border: "2px solid black", marginBottom: 10 }} />
        <label style={{ fontSize: 10, fontWeight: 800 }}>CONFIRM PASSWORD AGAIN</label>
        <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Confirm again" style={{ width: "100%", padding: 12, borderRadius: 8, border: "2px solid black", marginBottom: 10 }} />
        {err && <div style={{ background: "#FFEBEE", color: "red", padding: 8, borderRadius: 8, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>{err}</div>}
        <button onClick={confirmLogin} style={{ width: "100%", background: "black", color: "#00E676", padding: 14, borderRadius: 10, fontWeight: 900, border: "none" }}>✅ CONFIRM LOGIN</button>
      </div>
    </div>
  );
}