"use client";
import Link from "next/link";
import { useState } from "react";

export default function Marketplace(){
  const [play,setPlay]=useState(0);
  return(
    <div style={{minHeight:"100vh",background:"#0a0f0a",display:"flex",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:430,background:"#0a100c",padding:"16px 14px",borderLeft:"1px solid #111",borderRight:"1px solid #111"}}>
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}>
          <span style={{color:"#666",fontSize:12}}>8:45 AM</span>
          <Link href="/" style={{background:"#111",color:"white",width:28,height:28,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",textDecoration:"none"}}>X</Link>
        </div>
        <div style={{display:"flex",gap:10,marginTop:10}}>
          <div style={{width:40,height:40,background:"#0f2212",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔌</div>
          <div>
            <div style={{color:"white",fontSize:20,fontWeight:900}}>API <span style={{color:"#00C853"}}>Marketplace</span></div>
            <div style={{color:"#666",fontSize:11}}>Authentic Naija Pidgin Voices</div>
          </div>
        </div>
        <div style={{marginTop:16,background:"#111811",border:"1px solid #1a3a20",borderRadius:16,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{color:"#ccc",fontSize:13}}>Live API Key</span>
            <span style={{background:"#0f2212",color:"#00C853",fontSize:9,padding:"2px 8px",borderRadius:10}}>LIVE</span>
          </div>
          <div style={{marginTop:10,background:"#000",padding:10,borderRadius:10,color:"#444",fontSize:13,fontFamily:"monospace"}}>sk_live_••••••••••••••••</div>
        </div>
        <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div style={{background:"#111811",border:"1px solid #1a3a20",borderRadius:12,padding:12,textAlign:"center"}}><div style={{color:"#00C853",fontWeight:900,fontSize:18}}>100</div><div style={{color:"#666",fontSize:8}}>FREE VOICES</div></div>
          <div style={{background:"#111811",border:"1px solid #1a3a20",borderRadius:12,padding:12,textAlign:"center"}}><div style={{color:"#00C853",fontWeight:900,fontSize:18}}>3</div><div style={{color:"#666",fontSize:8}}>DATASETS</div></div>
          <div style={{background:"#111811",border:"1px solid #1a3a20",borderRadius:12,padding:12,textAlign:"center"}}><div style={{color:"#00C853",fontWeight:900,fontSize:18}}>99.9%</div><div style={{color:"#666",fontSize:8}}>UPTIME</div></div>
        </div>
        <div style={{marginTop:16}}>
          <div style={{color:"white",fontWeight:800,fontSize:14}}>Pricing Plans</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
            <div style={{background:"#111811",border:"1px solid #1a3a20",borderRadius:16,padding:12}}>
              <div style={{fontSize:20}}>🎁</div><div style={{color:"#00C853",fontWeight:900}}>Starter</div><div style={{color:"white",fontSize:13,fontWeight:700}}>100 Voices Free</div><div style={{color:"#666",fontSize:10,marginTop:4}}>API Key included</div>
              <button style={{width:"100%",marginTop:12,border:"1px solid #00C853",background:"transparent",color:"#00C853",padding:8,borderRadius:20,fontSize:11}}>Get Free Key →</button>
            </div>
            <div style={{background:"#112216",border:"2px solid #00C853",borderRadius:16,padding:12,position:"relative"}}>
              <div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",background:"#00C853",color:"black",fontSize:8,padding:"2px 8px",borderRadius:10,fontWeight:900}}>MOST POPULAR</div>
              <div style={{fontSize:20}}>👑</div><div style={{color:"white",fontWeight:900}}>Pro</div><div style={{color:"white",fontSize:13}}>1,000 Voices</div><div style={{color:"#00C853",fontSize:22,fontWeight:900}}>₦5,000</div><div style={{color:"#666",fontSize:10}}>Full API access</div>
              <button style={{width:"100%",marginTop:10,background:"#00C853",color:"black",border:"none",padding:8,borderRadius:20,fontSize:11,fontWeight:900}}>Buy with Paystack 🔒</button>
            </div>
          </div>
        </div>
        <div style={{marginTop:16}}>
          <div style={{color:"white",fontWeight:800}}>Preview Voices</div>
          <div style={{display:"flex",gap:8,overflowX:"auto",marginTop:10}}>
            {[{n:"Lagos Male",s:"Lagos Accent",t:"0:12"},{n:"Abuja Female",s:"Calm & Clear",t:"0:11"},{n:"Pidgin Narrator",s:"Natural Pidgin",t:"0:14"},{n:"Delta Warri",s:"Warri Accent",t:"0:13"}].map((v,i)=>(
              <div key={i} style={{minWidth:130,background:"#111811",border:"1px solid #1a3a20",borderRadius:12,padding:10}}>
                <div style={{color:"white",fontSize:11,fontWeight:700}}>{v.n}</div><div style={{color:"#666",fontSize:9}}>{v.s}</div>
                <div style={{color:"#00C853",marginTop:6,letterSpacing:2}}>〰️〰️</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:8,alignItems:"center"}}>
                  <div onClick={()=>setPlay(i)} style={{width:24,height:24,background:"#00C853",borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",color:"black",fontSize:10}}>{play===i?"■":"▶"}</div>
                  <span style={{color:"#666",fontSize:10}}>{v.t}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginTop:14,display:"flex",gap:10}}>
          <Link href="/worker" style={{flex:1,textDecoration:"none"}}><div style={{background:"#00C853",color:"black",padding:14,borderRadius:14,textAlign:"center",fontWeight:900}}>Start Building →</div></Link>
          <div style={{background:"#1a1a1a",border:"1px solid #333",color:"white",padding:14,borderRadius:14,fontSize:13}}>View Docs</div>
        </div>
      </div>
    </div>
  );
}