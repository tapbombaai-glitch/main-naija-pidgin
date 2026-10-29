"use client";
import Link from "next/link";

export default function ChairmanOverview() {
  return (
    <div style={{ minHeight: "100vh", background: "#2c3447", padding: "20px", display: "flex", justifyContent: "center", alignItems: "center" }}>
      
      {/* MAIN DASHBOARD CARD — Like your image */}
      <div style={{ width: "100%", maxWidth: "1100px", background: "#151a27", borderRadius: "18px", display: "flex", overflow: "hidden", border: "1px solid #1f2535", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        
        {/* SIDEBAR */}
        <aside style={{ width: "200px", background: "#1a2032", padding: "20px 12px", display: "flex", flexDirection: "column", borderRight: "1px solid #252d42" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "30px", padding: "0 8px" }}>
            <div style={{ width: "32px", height: "32px", background: "white", borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 900, fontSize: "10px", color: "#ff6a00" }}>Omni</div>
            <span style={{ color: "white", fontWeight: 700, fontSize: "14px" }}>Main Naija Pidgin</span>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
            <Link href="/admin" style={{ background: "#252d42", borderLeft: "3px solid #ff8c2f", color: "#ff8c2f", padding: "10px 12px", borderRadius: "6px", fontSize: "11px", textDecoration: "none" }}>◉ Overview</Link>
            <Link href="/admin/recordings" style={{ color: "#6b7280", padding: "10px 12px", fontSize: "11px", textDecoration: "none" }}>👥 Recording Review</Link>
            <Link href="/admin/workers" style={{ color: "#6b7280", padding: "10px 12px", fontSize: "11px", textDecoration: "none" }}>📋 Workers</Link>
            <Link href="/admin/announcements" style={{ color: "#6b7280", padding: "10px 12px", fontSize: "11px", textDecoration: "none" }}>📢 Announcements</Link>
          </nav>

          <Link href="/" style={{ background: "#ff8c2f", color: "white", padding: "10px", borderRadius: "8px", textAlign: "center", fontSize: "11px", fontWeight: 700, textDecoration: "none", marginTop: "auto" }}>Logout</Link>
        </aside>

        {/* MAIN CONTENT */}
        <main style={{ flex: 1, background: "#151a27", padding: "16px 20px" }}>
          
          {/* TOP HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h1 style={{ color: "white", fontSize: "14px", margin: 0, fontWeight: 700 }}>Overview</h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#6b7280", fontSize: "10px" }}>🔍 👑</span>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1a2032", padding: "4px 8px", borderRadius: "20px" }}>
                <div style={{ width: "18px", height: "18px", background: "#c084fc", borderRadius: "50%" }}></div>
                <span style={{ color: "white", fontSize: "10px" }}>Chairman: tapbomba.ai@gmail.com</span>
              </div>
            </div>
          </div>

          {/* 4 STAT CARDS — Exactly like your image */}
          <div style={{ marginBottom: "10px", color: "#6b7280", fontSize: "11px", fontWeight: 700 }}>Reviews</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
            <div style={{ background: "#7ae8a6", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "8px", color: "#0f5132", margin: "0 0 8px", fontWeight: 700 }}>Total Workers</p>
              <p style={{ fontSize: "16px", fontWeight: 900, color: "#0f5132", margin: 0 }}>I &nbsp; 24</p>
            </div>
            <div style={{ background: "#ff9f43", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "8px", color: "#7a3a00", margin: "0 0 8px", fontWeight: 700 }}>Pending Recordings</p>
              <p style={{ fontSize: "16px", fontWeight: 900, color: "#7a3a00", margin: 0 }}>I &nbsp; 7</p>
            </div>
            <div style={{ background: "#d48cff", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "8px", color: "#5a1a7a", margin: "0 0 8px", fontWeight: 700 }}>Approved Recordings</p>
              <p style={{ fontSize: "16px", fontWeight: 900, color: "#5a1a7a", margin: 0 }}>I &nbsp; 15</p>
            </div>
            <div style={{ background: "#7af0e0", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "8px", color: "#0a4a44", margin: "0 0 8px", fontWeight: 700 }}>Rejected Recordings</p>
              <p style={{ fontSize: "16px", fontWeight: 900, color: "#0a4a44", margin: 0 }}>I &nbsp; 2</p>
            </div>
          </div>

          {/* ANALYSIS + WITHDRAWAL — Bottom row like image */}
          <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "12px" }}>
            
            {/* ANALYSIS BAR CHART */}
            <div style={{ background: "#1a2032", borderRadius: "12px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ color: "white", fontSize: "11px", margin: 0 }}>Recording Activity</h3>
                <select style={{ background: "#151a27", border: "1px solid #252d42", color: "#6b7280", fontSize: "9px", padding: "4px 6px", borderRadius: "6px" }}>
                  <option>This Week</option>
                  <option>This Month</option>
                  <option>This Year</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                <span style={{ background: "#ff8c2f", color: "white", padding: "3px 8px", borderRadius: "10px", fontSize: "8px" }}>This Year</span>
                <span style={{ background: "#252d42", color: "#6b7280", padding: "3px 8px", borderRadius: "10px", fontSize: "8px" }}>This Month</span>
                <span style={{ background: "#252d42", color: "#6b7280", padding: "3px 8px", borderRadius: "10px", fontSize: "8px" }}>This Week</span>
              </div>
              {/* ORANGE BARS Jan-Dec like image */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "110px", paddingTop: "10px" }}>
                {[
                  { m: "Jan", h: 70 }, { m: "Feb", h: 40 }, { m: "Mar", h: 85 }, { m: "Apr", h: 55 }, { m: "May", h: 90 }, { m: "Jun", h: 30 },
                  { m: "Jul", h: 80 }, { m: "Aug", h: 75 }, { m: "Sep", h: 60 }, { m: "Oct", h: 85 }, { m: "Nov", h: 65 }, { m: "Dec", h: 95 }
                ].map(b => (
                  <div key={b.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "100%", height: `${b.h}px`, background: "#ff8c2f", borderRadius: "4px 4px 0 0" }}></div>
                    <span style={{ color: "#6b7280", fontSize: "7px" }}>{b.m}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT SUBMISSIONS — Right side */}
            <div style={{ background: "#1a2032", borderRadius: "12px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ color: "white", fontSize: "11px", margin: 0 }}>Recent Submissions</h3>
                <span style={{ color: "#6b7280", fontSize: "9px" }}>See All</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { name: "Worker-024", lang: "Pidgin", time: "9:15 AM" },
                  { name: "Worker-023", lang: "Hausa", time: "Yesterday" },
                  { name: "Worker-022", lang: "Igbo", time: "2d ago" },
                  { name: "Worker-021", lang: "Yoruba", time: "3d ago" },
                  { name: "Worker-020", lang: "Pidgin", time: "3d ago" },
                ].map(w => (
                  <div key={w.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "22px", height: "22px", background: "#252d42", borderRadius: "50%" }}></div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: "white", fontSize: "10px", margin: 0 }}>{w.name} • {w.lang}</p>
                      <p style={{ color: "#6b7280", fontSize: "8px", margin: 0 }}>{w.time}</p>
                    </div>
                    <span style={{ color: "#facc15", fontSize: "9px" }}>Pending</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <p style={{ textAlign: "center", color: "#3a4155", fontSize: "9px", marginTop: "14px" }}>Frontend Demo Only — tapbomba.ai@gmail.com — No Supabase yet</p>
        </main>
      </div>

      <style>{`
        @media (max-width: 700px) {
          div[style*="maxWidth: 1100px"] { flex-direction: column !important; }
          aside { width: 100% !important; flex-direction: row !important; flex-wrap: wrap !important; height: auto !important; }
          nav { flex-direction: row !important; flex-wrap: wrap !important; }
          div[style*="gridTemplateColumns: repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
          div[style*="gridTemplateColumns: 1.7fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}