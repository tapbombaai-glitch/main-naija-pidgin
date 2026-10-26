import Link from "next/link";
import "./home.css";

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
</main>

);
}