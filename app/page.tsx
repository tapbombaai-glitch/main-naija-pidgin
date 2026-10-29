"use client";
import { useState } from "react";
import Link from "next/link";
import "./home.css";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const apiKey = "mnpp_live_sk_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7";

  return (
    <div className="home">
      <div className="content" style={{maxWidth:"1100px"}}>
        {/* HERO */}
        <div className="hero">
          <div className="brand"><span className="brandIcon">🇳🇬</span> MAIN NAIJA PIDGIN</div>
          <div className="statusBadge" style={{background:"#0f2b16", borderColor:"#1f5a2a", color:"#4ade80"}}>
            <span className="statusDot" style={{background:"#22c55e"}}></span> LIVE • NAIJA VOICES
          </div>
          <h1>Welcome to <span>Main Naija Pidgin</span></h1>
          <p className="subtitle">Preserving authentic Nigerian languages through community voice recording. Every voice counts.</p>
        </div>

        {/* TOP PANELS - WORKER + CHAIRMAN SIDE BY SIDE */}
        <div className="panels" style={{display:"grid", gridTemplateColumns:"1.2fr 0.8fr", gap:"16px", marginTop:"24px"}}>
          
          {/* WORKER - LEFT BIG */}
          <div className="panel worker" style={{borderColor:"#1a3a25", background:"linear-gradient(180deg, #0f1f14 0%, #0a1410 100%)", borderRadius:"20px", padding:"22px"}}>
            <div className="workerTop" style={{display:"flex", alignItems:"center", gap:"10px", marginBottom:"12px"}}>
              <div className="workerIcon" style={{background:"#132a1a", width:"40px", height:"40px", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"12px"}}>🎙️</div>
              <div className="workerBadge" style={{background:"#102216", color:"#4ade80", border:"1px solid #1f5a2a", padding:"6px 12px", borderRadius:"20px", fontSize:"10px", fontWeight:"800"}}>RECORDING WORKSPACE</div>
            </div>
            <h2 style={{fontSize:"20px", fontWeight:"900"}}>Worker Panel</h2>
            <p style={{fontSize:"13px", color:"#888", marginTop:"6px"}}>Access your recording workspace directly. Start recording Pidgin voices.</p>
            <Link href="/worker" style={{textDecoration:'none'}}>
              <div className="workerButton" style={{justifyContent:'center', marginTop:'18px', cursor:'pointer', background:"#22c55e", color:"#041208", fontWeight:"900", padding:"14px", borderRadius:"12px", textAlign:"center"}}>
                Enter Workspace →
              </div>
            </Link>
            <div className="workerFootnote" style={{color:"#4ade80", fontSize:"11px", marginTop:"10px"}}>✓ No login needed • Ready to record</div>
          </div>

          {/* CHAIRMAN - RIGHT SMALL */}
          <Link href="/admin/login" className="panel chairman" style={{textDecoration:"none", borderRadius:"20px", padding:"22px", background:"#0f1218", border:"1px solid #1f232b", display:"block"}}>
            <div className="chairmanIcon" style={{fontSize:"24px"}}>👑</div>
            <div className="chairmanLabel" style={{fontSize:"10px", color:"#888", letterSpacing:"1px", fontWeight:"800", marginTop:"8px"}}>CHAIRMAN PANEL</div>
            <h2 style={{fontSize:"18px", fontWeight:"800", marginTop:"8px", color:"white"}}>Chairman Dashboard</h2>
            <p style={{fontSize:"13px", color:"#888", marginTop:"6px"}}>Review recordings, manage workers.</p>
            <div className="chairmanButton" style={{marginTop:"16px", background:"#1a1a1a", borderRadius:"10px", padding:"12px", display:"flex", justifyContent:"space-between", color:"white", fontSize:"13px"}}><span>Open Chairman Panel</span><span>→</span></div>
          </Link>
        </div>

        {/* MARKETPLACE - SAME DASHBOARD - FULL BELOW */}
        <div style={{marginTop:"18px", background:"linear-gradient(180deg, #101b13 0%, #0a1410 100%)", border:"1px solid #1f4d2a", borderRadius:"24px", padding:"24px"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            <div style={{display:"flex", alignItems:"center", gap:"14px"}}>
              <div style={{width:"48px", height:"48px", background:"#132a1a", borderRadius:"14px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"24px"}}>🔌</div>
              <div>
                <h2 style={{fontSize:"18px", fontWeight:"900"}}>API Marketplace</h2>
                <p style={{fontSize:"12px", color:"#888", marginTop:"2px"}}>Build with Naija voices — Same dashboard!</p>
              </div>
            </div>
            <span style={{fontSize:"10px", background:"#102216", color:"#4ade80", padding:"5px 12px", borderRadius:"20px", border:"1px solid #1f5a2a"}}>● LIVE</span>
          </div>

          {/* API KEY + STATS + ENDPOINTS ALL TOGETHER */}
          <div style={{marginTop:"18px", display:"grid", gridTemplateColumns:"1.2fr 0.8fr", gap:"14px"}}>
            {/* LEFT - KEY */}
            <div>
              <div style={{background:"#09100c", border:"1px solid #1f3a25", borderRadius:"14px", padding:"16px"}}>
                <p style={{fontSize:"10px", fontWeight:"800", color:"#aaa", margin:0, letterSpacing:"1px"}}>YOUR API KEY</p>
                <code style={{display:"block", marginTop:"10px", background:"black", border:"1px solid #1f2f25", padding:"12px", borderRadius:"8px", color:"#4ade80", fontSize:"11px", wordBreak:"break-all"}}>{apiKey}</code>
                <button onClick={()=>{navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(()=>setCopied(false),2000)}} style={{width:"100%", marginTop:"10px", background: copied ? "#22c55e" : "#1a2a1e", color: copied ? "#041208" : "white", border:"1px solid #2a3a2e", padding:"10px", borderRadius:"8px", fontWeight:"800", cursor:"pointer", fontSize:"12px"}}>
                  {copied ? "✓ Copied!" : "Copy API Key"}
                </button>
              </div>

              <div style={{marginTop:"10px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"8px"}}>
                <div style={{background:"#0f1218", border:"1px solid #1f232b", borderRadius:"12px", padding:"12px", textAlign:"center"}}>
                  <div style={{fontSize:"16px", fontWeight:"900"}}>1,000</div><div style={{fontSize:"9px", color:"#888"}}>FREE REQS</div>
                </div>
                <div style={{background:"#0f1218", border:"1px solid #1f232b", borderRadius:"12px", padding:"12px", textAlign:"center"}}>
                  <div style={{fontSize:"16px", fontWeight:"900"}}>3</div><div style={{fontSize:"9px", color:"#22c55e"}}>LIVE</div>
                </div>
                <div style={{background:"#0f1218", border:"1px solid #1f232b", borderRadius:"12px", padding:"12px", textAlign:"center"}}>
                  <div style={{fontSize:"16px", fontWeight:"900"}}>99.9%</div><div style={{fontSize:"9px", color:"#888"}}>UPTIME</div>
                </div>
              </div>
            </div>

            {/* RIGHT - ENDPOINTS */}
            <div style={{background:"#0f1218", border:"1px solid #1f232b", borderRadius:"14px", padding:"16px"}}>
              <p style={{fontSize:"11px", fontWeight:"800", margin:0}}>Endpoints</p>
              <div style={{marginTop:"10px", display:"flex", flexDirection:"column", gap:"8px"}}>
                <div style={{background:"black", padding:"10px 12px", borderRadius:"8px", fontSize:"11px", display:"flex", justifyContent:"space-between"}}>
                  <span><span style={{background:"#22c55e", color:"black", padding:"2px 5px", borderRadius:"4px", fontWeight:"800", fontSize:"9px"}}>GET</span> /api/voices</span>
                </div>
                <div style={{background:"black", padding:"10px 12px", borderRadius:"8px", fontSize:"11px", display:"flex", justifyContent:"space-between"}}>
                  <span><span style={{background:"#22c55e", color:"black", padding:"2px 5px", borderRadius:"4px", fontWeight:"800", fontSize:"9px"}}>GET</span> /api/datasets</span>
                </div>
                <div style={{background:"black", padding:"10px 12px", borderRadius:"8px", fontSize:"11px", display:"flex", justifyContent:"space-between"}}>
                  <span><span style={{background:"#c4b5fd", color:"black", padding:"2px 5px", borderRadius:"4px", fontWeight:"800", fontSize:"9px"}}>POST</span> /api/translate</span>
                </div>
              </div>
              <Link href="/marketplace" style={{display:"block", marginTop:"12px", background:"#22c55e", color:"#041208", padding:"12px", borderRadius:"10px", textAlign:"center", textDecoration:"none", fontWeight:"900", fontSize:"13px"}}>
                Explore Full API →
              </Link>
            </div>
          </div>
        </div>

        <div className="footer" style={{marginTop:"20px", display:"flex", justifyContent:"space-between", fontSize:"11px", color:"#444"}}>
          <span>MAIN NAIJA PIDGIN © 2026</span><span>Built for Nigerian voices 🇳🇬 • All in one dashboard</span>
        </div>
      </div>
    </div>
  );
} 