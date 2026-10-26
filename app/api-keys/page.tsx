import Link from "next/link";

const packages = [
  {
    name: "Free",
    credits: "100 credits",
    price: "₦0",
    description: "Explore the API and test your integration.",
  },
  {
    name: "Starter",
    credits: "1,000 credits",
    price: "₦5,000",
    description: "For developers starting a new project.",
  },
  {
    name: "Basic",
    credits: "2,000 credits",
    price: "₦10,000",
    description: "For growing applications.",
  },
  {
    name: "Popular",
    credits: "5,000 credits",
    price: "₦25,000",
    description: "For applications with more usage.",
  },
  {
    name: "Business",
    credits: "10,000 credits",
    price: "₦50,000",
    description: "For larger applications.",
  },
];

export default function ApiKeysPage() {
  return (
    <main className="marketplace">
      <header className="header">
        <Link href="/api-keys" className="brand">
          <span className="brand-icon">M</span>
          <span>
            MAIN NAIJA PIDGIN
            <small>VOICE API PLATFORM</small>
          </span>
        </Link>

        <nav>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#documentation">Documentation</a>
          <a href="#customer-portal" className="nav-button">
            Customer Portal
          </a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            BUILT FOR DEVELOPERS
          </span>

          <h1>
            Give your applications a
            <span> Naija Pidgin voice.</span>
          </h1>

          <p>
            Integrate Nigerian Pidgin voice recordings into
            your applications through the Main Naija Pidgin
            Voice API.
          </p>

          <div className="actions">
            <a href="#pricing" className="button primary">
              Explore API Packages
            </a>

            <a href="#documentation" className="button secondary">
              Read Documentation
            </a>
          </div>

          <div className="benefits">
            <span>✓ Credit-based access</span>
            <span>✓ Private customer accounts</span>
            <span>✓ Developer-friendly API</span>
          </div>
        </div>

        <div className="code-card">
          <div className="code-header">
            <div className="dots">
              <i />
              <i />
              <i />
            </div>
            <span>voice-api.example</span>
          </div>

          <div className="code-body">
            <span className="code-label">REQUEST</span>

            <pre>{`POST /api/v1/voice
Content-Type: application/json

{
  "text": "How you dey?",
  "language": "pidgin"
}`}</pre>

            <div className="divider" />

            <span className="code-label">AUTHENTICATION</span>

            <pre>{`x-api-key: YOUR_API_KEY`}</pre>

            <p>
              Use the API key issued to your own customer
              account. Never share your secret key publicly.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="section-heading">
          <span className="eyebrow">THE PLATFORM</span>
          <h2>Built for your next project</h2>
          <p>
            Discover the tools available for integrating
            Main Naija Pidgin voice into your application.
          </p>
        </div>

        <div className="feature-grid">
          <article className="feature">
            <span className="feature-icon">🎙️</span>
            <h3>Voice API</h3>
            <p>
              Request available, Chairman-approved voice
              recordings through the API.
            </p>
          </article>

          <article className="feature">
            <span className="feature-icon">🔐</span>
            <h3>Private API Keys</h3>
            <p>
              Keep customer credentials separate from
              worker accounts and recording activities.
            </p>
          </article>

          <article className="feature">
            <span className="feature-icon">📊</span>
            <h3>Credit Management</h3>
            <p>
              Manage your own API credits and monitor
              usage through your private customer account.
            </p>
          </article>

          <article className="feature">
            <span className="feature-icon">💻</span>
            <h3>Developer Documentation</h3>
            <p>
              Learn about authentication, requests,
              responses, and integration requirements.
            </p>
          </article>
        </div>
      </section>

      <section className="section pricing" id="pricing">
        <div className="section-heading">
          <span className="eyebrow">API PACKAGES</span>
          <h2>Choose your credit package</h2>
          <p>
            These are the agreed package prices. Payment
            and paid key issuance are not enabled here yet.
          </p>
        </div>

        <div className="pricing-grid">
          {packages.map((item) => (
            <article
              key={item.name}
              className={`price-card ${
                item.name === "Popular" ? "popular" : ""
              }`}
            >
              {item.name === "Popular" && (
                <span className="popular-label">
                  POPULAR
                </span>
              )}

              <h3>{item.name}</h3>

              <div className="price">{item.price}</div>

              <div className="credits">{item.credits}</div>

              <p>{item.description}</p>

              <a href="#customer-portal" className="button secondary">
                Customer Access
              </a>
            </article>
          ))}
        </div>

        <p className="pricing-note">
          Prices are displayed for information only.
          Paystack integration will be added in the final stage.
        </p>
      </section>

      <section className="section portal" id="customer-portal">
        <div className="portal-panel">
          <div>
            <span className="eyebrow">CUSTOMER PORTAL</span>

            <h2>Your API account belongs to you.</h2>

            <p>
              The customer portal will provide separate
              registration and login, your own API key,
              credit balances, and usage information.
            </p>

            <p className="notice">
              Customer authentication and secure key issuance
              must be connected to the backend before customers
              can create accounts or receive keys.
            </p>
          </div>

          <div className="private-card">
            <span className="lock-icon">🔐</span>

            <h3>Private customer access</h3>

            <p>
              API credentials and credit balances must only
              be available to their authorized owners.
            </p>

            <span className="coming-soon">
              CUSTOMER LOGIN — NEXT STAGE
            </span>
          </div>
        </div>
      </section>

      <section
        className="section documentation"
        id="documentation"
      >
        <div className="section-heading">
          <span className="eyebrow">DEVELOPER GUIDE</span>
          <h2>API request example</h2>
          <p>
            Example request format for developers.
            This is documentation, not a live API test.
          </p>
        </div>

        <div className="docs-card">
          <div className="docs-top">
            <span>HTTP REQUEST</span>
            <span>JSON</span>
          </div>

          <pre>{`POST /api/v1/voice
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "text": "How you dey?",
  "language": "pidgin"
}`}</pre>

          <p>
            Replace YOUR_API_KEY with your own authorized
            customer API key. Do not put real API keys in
            public source code or shared screenshots.
          </p>
        </div>
      </section>

      <footer className="footer">
        <Link href="/api-keys" className="brand">
          <span className="brand-icon">M</span>
          <span>MAIN NAIJA PIDGIN</span>
        </Link>

        <p>Voice technology for developers.</p>

        <small>
          © {new Date().getFullYear()} Main Naija Pidgin
        </small>
      </footer>

      <style>{`
        .marketplace {
          min-height: 100vh;
          overflow: hidden;
          background: #07110d;
          color: #f4f7f4;
          font-family: Arial, Helvetica, sans-serif;
        }

        .marketplace * {
          box-sizing: border-box;
        }

        .marketplace a {
          text-decoration: none;
        }

        .header {
          max-width: 1200px;
          margin: auto;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          font-size: 13px;
          font-weight: 800;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #d9ff55;
          color: #10190d;
          font-size: 23px;
        }

        .brand small {
          display: block;
          margin-top: 5px;
          color: #a4b4a9;
          font-size: 9px;
          letter-spacing: 1.5px;
        }

        .header nav {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .header nav a {
          color: #c6d2c9;
          font-size: 12px;
        }

        .header nav .nav-button {
          padding: 12px 15px;
          border-radius: 9px;
          background: #d9ff55;
          color: #10190d;
          font-weight: 800;
        }

        .hero {
          max-width: 1200px;
          margin: auto;
          padding: 85px 24px 100px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          align-items: center;
          gap: 55px;
        }

        .eyebrow {
          color: #d9ff55;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .hero h1 {
          margin: 23px 0;
          font-size: clamp(39px, 5vw, 65px);
          line-height: 1.08;
          letter-spacing: -2px;
        }

        .hero h1 span {
          display: block;
          color: #d9ff55;
        }

        .hero-copy > p,
        .section-heading > p {
          color: #a9b9ae;
          font-size: 15px;
          line-height: 1.9;
        }

        .hero-copy > p {
          max-width: 520px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }

        .button {
          min-height: 44px;
          padding: 13px 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 800;
          text-align: center;
        }

        .primary {
          background: #d9ff55;
          color: #10190d;
        }

        .secondary {
          border: 1px solid #34473a;
          background: #0c1911;
          color: #f4f7f4;
        }

        .benefits {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 26px;
          color: #b7c5ba;
          font-size: 10px;
        }

        .code-card,
        .feature,
        .price-card,
        .docs-card {
          border: 1px solid #26392c;
          border-radius: 17px;
          background: #0b1710;
        }

        .code-card {
          overflow: hidden;
          box-shadow: 0 20px 80px #0005;
        }

        .code-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 18px;
          border-bottom: 1px solid #26392c;
          color: #a9b9ae;
          font-size: 11px;
        }

        .dots {
          display: flex;
          gap: 6px;
        }

        .dots i {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #f87171;
        }

        .dots i:nth-child(2) {
          background: #facc15;
        }

        .dots i:nth-child(3) {
          background: #4ade80;
        }

        .code-body {
          padding: 25px;
        }

        .code-label {
          color: #d9ff55;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .marketplace pre {
          max-width: 100%;
          overflow-x: auto;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          color: #dce9df;
          font: 12px/1.9 monospace;
        }

        .divider {
          height: 1px;
          margin: 22px 0;
          background: #26392c;
        }

        .code-body > p {
          color: #8da293;
          font-size: 11px;
          line-height: 1.8;
        }

        .section {
          padding: 82px 24px;
          border-top: 1px solid #1b2b20;
        }

        .section-heading {
          max-width: 680px;
          margin: 0 auto 40px;
          text-align: center;
        }

        .section-heading h2,
        .portal-panel h2 {
          margin: 17px 0;
          font-size: clamp(27px, 4vw, 41px);
          letter-spacing: -1px;
        }

        .feature-grid {
          max-width: 1152px;
          margin: auto;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
        }

        .feature {
          padding: 23px;
        }

        .feature-icon {
          font-size: 27px;
        }

        .feature h3 {
          margin: 19px 0 10px;
          font-size: 16px;
        }

        .feature p,
        .price-card > p {
          color: #a9b9ae;
          font-size: 12px;
          line-height: 1.9;
        }

        .pricing-grid {
          max-width: 1200px;
          margin: auto;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 13px;
        }

        .price-card {
          padding: 23px 17px;
        }

        .price-card.popular {
          border-color: #d9ff55;
        }

        .popular-label {
          display: inline-block;
          margin-bottom: 10px;
          padding: 6px 8px;
          border-radius: 6px;
          background: #d9ff55;
          color: #10190d;
          font-size: 9px;
          font-weight: 900;
        }

        .price-card h3 {
          margin: 10px 0 17px;
        }

        .price {
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -1px;
        }

        .credits {
          margin-top: 10px;
          color: #d9ff55;
          font-size: 12px;
          font-weight: 700;
        }

        .price-card > p {
          min-height: 70px;
        }

        .price-card .button {
          width: 100%;
          margin-top: 12px;
          font-size: 10px;
        }

        .pricing-note {
          margin: 25px auto 0;
          color: #8da293;
          font-size: 11px;
          text-align: center;
        }

        .portal-panel {
          max-width: 1152px;
          margin: auto;
          padding: 38px;
          display: grid;
          grid-template-columns: 1fr 0.7fr;
          align-items: center;
          gap: 35px;
          border: 1px solid #34473a;
          border-radius: 20px;
          background: linear-gradient(130deg, #102117, #09130d);
        }

        .portal-panel > div:first-child > p {
          color: #a9b9ae;
          font-size: 13px;
          line-height: 1.9;
        }

        .portal-panel .notice {
          color: #d9ff55 !important;
        }

        .private-card {
          padding: 25px;
          border: 1px solid #34473a;
          border-radius: 15px;
          background: #07110d;
        }

        .lock-icon {
          font-size: 31px;
        }

        .private-card h3 {
          margin: 15px 0 10px;
        }

        .private-card p {
          color: #a9b9ae;
          font-size: 12px;
          line-height: 1.8;
        }

        .coming-soon {
          display: inline-block;
          margin-top: 10px;
          color: #d9ff55;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .docs-card {
          max-width: 800px;
          margin: auto;
          padding: 24px;
        }

        .docs-top {
          display: flex;
          justify-content: space-between;
          color: #d9ff55;
          font-size: 10px;
          font-weight: 800;
        }

        .docs-card > p {
          color: #a9b9ae;
          font-size: 11px;
          line-height: 1.9;
        }

        .footer {
          padding: 28px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 17px;
          border-top: 1px solid #1b2b20;
        }

        .footer p,
        .footer small {
          color: #8da293;
          font-size: 10px;
        }

        @media (max-width: 900px) {
          .header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header nav {
            gap: 15px;
          }

          .hero {
            grid-template-columns: 1fr;
            gap: 40px;
            padding-top: 55px;
          }

          .feature-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pricing-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .portal-panel {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .feature-grid,
          .pricing-grid {
            grid-template-columns: 1fr;
          }

          .hero h1 {
            letter-spacing: -1.2px;
          }

          .benefits {
            flex-direction: column;
            gap: 10px;
          }

          .portal-panel {
            padding: 23px;
          }
        }
      `}</style>
    </main>
  );
}