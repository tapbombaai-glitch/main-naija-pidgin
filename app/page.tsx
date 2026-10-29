"use client";
import { useState } from "react";
import Link from "next/link";
import "./home.css";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const apiKey = "mnpp_live_sk_9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d2e1f0a9b8c7";

  // YOUR 1 VERY CLEAR VOICE - FOR PREVIEW
  const voices = [
    { id: "v1", name: "Lagos Male", sub: "Lagos Accent", flag: "🇳🇬", t: "0:05", url: "/omo.ogg" },
    { id: "v2", name: "Abuja Female", sub: "Calm & Clear", flag: "🇳🇬", t: "0:11", url: "/omo.ogg" },
    { id: "v3", name: "Pidgin Narrator", sub: "Natural Pidgin", flag: "🇳🇬", t: "0:14", url: "/omo.ogg" },
    { id: "v4", name: "Delta", sub: "Warri Accent", flag: "🇳🇬", t: "0:10", url: "/omo.ogg" },
  ];

  return (
    <div className="home">
      <div className="content" style={{maxWidth:"700px", margin:"0 auto"}}>
        
        {/* HEADER */}
        <div style={{textAlign:"center", padding:"20px 0 10px 0"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", fontWeight:"900", fontSize:"14px", letterSpacing:"1px"}}>
            <span>🇳🇬</span> MAIN NAIJA PIDGIN
          </div>
          <div style={{marginTop:"10px", display:"inline-flex", alignItems:"center", gap:"6px", background:"#0f2b16", border:"1px solid #1f5a2a", color:"#4ade80", padding:"5px 12px", borderRadius:"20px", fontSize:"10px", fontWeight:"800"}}>
            <span style={{width:"6px", height:"6px", background:"#22c55e", borderRadius:"50%", display:"inline-block"}}></span> LIVE - NAIJA VOICES
          </div>
          <h1 style={{marginTop:"14px", fontSize:"26px", fontWeight:"900"}}>Welcome to <span style={{color:"#facc15"}}>Main Naija Pidgin</span></h1>
          <p style={{color:"#666", fontSize:"13px", marginTop:"8px"}}>Preserving authentic Nigerian languages — All in one dashboard</p>
        </div>

        {/* WORKER + CHAIRMAN - BALANCED - 1fr 1fr */}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginTop:"18px"}}>
          <div style={{background:"#0f1410", border:"1px solid #1f3a25", borderRadius:"18px", padding:"16px", display:"flex", flexDirection:"column", minHeight:"200px"}}>
            <div style={{width:"36px", height:"36px", background:"#132a1a", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center"}}>🎙️</div>
            <h2 style={{fontSize:"16px", fontWeight:"900", color:"white", marginTop:"12px"}}>Worker Panel</h2>
            <p style={{fontSize:"11px", color:"#666", marginTop:"6px", flex:1}}>Access your recording workspace directly.</p>
            <Link href="/worker" style={{textDecoration:"none"}}>
              <div style={{marginTop:"12px", background:"#22c55e", color:"black", padding:"11px", borderRadius:"10px", textAlign:"center", fontWeight:"900", fontSize:"12px"}}>Enter Workspace →</div>
            </Link>
          </div>
          <div style={{background:"#101012", border:"1px solid #2a2a2a", borderRadius:"18px", padding:"16px", display:"flex", flexDirection:"column", minHeight:"200px"}}>
            <div style={{width:"36px", height:"36px", background:"#1f1a00", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center"}}>👑</div>
            <h2 style={{fontSize:"16px", fontWeight:"900", color:"white", marginTop:"12px"}}>Chairman Dashboard</h2>
            <p style={{fontSize:"11px", color:"#666", marginTop:"6px", flex:1}}>Review recordings, manage workers.</p>
            <Link href="/admin/login" style={{textDecoration:"none"}}>
              <div style={{marginTop:"12px", background:"#1f1f1f", border:"1px solid #333", color:"white", padding:"11px", borderRadius:"10px", textAlign:"center", fontWeight:"700", fontSize:"12px"}}>Open Chairman Panel →</div>
            </Link>
          </div>
        </div>

        {/* YOUR MARKETPLACE CODE - I DID NOT DELETE ANYTHING */}
        <div style={{marginTop:"14px"}}>
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

            {/* === ADDED ONLY THIS PART - PREVIEW VOICES LIKE YOUR SCREENSHOT === */}
            <div style={{marginTop:"18px", background:"#0f1210", border:"1px solid #1f2320", borderRadius:"16px", padding:"16px"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <h3 style={{fontSize:"13px", fontWeight:"900", color:"white", margin:0}}>Preview Voices</h3>
                  <p style={{fontSize:"10px", color:"#666", margin:"2px 0 0 0"}}>🎧 Listen before you buy</p>
                </div>
              </div>
              <div style={{marginTop:"14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
                {voices.map(v => (
                  <div key={v.id} style={{background:"black", border:"1px solid #1e2a20", borderRadius:"12px", padding:"10px"}}>
                    <div style={{display:"flex", gap:"6px", alignItems:"center"}}>
                      <span style={{fontSize:"12px"}}>{v.flag}</span>
                      <div>
                        <div style={{fontSize:"11px", fontWeight:"800", color:"white"}}>{v.name}</div>
                        <div style={{fontSize:"9px", color:"#666"}}>{v.sub}</div>
                      </div>
                    </div>
                    <div style={{marginTop:"8px", height:"18px", background:"repeating-linear-gradient(90deg, #22c55e 0 2px, transparent 2px 4px)", opacity:0.6, borderRadius:"4px"}}></div>
                    <div style={{marginTop:"8px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                      <div style={{width:"22px", height:"22px", background:"#22c55e", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", cursor:"pointer"}} onClick={()=>{const a=new Audio(v.url); a.play()}}>▶</div>
                      <span style={{fontSize:"10px", color:"#666"}}>{v.t}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:"12px", display:"flex", gap:"6px", alignItems:"center", background:"#0a100c", border:"1px solid #1e3a25", padding:"8px 10px", borderRadius:"10px"}}>
                <span style={{fontSize:"10px"}}>🔒</span>
                <span style={{fontSize:"10px", color:"#666"}}>Pay with Card or Bank Transfer via Paystack</span>
                <span style={{marginLeft:"auto", fontSize:"11px", fontWeight:"900", color:"white"}}>paystack</span>
              </div>
            </div>
            {/* === END OF ADDED PART === */}
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
              <Link href="/marketplace" style={{textDecoration:"none"}}>
                <div style={{background:"#1a1a1a", border:"1px solid #2a2a2a", color:"white", padding:"13px", borderRadius:"12px", textAlign:"center", fontWeight:"700", fontSize:"13px"}}>View Full Marketplace</div>
              </Link>
            </div>
          </div>

          <div style={{marginTop:"14px", background:"linear-gradient(135deg, #121212 0%, #0f1210 100%)", border:"1px solid #1f2320", borderRadius:"16px", padding:"16px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <p style={{fontSize:"13px", fontWeight:"800", color:"white", margin:0}}>Need more requests?</p>
              <p style={{fontSize:"11px", color:"#666", margin:"3px 0 0 0"}}>Upgrade to Pro - 50k requests/month</p>
            </div>
            <span style={{fontSize:"20px"}}>🚀</span>
          </div>
        </div>

        <div style={{marginTop:"18px", textAlign:"center", fontSize:"10px", color:"#333"}}>MAIN NAIJA PIDGIN © 2026 — All in one dashboard ✅</div>
      </div>
    </div>
  );
}