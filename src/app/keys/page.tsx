"use client";
import { useState, useEffect } from "react";

export default function KeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchKeys = async () => {
    const res = await fetch("/api/keys");
    const data = await res.json();
    if (data.success) setKeys(data.keys);
  };

  useEffect(() => { fetchKeys(); }, []);

  const generateKey = async () => {
    setLoading(true);
    setNewKey("");
    const res = await fetch("/api/keys", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setNewKey(data.api_key);
      fetchKeys();
      alert("KEY GENERATED! Copy am now! You no go see am again!");
    } else {
      alert("Error: " + data.error);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>🔑 EMAKA VOICE API Keys</h1>
      
      <button onClick={generateKey} disabled={loading} style={{ background: "black", color: "white", padding: "12px 20px", borderRadius: "8px", marginTop: "15px", width: "100%", fontWeight: "bold" }}>
        {loading ? "Generating..." : "+ Generate New API Key"}
      </button>

      {newKey && (
        <div style={{ background: "#dcfce7", border: "1px solid green", padding: "15px", marginTop: "20px", borderRadius: "8px", wordBreak: "break-all" }}>
          <p style={{ fontWeight: "bold", color: "green" }}>✅ COPY THIS NOW - SHOWS ONCE!</p>
          <code style={{ fontSize: "16px", fontWeight: "bold" }}>{newKey}</code>
          <button onClick={() => navigator.clipboard.writeText(newKey)} style={{ display: "block", marginTop: "10px", background: "green", color: "white", padding: "8px", borderRadius: "5px" }}>Copy Key</button>
        </div>
      )}

      <h2 style={{ marginTop: "30px", fontWeight: "bold" }}>Your Keys</h2>
      <div style={{ marginTop: "10px" }}>
        {keys.map((k: any) => (
          <div key={k.id} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "8px", borderRadius: "6px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "monospace" }}>{k.prefix}...{k.hint}</span>
            <span style={{ fontSize: "12px", color: k.is_active ? "green" : "red" }}>{k.is_active ? "● Active" : "Revoked"}</span>
          </div>
        ))}
        {keys.length === 0 && <p>No keys yet. Generate one!</p>}
      </div>

      <div style={{ marginTop: "30px", background: "#f3f4f6", padding: "15px", borderRadius: "8px" }}>
        <p style={{ fontWeight: "bold" }}>How to use:</p>
        <code style={{ fontSize: "12px" }}>curl -H "Authorization: Bearer YOUR_KEY" https://your-site.vercel.app/api/generate</code>
      </div>
    </div>
  );
}