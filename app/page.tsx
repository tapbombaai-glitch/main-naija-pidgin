"use client";
import { useState } from "react";
import Link from "next/link";

export default function ChairmanHomepage() {
  const [copied, setCopied] = useState(false);
  const apiKey = "mk_live_••••••••••••_naija";

  return (
    <div style={{ background: "#050A05", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <style>{`*{box-sizing:border-box} body{margin:0}`}</style>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "12px", width: "100%" }}>
        
        {/* HEADER - Chairman */}
        <div style={{ background: "#1A231A", borderRadius: "14px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: "900", color: "#00E676", fontSize: "14px" }}>🇳🇬 MAIN NAIJA PIDGIN</div>
          <span style={{ background: "#7f1d1d", color: "white", fontSize: "9px", padding: "3px 8px", borderRadius: "20px", fontWeight: "800" }}>● LIVE</span>
        </div>

        <div style={{ marginTop: "16px" }}>
          <h1 style={{ fontSize: "22px", fontWeight: "900", color: "white", margin: 0, lineHeight: "26px" }}>Chairman Homepage</h1>
          <p style={{ color: "#888", fontSize: "12px", marginTop: "6px" }}>Chairman entry - tapbomba.ai@gmail.com - Do and Keep</p>
        </div>

        {/* WORKER + CHAIRMAN - FIXED INSIDE - NO DELETE - CHAIRMAN CODE */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px", width: "100%" }}>
          <div style={{ background: "#121C12", border: "1px solid #1E3A1E", borderRadius: "16px", padding: "14px", display: "flex", flexDirection: "column", minHeight: "130px", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: "800", color: "white", fontSize: "13px" }}>💼 Worker Panel</div>
              <div style={{ color: "#777", fontSize: "10px", marginTop: "6px" }}>Manage ops & tasks</div>
              <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                <span style={{ fontSize: "8px", background: "#00E67620", color: "#00E676", padding: "2px 6px", borderRadius: "4px", fontWeight: "800" }}>45 Tasks</span>
                <span style={{ fontSize: "8px", background: "#1A231A", color: "#888", padding: "2px 6px", borderRadius: "4px" }}>● Online</span>
              </div>
            </div>
            <Link href="/worker" style={{ textDecoration: "none", display: "block", width: "100%" }}>
              <div style={{ marginTop: "12px", background: "#00E676", color: "black", padding: "11px", borderRadius: "10px", textAlign: "center", fontWeight: "900", fontSize: "11px" }}>Enter Workspace →</div>
            </Link>
          </div>

          <div style={{ background: "#121C12", border: "1px solid #3A341E", borderRadius: "16px", padding: "14px", display: "flex", flexDirection: "column", minHeight: "130px", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: "800", color: "white", fontSize: "13px" }}>👑 Chairman Dashboard</div>
              <div style={{ color: "#777", fontSize: "10px", marginTop: "6px" }}>Lead & analytics</div>
              <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                <span style={{ fontSize: "8px", background: "#FFC10720", color: "#FFC107", padding: "2px 6px", borderRadius: "4px", fontWeight: "800" }}>12 Workers</span>
                <span style={{ fontSize: "8px", background: "#1A231A", color: "#888", padding: "2px 6px", borderRadius: "4px" }}>Admin</span>
              </div>
            </div>
            <Link href="/admin/login" style={{ textDecoration: "none", display: "block", width: "100%" }}>
              <div style={{ marginTop: "12px", background: "transparent", border: "1.5px solid #FFC107", color: "#FFC107", padding: "10px", borderRadius: "10px", textAlign: "center", fontWeight: "800", fontSize: "11px" }}>Open Dashboard →</div>
            </Link>
          </div>
        </div>

        {/* Rest of Chairman code - Keep same */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ fontWeight: "800", color: "white", fontSize: "15px" }}>🛡️ API Marketplace</div>
          <div style={{ marginTop: "10px", background: "#121C12", border: "1px solid #1E3A1E", borderRadius: "14px", padding: "12px" }}>
            <div style={{ color: "#777", fontSize: "9px", fontWeight: "800" }}>API KEY</div>
            <div style={{ marginTop: "8px", display: "flex", gap: "8px", alignItems: "center" }}>
              <div style={{ flex: 1, background: "black", border: "1px solid #222", borderRadius: "8px", padding: "10px", color: "#aaa", fontSize: "11px", fontFamily: "monospace" }}>{apiKey}</div>
              <button onClick={()=>{navigator.clipboard.writeText("mk_live_test_key"); setCopied(true); setTimeout(()=>setCopied(false),2000)}} style={{ background: "#1E3A1E", color: "#00E676", border: "none", padding: "10px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: "800" }}>{copied ? "✓" : "Copy"}</button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px", textAlign: "center", color: "#444", fontSize: "9px", paddingBottom: "20px" }}>Chairman Homepage • tapbomba.ai@gmail.com • Keep Forever</div>
      </div>
    </div>
  );
}