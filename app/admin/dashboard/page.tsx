"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export default function ChairmanDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkChairman() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          router.replace("/admin/login");
          return;
        }

        const userEmail = (data.user.email ?? "").trim().toLowerCase();

        if (userEmail !== CHAIRMAN_EMAIL.toLowerCase()) {
          await supabase.auth.signOut();
          router.replace("/admin/login");
          return;
        }

        if (active) {
          setEmail(userEmail);
          setChecking(false);
        }
      } catch (error) {
        console.error("Chairman access check failed:", error);
        if (active) {
          setErrorMessage("Unable to verify Chairman access. Check Supabase keys in Render.");
          setChecking(false);
        }
      }
    }

    void checkChairman();
    return () => { active = false; };
  }, [router, supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (checking) {
    return (
      <main style={styles.page}>
        <section style={styles.card}><p>Checking Chairman access...</p></section>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <h1 style={styles.heading}>Chairman Dashboard</h1>
          <p style={styles.error}>{errorMessage}</p>
          <button style={styles.button} onClick={() => window.location.reload()}>Try Again</button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.label}>MAIN NAIJA PIDGIN</p>
          <h1 style={styles.heading}>Chairman Dashboard</h1>
          <p>Welcome, Chairman — {email}</p>
        </div>
        <button type="button" onClick={signOut} style={styles.button}>Sign Out</button>
      </header>

      <section style={styles.account}>
        <h2>✅ Account verified</h2>
        <p>Signed in as: {email}</p>
        <p style={styles.note}>Connected to pidgin-voice project</p>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <h2>Recording Management</h2>
          <p>Review worker recordings and manage approvals.</p>
          <button type="button" style={styles.button} onClick={() => router.push("/admin/recordings")}>Manage Recordings</button>
        </article>
        <article style={styles.card}>
          <h2>Worker Account Management</h2>
          <p>View worker accounts and manage status.</p>
          <button type="button" style={styles.button} onClick={() => router.push("/admin/workers")}>Manage Workers</button>
        </article>
        <article style={styles.card}>
          <h2>API Credit Management</h2>
          <p>Manage customer API credits.</p>
          <button type="button" style={styles.button} onClick={() => router.push("/api-keys")}>Open API Marketplace</button>
        </article>
        <article style={styles.card}>
          <h2>Announcements</h2>
          <p>Create announcements for workers.</p>
          <button type="button" style={styles.button} onClick={() => router.push("/admin/announcements")}>Manage Announcements</button>
        </article>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", padding: "24px", background: "#101010", color: "#ffffff", fontFamily: "Arial, sans-serif" },
  header: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "24px" },
  label: { color: "#d4af37", fontWeight: 700, letterSpacing: "2px" },
  heading: { margin: "8px 0", color: "#d4af37" },
  account: { padding: "20px", marginBottom: "24px", border: "1px solid #383838", borderRadius: "12px", background: "#1b1b1b" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "16px" },
  card: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px", padding: "20px", border: "1px solid #383838", borderRadius: "12px", background: "#1b1b1b" },
  button: { padding: "12px 18px", border: "none", borderRadius: "8px", background: "#d4af37", color: "#101010", fontWeight: 700, cursor: "pointer" },
  error: { padding: "12px", borderRadius: "8px", background: "#3a1717", color: "#ffbaba" },
  note: { color: "#c4c4c4", fontSize: "14px" },
};