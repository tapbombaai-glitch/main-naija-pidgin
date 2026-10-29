"use client";
import Link from "next/link";
import { useState } from "react";
export default function AnnouncementsPage() {
  const [title, setTitle] = useState("");
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", padding: "16px", color: "white" }}>
      <Link href="/admin" style={{ color: "#22c55e", fontSize: "12px", textDecoration: "none" }}>← Back to Overview</Link>
      <h1 style={{ fontSize: "20px", marginTop: "12px" }}>Announcements</h1>
      <p style={{ color: "#64748b", fontSize: "11px" }}>Create / Edit / Publish — Frontend demo</p>
      
      <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "12px", padding: "14px", marginTop: "16px" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, margin: "0 0 10px" }}>Create New Announcement</p>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title e.g. New recording task for Pidgin" style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", color: "white", padding: "10px", borderRadius: "8px", fontSize: "12px", marginBottom: "10px" }} />
        <textarea placeholder="Message for all workers..." style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", color: "white", padding: "10px", borderRadius: "8px", fontSize: "12px", minHeight: "80px" }}></textarea>
        <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
          <button style={{ flex: 1, background: "#1e293b", color: "white", padding: "10px", borderRadius: "8px", fontSize: "11px", border: "none" }}>Save Draft</button>
          <button style={{ flex: 1, background: "#f59e0b", color: "black", padding: "10px", borderRadius: "8px", fontSize: "11px", fontWeight: 800, border: "none" }}>Publish →</button>
        </div>
      </div>

      <div style={{ marginTop: "16px" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, marginBottom: "10px" }}>Recent Announcements (Demo)</p>
        <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "10px", padding: "12px" }}>
          <p style={{ margin: 0, fontSize: "12px", fontWeight: 700 }}>Welcome Workers! 🎙️</p>
          <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#94a3b8" }}>Start recording Pidgin, Hausa, Igbo, Yoruba. Max 60 seconds.</p>
          <p style={{ margin: "6px 0 0", fontSize: "9px", color: "#475569" }}>Published: Today • By Chairman</p>
        </div>
      </div>
    </div>
  );
}