"use client";

import { useState } from "react";

type Module = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  description: string;
};

const modules: Module[] = [
  {
    id: "workers",
    title: "Workers",
    subtitle: "Manage Workers",
    icon: "👥",
    color: "green",
    description: "View workers, manage accounts, suspend or reactivate workers.",
  },
  {
    id: "recordings",
    title: "Recordings",
    subtitle: "Approve & Monitor",
    icon: "🎙️",
    color: "purple",
    description: "Listen to submitted recordings and approve or reject them.",
  },
  {
    id: "payments",
    title: "Payments",
    subtitle: "Earnings & Payouts",
    icon: "💰",
    color: "gold",
    description: "Monitor worker earnings, payments and platform revenue.",
  },
  {
    id: "voices",
    title: "Voice Studio",
    subtitle: "Voice Cloning & TTS",
    icon: "🎧",
    color: "blue",
    description: "Manage cloned voices and generate Pidgin speech.",
  },
  {
    id: "api",
    title: "API Management",
    subtitle: "Keys & Customers",
    icon: "🔑",
    color: "cyan",
    description: "Manage API customers, API keys, credits and usage.",
  },
  {
    id: "announcements",
    title: "Announcements",
    subtitle: "Publish Updates",
    icon: "📢",
    color: "orange",
    description: "Create and manage announcements for platform users.",
  },
  {
    id: "security",
    title: "Security",
    subtitle: "Access & Logs",
    icon: "🛡️",
    color: "purple",
    description: "Review Chairman access and platform activity logs.",
  },
  {
    id: "marketplace",
    title: "Marketplace",
    subtitle: "API Store Control",
    icon: "🛒",
    color: "green",
    description: "Manage the API Marketplace and its customer services.",
  },
];

export default function ChairmanDashboard() {
  const [activeModule, setActiveModule] = useState<Module | null>(null);
  const [activeTab, setActiveTab] = useState("Home");

  function openModule(module: Module) {
    setActiveModule(module);
  }

  function closeModule() {
    setActiveModule(null);
  }

  return (
    <main className="chairman-page">
      <div className="dashboard">

        {/* HEADER */}
        <header className="header">
          <div className="brand">
            <div className="crown">♛</div>

            <div>
              <h1>MAIN NAIJA PIDGIN</h1>
              <h2>CHAIRMAN CONTROL CENTRE</h2>
            </div>
          </div>

          <button
            className="settings"
            onClick={() => openModule({
              id: "settings",
              title: "Settings",
              subtitle: "Control Centre",
              icon: "⚙️",
              color: "green",
              description: "Chairman dashboard settings and preferences.",
            })}
            aria-label="Settings"
          >
            ⚙
          </button>
        </header>

        {/* CHAIRMAN ACCOUNT */}
        <section className="account">
          <span className="shield">🛡</span>

          <div className="account-details">
            <strong>Chairman Control</strong>
            <small>tapbomba.ai@gmail.com</small>
          </div>

          <span className="online">
            <span className="dot"></span>
            Panel
          </span>
        </section>

        {/* SYSTEM OVERVIEW */}
        <section className="overview">
          <div className="overview-heading">
            <h2>📊 System Overview</h2>

            <button
              className="refresh"
              onClick={() => alert("Live statistics will be connected to Supabase next.")}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="stats">
            <div className="stat">
              <span>👥</span>
              <small>Workers</small>
              <strong>—</strong>
            </div>

            <div className="stat">
              <span>🎙️</span>
              <small>Recordings</small>
              <strong>—</strong>
            </div>

            <div className="stat">
              <span>🕒</span>
              <small>Pending</small>
              <strong>—</strong>
            </div>

            <div className="stat">
              <span>✅</span>
              <small>Approved</small>
              <strong>—</strong>
            </div>

            <div className="stat">
              <span>💰</span>
              <small>Revenue</small>
              <strong>—</strong>
            </div>
          </div>
        </section>

        {/* MANAGEMENT BUTTONS */}
        <section className="management">
          <h3>PLATFORM MANAGEMENT</h3>

          <div className="module-grid">
            {modules.map((module) => (
              <button
                key={module.id}
                className={`module-card ${module.color}`}
                onClick={() => openModule(module)}
              >
                <span className="module-icon">{module.icon}</span>

                <span className="module-text">
                  <strong>{module.title}</strong>
                  <small>{module.subtitle}</small>
                </span>

                <span className="arrow">›</span>
              </button>
            ))}
          </div>
        </section>

        {/* BRAND FOOTER */}
        <footer className="brand-footer">
          <div className="footer-brand">
            <span>♛</span>
            <div>
              <strong>Main Naija Pidgin</strong>
              <small>...Your Voice, Our Business</small>
            </div>
          </div>

          <button
            className="logout"
            onClick={() => alert("Secure Chairman logout will be connected next.")}
          >
            ⇥ Logout
          </button>
        </footer>

        {/* BOTTOM NAVIGATION */}
        <nav className="bottom-nav">
          {[
            { name: "Home", icon: "⌂" },
            { name: "Analytics", icon: "▥" },
            { name: "Alerts", icon: "♟" },
            { name: "More", icon: "☰" },
          ].map((item) => (
            <button
              key={item.name}
              className={activeTab === item.name ? "nav-active" : ""}
              onClick={() => {
                setActiveTab(item.name);

                if (item.name !== "Home") {
                  setActiveModule({
                    id: item.name,
                    title: item.name,
                    subtitle: "Chairman Control",
                    icon: item.icon,
                    color: "green",
                    description: `${item.name} will be connected to the live platform data.`,
                  });
                } else {
                  closeModule();
                }
              }}
            >
              <span>{item.icon}</span>
              <small>{item.name}</small>
            </button>
          ))}
        </nav>

      </div>

      {/* POPUP PANEL */}
      {activeModule && (
        <div className="modal-backdrop" onClick={closeModule}>
          <section
            className="module-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="modal-icon">{activeModule.icon}</span>
                <h2>{activeModule.title}</h2>
                <small>{activeModule.subtitle}</small>
              </div>

              <button className="close-button" onClick={closeModule}>
                ✕
              </button>
            </div>

            <div className="modal-content">
              <p>{activeModule.description}</p>

              <div className="coming-soon">
                <span>⚙️</span>
                <strong>Management Panel</strong>
                <small>
                  This section is ready for its live database connection.
                  Your existing platform data will be preserved.
                </small>
              </div>

              <button className="back-button" onClick={closeModule}>
                ← Back to Dashboard
              </button>
            </div>
          </section>
        </div>
      )}

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .chairman-page {
          min-height: 100vh;
          background:
            radial-gradient(ellipse at top, #003d14 0%, #001006 38%, #000 80%);
          color: white;
          padding: 12px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .dashboard {
          max-width: 850px;
          margin: auto;
          padding-bottom: 12px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 18px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .crown {
          font-size: clamp(42px, 11vw, 75px);
          color: #ffcc24;
          text-shadow: 0 0 20px #d69a00;
        }

        .brand h1 {
          font-size: clamp(15px, 4vw, 27px);
          margin: 0;
          font-weight: 900;
        }

        .brand h2 {
          font-size: clamp(11px, 3vw, 19px);
          margin: 5px 0 0;
          color: #ffd52b;
          font-weight: 900;
        }

        .settings {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid #00e83d;
          background: #001b09;
          color: #00f33d;
          font-size: 28px;
          flex-shrink: 0;
        }

        .account {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid #16c940;
          border-radius: 25px;
          padding: 12px;
          margin-bottom: 18px;
          background: #001b0a;
          min-width: 0;
        }

        .shield {
          font-size: 26px;
        }

        .account-details {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .account-details strong {
          font-size: 13px;
        }

        .account-details small {
          font-size: 11px;
          color: #b5d7bd;
          overflow-wrap: anywhere;
        }

        .online {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #006b1b;
          border: 1px solid #00f43c;
          padding: 8px 12px;
          border-radius: 25px;
          font-size: 12px;
          flex-shrink: 0;
        }

        .dot {
          width: 9px;
          height: 9px;
          background: #00ff44;
          border-radius: 50%;
        }

        .overview {
          border: 2px solid #00ed36;
          border-radius: 25px;
          background: linear-gradient(145deg, #003817, #001407);
          box-shadow: 0 0 17px #00b52d55;
          overflow: hidden;
          margin-bottom: 25px;
        }

        .overview-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 15px;
        }

        .overview-heading h2 {
          font-size: clamp(17px, 4vw, 25px);
          margin: 0;
        }

        .refresh {
          background: #00a927;
          border: 1px solid #55ff6e;
          color: white;
          padding: 9px 12px;
          border-radius: 25px;
          font-weight: bold;
          font-size: 12px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          border-top: 1px solid #00c931;
        }

        .stat {
          text-align: center;
          padding: 14px 3px;
          border-right: 1px solid #087d2a;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .stat:last-child {
          border-right: 0;
        }

        .stat span {
          font-size: 24px;
        }

        .stat small {
          font-size: 10px;
          color: #d8ffe0;
        }

        .stat strong {
          font-size: clamp(17px, 5vw, 27px);
          color: #00f33c;
          overflow-wrap: anywhere;
        }

        .management h3 {
          color: #9ee9ae;
          font-size: 13px;
          letter-spacing: 2px;
          margin: 0 0 13px;
        }

        .module-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .module-card {
          min-height: 95px;
          border-radius: 23px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px;
          color: white;
          text-align: left;
          cursor: pointer;
          box-shadow: inset 0 1px 5px #ffffff40, 0 5px 12px #0008;
          transition: transform 0.15s ease;
          min-width: 0;
        }

        .module-card:active {
          transform: scale(0.97);
        }

        .module-icon {
          font-size: clamp(27px, 7vw, 43px);
          flex-shrink: 0;
        }

        .module-text {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 0;
        }

        .module-text strong {
          font-size: clamp(13px, 3.5vw, 19px);
          overflow-wrap: anywhere;
        }

        .module-text small {
          font-size: clamp(10px, 2.7vw, 13px);
          color: #ffffffd9;
        }

        .arrow {
          width: 27px;
          height: 27px;
          border: 1px solid #ffffff77;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 25px;
          flex-shrink: 0;
        }

        .green {
          background: linear-gradient(135deg, #00a52d, #003d15);
          border: 1px solid #00ed40;
        }

        .purple {
          background: linear-gradient(135deg, #9400eb, #32005f);
          border: 1px solid #ca62ff;
        }

        .gold {
          background: linear-gradient(135deg, #e7a500, #573800);
          border: 1px solid #ffda34;
        }

        .blue {
          background: linear-gradient(135deg, #087ee8, #003b76);
          border: 1px solid #38a8ff;
        }

        .cyan {
          background: linear-gradient(135deg, #00aaa7, #004847);
          border: 1px solid #00f0dc;
        }

        .orange {
          background: linear-gradient(135deg, #f26a00, #802600);
          border: 1px solid #ff9a2e;
        }

        .brand-footer {
          margin-top: 24px;
          padding: 12px;
          border: 2px solid #00d937;
          border-radius: 23px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: #001509;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .footer-brand > span {
          color: #ffd42c;
          font-size: 36px;
        }

        .footer-brand div {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .footer-brand strong {
          color: #ffda37;
          font-size: clamp(12px, 3.5vw, 18px);
        }

        .footer-brand small {
          font-size: 10px;
          font-style: italic;
          color: #ddd;
        }

        .logout {
          background: #d90000;
          border: 1px solid #ff6565;
          color: white;
          padding: 12px;
          border-radius: 25px;
          font-weight: bold;
          font-size: 12px;
          flex-shrink: 0;
        }

        .bottom-nav {
          position: sticky;
          bottom: 0;
          margin: 18px -12px -12px;
          padding: 10px 4px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: #000d05f5;
          border-top: 2px solid #00e83b;
          z-index: 5;
        }

        .bottom-nav button {
          background: transparent;
          border: 0;
          color: #aaa;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 6px;
        }

        .bottom-nav button span {
          font-size: 25px;
        }

        .bottom-nav button small {
          font-size: 11px;
        }

        .bottom-nav .nav-active {
          color: #00ff48;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: #000d;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px;
          z-index: 20;
        }

        .module-modal {
          width: 100%;
          max-width: 440px;
          max-height: 85vh;
          overflow-y: auto;
          border: 2px solid #00ed40;
          border-radius: 24px;
          background: linear-gradient(145deg, #003316, #000b04);
          box-shadow: 0 0 30px #00e83b55;
        }

        .modal-heading {
          padding: 20px;
          border-bottom: 1px solid #17652d;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-heading h2 {
          margin: 8px 0 3px;
        }

        .modal-heading small {
          color: #a8d9b2;
        }

        .modal-icon {
          font-size: 35px;
        }

        .close-button {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #7e0000;
          border: 1px solid #ff5b5b;
          color: white;
          font-size: 19px;
        }

        .modal-content {
          padding: 20px;
        }

        .modal-content p {
          color: #d4ead8;
          line-height: 1.6;
        }

        .coming-soon {
          border: 1px solid #18863a;
          border-radius: 17px;
          padding: 20px;
          background: #00230d;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
        }

        .coming-soon span {
          font-size: 35px;
        }

        .coming-soon small {
          color: #b6d9be;
          line-height: 1.5;
        }

        .back-button {
          width: 100%;
          margin-top: 18px;
          padding: 14px;
          border: 0;
          border-radius: 15px;
          background: #00a92d;
          color: white;
          font-weight: bold;
        }

        @media (max-width: 360px) {
          .module-grid {
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .stat:nth-child(3) {
            border-right: 0;
          }

          .stat:nth-child(4),
          .stat:nth-child(5) {
            border-top: 1px solid #087d2a;
          }
        }
      `}</style>
    </main>
  );
}