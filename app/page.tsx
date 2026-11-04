"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home">

      <div className="container">

        {/* BRAND HEADER */}
        <header className="header">
          <div className="logo">♛</div>

          <div className="brand">
            <h1>MAIN NAIJA PIDGIN</h1>
            <p>YOUR VOICE. OUR BUSINESS.</p>
          </div>

          <div className="status">
            <span className="dot"></span>
            LIVE
          </div>
        </header>

        {/* HERO */}
        <section className="hero">
          <div className="hero-tag">
            🇳🇬 BUILT FOR NIGERIA
          </div>

          <h2>
            Welcome to
            <span> Main Naija Pidgin</span>
          </h2>

          <p>
            The home of Nigerian voices, voice technology
            and opportunities for everyone.
          </p>
        </section>

        {/* MAIN PANELS */}
        <section className="panels">

          {/* WORKER */}
          <Link href="/worker" className="panel worker">
            <div className="panel-top">
              <span className="panel-icon">👷</span>
              <span className="panel-badge">WORKSPACE</span>
            </div>

            <h3>Worker Panel</h3>

            <p>
              Access your workspace, record Nigerian voices,
              submit tasks and monitor your earnings.
            </p>

            <div className="panel-bottom">
              <span>Enter Worker Workspace</span>
              <strong>→</strong>
            </div>
          </Link>

          {/* CHAIRMAN */}
          <Link href="/admin/login" className="panel chairman">
            <div className="panel-top">
              <span className="panel-icon">👑</span>
              <span className="panel-badge">ADMINISTRATION</span>
            </div>

            <h3>Chairman Dashboard</h3>

            <p>
              Manage workers, recordings, payments,
              Voice Studio, API services and platform activities.
            </p>

            <div className="panel-bottom">
              <span>Open Chairman Control</span>
              <strong>→</strong>
            </div>
          </Link>

        </section>

        {/* PLATFORM FEATURES */}
        <section className="features">
          <h3>OUR PLATFORM</h3>

          <div className="feature-grid">
            <div className="feature">
              <span>🎙️</span>
              <p>Voice Recording</p>
            </div>

            <div className="feature">
              <span>🤖</span>
              <p>AI Voice Technology</p>
            </div>

            <div className="feature">
              <span>🌍</span>
              <p>Nigerian Languages</p>
            </div>

            <div className="feature">
              <span>🚀</span>
              <p>Voice Innovation</p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          <div className="footer-logo">♛</div>

          <strong>MAIN NAIJA PIDGIN</strong>

          <p>Building the future with Nigerian voices.</p>

          <small>© 2026 Main Naija Pidgin. All rights reserved.</small>
        </footer>

      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .home {
          min-height: 100vh;
          background:
            radial-gradient(ellipse at top, #06451e 0%, #001b0a 42%, #000 100%);
          color: white;
          padding: 20px 14px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .container {
          width: 100%;
          max-width: 850px;
          margin: auto;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 0 25px;
          border-bottom: 1px solid #1c5930;
        }

        .logo {
          color: #ffcf32;
          font-size: 48px;
          text-shadow: 0 0 20px #d49c00;
        }

        .brand {
          flex: 1;
        }

        .brand h1 {
          margin: 0;
          font-size: clamp(15px, 4vw, 25px);
          font-weight: 900;
        }

        .brand p {
          margin: 5px 0 0;
          color: #ffcf32;
          font-size: 10px;
          letter-spacing: 2px;
        }

        .status {
          border: 1px solid #00e943;
          background: #003a16;
          color: #00ff49;
          padding: 8px 11px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dot {
          width: 8px;
          height: 8px;
          background: #00ff49;
          border-radius: 50%;
        }

        .hero {
          text-align: center;
          padding: 42px 8px 35px;
        }

        .hero-tag {
          display: inline-block;
          padding: 9px 16px;
          border: 1px solid #00d93d;
          border-radius: 30px;
          color: #8affaa;
          font-size: 11px;
          letter-spacing: 1px;
          margin-bottom: 18px;
        }

        .hero h2 {
          font-size: clamp(27px, 7vw, 43px);
          line-height: 1.2;
          margin: 0;
          font-weight: 900;
        }

        .hero h2 span {
          display: block;
          color: #ffd337;
          margin-top: 7px;
        }

        .hero p {
          max-width: 450px;
          margin: 18px auto 0;
          color: #c5d8ca;
          font-size: 14px;
          line-height: 1.7;
        }

        .panels {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 15px;
        }

        .panel {
          text-decoration: none;
          color: white;
          padding: 20px 16px;
          border-radius: 24px;
          min-height: 235px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 25px #0008;
          transition: transform 0.2s;
        }

        .panel:active {
          transform: scale(0.97);
        }

        .worker {
          background: linear-gradient(145deg, #007e2c, #003b17);
          border: 1px solid #00ed45;
        }

        .chairman {
          background: linear-gradient(145deg, #725000, #302000);
          border: 1px solid #ffd338;
        }

        .panel-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 5px;
        }

        .panel-icon {
          font-size: 39px;
        }

        .panel-badge {
          font-size: 9px;
          border: 1px solid #ffffff66;
          border-radius: 20px;
          padding: 7px;
          color: #fff;
        }

        .panel h3 {
          font-size: clamp(17px, 4vw, 23px);
          margin: 20px 0 9px;
        }

        .panel p {
          font-size: 12px;
          line-height: 1.7;
          color: #e1f0e4;
          margin: 0 0 20px;
        }

        .panel-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 5px;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid #ffffff55;
          font-size: 11px;
          font-weight: bold;
        }

        .panel-bottom strong {
          font-size: 23px;
        }

        .features {
          margin-top: 35px;
          padding: 20px 15px;
          border: 1px solid #14532b;
          border-radius: 22px;
          background: #001a0b;
        }

        .features h3 {
          font-size: 12px;
          letter-spacing: 2px;
          color: #ffd337;
          text-align: center;
          margin: 0 0 20px;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px 10px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .feature span {
          font-size: 24px;
        }

        .feature p {
          font-size: 11px;
          color: #d4e9d9;
        }

        footer {
          text-align: center;
          padding: 35px 10px 15px;
          color: #b5c9b9;
        }

        .footer-logo {
          color: #ffd337;
          font-size: 42px;
          margin-bottom: 7px;
        }

        footer strong {
          color: white;
          font-size: 14px;
        }

        footer p {
          font-size: 12px;
          margin: 9px 0 20px;
        }

        footer small {
          font-size: 10px;
          color: #82978a;
        }

        @media (max-width: 380px) {
          .panels {
            grid-template-columns: 1fr;
          }

          .panel {
            min-height: 205px;
          }
        }
      `}</style>

    </main>
  );
}