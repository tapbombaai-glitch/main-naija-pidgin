"use client";

import Link from "next/link";

export default function HomePage() {
return (
<main className="home">
<div className="container">

    <header className="header">
      <div className="logo">♛</div>

      <div className="brand">
        <h1>MAIN NAIJA PIDGIN</h1>
        <p>YOUR VOICE. OUR BUSINESS.</p>
      </div>

      <div className="status">
        <span className="dot" />
        LIVE
      </div>
    </header>

    <section className="hero">
      <div className="hero-tag">🇳🇬 BUILT FOR NIGERIA</div>

      <h2>
        Welcome to
        <span>Main Naija Pidgin</span>
      </h2>

      <p>
        The home of Nigerian voices, voice technology and
        opportunities for everyone.
      </p>
    </section>

    <section className="panels">

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

      <Link href="/admin/login" className="panel admin">
        <div className="panel-top">
          <span className="panel-icon">👑</span>
          <span className="panel-badge">ADMINISTRATION</span>
        </div>

        <h3>Admin Dashboard</h3>

        <p>
          Manage workers, recordings, payments, Voice Studio,
          API services and platform activities.
        </p>

        <div className="panel-bottom">
          <span>Open Admin Control</span>
          <strong>→</strong>
        </div>
      </Link>

    </section>

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
      width: 100%;
      min-height: 100vh;
      overflow-x: hidden;
      background: radial-gradient(
        ellipse at top,
        #06451e 0%,
        #001b0a 42%,
        #000 100%
      );
      color: #fff;
      padding: 16px 12px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .container {
      width: 100%;
      max-width: 850px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 10px 0 20px;
      border-bottom: 1px solid #1c5930;
      min-width: 0;
    }

    .logo {
      color: #ffcf32;
      font-size: 38px;
      flex-shrink: 0;
      text-shadow: 0 0 20px #d49c00;
    }

    .brand {
      flex: 1;
      min-width: 0;
    }

    .brand h1 {
      margin: 0;
      font-size: clamp(13px, 4vw, 25px);
      font-weight: 900;
      overflow-wrap: anywhere;
    }

    .brand p {
      margin: 5px 0 0;
      color: #ffcf32;
      font-size: 9px;
      letter-spacing: 1px;
    }

    .status {
      flex-shrink: 0;
      border: 1px solid #00e943;
      background: #003a16;
      color: #00ff49;
      padding: 7px 9px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .dot {
      width: 7px;
      height: 7px;
      background: #00ff49;
      border-radius: 50%;
    }

    .hero {
      text-align: center;
      padding: 38px 5px 30px;
    }

    .hero-tag {
      display: inline-block;
      padding: 8px 13px;
      border: 1px solid #00d93d;
      border-radius: 30px;
      color: #8affaa;
      font-size: 10px;
      letter-spacing: 1px;
      margin-bottom: 18px;
    }

    .hero h2 {
      font-size: clamp(26px, 7vw, 43px);
      line-height: 1.2;
      margin: 0;
      font-weight: 900;
    }

    .hero h2 span {
      display: block;
      color: #ffd337;
      margin-top: 7px;
      overflow-wrap: anywhere;
    }

    .hero p {
      max-width: 450px;
      margin: 16px auto 0;
      color: #c5d8ca;
      font-size: 13px;
      line-height: 1.7;
    }

    .panels {
      display: grid;
      grid-template-columns: 1fr;
      gap: 15px;
      width: 100%;
    }

    .panel {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      min-height: 205px;
      padding: 19px 16px;
      border-radius: 20px;
      color: #fff;
      text-decoration: none;
      box-shadow: 0 10px 25px #0008;
      transition: transform 0.2s;
    }

    .panel:active {
      transform: scale(0.98);
    }

    .worker {
      background: linear-gradient(145deg, #007e2c, #003b17);
      border: 1px solid #00ed45;
    }

    .admin {
      background: linear-gradient(145deg, #725000, #302000);
      border: 1px solid #ffd338;
    }

    .panel-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .panel-icon {
      font-size: 34px;
    }

    .panel-badge {
      font-size: 9px;
      border: 1px solid #ffffff66;
      border-radius: 20px;
      padding: 7px 9px;
      color: #fff;
    }

    .panel h3 {
      font-size: 20px;
      margin: 16px 0 8px;
    }

    .panel p {
      font-size: 12px;
      line-height: 1.7;
      color: #e1f0e4;
      margin: 0 0 18px;
    }

    .panel-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: auto;
      padding-top: 11px;
      border-top: 1px solid #ffffff55;
      font-size: 12px;
      font-weight: bold;
    }

    .panel-bottom strong {
      font-size: 22px;
    }

    .features {
      margin-top: 30px;
      padding: 19px 13px;
      border: 1px solid #14532b;
      border-radius: 20px;
      background: #001a0b;
    }

    .features h3 {
      font-size: 12px;
      letter-spacing: 2px;
      color: #ffd337;
      text-align: center;
      margin: 0 0 18px;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 17px 8px;
    }

    .feature {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .feature span {
      font-size: 22px;
      flex-shrink: 0;
    }

    .feature p {
      font-size: 11px;
      color: #d4e9d9;
      margin: 0;
    }

    footer {
      text-align: center;
      padding: 32px 8px 15px;
      color: #b5c9b9;
    }

    .footer-logo {
      color: #ffd337;
      font-size: 38px;
      margin-bottom: 7px;
    }

    footer strong {
      color: #fff;
      font-size: 14px;
    }

    footer p {
      font-size: 12px;
      margin: 9px 0 18px;
    }

    footer small {
      font-size: 10px;
      color: #82978a;
    }

    @media (min-width: 700px) {
      .home {
        padding: 25px 20px;
      }

      .panels {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `}</style>
</main>

);
}