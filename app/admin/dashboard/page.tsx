"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  isSupabaseConfigured,
} from "../../../src/lib/supabase";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export default function ChairmanDashboardPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function checkChairman() {
      if (!isSupabaseConfigured) {
        if (active) {
          setErrorMessage(
            "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Render."
          );
          setChecking(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        const userEmail = (data.user.email ?? "")
          .trim()
          .toLowerCase();

        if (userEmail !== CHAIRMAN_EMAIL) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (active) {
          setEmail(userEmail);
          setChecking(false);
        }
      } catch (error) {
        console.error("Chairman access check failed:", error);

        if (active) {
          setErrorMessage(
            "Unable to verify Chairman access. Check your Supabase configuration and browser console."
          );
          setChecking(false);
        }
      }
    }

    void checkChairman();

    return () => {
      active = false;
    };
  }, [router]);

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
    }
  }

  if (checking) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <p>Checking Chairman access...</p>
        </section>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <h1 style={styles.heading}>Chairman Dashboard</h1>

          <p style={styles.error}>
            {errorMessage}
          </p>

          <button
            style={styles.button}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>

          <p style={styles.note}>
            No Chairman dashboard functions have been enabled on this error
            screen.
          </p>
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
          <p>Welcome, Chairman.</p>
        </div>

        <button
          type="button"
          onClick={signOut}
          style={styles.button}
        >
          Sign Out
        </button>
      </header>

      <section style={styles.account}>
        <h2>Account verified</h2>
        <p>Signed in as: {email}</p>
      </section>

      <section style={styles.grid}>
        <article style={styles.card}>
          <h2>Recording Management</h2>
          <p>
            Review worker recordings and manage approvals.
          </p>
          <p style={styles.note}>
            Recording controls are not connected yet.
          </p>
        </article>

        <article style={styles.card}>
          <h2>API Credit Management</h2>
          <p>
            Manage customer API credits securely.
          </p>
          <p style={styles.note}>
            Credit controls are not connected yet.
          </p>
        </article>

        <article style={styles.card}>
          <h2>Announcements</h2>
          <p>
            Prepare announcements for workers.
          </p>
          <p style={styles.note}>
            Announcement controls are not connected yet.
          </p>
        </article>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    background: "#101010",
    color: "#ffffff",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "24px",
  },
  label: {
    color: "#d4af37",
    fontWeight: 700,
    letterSpacing: "2px",
  },
  heading: {
    margin: "8px 0",
    color: "#d4af37",
  },
  account: {
    padding: "20px",
    marginBottom: "24px",
    border: "1px solid #383838",
    borderRadius: "12px",
    background: "#1b1b1b",
    overflowWrap: "anywhere",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "16px",
  },
  card: {
    padding: "20px",
    border: "1px solid #383838",
    borderRadius: "12px",
    background: "#1b1b1b",
    overflowWrap: "anywhere",
  },
  button: {
    padding: "12px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#d4af37",
    color: "#101010",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    padding: "12px",
    borderRadius: "8px",
    background: "#3a1717",
    color: "#ffbaba",
    overflowWrap: "anywhere",
  },
  note: {
    color: "#c4c4c4",
    fontSize: "14px",
  },
};