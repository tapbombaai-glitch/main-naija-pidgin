import Link from "next/link";

export default function HomePage() {
return (
<main className="home">
<div className="content">
<div className="brand">MAIN NAIJA PIDGIN</div>

    <h1>Welcome to Main Naija Pidgin</h1>

    <p className="subtitle">
      A platform for Pidgin voice recording, review and approval.
    </p>

    <section className="panels">
      <Link href="/login" className="panel chairman">
        <span className="icon">👑</span>
        <span className="panelTitle">Chairman Panel</span>
        <span className="panelDescription">
          Review recordings and manage the platform.
        </span>
        <span className="buttonText">Open Chairman Panel →</span>
      </Link>

      <Link href="/worker" className="panel worker">
        <span className="icon">🎙️</span>
        <span className="panelTitle">Worker Panel</span>
        <span className="panelDescription">
          Record Pidgin voice and check your submissions.
        </span>
        <span className="buttonText">Open Worker Panel →</span>
      </Link>
    </section>

    <footer>
      Main Naija Pidgin © 2026
      <br />
      Voice Recording Platform
    </footer>
  </div>

  <style jsx>{`
    .home {
      min-height: 100vh;
      padding: 48px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #07130e;
      color: #ffffff;
      font-family: Arial, sans-serif;
    }

    .content {
      width: 100%;
      max-width: 680px;
      text-align: center;
    }

    .brand {
      color: #e5bd55;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 4px;
      margin-bottom: 22px;
    }

    h1 {
      margin: 0;
      font-size: clamp(30px, 6vw, 46px);
      line-height: 1.15;
    }

    .subtitle {
      color: #bdc9c1;
      font-size: 16px;
      line-height: 1.6;
      margin: 18px 0 35px;
    }

    .panels {
      display: grid;
      gap: 18px;
    }

    .panel {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 26px 20px;
      border-radius: 18px;
      text-decoration: none;
      color: #ffffff;
      transition: transform 0.2s ease, filter 0.2s ease;
    }

    .panel:hover {
      transform: translateY(-3px);
      filter: brightness(1.08);
    }

    .chairman {
      background: linear-gradient(135deg, #8f6718, #d6ad42);
      border: 1px solid #f3d77b;
    }

    .worker {
      background: linear-gradient(135deg, #11633e, #168454);
      border: 1px solid #45bd83;
    }

    .icon {
      font-size: 32px;
    }

    .panelTitle {
      font-size: 23px;
      font-weight: 800;
    }

    .panelDescription {
      font-size: 14px;
      line-height: 1.5;
      color: #f0f4f1;
    }

    .buttonText {
      margin-top: 5px;
      padding: 12px 18px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
    }

    footer {
      margin-top: 35px;
      color: #87968d;
      font-size: 12px;
      line-height: 1.8;
    }

    @media (max-width: 480px) {
      .home {
        padding: 35px 16px;
      }

      .panel {
        padding: 24px 15px;
      }
    }
  `}</style>
</main>

);
}