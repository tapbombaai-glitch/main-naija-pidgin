"use client";
import { useState } from "react";
import Link from "next/link";

export default function MarketplacePage() {
  const [copied, setCopied] = useState(false);
  const apiKey = "mnpp_live_sk_9f8a7b6c5d4e3f2a1b0c9d8e7";

  const copy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <div style={{minHeight:"100vh", background:"#050706", color:"white"}}>
      {/* HEADER */}
      <header style={{padding:"16px 20px", borderBottom:"1px solid #1a2a1e", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"#050706", zIndex:10}}>
        <Link href="/" style={{color:"#4ade80", textDecoration:"none", fontSize:"14px", fontWeight:"700"}}>← Home</Link>
        <span style={{fontSize:"12px", fontWeight:"800", letterSpacing:"1px", color:"#888"}}>API MARKETPLACE</span>
        <span>🔌</span>
      </header>

      <div style={{maxWidth:"800px", margin:"0 auto", padding:"20px", paddingBottom:"60px"}}>
        {/* HERO CARD */}
        <div style={{background:"linear-gradient(180deg, #101b13 0%, #0a1410 100%)", border:"1px solid #285638", borderRadius:"24px", padding:"28px"}}>
          <div style={{display:"flex", gap:"14px", alignItems:"center"}}>
            <div style={{width:"48px", height:"48px", background:"#132a1a", borderRadius:"14px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px"}}>🔌</div>
            <div>
              <h1 style={{fontSize:"22px", fontWeight:"900"}}>API Marketplace</h1>
              <p style={{fontSize:"13px", color:"#888", marginTop:"4px"}}>Build with authentic Naija Pidgin voices & datasets</p>
            </div>
          </div>

          {/* API KEY */}
          <div style={{marginTop:"24px", background:"#09100c", border:"1px solid #1f3a25", borderRadius:"16px", padding:"18px"}}>
            <div style={{display:"flex", justifyContent:"space-between"}}>
              <p style={{fontSize:"11px", letterSpacing:"1px", fontWeight:"800", color:"#aaa"}}>YOUR API KEY</p>
              <span style={{fontSize:"10px", background:"#1a2a1e", color:"#4ade80", padding:"4px 10px", borderRadius:"20px", border:"1px solid #2a4a32"}}>● LIVE</span>
            </div>
            <code style={{display:"block", marginTop:"12px", background:"black", border:"1px solid #1f2f25", padding:"14px", borderRadius:"10px", color:"#4ade80", fontSize:"13px", wordBreak:"break-all"}}>{apiKey}</code>
            <button onClick={copy} style={{width:"100%", marginTop:"12px", background: copied ? "#22c55e" : "#1a2a1e", color: copied ? "#041208" : "white", border:"1px solid #2a3a2e", padding:"12px", borderRadius:"10px", fontWeight:"900", cursor:"pointer", fontSize:"14px"}}>
              {copied ? "✓ Copied!" : "Copy API Key"}
            </button>
          </div>

          {/* STATS */}
          <div style={{marginTop:"18px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px"}}>
            <div style={{background:"#0f1218", border:"1px solid #1f232b", borderRadius:"14px", padding:"14px", textAlign:"center"}}>
              <div style={{fontSize:"20px", fontWeight:"900"}}>1,000</div><div style={{fontSize:"10px", color:"#888", marginTop:"2px"}}>FREE REQUESTS</div>
            </div>
            <div style={{background:"#0f1218", border:"1px solid #1f232b", borderRadius:"14px", padding:"14px", textAlign:"center"}}>
              <div style={{fontSize:"20px", fontWeight:"900"}}>3</div><div style={{fontSize:"10px", color:"#22c55e", marginTop:"2px"}}>DATASETS LIVE</div>
            </div>
            <div style={{background:"#0f1218", border:"1px solid #1f232b", borderRadius:"14px", padding:"14px", textAlign:"center"}}>
              <div style={{fontSize:"20px", fontWeight:"900"}}>99.9%</div><div style={{fontSize:"10px", color:"#888", marginTop:"2px"}}>UPTIME</div>
            </div>
          </div>
        </div>

        {/* ENDPOINTS */}
        <div style={{marginTop:"20px", background:"#0f1218", border:"1px solid #1f232b", borderRadius:"20px", padding:"22px"}}>
          <h2 style={{fontSize:"16px", fontWeight:"800"}}>Available Endpoints</h2>
          <div style={{marginTop:"16px", display:"flex", flexDirection:"column", gap:"10px"}}>
            <div style={{background:"black", borderRadius:"10px", padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid #1a1a1a"}}>
              <span style={{fontSize:"12px"}}><span style={{background:"#22c55e", color:"black", padding:"2px 6px", borderRadius:"4px", fontWeight:"800", fontSize:"10px", marginRight:"8px"}}>GET</span>/api/voices</span>
              <span style={{fontSize:"11px", color:"#666"}}>List recordings</span>
            </div>
            <div style={{background:"black", borderRadius:"10px", padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid #1a1a1a"}}>
              <span style={{fontSize:"12px"}}><span style={{background:"#22c55e", color:"black", padding:"2px 6px", borderRadius:"4px", fontWeight:"800", fontSize:"10px", marginRight:"8px"}}>GET</span>/api/datasets</span>
              <span style={{fontSize:"11px", color:"#666"}}>Pidgin datasets</span>
            </div>
            <div style={{background:"black", borderRadius:"10px", padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid #1a1a1a"}}>
              <span style={{fontSize:"12px"}}><span style={{background:"#a78bfa", color:"black", padding:"2px 6px", borderRadius:"4px", fontWeight:"800", fontSize:"10px", marginRight:"8px"}}>POST</span>/api/translate</span>
              <span style={{fontSize:"11px", color:"#666"}}>Pidgin → English</span>
            </div>
          </div>

          <div style={{marginTop:"18px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
            <Link href="/" style={{background:"#22c55e", color:"#041208", padding:"14px", borderRadius:"12px", textAlign:"center", textDecoration:"none", fontWeight:"900", fontSize:"14px"}}>Start Building →</Link>
            <button style={{background:"#1a2a1e", color:"white", padding:"14px", borderRadius:"12px", border:"1px solid #2a3a2e", fontWeight:"700", fontSize:"14px"}}>View Docs</button>
          </div>
        </div>

        {/* PRICING TEASER */}
        <div style={{marginTop:"20px", background:"linear-gradient(135deg, #101b13, #0f1218)", border:"1px solid #1f3a25", borderRadius:"20px", padding:"22px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <h3 style={{fontSize:"15px", fontWeight:"800"}}>Need more requests?</h3>
            <p style={{fontSize:"12px", color:"#888", marginTop:"4px"}}>Upgrade to Pro — 50k requests/month</p>
          </div>
          <div style={{fontSize:"20px"}}>🚀</div>
        </div>

        <p style={{textAlign:"center", color:"#444", fontSize:"11px", marginTop:"24px"}}>MAIN NAIJA PIDGIN © 2026 • Every voice matters 🇳🇬</p>
      </div>
    </div>
  );
}