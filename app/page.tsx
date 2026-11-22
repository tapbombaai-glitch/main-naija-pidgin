"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight:"100vh", background:"#070707", color:"white", fontFamily:"Arial, sans-serif", padding:"20px 16px 40px" }}>
      <div style={{ maxWidth:480, margin:"0 auto", textAlign:"center" }}>
        <div style={{ fontSize:40 }}>👑</div>
        <h1 style={{ fontSize:26, margin:"10px 0 4px", color:"#D4AF37" }}>MAIN NAIJA PIDGIN</h1>
        <p style={{ color:"#aaa", fontSize:13, lineHeight:1.6 }}>Worker record → Chairman approve → Marketplace sell.<br/>Choose your app:</p>
        <div style={{ display:"grid", gap:14, marginTop:24, textAlign:"left" }}>
          <Link href="/worker" style={{ textDecoration:"none", background:"#111A11", border:"1px solid #00E676", borderRadius:16, padding:18, display:"block" }}>
            <div style={{ fontSize:28 }}>🎙️</div>
            <div style={{ color:"white", fontWeight:900, fontSize:18, marginTop:8 }}>WORKER APP</div>
            <div style={{ color:"#aaa", fontSize:12, marginTop:4 }}>Record Pidgin 11-15 sec • ₦20<br/>Record Nigerian English 60+ sec • ₦30</div>
            <div style={{ color:"#00E676", fontWeight:900, fontSize:13, marginTop:10 }}>Open Worker →</div>
          </Link>
          <Link href="/admin" style={{ textDecoration:"none", background:"#171307", border:"1px solid #D4AF37", borderRadius:16, padding:18, display:"block" }}>
            <div style={{ fontSize:28 }}>👑</div>
            <div style={{ color:"white", fontWeight:900, fontSize:18, marginTop:8 }}>CHAIRMAN APP</div>
            <div style={{ color:"#aaa", fontSize:12, marginTop:4 }}>Review • Approve / Reject • Pay Workers • Withdrawals</div>
            <div style={{ color:"#D4AF37", fontWeight:900, fontSize:13, marginTop:10 }}>Open Chairman →</div>
          </Link>
          <Link href="/marketplace" style={{ textDecoration:"none", background:"#1A1500", border:"1px solid #FFC107", borderRadius:16, padding:18, display:"block" }}>
            <div style={{ fontSize:28 }}>🛍️</div>
            <div style={{ color:"white", fontWeight:900, fontSize:18, marginTop:8 }}>MARKETPLACE APP</div>
            <div style={{ color:"#aaa", fontSize:12, marginTop:4 }}>Buy only APPROVED dataset</div>
            <div style={{ color:"#FFC107", fontWeight:900, fontSize:13, marginTop:10 }}>Open Marketplace →</div>
          </Link>
        </div>
      </div>
    </main>
  );
}