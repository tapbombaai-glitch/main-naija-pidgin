import Link from "next/link";
import "./home.css";

export default function Home() {
  return (
    <div className="home">
      <div className="content">
        <div className="hero">
          <div className="brand"><span className="brandIcon">🇳🇬</span> MAIN NAIJA PIDGIN</div>
          <div className="statusBadge" style={{background:"#0f2b16", borderColor:"#1f5a2a", color:"#4ade80"}}>
            <span className="statusDot" style={{background:"#22c55e"}}></span> LIVE • NAIJA VOICES
          </div>
          <h1>Welcome to <span>Main Naija Pidgin</span></h1>
          <p className="subtitle">Preserving authentic Nigerian languages through community voice recording. Every voice counts.</p>
        </div>

        <div className="panels">
          {/* WORKER PANEL - FIXED TO /worker */}
          <div className="panel worker" style={{borderColor:"#1a3a25", background:"linear-gradient(180deg, #0f1f14 0%, #0a1410 100%)"}}>
            <div className="workerTop">
              <div className="workerIcon" style={{background:"#132a1a"}}>🎙️</div>
              <div className="workerBadge" style={{background:"#102216", color:"#4ade80", border:"1px solid #1f5a2a"}}>RECORDING WORKSPACE</div>
            </div>
            <h2>Worker Panel</h2>
            <p>Access your recording workspace directly. Start recording Pidgin voices.</p>
            <Link href="/worker" style={{textDecoration:'none'}}>
              <div className="workerButton" style={{justifyContent:'center', marginTop:'20px', cursor:'pointer', background:"#22c55e", color:"#041208", fontWeight:"900"}}>
                Enter Workspace →
              </div>
            </Link>
            <div className="workerFootnote" style={{color:"#4ade80"}}>✓ No login needed • Ready to record</div>
          </div>

          {/* CHAIRMAN PANEL - STILL WORKS */}
          <Link href="/admin/login" className="panel chairman" style={{textDecoration:"none"}}>
            <div className="chairmanIcon">👑</div>
            <div className="chairmanLabel">CHAIRMAN PANEL</div>
            <h2>Chairman Dashboard</h2>
            <p>Review recordings, manage workers.</p>
            <div className="chairmanButton"><span>Open Chairman Panel</span><span>→</span></div>
          </Link>
        </div>

        <div className="apiSection" style={{borderColor:"#1a2a1e"}}>
          <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
            <div className="apiIcon" style={{background:"#102216"}}>🔌</div>
            <div><h2 style={{fontSize:"16px"}}>API Marketplace</h2><p style={{fontSize:"13px", color:"#888"}}>Access datasets. Build with Naija voices.</p></div>
          </div>
          <Link href="/marketplace" className="apiButton" style={{textDecoration:"none"}}>
            <span>Explore API</span><span>→</span>
          </Link>
        </div>

        <div className="footer"><span>MAIN NAIJA PIDGIN © 2026</span><span>Built for Nigerian voices 🇳🇬</span></div>
      </div>
    </div>
  );
}