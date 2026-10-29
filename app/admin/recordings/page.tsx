"use client";
import Link from "next/link";
export default function RecordingsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", padding: "16px", color: "white" }}>
      <Link href="/admin" style={{ color: "#22c55e", fontSize: "12px", textDecoration: "none" }}>← Back to Overview</Link>
      <h1 style={{ fontSize: "20px", marginTop: "12px" }}>Recording Review</h1>
      <p style={{ color: "#64748b", fontSize: "11px" }}>Approve / Reject — Frontend demo</p>
      
      <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
        {[
          { id: "REC-024", worker: "Worker-024", lang: "Pidgin", type: "Free Talk", status: "Pending" },
          { id: "REC-023", worker: "Worker-023", lang: "Hausa", type: "Read Text", status: "Pending" },
          { id: "REC-022", worker: "Worker-022", lang: "Igbo", type: "Free Talk", status: "Approved" },
        ].map(r => (
          <div key={r.id} style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "12px", padding: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700 }}>{r.id} • {r.type}</p>
              <span style={{ background: r.status==="Pending"?"#422006":"#052e16", color: r.status==="Pending"?"#fbbf24":"#4ade80", padding: "3px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: 800 }}>{r.status}</span>
            </div>
            <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#64748b" }}>{r.worker} • {r.lang} • Today 9:15 AM</p>
            <div style={{ background: "#0f172a", borderRadius: "8px", padding: "10px", marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
              <button style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f59e0b", border: "none" }}>▶️</button>
              <div style={{ flex: 1, height: "4px", background: "#1e293b", borderRadius: "2px" }}><div style={{ width: "60%", height: "100%", background: "#f59e0b" }}></div></div>
              <span style={{ fontSize: "10px", color: "#64748b" }}>0:42 / 1:00</span>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button style={{ flex: 1, background: "#052e16", border: "1px solid #14532d", color: "#4ade80", padding: "9px", borderRadius: "8px", fontSize: "11px", fontWeight: 700 }}>✓ Approve</button>
              <button style={{ flex: 1, background: "#450a0a", border: "1px solid #7f1d1d", color: "#f87171", padding: "9px", borderRadius: "8px", fontSize: "11px", fontWeight: 700 }}>✕ Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}