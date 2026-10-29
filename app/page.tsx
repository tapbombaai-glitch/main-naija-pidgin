import Link from "next/link";
import "./home.css";

export default function Home() {
  return (
    <div className="home">
      <div className="content">
        <div className="hero">
          <div className="brand"><span className="brandIcon">🇳🇬</span> MAIN NAIJA PIDGIN</div>
          <div className="statusBadge"><span className="statusDot"></span> FRONTEND DEMO</div>
          <h1>Welcome to <span>Main Naija Pidgin</span></h1>
          <p className="subtitle">Preserving authentic Nigerian languages through community voice recording.</p>
        </div>

        <div className="panels">
          <Link href="/admin/login" className="panel chairman">
            <div className="chairmanIcon">👑</div>
            <div className="chairmanLabel">CHAIRMAN PANEL</div>
            <h2>Chairman Dashboard</h2>
            <p>Review recordings, manage workers.</p>
            <div className="chairmanButton"><span>Open Chairman Panel</span><span>→</span></div>
          </Link>

          <div className="panel worker">
            <div className="workerTop">
              <div className="workerIcon">🎙️</div>
              <div className="workerBadge">RECORDING WORKSPACE</div>
            </div>
            <h2>Worker Panel</h2>
            <p>Login to access your recording facilities.</p>
            <Link href="/worker/login" style={{textDecoration:'none'}}>
              <div className="workerButton" style={{justifyContent:'center', marginTop:'24px', cursor:'pointer'}}>
                Log In →
              </div>
            </Link>
            <div className="workerFootnote">Facilities will appear after login.</div>
          </div>
        </div>

        <div className="apiSection">
          <div><div className="apiIcon">🔌</div><div><h2>API Marketplace</h2><p>Access datasets.</p></div></div>
          <Link href="/api-docs" className="apiButton"><span>Explore API</span><span>→</span></Link>
        </div>

        <div className="footer"><span>MAIN NAIJA PIDGIN © 2026</span><span>Built for Nigerian voices 🇳🇬</span></div>
      </div>
    </div>
  );
}