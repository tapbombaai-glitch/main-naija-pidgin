"use client"
import { useState, useEffect } from "react"

export default function ChairmanPanel() {
  const [activeTab, setActiveTab] = useState("overview")
  const [workers, setWorkers] = useState([
    { id: "024", lang: "Pidgin", status: "Pending", name: "Worker-024" },
    { id: "023", lang: "Hausa", status: "Approved", name: "Worker-023" },
    { id: "022", lang: "Igbo", status: "Approved", name: "Worker-022" },
  ])

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui", padding: 0, margin: 0 }}>
      {/* HEADER */}
      <header style={{ background: "white", padding: "16px", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 10 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>MAIN NAIJA</h1>
        <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>PIDGIN • CHAIRMAN PANEL</p>
        <p style={{ fontSize: 12, margin: "8px 0 0 0" }}>tapbomba.ai@gmail.com</p>
      </header>

      {/* TABS - ORGANIZED FOR PHONE */}
      <div style={{ display: "flex", gap: 8, padding: 12, background: "white", overflowX: "auto", borderBottom: "1px solid #e2e8f0" }}>
        {[
          { id: "overview", label: "Overview" },
          { id: "review", label: "Recording Review" },
          { id: "workers", label: "Workers" },
          { id: "api", label: "API Management" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 12px", borderRadius: 20, border: "none", whiteSpace: "nowrap", fontSize: 12, fontWeight: 600,
              background: activeTab === tab.id ? "black" : "#f1f5f9", color: activeTab === tab.id ? "white" : "#334155"
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ padding: 16 }}>
        {activeTab === "overview" && (
          <>
            <h2 style={{ fontSize: 20, margin: "0 0 4px 0" }}>Good Morning, Chairman 👑</h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px 0" }}>Here's what's happening on your platform today.</p>

            {/* STATS GRID - ORGANIZED */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>Total Workers</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>24</div>
              </div>
              <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>Active today</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>7</div>
              </div>
              <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>Pending Review</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>7</div>
              </div>
              <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>Needs action</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>15</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>✅ Approved</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>15</div>
              </div>
              <div style={{ background: "white", padding: 16, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>❌ Rejected</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>2</div>
              </div>
            </div>

            {/* RECENT SUBMISSIONS */}
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 16 }}>
              <h3 style={{ fontSize: 14, margin: "0 0 12px 0" }}>Recent Submissions</h3>
              {workers.map(w => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{w.name}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{w.lang}</div>
                  </div>
                  <div style={{
                    fontSize: 10, padding: "4px 8px", borderRadius: 20, fontWeight: 700,
                    background: w.status === "Approved" ? "#dcfce7" : "#fef3c7", color: w.status === "Approved" ? "#166534" : "#92400e"
                  }}>{w.status}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "review" && (
          <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 12 }}>
            <p>Recording Review - Use your /admin page for approval 👑</p>
            <a href="/admin" style={{ display: "inline-block", marginTop: 12, padding: "10px 20px", background: "black", color: "white", borderRadius: 8, textDecoration: "none" }}>Go to Admin Approval</a>
          </div>
        )}

        {activeTab !== "overview" && activeTab !== "review" && (
          <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 12 }}>
            <h3 style={{ fontSize: 48 }}>🚧</h3>
            <p>{activeTab} page dey come soon</p>
          </div>
        )}
      </div>
    </div>
  )
}