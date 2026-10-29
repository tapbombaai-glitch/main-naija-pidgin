"use client";
import { useState } from "react";
import Link from "next/link";
import "../home.css";

export default function Marketplace() {
  const [copied, setCopied] = useState(false);
  const apiKey = "mnpp_live_sk_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7";

  return (
    <div style={{minHeight:"100vh", background:"#080a08", padding:"16px"}}>
      <div style={{maxWidth:"480px", margin:"0 auto"}}>
        
        <div style={{display:"flex", alignItems:"center", gap:"10px", marginBottom:"16px", padding:"10px 0"}}>
          <Link href="/" style={{color:"#4ade80", textDecoration:"none", fontSize:"14px", fontWeight:"600"}}>← Home</Link>
          <span style={{color:"#555", fontSize:"12px", letterSpacing:"2px", fontWeight:"800", marginLeft:"auto", marginRight:"auto"}}>API MARKETPLACE</span>
        </div>

        <div style={{background:"linear-gradient(180deg, #111a12 0%, #0d1210 100%)", border:"1px solid #1f3a25", borderRadius:"20px", padding:"20px"}}>
          <div style={{display:"flex", gap:"12px", alignItems:"flex-start"}}>
            <div style={{width:"42px", height:"42px", background:"#1a2a1e", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"20px"}}>🔌</div>
            <div>
              <h1 style={{fontSize:"16px", fontWeight:"900", color:"white", margin:0}}>API Marketplace</h1>
              <p style={{fontSize:"12px", color:"#777", margin:"4px 0 0 0"}}>Build with authentic Naija Pidgin voices & datasets</p>
            </div>
          </div>

          <div style={{marginTop:"18px", background:"#0a100c", border:"1px solid #1e3a25", borderRadius:"16px", padding:"14px"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <p style={{fontSize:"10px", fontWeight:"800", color:"#777", letterSpacing:"1px", margin:0}}>YOUR API KEY</p>
              <span style={{fontSize:"9px", background:"#102216", color:"#4ade80", padding:"3px 8px", borderRadius:"20px", border:"1px solid #1f5a2a"}}>● LIVE</span>
            </div>
            <code style={{display:"block", marginTop:"10px", background:"black", border:"1px solid #1a2a1e", padding:"10px", borderRadius:"8px", color:"#4ade80", fontSize:"11px", wordBreak:"break-all", fontFamily:"monospace"}}>{apiKey}</code>
            <button onClick={()=>{navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(()=>setCopied(false),2000)}} 
              style={{width:"100%", marginTop:"10px", background: copied ? "#22c55e" : "#1a2a1e", color: copied ? "#041208" : "#aaa", border:"1px solid #2a3a2e", padding:"11px", borderRadius:"10px", fontWeight:"800", cursor:"pointer", fontSize:"13px"}}>
              {copied ? "✓ Copied!" : "Copy API Key"}
            </button>
          </div>

          <div style={{marginTop:"14px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px"}}>
            <div style={{background:"#0f1210", border:"1px solid #1f2320", borderRadius:"14px", padding:"14px 8px", textAlign:"center"}}>
              <div style={{fontSize:"18px", fontWeight:"900", color:"white"}}>1,000</div>
              <div style={{fontSize:"8px", color:"#666", fontWeight:"800", marginTop:"2px"}}>FREE<br/>REQUESTS</div>
            </div>
            <div style={{background:"#0f1210", border:"1px solid #1f2320", borderRadius:"14px", padding:"14px 8px", textAlign:"center"}}>
              <div style={{fontSize:"18px", fontWeight:"900", color:"white"}}>3</div>
              <div style={{fontSize:"8px", color:"#22c55e", fontWeight:"800", marginTop:"2px"}}>DATASETS<br/>LIVE</div>
            </div>
            <div style={{background:"#0f1210", border:"1px solid #1f2320", borderRadius:"14px", padding:"14px 8px", textAlign:"center"}}>
              <div style={{fontSize:"18px", fontWeight:"900", color:"white"}}>99.9%</div>
              <div style={{fontSize:"8px", color:"#666", fontWeight:"800", marginTop:"2px"}}>UPTIME</div>
            </div>
          </div>
        </div>

        <div style={{marginTop:"14px", background:"#0f1210", border:"1px solid #1f2320", borderRadius:"20px", padding:"18px"}}>
          <h3 style={{fontSize:"14px", fontWeight:"800", color:"white", margin:0}}>Available Endpoints</h3>
          <div style={{marginTop:"14px", display:"flex", flexDirection:"column", gap:"10px"}}>
            <div style={{background:"black", border:"1px solid #1a1a1a", padding:"12px 14px", borderRadius:"12px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
                <span style={{background:"#22c55e", color:"black", padding:"3px 8px", borderRadius:"6px", fontWeight:"900", fontSize:"9px"}}>GET</span>
                <span style={{color:"white", fontSize:"13px", fontFamily:"monospace"}}>/api/voices</span>
              </div>
              <span style={{color:"#555", fontSize:"11px"}}>List recordings</span>
            </div>
            <div style={{background:"black", border:"1px solid #1a1a1a", padding:"12px 14px", borderRadius:"12px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
                <span style={{background:"#22c55e", color:"black", padding:"3px 8px", borderRadius:"6px", fontWeight:"900", fontSize:"9px"}}>GET</span>
                <span style={{color:"white", fontSize:"13px", fontFamily:"monospace"}}>/api/datasets</span>
              </div>
              <span style={{color:"#555", fontSize:"11px"}}>Pidgin datasets</span>
            </div>
            <div style={{background:"black", border:"1px solid #1a1a1a", padding:"12px 14px", borderRadius:"12px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
                <span style={{background:"#c4b5fd", color:"black", padding:"3px 8px", borderRadius:"6px", fontWeight:"900", fontSize:"9px"}}>POST</span>
                <span style={{color:"white", fontSize:"13px", fontFamily:"monospace"}}>/api/translate</span>
              </div>
              <span style={{color:"#555", fontSize:"11px"}}>Pidgin → English</span>
            </div>
          </div>
          <div style={{marginTop:"16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
            <Link href="/worker" style={{textDecoration:"none"}}>
              <div style={{background:"#22c55e", color:"#041208", padding:"13px", borderRadius:"12px", textAlign:"center", fontWeight:"900", fontSize:"13px"}}>Start Building →</div>
            </Link>
            <div style={{background:"#1a1a1a", border:"1px solid #2a2a2a", color:"white", padding:"13px", borderRadius:"12px", textAlign:"center", fontWeight:"700", fontSize:"13px", cursor:"pointer"}}>View Docs</div>
          </div>
        </div>

        <div style={{marginTop:"14px", background:"linear-gradient(135deg, #121212 0%, #0f1210 100%)", border:"1px solid #1f2320", borderRadius:"16px", padding:"16px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <p style={{fontSize:"13px", fontWeight:"800", color:"white", margin:0}}>Need more requests?</p>
            <p style={{fontSize:"11px", color:"#666", margin:"3px 0 0 0"}}>Upgrade to Pro - 50k requests/month</p>
          </div>
          <span style={{fontSize:"20px"}}>🚀</span>
        </div>

        <div style={{marginTop:"18px", textAlign:"center", fontSize:"10px", color:"#333"}}>MAIN NAIJA PIDGIN © 2026 • Every voice matters 🇳🇬</div>
      </div>
    </div>
  );
}