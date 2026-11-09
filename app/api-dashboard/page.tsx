"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type ApiKey = {
  id: string;
  name: string | null;
  key_prefix: string | null;
  is_active: boolean | null;
  status: string | null;
  plan: string | null;
  tier: string | null;
  free_requests_remaining: number | null;
  paid_requests_remaining: number | null;
  credits_remaining: number | null;
  credits_used: number | null;
  credits_total: number | null;
  created_at: string | null;
};

type Payment = {
  id: string;
  package_id: string;
  amount: number;
  credits: number;
  currency: string | null;
  payment_status: string | null;
  paid_at: string | null;
  created_at: string | null;
};

export default function ApiDashboard() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        window.location.href = "/user/login";
        return;
      }

      setUser(currentUser);

      // Only load API keys belonging to the logged-in customer.
      // API secrets are deliberately excluded.
      const { data: keyData, error: keyError } = await supabase
        .from("api_keys")
        .select(
          "id,name,key_prefix,is_active,status,plan,tier,free_requests_remaining,paid_requests_remaining,credits_remaining,credits_used,credits_total,created_at"
        )
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (keyError) throw keyError;

      // Only load payment records belonging to this customer.
      const { data: paymentData, error: paymentError } = await supabase
        .from("api_payments")
        .select(
          "id,package_id,amount,credits,currency,payment_status,paid_at,created_at"
        )
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (paymentError) throw paymentError;

      setKeys((keyData || []) as ApiKey[]);
      setPayments((paymentData || []) as Payment[]);
    } catch (err: any) {
      console.error("Dashboard loading error:", err);
      setError(
        err?.message || "Could not load your dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const totalPaid = payments
    .filter((payment) => payment.payment_status === "successful")
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const successfulPayments = payments.filter(
    (payment) => payment.payment_status === "successful"
  ).length;

  const totalCredits = keys.reduce(
    (total, key) => total + Number(key.credits_remaining || 0),
    0
  );

  const totalUsed = keys.reduce(
    (total, key) => total + Number(key.credits_used || 0),
    0
  );

  if (loading) {
    return (
      <main style={styles.page}>
        <p style={styles.muted}>Loading your API dashboard...</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>🇳🇬 MAIN NAIJA PIDGIN</div>
          <h1 style={styles.title}>API Dashboard</h1>
          <p style={styles.muted}>
            Manage your API credits, keys and payments.
          </p>
        </div>

        <button style={styles.refresh} onClick={loadDashboard}>
          Refresh
        </button>
      </header>

      {user && (
        <div style={styles.account}>
          <span style={styles.muted}>Logged in as</span>
          <strong>{user.email}</strong>
        </div>
      )}

      {error && (
        <div style={styles.error}>
          {error}
          <button style={styles.retry} onClick={loadDashboard}>
            Try again
          </button>
        </div>
      )}

      <section style={styles.grid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Available Credits</span>
          <strong style={styles.green}>{totalCredits.toLocaleString()}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Credits Used</span>
          <strong>{totalUsed.toLocaleString()}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Successful Purchases</span>
          <strong>{successfulPayments}</strong>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Spent</span>
          <strong style={styles.yellow}>{formatMoney(totalPaid)}</strong>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeading}>
          <h2>My API Keys</h2>
          <span style={styles.badge}>{keys.length} key(s)</span>
        </div>

        {keys.length === 0 ? (
          <div style={styles.empty}>
            <h3>No API key yet</h3>
            <p>
              Claim your 1,000 free API credits from the Marketplace to get
              started.
            </p>
            <a href="/marketplace" style={styles.button}>
              Go to Marketplace
            </a>
          </div>
        ) : (
          keys.map((key) => (
            <div key={key.id} style={styles.keyCard}>
              <div style={styles.keyTop}>
                <div>
                  <strong>{key.name || "Main Naija Pidgin API Key"}</strong>
                  <p style={styles.keyPrefix}>
                    {key.key_prefix || "Key prefix unavailable"} • Secret hidden
                  </p>
                </div>

                <span
                  style={{
                    ...styles.status,
                    color:
                      key.is_active && key.status !== "suspended"
                        ? "#00E676"
                        : "#ff7070",
                  }}
                >
                  {key.is_active && key.status !== "suspended"
                    ? "ACTIVE"
                    : "INACTIVE"}
                </span>
              </div>

              <div style={styles.balanceGrid}>
                <div>
                  <strong style={styles.green}>
                    {Number(key.free_requests_remaining || 0).toLocaleString()}
                  </strong>
                  <span>Free Left</span>
                </div>

                <div>
                  <strong>
                    {Number(key.paid_requests_remaining || 0).toLocaleString()}
                  </strong>
                  <span>Paid Left</span>
                </div>

                <div>
                  <strong style={styles.yellow}>
                    {Number(key.credits_remaining || 0).toLocaleString()}
                  </strong>
                  <span>Total Left</span>
                </div>
              </div>

              <p style={styles.used}>
                Used: {Number(key.credits_used || 0).toLocaleString()}
                {" • "}
                Plan: {key.plan || key.tier || "Free"}
              </p>
            </div>
          ))
        )}
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeading}>
          <h2>Payment History</h2>
          <span style={styles.badge}>{payments.length} record(s)</span>
        </div>

        {payments.length === 0 ? (
          <div style={styles.empty}>
            <p>No payment records yet.</p>
            <p style={styles.muted}>
              Your purchases will appear here after checkout.
            </p>
          </div>
        ) : (
          payments.map((payment) => (
            <div key={payment.id} style={styles.paymentCard}>
              <div>
                <strong>
                  {payment.package_id.toUpperCase()} PACKAGE
                </strong>
                <p style={styles.used}>
                  {Number(payment.credits).toLocaleString()} credits
                </p>
                <p style={styles.used}>
                  {payment.paid_at
                    ? new Date(payment.paid_at).toLocaleString()
                    : new Date(payment.created_at || "").toLocaleString()}
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <strong>{formatMoney(payment.amount)}</strong>
                <p
                  style={{
                    ...styles.paymentStatus,
                    color:
                      payment.payment_status === "successful"
                        ? "#00E676"
                        : payment.payment_status === "pending"
                        ? "#FFD54F"
                        : "#ff7070",
                  }}
                >
                  {(payment.payment_status || "unknown").toUpperCase()}
                </p>
              </div>
            </div>
          ))
        )}
      </section>

      <section style={styles.actions}>
        <a href="/marketplace" style={styles.button}>
          Buy More Credits
        </a>

        <a href="/marketplace" style={styles.secondaryButton}>
          Open Marketplace
        </a>
      </section>

      <button
        style={styles.logout}
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/user/login";
        }}
      >
        Sign Out
      </button>

      <p style={styles.footer}>
        Main Naija Pidgin • Your API account
      </p>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: "#060A06",
    minHeight: "100vh",
    color: "white",
    padding: "20px",
    maxWidth: "480px",
    margin: "0 auto",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "20px",
  },
  brand: {
    color: "#00E676",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "1px",
  },
  title: {
    fontSize: "25px",
    fontWeight: 900,
    margin: "8px 0 4px",
  },
  muted: {
    color: "#888",
    fontSize: "12px",
  },
  refresh: {
    background: "#172417",
    border: "1px solid #285b36",
    color: "#00E676",
    padding: "10px 12px",
    borderRadius: "9px",
    fontWeight: 800,
  },
  account: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    background: "#101910",
    padding: "13px",
    borderRadius: "12px",
    marginBottom: "18px",
    fontSize: "12px",
    overflowWrap: "anywhere",
  },
  error: {
    background: "#351515",
    border: "1px solid #8b3333",
    padding: "13px",
    borderRadius: "10px",
    color: "#ffaaaa",
    fontSize: "12px",
    marginBottom: "15px",
  },
  retry: {
    display: "block",
    marginTop: "10px",
    padding: "8px 12px",
    borderRadius: "7px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },
  statCard: {
    background: "#121C12",
    border: "1px solid #263b29",
    borderRadius: "13px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },
  statLabel: {
    fontSize: "10px",
    color: "#999",
  },
  green: {
    color: "#00E676",
  },
  yellow: {
    color: "#FFD54F",
  },
  section: {
    marginTop: "25px",
  },
  sectionHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  badge: {
    color: "#00E676",
    fontSize: "10px",
    background: "#122516",
    padding: "6px 9px",
    borderRadius: "20px",
  },
  keyCard: {
    background: "#121C12",
    border: "1px solid #00a94f",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "12px",
  },
  keyTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
  },
  keyPrefix: {
    color: "#888",
    fontSize: "10px",
    marginTop: "6px",
  },
  status: {
    fontSize: "9px",
    fontWeight: 900,
  },
  balanceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
    marginTop: "18px",
  },
  used: {
    color: "#888",
    fontSize: "10px",
    marginTop: "8px",
  },
  empty: {
    background: "#111811",
    border: "1px solid #263b29",
    borderRadius: "13px",
    padding: "18px",
    color: "#bbb",
    fontSize: "12px",
  },
  button: {
    display: "inline-block",
    background: "#00C853",
    color: "#001b09",
    textDecoration: "none",
    padding: "12px 15px",
    borderRadius: "9px",
    fontWeight: 900,
    fontSize: "12px",
    textAlign: "center",
  },
  secondaryButton: {
    display: "inline-block",
    background: "#172417",
    color: "#00E676",
    border: "1px solid #285b36",
    textDecoration: "none",
    padding: "12px 15px",
    borderRadius: "9px",
    fontWeight: 800,
    fontSize: "12px",
    textAlign: "center",
  },
  paymentCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    background: "#121C12",
    border: "1px solid #263b29",
    borderRadius: "12px",
    padding: "13px",
    marginBottom: "9px",
    fontSize: "11px",
  },
  paymentStatus: {
    fontSize: "9px",
    fontWeight: 900,
    marginTop: "6px",
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "25px",
  },
  logout: {
    width: "100%",
    marginTop: "15px",
    background: "transparent",
    border: "1px solid #633333",
    color: "#ff7777",
    padding: "12px",
    borderRadius: "9px",
    fontWeight: 800,
  },
  footer: {
    textAlign: "center",
    color: "#555",
    fontSize: "10px",
    marginTop: "25px",
  },
};