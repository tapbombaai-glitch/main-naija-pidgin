"use client";
import Link from "next/link";
import { useState } from "react";

export default function ChairmanOverview() {
  const [menu, setMenu] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "white", fontFamily: "system-ui" }}>
      
      {/* MOBILE TOP BAR */}
      <header style={{ background: "#020617", borderBottom: "1px solid #1e293b", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={() => setMenu(!menu)} style={{ background: "#1e293b", border: "1px solid #334155", color: "white", padding: "8px 10px", borderRadius: "8px", fontSize: "16px" }}>☰</button>
          <span style={{ fontWeight: 800, fontSize: "13px", letterSpacing: "1px" }}>MAIN NAIJA PIDGIN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "10px", color: "#64748b" }}>Chairman</span>
          <div style={{ width: "28px", height: "28px", background: "#f59e0b", borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 900, color: "black", fontSize: "11px" }}>C</div>
        </div>
      </header>

      <div style={{ display: "flex" }}>
        {/* SIDEBAR */}
        <aside style={{ 
          width: "220px", 
          background: "#020617", 
          borderRight: "1px solid #1e293b", 
          minHeight: "calc(100vh - 53px)",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: "53px",
          height: "calc(100vh - 53px)"
        }} className="chairSidebar">
          <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
            <Link href="/admin" style={{ background: "#1e293b", borderLeft: "3px solid #f59e0b", color: "#f59e0b", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>📊 Overview</Link>
            <Link href="/admin/recordings" style={{ color: "#94a3b8", padding: "10px 12px", fontSize: "12px", textDecoration: "none" }}>🎧 Recording Review</Link>
            <Link href="/admin/workers" style={{ color: "#94a3b8", padding: "10px 12px", fontSize: "12px", textDecoration: "none" }}>👷 Workers</Link>
            <Link href="/admin/announcements" style={{ color: "#94a3b8", padding: "10px 12px", fontSize: "12px", textDecoration: "none" }}>📢 Announcements</Link>
          </nav>
          <Link href="/" style={{ background: "#f59e0b", color: "black", padding: "10px", borderRadius: "8px", textAlign: "center", fontSize: "12px", fontWeight: 800, textDecoration: "none", marginTop: "auto" }}>Logout →</Link>
          <p style={{ color: "#334155", fontSize: "9px", textAlign: "center", marginTop: "10px" }}>tapbomba.ai@gmail.com</p>
        </aside>

        {/* MAIN CONTENT - SCROLLABLE */}
        <main style={{ flex: 1, padding: "16px", maxWidth: "100%", overflowX: "hidden" }}>
          
          <h1 style={{ fontSize: "18px", margin: "0 0 4px", fontWeight: 800 }}>Overview</h1>
          <p style={{ color: "#64748b", fontSize: "11px", margin: "0 0 16px" }}>Frontend demo — No Supabase yet</p>

          {/* 4 CARDS - 2 per row on phone */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginBottom: "16px" }}>
            <div style={{ background: "#052e16", border: "1px solid #14532d", borderRadius: "12px", padding: "14px" }}>
              <p style={{ color: "#86efac", fontSize: "9px", fontWeight: 800, letterSpacing: "1px", margin: 0 }}>TOTAL WORKERS</p>
              <h2 style={{ fontSize: "22px", margin: "8px 0 0", color: "#4ade80" }}>24</h2>
            </div>
            <div style={{ background: "#431407", border: "1px solid #7c2d12", borderRadius: "12px", padding: "14px" }}>
              <p style={{ color: "#fdba74", fontSize: "9px", fontWeight: 800, letterSpacing: "1px", margin: 0 }}>PENDING</p>
              <h2 style={{ fontSize: "22px", margin: "8px 0 0", color: "#fb923c" }}>7</h2>
            </div>
            <div style={{ background: "#3b0764", border: "1px solid #581c87", borderRadius: "12px", padding: "14px" }}>
              <p style={{ color: "#d8b4fe", fontSize: "9px", fontWeight: 800, letterSpacing: "1px", margin: 0 }}>APPROVED</p>
              <h2 style={{ fontSize: "22px", margin: "8px 0 0", color: "#c084fc" }}>15</h2>
            </div>
            <div style={{ background: "#042f2e", border: "1px solid #134e4a", borderRadius: "12px", padding: "14px" }}>
              <p style={{ color: "#5eead4", fontSize: "9px", fontWeight: 800, letterSpacing: "1px", margin: 0 }}>REJECTED</p>
              <h2 style={{ fontSize: "22px", margin: "8px 0 0", color: "#2dd4bf" }}>2</h2>
            </div>
          </div>

          {/* RECORDING ACTIVITY */}
          <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "14px", padding: "14px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "13px", margin: 0 }}>Recording Activity</h3>
              <div style={{ display: "flex", gap: "6px" }}>
                <span style={{ background: "#f59e0b", color: "black", padding: "4px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: 800 }}>This Year</span>
                <span style={{ background: "#1e293b", color: "#64748b", padding: "4px 8px", borderRadius: "20px", fontSize: "9px" }}>Month</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "100px", overflowX: "auto", paddingBottom: "20px" }}>
              {[
                { m: "Jan", h: 50 }, { m: "Feb", h: 30 }, { m: "Mar", h: 80 }, { m: "Apr", h: 45 }, { m: "May", h: 85 }, { m: "Jun", h: 25 },
                { m: "Jul", h: 70 }, { m: "Aug", h: 65 }, { m: "Sep", h: 55 }, { m: "Oct", h: 75 }, { m: "Nov", h: 60 }, { m: "Dec", h: 90 }
              ].map(b => (
                <div key={b.m} style={{ flex: "0 0 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "100%", height: `${b.h}px`, background: "#f59e0b", borderRadius: "4px 4px 0 0" }}></div>
                  <span style={{ color: "#64748b", fontSize: "8px" }}>{b.m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT SUBMISSIONS */}
          <div style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "14px", padding: "14px" }}>
            <h3 style={{ fontSize: "13px", margin: "0 0 12px" }}>Recent Submissions</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { id: "Worker-024", lang: "Pidgin", s: "Pending" },
                { id: "Worker-023", lang: "Hausa", s: "Approved" },
                { id: "Worker-022", lang: "Igbo", s: "Approved" },
                { id: "Worker-021", lang: "Yoruba", s: "Pending" },
              ].map(w => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0f172a", padding: "10px 12px", borderRadius: "10px", border: "1px solid #1e293b" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: 700 }}>{w.id}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#64748b" }}>{w.lang}</p>
                  </div>
                  <span style={{ background: w.s === "Pending" ? "#422006" : "#052e16", color: w.s === "Pending" ? "#fbbf24" : "#4ade80", padding: "4px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: 800 }}>{w.s}</span>
                </div>
              ))}
            </div>
            <Link href="/admin/recordings" style={{ display: "block", marginTop: "12px", background: "#1e293b", color: "white", textAlign: "center", padding: "10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, textDecoration: "none" }}>View All Recordings →</Link>
          </div>

        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .chairSidebar { 
            position: fixed !important;
            top: 53px !important;
            left: 0 !important;
            z-index: 30 !important;
            transform: translateX(-100%) !important;
            transition: transform 0.3s ease !important;
            width: 200px !important;
          }
          .chairSidebar.open {
            transform: translateX(0) !important;
          }
          main { width: 100% !important; }
        }
      `}</style>

      {/* JS to toggle class */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('click', function(e) {
          if(e.target.closest('button')) {
            const sb = document.querySelector('.chairSidebar');
            if(sb) sb.classList.toggle('open');
          }
        });
      `}} />
    </div>
  );
}