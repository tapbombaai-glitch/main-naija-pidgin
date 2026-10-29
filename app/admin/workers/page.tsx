"use client";
import Link from "next/link";
export default function WorkersPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", padding: "16px", color: "white" }}>
      <Link href="/admin" style={{ color: "#22c55e", fontSize: "12px", textDecoration: "none" }}>← Back to Overview</Link>
      <h1 style={{ fontSize: "20px", marginTop: "12px" }}>Workers Management</h1>
      <p style={{ color: "#64748b", fontSize: "11px" }}>Frontend demo — Real data later with Supabase</p>
      
      <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
        <input placeholder="Search workers..." style={{ flex: 1, background: "#020617", border: "1px solid #1e293b", color: "white", padding: "10px", borderRadius: "8px", fontSize: "12px" }} />
        <button style={{ background: "#1e293b", border: "1px solid #334155", color: "white", padding: "10px 14px", borderRadius: "8px", fontSize: "11px" }}>Filter</button>
      </div>

      <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
        {[
          { id: "Worker-024", lang: "Pidgin", recordings: 12, approved: 8 },
          { id: "Worker-023", lang: "Hausa", recordings: 15, approved: 12 },
          { id: "Worker-022", lang: "Igbo", recordings: 9, approved: 7 },
          { id: "Worker-021", lang: "Yoruba", recordings: 6, approved: 3 },
        ].map(w => (
          <div key={w.id} style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "12px", padding: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 700 }}>{w.id}</p>
              <span style={{ background: "#1e293b", color: "#94a3b8", padding: "3px 8px", borderRadius: "20px", fontSize: "9px" }}>{w.lang}</span>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#64748b" }}>{w.recordings} recordings • {w.approved} approved</p>
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button style={{ flex: 1, background: "#1e293b", border: "none", color: "white", padding: "8px", borderRadius: "6px", fontSize: "10px" }}>View Details</button>
              <button style={{ flex: 1, background: "#052e16", border: "1px solid #14532d", color: "#4ade80", padding: "8px", borderRadius: "6px", fontSize: "10px" }}>Message</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}