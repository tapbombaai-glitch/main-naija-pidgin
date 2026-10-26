import Link from "next/link";

const dashboards = [
  {
    icon: "🎙️",
    title: "Worker Panel",
    description:
      "Record Pidgin sentences, listen to your recordings, and submit them for Chairman review.",
    button: "Enter Worker Panel",
    href: "/worker",
    theme: "worker",
  },
  {
    icon: "👑",
    title: "Chairman Panel",
    description:
      "Access authorised recording reviews, approve submissions, and manage the platform.",
    button: "Chairman Login",
    href: "/login",
    theme: "chairman",
  },
  {
    icon: "🔑",
    title: "API Customer Panel",
    description:
      "Explore the Voice API, view available credit packages, and access the developer portal.",
    button: "Explore Voice API",
    href: "/api-keys",
    theme: "api",
  },
];

export default function HomePage() {
  return (
    <main className="home">
      <header className="header">
        <Link href="/" className="brand">
          <span className="brand-icon">🎙️</span>
          <span>Main Naija Pidgin</span>
        </Link>

        <span className="platform-label">VOICE PLATFORM</span>
      </header>

      <section className="hero">
        <span className="eyebrow">YOUR VOICE. YOUR LANGUAGE.</span>

        <h1>
          Welcome to
          <br />
          <span>Main Naija Pidgin</span>
        </h1>

        <p>
          One platform for voice recording, authorised administration,
          and Pidgin Voice API access.
        </p>

        <h2>Choose your dashboard</h2>
        <p className="subtitle">
          Select the service you want to access below.
        </p>
      </section>

      <section className="dashboard-grid" aria-label="Available dashboards">
        {dashboards.map((dashboard) => (
          <article
            className={`dashboard-card ${dashboard.theme}`}
            key={dashboard.theme}
          >
            <div className="card-icon" aria-hidden="true">
              {dashboard.icon}
            </div>

            <h3>{dashboard.title}</h3>

            <p>{dashboard.description}</p>

            <Link className="dashboard-button" href={dashboard.href}>
              {dashboard.button}
              <span aria-hidden="true"> →</span>
            </Link>
          </article>
        ))}
      </section>

      <footer className="footer">
        <p>
          Main Naija Pidgin · Voice Recording &amp; API Platform
        </p>
        <p>Built to help preserve and power Nigerian Pidgin voices.</p>
      </footer>

      <style>{`
        * {
          box-sizing: border-box;
        }

        .home {
          min-height: 100vh;
          padding: 24px;
          color: #f8fafc;
          background:
            radial-gradient(ellipse at top, #163d35 0%, transparent 48%),
            #07110f;
          font-family: Arial, Helvetica, sans-serif;
        }

        .header {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ffffff;
          text-decoration: none;
          font-size: 18px;
          font-weight: 800;
        }

        .brand-icon {
          font-size: 28px;
        }

        .platform-label,
        .eyebrow {
          color: #80e0ae;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .hero {
          max-width: 780px;
          margin: 76px auto 42px;
          text-align: center;
        }

        .hero h1 {
          margin: 18px 0;
          font-size: clamp(34px, 6vw, 58px);
          line-height: 1.12;
          letter-spacing: -1.5px;
        }

        .hero h1 span {
          color: #80e0ae;
        }

        .hero > p {
          max-width: 620px;
          margin: 0 auto;
          color: #bdcbc5;
          font-size: 16px;
          line-height: 1.8;
        }

        .hero h2 {
          margin: 44px 0 8px;
          font-size: 25px;
        }

        .hero .subtitle {
          font-size: 14px;
        }

        .dashboard-grid {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .dashboard-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
          padding: 26px;
          border: 1px solid #29453c;
          border-radius: 18px;
          background: rgba(15, 31, 26, 0.92);
        }

        .card-icon {
          display: grid;
          width: 54px;
          height: 54px;
          place-items: center;
          border-radius: 14px;
          background: #203b31;
          font-size: 29px;
        }

        .dashboard-card h3 {
          margin: 22px 0 10px;
          font-size: 21px;
        }

        .dashboard-card p {
          flex: 1;
          margin: 0 0 24px;
          color: #bdcbc5;
          font-size: 14px;
          line-height: 1.8;
        }

        .dashboard-button {
          display: block;
          width: 100%;
          padding: 14px 12px;
          border-radius: 10px;
          background: #80e0ae;
          color: #071a12;
          text-align: center;
          text-decoration: none;
          font-size: 14px;
          font-weight: 800;
        }

        .dashboard-button:hover {
          background: #a0f0c4;
        }

        .footer {
          max-width: 1100px;
          margin: 55px auto 0;
          padding: 22px 0;
          border-top: 1px solid #29453c;
          color: #a9b8b1;
          text-align: center;
          font-size: 12px;
          line-height: 1.8;
        }

        .footer p {
          margin: 5px 0;
        }

        @media (max-width: 800px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
            max-width: 520px;
          }

          .hero {
            margin-top: 55px;
          }
        }

        @media (max-width: 420px) {
          .home {
            padding: 18px;
          }

          .brand {
            font-size: 15px;
          }

          .platform-label {
            font-size: 9px;
            letter-spacing: 1px;
          }

          .dashboard-card {
            padding: 22px;
          }
        }
      `}</style>
    </main>
  );
}