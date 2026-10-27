"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export default function ChairmanDashboardPage() {
const router = useRouter();
const [checking, setChecking] = useState(true);
const [email, setEmail] = useState("");

useEffect(() => {
let active = true;

async function checkChairman() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      router.replace("/login");
      return;
    }

    const userEmail = (data.user.email || "").trim().toLowerCase();

    if (userEmail !== CHAIRMAN_EMAIL) {
      await supabase.auth.signOut();
      router.replace("/login");
      return;
    }

    if (active) {
      setEmail(userEmail);
      setChecking(false);
    }
  } catch {
    router.replace("/login");
  }
}

checkChairman();

return () => {
  active = false;
};

}, [router]);

async function signOut() {
await supabase.auth.signOut();
router.replace("/login");
}

if (checking) {
return (
<main className="chairman-page">
<p>Checking Chairman access...</p>
</main>
);
}

return (
<main className="chairman-page">
<header className="chairman-header">
<div>
<p className="chairman-label">MAIN NAIJA PIDGIN</p>
<h1>Chairman Dashboard</h1>
<p>Welcome, Chairman.</p>
</div>

    <button onClick={signOut} className="chairman-button">
      Sign Out
    </button>
  </header>

  <section className="chairman-account">
    <h2>Account verified</h2>
    <p>Signed in as: {email}</p>
  </section>

  <section className="chairman-grid">
    <article className="chairman-card">
      <h2>Recording Management</h2>
      <p>Review worker recordings and manage approvals.</p>
      <p className="chairman-status">Feature to be connected</p>
    </article>

    <article className="chairman-card">
      <h2>API Credit Management</h2>
      <p>Manage customer API credits securely.</p>
      <p className="chairman-status">Feature to be connected</p>
    </article>

    <article className="chairman-card">
      <h2>Announcements</h2>
      <p>Prepare announcements for workers.</p>
      <p className="chairman-status">Feature to be connected</p>
    </article>
  </section>
</main>

);
}