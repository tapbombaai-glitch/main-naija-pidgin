"use client";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const apiKey = "mk_live_••••••••••••_naija";

  return (
    <div style={{ background: "#050A05", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <style>{`*{box-sizing:border-box} body{margin:0}`}</style>
      
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "12px", width: "100%" }}>
        
        {/* HEADER */}
        <div style={{ background: "#1A231A", borderRadius: "14px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: "900", color: "#00E676", fontSize: "14px", letterSpacing: "0.5px" }}>🇳🇬 MAIN NAIJA PIDGIN</div>
          <span style={{ background: "#7f1d1d", color: "white", fontSize: "9px", padding: "3px 8px", borderRadius: "20px", fontWeight: "800" }}>● LIVE</span>
        </div>

        <div style={{ marginTop: "16px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "900", color: "white", margin: 0, lineHeight: "26px" }}>Welcome to Main Naija Pidgin</h1>
          <p style={{ color: "#888", fontSize: "12px", marginTop: "6px" }}>Build with pidgin. Deploy fast. Run Naija.</p>
        </div>

        {/* WORKER + CHAIRMAN - FIXED FOR SMALL PHONE */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px", width: "100%" }}>
          <div style={{ background: "#121C12", border: "1px solid #1E3A1E", borderRadius: "16px", padding: "14px", display: "flex", flexDirection: "column", minHeight: "120px" }}>
            <div style={{ fontWeight: "800", color: "white", fontSize: "13px" }}>💼 Worker Panel</div>
            <div style={{ color: "#777", fontSize: "10px", marginTop: "6px", flex: 1 }}>Manage ops & tasks</div>
            <Link href="/worker" style={{ textDecoration: "none" }}>
              <div style={{ marginTop: "12px", background: "#00E676", color: "black", padding: "10px", borderRadius: "10px", textAlign: "center", fontWeight: "900", fontSize: "11px" }}>Enter Workspace</div>
            </Link>
          </div>

          <div style={{ background: "#121C12", border: "1px solid #3A341E", borderRadius: "16px", padding: "14px", display: "flex", flexDirection: "column", minHeight: "120px" }}>
            <div style={{ fontWeight: "800", color: "white", fontSize: "13px" }}>👑 Chairman Dashboard</div>
            <div style={{ color: "#777", fontSize: "10px", marginTop: "6px", flex: 1 }}>Lead & analytics</div>
            <Link href="/admin/login" style={{ textDecoration: "none" }}>
              <div style={{ marginTop: "12px", background: "transparent", border: "1px solid #FFC107", color: "#FFC107", padding: "10px", borderRadius: "10px", textAlign: "center", fontWeight: "800", fontSize: "11px" }}>Open Dashboard</div>
            </Link>
          </div>
        </div>

        {/* API MARKETPLACE */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ fontWeight: "800", color: "white", fontSize: "15px" }}>🛡️ API Marketplace</div>
          
          <div style={{ marginTop: "10px", background: "#121C12", border: "1px solid #1E3A1E", borderRadius: "14px", padding: "12px" }}>
            <div style={{ color: "#777", fontSize: "9px", fontWeight: "800", letterSpacing: "1px" }}>API KEY</div>
            <div style={{ marginTop: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ flex: 1, background: "black", border: "1px solid #222", borderRadius: "8px", padding: "10px", color: "#aaa", fontSize: "11px", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{apiKey}</div>
              <button onClick={()=>{navigator.clipboard.writeText("mk_live_test_key"); setCopied(true); setTimeout(()=>setCopied(false),2000)}} 
                style={{ background: "#1E3A1E", color: "#00E676", border: "none", padding: "10px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: "800" }}>
                {copied ? "✓" : "Copy"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            <div style={{ background: "#121C12", border: "1px solid #1E3A1E", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
              <div style={{ color: "#666", fontSize: "8px", fontWeight: "800" }}>FREE REQUESTS</div>
              <div style={{ color: "#00E676", fontWeight: "900", fontSize: "12px", marginTop: "4px" }}>2,500/mo</div>
            </div>
            <div style={{ background: "#121C12", border: "1px solid #1E3A1E", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
              <div style={{ color: "#666", fontSize: "8px", fontWeight: "800" }}>DATASETS LIVE</div>
              <div style={{ color: "white", fontWeight: "900", fontSize: "14px", marginTop: "4px" }}>12</div>
            </div>
            <div style={{ background: "#121C12", border: "1px solid #1E3A1E", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
              <div style={{ color: "#666", fontSize: "8px", fontWeight: "800" }}>UPTIME</div>
              <div style={{ color: "white", fontWeight: "900", fontSize: "14px", marginTop: "4px" }}>99.9%</div>
            </div>
          </div>
        </div>

        {/* PREVIEW VOICES */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ fontWeight: "800", color: "white", fontSize: "14px" }}>🎧 Preview Voices</div>
          <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              { n: "Lagos Male", s: "Natural • Young" },
              { n: "Abuja Female", s: "Warm • Professional" },
              { n: "Pidgin Narrator", s: "Story • Expressive" },
              { n: "Delta", s: "Rugged • Local" },
              { n: "Yoruba Mix", s: "Hybrid • Bilingual" },
              { n: "GET /api/datasets", s: "Fetch live local datasets", green: true },
            ].map((v: any) => (
              <div key={v.n} style={{ background: "#121C12", border: "1px solid #1E3A1E", borderRadius: "12px", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "center", minWidth: 0 }}>
                  <span style={{ fontSize: "12px" }}>🇳🇬</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: v.green ? "#00E676" : "white", fontSize: "10px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.n}</div>
                    <div style={{ color: "#666", fontSize: "8px", marginTop: "2px" }}>{v.s}</div>
                  </div>
                </div>
                <div style={{ width: "24px", height: "24px", background: "#00E676", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", flexShrink: 0 }}>▶</div>
              </div>
            ))}
          </div>
        </div>

        {/* ENDPOINTS */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ fontWeight: "800", color: "white", fontSize: "14px" }}>↔ Available Endpoints</div>
          <div style={{ marginTop: "10px", background: "#121C12", border: "1px solid #1E3A1E", borderRadius: "14px", padding: "14px" }}>
            <div style={{ color: "#00E676", fontSize: "11px", fontWeight: "800", fontFamily: "monospace" }}>GET /api/voices</div>
            <div style={{ color: "#666", fontSize: "10px", marginTop: "2px" }}>List all available voices</div>
            <div style={{ color: "#FFC107", fontSize: "11px", fontWeight: "800", fontFamily: "monospace", marginTop: "10px" }}>POST /api/synthesize</div>
            <div style={{ color: "#666", fontSize: "10px", marginTop: "2px" }}>Create speech from text (pidgin supported)</div>
            <div style={{ color: "#FFC107", fontSize: "11px", fontWeight: "800", fontFamily: "monospace", marginTop: "10px" }}>POST /api/feedback</div>
            <div style={{ color: "#666", fontSize: "10px", marginTop: "2px" }}>Submit feedback & improve model</div>
          </div>
        </div>

        <div style={{ marginTop: "20px", textAlign: "center", color: "#444", fontSize: "9px", paddingBottom: "20px" }}>Secured • Powered by Naija Cloud • v1.2.0</div>
      </div>
    </div>
  );
}