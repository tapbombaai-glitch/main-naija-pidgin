import Link from "next/link";
import "./home.css";

export default function HomePage() {
  return (
    <main className="home">
      <div className="content">
        <header className="hero">
          <div className="brand">
            <span className="brandIcon">🎙️</span>
            MAIN NAIJA PIDGIN
          </div>

          <div className="statusBadge">
            <span className="statusDot" />
            VOICE RECORDING PLATFORM
          </div>

          <h1>
            Welcome to <span>Main Naija Pidgin</span>
          </h1>

          <p className="subtitle">
            Record authentic Nigerian Pidgin voices, submit your recordings,
            and let the Chairman review your work.
          </p>
        </header>

        <section className="panels">
          {/* Chairman panel: smaller and positioned on the left */}
          <Link href="/login" className="panel chairman">
            <div className="chairmanIcon">👑</div>

            <div className="chairmanLabel">ADMINISTRATION</div>

            <h2>Chairman Panel</h2>

            <p>
              Review recordings, approve submissions, and manage the platform.
            </p>

            <span className="chairmanButton">
              Chairman Login <span aria-hidden="true">→</span>
            </span>
          </Link>

          {/* Worker panel: larger main workspace */}
          <Link href="/worker" className="panel worker">
            <div className="workerTop">
              <span className="workerIcon">🎙️</span>
              <span className="workerBadge">RECORDING WORKSPACE</span>
            </div>

            <h2>Worker Panel</h2>

            <p>
              Listen to assigned sentences, record your voice, review your
              audio, and submit your recordings to the Chairman.
            </p>

            <div className="workerFeatures">
              <span>🎧 Listen</span>
              <span>🎤 Record</span>
              <span>📤 Submit</span>
            </div>

            <span className="workerButton">
              Open Worker Workspace <span aria-hidden="true">→</span>
            </span>

            <div className="workerFootnote">
              Your recordings go to the Chairman for review.
            </div>
          </Link>
        </section>

        {/* The API marketplace remains a separate destination */}
        <section className="apiSection">
          <div>
            <span className="apiIcon">🔑</span>

            <div>
              <h2>API Marketplace</h2>
              <p>
                Explore voice API access, available credit packages, and
                developer documentation.
              </p>
            </div>
          </div>

          <Link href="/api-keys" className="apiButton">
            Explore API <span aria-hidden="true">→</span>
          </Link>
        </section>

        <footer className="footer">
          <span>MAIN NAIJA PIDGIN © 2026</span>
          <span>Built for Nigerian voices 🇳🇬</span>
        </footer>
      </div>
    </main>
  );
}