"use client";
import Link from "next/link";

export default function ChairmanDashboard() {
  return (
    <div style={{ padding: 20, background: "#000", color: "#fff", minHeight: "100vh" }}>
      <h1>Main Naija Pidgin — Chairman Dashboard</h1>
      <p>Chairman: tapbomba.ai@gmail.com</p>

      <div style={{ display: "grid", gap: 15, marginTop: 20 }}>
        
        {/* CARD 1 - RECORDINGS - WATER SPINE */}
        <Link href="/admin/recordings" style={{ border: "1px solid #fff", padding: 20, display: "block" }}>
          <h2>Water Spine / Recording Management</h2>
          <p>View all recordings — Approve / Reject — Play audio</p>
        </Link>

        {/* CARD 2 - WORKER ACCOUNTS */}
        <Link href="/admin/workers" style={{ border: "1px solid #fff", padding: 20, display: "block" }}>
          <h2>Worker Account Management</h2>
          <p>View workers — Suspend / Reactivate — Words Recorded</p>
        </Link>

        {/* CARD 3 - WORKER PANEL (for testing) */}
        <Link href="/worker" style={{ border: "1px solid #0f0", padding: 20, display: "block" }}>
          <h2>Worker Recording Panel</h2>
          <p>Test recording — See text to talk — Record — Submit — Recent</p>
        </Link>

        {/* CARD 4 - API MARKETPLACE */}
        <Link href="/api-marketplace" style={{ border: "1px solid #fff", padding: 20, display: "block" }}>
          <h2>API Marketplace</h2>
          <p>Free, Starter, Basic, Popular, Business packages</p>
        </Link>

      </div>
    </div>
  );
}
