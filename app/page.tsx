"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home">

      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      {/* HEADER */}
      <header className="header">
        <Link href="/" className="brand-area">
          <div className="logo">♛</div>

          <div className="brand">
            <h1>MAIN NAIJA PIDGIN</h1>
            <p>YOUR VOICE. OUR BUSINESS.</p>
          </div>
        </Link>

        <div className="status">
          <span className="dot" />
          PLATFORM LIVE
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-tag">
          🇳🇬 BUILT FOR NIGERIA · POWERED BY NIGERIAN VOICES
        </div>

        <h2>
          Welcome to
          <span>Main Naija Pidgin</span>
        </h2>

        <p>
          The home of Nigerian voices, AI voice technology,
          voice innovation and opportunities for everyone.
        </p>

        <div className="hero-actions">
          <Link href="/marketplace" className="hero-button">
            Explore API Marketplace <span>→</span>
          </Link>

          <a href="#platform" className="hero-secondary">
            Explore Platform ↓
          </a>
        </div>

        <div className="hero-divider">
          <span />
          <p>ONE PLATFORM. THREE DESTINATIONS.</p>
          <span />
        </div>
      </section>

      {/* MAIN PANELS */}
      <section className="panels" id="platform">

        {/* WORKER PANEL */}
        <Link href="/worker/login" className="panel worker">
          <div className="panel-top">
            <span className="panel-icon">👷</span>
            <span className="panel-badge">WORKSPACE</span>
          </div>

          <h3>Worker Panel</h3>

          <p>
            Access your workspace, record Nigerian voices,
            submit recording tasks and monitor your earnings.
          </p>

          <div className="panel-bottom">
            <span>Enter Worker Workspace</span>
            <strong>→</strong>
          </div>
        </Link>

        {/* CHAIRMAN DASHBOARD */}
        <Link href="/admin/login" className="panel admin">
          <div className="panel-top">
            <span className="panel-icon">👑</span>
            <span className="panel-badge">CHAIRMAN ONLY</span>
          </div>

          <h3>Chairman Dashboard</h3>

          <p>
            Manage workers, recordings, approvals, earnings,
            Voice Studio and platform administration.
          </p>

          <div className="panel-bottom">
            <span>Open Chairman Dashboard</span>
            <strong>→</strong>
          </div>
        </Link>

        {/* API MARKETPLACE */}
        <Link href="/marketplace" className="panel marketplace">
          <div className="panel-top">
            <span className="panel-icon">🚀</span>
            <span className="panel-badge">DEVELOPER ACCESS</span>
          </div>

          <h3>API Marketplace</h3>

          <p>
            Explore Nigerian AI voices, access voice APIs,
            claim your free API credits, manage keys and
            purchase additional credits.
          </p>

          <div className="panel-bottom">
            <span>Explore API Marketplace</span>
            <strong>→</strong>
          </div>
        </Link>

      </section>

      {/* PLATFORM FEATURES */}
      <section className="features">
        <div className="section-heading">
          <span>WHAT WE DO</span>
          <h3>One Platform. Endless Possibilities.</h3>
          <p>
            Building technology around the richness of Nigerian voices.
          </p>
        </div>

        <div className="feature-grid">

          <div className="feature">
            <span>🎙️</span>
            <h4>Voice Recording</h4>
            <p>Collect and preserve Nigerian voices.</p>
          </div>

          <div className="feature">
            <span>🤖</span>
            <h4>AI Voice Technology</h4>
            <p>Bring Nigerian voices into AI applications.</p>
          </div>

          <div className="feature">
            <span>🌍</span>
            <h4>Nigerian Languages</h4>
            <p>Support Nigeria's languages and accents.</p>
          </div>

          <div className="feature">
            <span>🚀</span>
            <h4>Voice Innovation</h4>
            <p>Build new possibilities with voice technology.</p>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-logo">♛</div>

        <strong>MAIN NAIJA PIDGIN</strong>

        <p>Building the future with Nigerian voices.</p>

        <div className="footer-line" />

        <small>
          © 2026 Main Naija Pidgin. All rights reserved.
        </small>
      </footer>

      <style jsx>{`
        .home {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background: #050907;
          color: #ffffff;
          padding: 0 7%;
          font-family: Arial, Helvetica, sans-serif;
        }

        .background-glow {
          position: absolute;
          width: 380px;
          height: 380px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.12;
          pointer-events: none;
        }

        .glow-one {
          background: #00d875;
          top: 100px;
          left: -180px;
        }

        .glow-two {
          background: #d5a900;
          top: 500px;
          right: -200px;
        }

        .header {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 25px 0;
          border-bottom: 1px solid #1b3025;
          gap: 15px;
        }

        .brand-area {
          display: flex;
          align-items: center;
          gap: 13px;
          text-decoration: none;
          color: white;
        }

        .logo,
        .footer-logo {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #00d875, #007d43);
          border-radius: 14px;
          color: #001b0e;
          font-size: 29px;
          font-weight: bold;
        }

        .brand h1 {
          font-size: 17px;
          letter-spacing: 1.4px;
          margin: 0;
        }

        .brand p {
          color: #8eaa99;
          font-size: 10px;
          letter-spacing: 2px;
          margin: 5px 0 0;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #a6c4b1;
          font-size: 10px;
          letter-spacing: 1.5px;
          border: 1px solid #244532;
          padding: 10px 14px;
          border-radius: 30px;
          white-space: nowrap;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00e676;
          box-shadow: 0 0 10px #00e676;
        }

        .hero {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 850px;
          margin: 90px auto 65px;
        }

        .hero-tag {
          display: inline-block;
          color: #00e676;
          border: 1px solid #24553a;
          background: #0b1d13;
          padding: 10px 17px;
          border-radius: 30px;
          font-size: 10px;
          letter-spacing: 1.5px;
        }

        .hero h2 {
          font-size: clamp(36px, 6vw, 66px);
          line-height: 1.12;
          margin: 28px 0 18px;
          font-weight: 800;
          letter-spacing: -2px;
        }

        .hero h2 span {
          display: block;
          color: #00e676;
          margin-top: 8px;
        }

        .hero > p {
          max-width: 620px;
          margin: 0 auto;
          color: #a7b7ad;
          font-size: 16px;
          line-height: 1.8;
        }

        .hero-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          margin-top: 32px;
        }

        .hero-button {
          display: inline-flex;
          gap: 20px;
          align-items: center;
          background: #00d875;
          color: #001b0e;
          padding: 15px 23px;
          border-radius: 10px;
          font-weight: bold;
          text-decoration: none;
          transition: 0.2s;
        }

        .hero-button:hover {
          background: #48f59d;
          transform: translateY(-2px);
        }

        .hero-secondary {
          color: #d0ded5;
          text-decoration: none;
          padding: 14px 18px;
          border: 1px solid #314638;
          border-radius: 10px;
          font-size: 13px;
        }

        .hero-divider {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-top: 65px;
        }

        .hero-divider span {
          height: 1px;
          background: #1d3326;
          flex: 1;
        }

        .hero-divider p {
          color: #789483;
          font-size: 10px;
          letter-spacing: 2px;
          white-space: nowrap;
        }

        .panels {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          max-width: 1150px;
          margin: 0 auto;
        }

        .panel {
          display: flex;
          flex-direction: column;
          min-height: 280px;
          padding: 27px;
          border-radius: 17px;
          border: 1px solid #263b2e;
          background: linear-gradient(145deg, #101b14, #09110c);
          color: white;
          text-decoration: none;
          transition: 0.25s ease;
        }

        .panel:hover {
          transform: translateY(-7px);
          border-color: #00d875;
          box-shadow: 0 15px 40px #0008;
        }

        .worker {
          border-top: 3px solid #00d875;
        }

        .admin {
          border-top: 3px solid #e5bd35;
        }

        .marketplace {
          border-top: 3px solid #3898ff;
        }

        .panel-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .panel-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: #17291d;
          font-size: 25px;
        }

        .panel-badge {
          font-size: 9px;
          letter-spacing: 1.2px;
          color: #a7c3b1;
          border: 1px solid #304b38;
          padding: 7px 10px;
          border-radius: 20px;
        }

        .panel h3 {
          font-size: 22px;
          margin: 25px 0 12px;
        }

        .panel > p {
          color: #9eafa4;
          font-size: 13px;
          line-height: 1.8;
          margin: 0 0 25px;
        }

        .panel-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
          padding-top: 18px;
          border-top: 1px solid #26372b;
          color: #00e676;
          font-size: 12px;
          font-weight: bold;
        }

        .admin .panel-bottom {
          color: #e5bd35;
        }

        .marketplace .panel-bottom {
          color: #65aaff;
        }

        .panel-bottom strong {
          font-size: 21px;
        }

        .features {
          position: relative;
          z-index: 1;
          max-width: 1150px;
          margin: 105px auto 90px;
        }

        .section-heading {
          text-align: center;
          margin-bottom: 35px;
        }

        .section-heading > span {
          color: #00e676;
          font-size: 10px;
          letter-spacing: 2px;
        }

        .section-heading h3 {
          font-size: clamp(23px, 4vw, 34px);
          margin: 13px 0;
        }

        .section-heading p {
          color: #8fa397;
          font-size: 13px;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
        }

        .feature {
          background: #0c1710;
          border: 1px solid #1e3527;
          border-radius: 13px;
          padding: 23px 15px;
          text-align: center;
        }

        .feature > span {
          font-size: 29px;
        }

        .feature h4 {
          font-size: 13px;
          margin: 14px 0 8px;
        }

        .feature p {
          color: #8fa397;
          font-size: 11px;
          line-height: 1.6;
          margin: 0;
        }

        footer {
          position: relative;
          z-index: 1;
          border-top: 1px solid #1b3025;
          padding: 40px 0 30px;
          text-align: center;
        }

        .footer-logo {
          margin: 0 auto 15px;
        }

        footer > strong {
          font-size: 14px;
          letter-spacing: 2px;
        }

        footer > p {
          color: #91a699;
          font-size: 12px;
          margin: 10px 0 20px;
        }

        .footer-line {
          height: 1px;
          background: #1b3025;
          max-width: 450px;
          margin: 0 auto 20px;
        }

        footer small {
          color: #63776a;
          font-size: 10px;
        }

        @media (max-width: 850px) {
          .panels {
            grid-template-columns: 1fr 1fr;
          }

          .marketplace {
            grid-column: 1 / -1;
          }

          .feature-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 560px) {
          .home {
            padding: 0 18px;
          }

          .header {
            padding: 18px 0;
          }

          .logo {
            width: 42px;
            height: 42px;
            font-size: 25px;
          }

          .brand h1 {
            font-size: 12px;
            letter-spacing: 0.8px;
          }

          .brand p {
            font-size: 8px;
            letter-spacing: 1px;
          }

          .status {
            padding: 8px 9px;
            font-size: 8px;
            letter-spacing: 0.5px;
          }

          .hero {
            margin: 65px auto 45px;
          }

          .hero-tag {
            font-size: 8px;
            letter-spacing: 0.8px;
            padding: 9px 11px;
          }

          .hero h2 {
            font-size: 39px;
          }

          .hero > p {
            font-size: 13px;
          }

          .hero-button,
          .hero-secondary {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }

          .hero-divider {
            margin-top: 45px;
            gap: 8px;
          }

          .hero-divider p {
            font-size: 8px;
            letter-spacing: 1px;
          }

          .panels {
            grid-template-columns: 1fr;
            gap: 15px;
          }

          .marketplace {
            grid-column: auto;
          }

          .panel {
            min-height: 255px;
            padding: 23px;
          }

          .features {
            margin: 75px auto 65px;
          }

          .feature-grid {
            gap: 10px;
          }

          .feature {
            padding: 19px 10px;
          }
        }
      `}</style>

    </main>
  );
}