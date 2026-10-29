"use client";
import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const apiKey = "mnpp_live_sk_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7";

  const voices = [
    { id: "v1", name: "Lagos Male", sub: "Lagos Accent", flag: "🇳🇬", t: "0:05", url: "/omo.ogg" },
    { id: "v2", name: "Abuja Female", sub: "Calm & Clear", flag: "🇳🇬", t: "0:11", url: "/omo.ogg" },
    { id: "v3", name: "Pidgin Narrator", sub: "Natural Pidgin", flag: "🇳🇬", t: "0:14", url: "/omo.ogg" },
    { id: "v4", name: "Delta", sub: "Warri Accent", flag: "🇳🇬", t: "0:10", url: "/omo.ogg" },
  ];

  return (
    <div style={{background:"#050705", minHeight:"100vh", padding:"12px", fontFamily:"sans-serif"}}>
      <div style={{maxWidth:"700px", margin:"0 auto"}}>
        
        {/* HEADER - ONLY ONE TIME */}
        <div style={{textAlign:"center", padding:"20px 0 10px 0"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", fontWeight:"900", fontSize:"14px", color:"white", letterSpacing:"1px"}}>
            <span>🇳🇬</span> MAIN NAIJA PIDGIN
          </div>
          <h1 style={{marginTop:"14px", fontSize:"26px", fontWeight:"900", color:"white"}}>Welcome to <span style={{color:"#facc15"}}>Main Naija Pidgin</span></h1>
        </div>

        {/* WORKER + CHAIRMAN */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginTop:"18px"}}>
          <div style={{background:"#0f1410", border:"1px solid #1f3a25", borderRadius:"18px", padding:"16px"}}>
            <h2 style={{fontSize:"16px", fontWeight:"900", color:"white"}}>Worker Panel</h2>
            <p style={{fontSize:"11px", color:"#888", marginTop:"6px"}}>Access your recording workspace.</p>
            <Link href="/worker" style={{textDecoration:"none"}}>
              <div style={{marginTop:"12px", background:"#22c55e", color:"black", padding:"11px", borderRadius:"10px", textAlign:"center", fontWeight:"900", fontSize:"12px"}}>Enter Workspace →</div>
            </Link>
          </div>
          <div style={{background:"#101012", border:"1px solid #2a2a2a", borderRadius:"18px", padding:"16px"}}>
            <h2 style={{fontSize:"16px", fontWeight:"900", color:"white"}}>Chairman Dashboard</h2>
            <p style={{fontSize:"11px", color:"#888", marginTop:"6px"}}>Review recordings, manage workers.</p>
            <Link href="/admin/login" style={{textDecoration:"none"}}>
              <div style={{marginTop:"12px", background:"#1f1f1f", border:"1px solid #333", color:"white", padding:"11px", borderRadius:"10px", textAlign:"center", fontWeight:"700", fontSize:"12px"}}>Open Chairman Panel →</div>
            </Link>
          </div>
        </div>

        {/* MARKETPLACE - SINGLE, NO DOUBLE */}
        <div style={{marginTop:"14px", background:"#111a12", border:"1px solid #1f3a25", borderRadius:"20px", padding:"20px"}}>
            <h1 style={{fontSize:"16px", fontWeight:"900", color:"white"}}>API Marketplace</h1>
            <p style={{fontSize:"12px", color:"#777"}}>Build with authentic Naija Pidgin voices & datasets</p>

            <div style={{marginTop:"14px", background:"#0a100c", border:"1px solid #1e3a25", borderRadius:"12px", padding:"14px"}}>
              <code style={{color:"#4ade80", fontSize:"11px", wordBreak:"break-all"}}>{apiKey}</code>
              <button onClick={()=>{navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(()=>setCopied(false),2000)}} 
                style={{width:"100%", marginTop:"10px", background: copied ? "#22c55e" : "#1a2a1e", color:"white", padding:"11px", borderRadius:"10px", fontWeight:"800"}}>
                {copied ? "✓ Copied!" : "Copy API Key"}
              </button>
            </div>

            <div style={{marginTop:"18px"}}>
              <h3 style={{fontSize:"13px", fontWeight:"900", color:"white"}}>Preview Voices</h3>
              <div style={{marginTop:"10px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
                {voices.map(v => (
                  <div key={v.id} style={{background:"black", border:"1px solid #1e2a20", borderRadius:"12px", padding:"10px"}}>
                    <div style={{fontSize:"11px", fontWeight:"800", color:"white"}}>{v.flag} {v.name}</div>
                    <div style={{fontSize:"9px", color:"#666"}}>{v.sub} - {v.t}</div>
                    <div onClick={()=>{new Audio(v.url).play()}} style={{marginTop:"8px", width:"22px", height:"22px", background:"#22c55e", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer"}}>▶</div>
                  </div>
                ))}
              </div>
            </div>
        </div>

        <div style={{marginTop:"18px", textAlign:"center", fontSize:"10px", color:"#333"}}>MAIN NAIJA PIDGIN © 2026</div>
      </div>
    </div>
  );
}