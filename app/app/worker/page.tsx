"use client";
import { useState } from "react";
import Link from "next/link";

export default function WorkerPanel() {
  const [tab, setTab] = useState("home");
  return (
    <div style={{minHeight:"100vh", background:"#050706", color:"white"}}>
      <header style={{padding:"16px", borderBottom:"1px solid #222", display:"flex", justifyContent:"space-between"}}>
        <Link href="/" style={{color:"#4ade80", textDecoration:"none"}}>← Home</Link>
        <span style={{fontSize:"12px", fontWeight:"800", letterSpacing:"1px"}}>WORKER PANEL</span>
        <span>🎙️</span>
      </header>

      <main style={{padding:"20px", paddingBottom:"80px"}}>
        {tab==="home" && (
          <>
            <h2>Welcome Worker 👋</h2>
            <p style={{color:"#888", fontSize:"14px"}}>Every voice counts!</p>
            <button onClick={()=>setTab("record")} style={{width:"100%", marginTop:"20px", background:"#22c55e", color:"black", padding:"16px", borderRadius:"14px", border:"none", fontWeight:"900"}}>🎙️ Start Recording</button>
            <div style={{marginTop:"16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px"}}>
              <div style={{background:"#151820", padding:"16px", borderRadius:"12px", textAlign:"center"}}><b style={{fontSize:"20px"}}>04</b><br/><span style={{fontSize:"11px", color:"#888"}}>Pending</span></div>
              <div style={{background:"#151820", padding:"16px", borderRadius:"12px", textAlign:"center"}}><b style={{fontSize:"20px"}}>12</b><br/><span style={{fontSize:"11px", color:"#888"}}>Done</span></div>
            </div>
          </>
        )}
        {tab==="record" && <div><button onClick={()=>setTab("home")} style={{background:"none", border:"none", color:"#22c55e"}}>← Back</button><h2 style={{marginTop:"12px"}}>Record Voice</h2><div style={{marginTop:"20px", background:"#151820", padding:"30px", borderRadius:"16px", textAlign:"center"}}>🎤<p style={{marginTop:"10px"}}>Ready — Max 60s</p><button style={{width:"100%", marginTop:"12px", background:"#22c55e", color:"black", padding:"12px", borderRadius:"10px", border:"none", fontWeight:"bold"}}>Start Recording</button></div></div>}
        {tab==="mywork" && <div><h2>My Work</h2><p style={{color:"#888"}}>Recordings go show here</p></div>}
        {tab==="profile" && <div><h2>Profile</h2><p style={{color:"#888"}}>worker@naijapidgin.com</p></div>}
      </main>

      <nav style={{position:"fixed", bottom:0, left:0, right:0, background:"#0f1218", borderTop:"1px solid #222", display:"flex", justifyContent:"space-around", padding:"10px"}}>
        <button onClick={()=>setTab("home")} style={{background:"none", border:"none", color: tab==="home" ? "#22c55e" : "#666"}}>🏠<br/>Home</button>
        <button onClick={()=>setTab("record")} style={{background:"none", border:"none", color: tab==="record" ? "#22c55e" : "#666"}}>🎙️<br/>Record</button>
        <button onClick={()=>setTab("mywork")} style={{background:"none", border:"none", color: tab==="mywork" ? "#22c55e" : "#666"}}>📁<br/>My Work</button>
        <button onClick={()=>setTab("profile")} style={{background:"none", border:"none", color: tab==="profile" ? "#22c55e" : "#666"}}>👤<br/>Profile</button>
      </nav>
    </div>
  );
}