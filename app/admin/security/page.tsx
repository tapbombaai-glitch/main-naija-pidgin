"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

type ApiKey = {
  id: string;
  email: string | null;
  key_prefix: string | null;
  is_active: boolean | null;
  status: string | null;
  is_free: boolean | null;
  created_at: string | null;
};

type SecurityData = {
  chairman_email: string;
  chairman_verified: boolean;
  admin_protection: string;
  api_key_monitoring: string;
  total_keys_checked: number;
  active_keys: number;
  inactive_keys: number;
  last_checked: string;
};

export default function SecurityPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [security, setSecurity] = useState<SecurityData | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);

  const loadSecurity = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/admin/login");
        return;
      }

      if (session.user.email?.toLowerCase() !== ADMIN_EMAIL) {
        router.replace("/admin/login");
        return;
      }

      const response = await fetch("/api/admin/security", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (response.status === 401 || response.status === 403) {
          router.replace("/admin/login");
          return;
        }

        throw new Error(
          result.error || "Unable to load security information."
        );
      }

      setSecurity(result.security);
      setApiKeys(result.api_keys || []);
    } catch (err) {
      console.error("Security Centre error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadSecurity();
  }, [loadSecurity]);

  const formatDate = (date: string | null) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const cardStyle: React.CSSProperties = {
    background: "#151515",
    border: "1px solid #292929",
    borderRadius: 14,
    padding: 16,
  };

  const statusStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 800,
    background: active ? "#12351f" : "#3a2020",
    color: active ? "#4ade80" : "#f87171",
  });

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#080808",
          color: "white",
          display: "grid",
          placeItems: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "#4ade80", fontSize: 30 }}>🔒</div>
          <p>Loading Security Centre...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#f5f5f5",
        padding: "20px 14px 50px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                color: "#4ade80",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 2,
              }}
            >
              MAIN NAIJA PIDGIN
            </div>

            <h1 style={{ fontSize: 25, margin: "8px 0 4px" }}>
              🔐 Security Centre
            </h1>

            <p style={{ color: "#999", fontSize: 13, margin: 0 }}>
              Chairman security and API key monitoring
            </p>
          </div>

          <button
            onClick={() => loadSecurity(true)}
            disabled={refreshing}
            style={{
              background: "#12351f",
              color: "#4ade80",
              border: "1px solid #236b3c",
              borderRadius: 9,
              padding: "11px 15px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {refreshing ? "Checking..." : "↻ Refresh"}
          </button>
        </header>

        <Link
          href="/admin"
          style={{
            display: "inline-block",
            color: "#4ade80",
            textDecoration: "none",
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          ← Back to Chairman Dashboard
        </Link>

        {error && (
          <div
            style={{
              background: "#351919",
              border: "1px solid #713333",
              color: "#fca5a5",
              borderRadius: 10,
              padding: 14,
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        {security && (
          <>
            <section
              style={{
                ...cardStyle,
                marginBottom: 16,
                borderColor: "#236b3c",
              }}
            >
              <div style={{ color: "#4ade80", fontWeight: 800 }}>
                CHAIRMAN VERIFICATION
              </div>

              <h2 style={{ fontSize: 19, margin: "12px 0 6px" }}>
                {security.chairman_verified
                  ? "✅ Chairman Verified"
                  : "⚠️ Verification Failed"}
              </h2>

              <p style={{ color: "#aaa", fontSize: 13 }}>
                {security.chairman_email}
              </p>

              <span style={statusStyle(security.chairman_verified)}>
                {security.chairman_verified ? "VERIFIED" : "NOT VERIFIED"}
              </span>
            </section>

            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={cardStyle}>
                <div style={{ color: "#999", fontSize: 12 }}>
                  API KEYS CHECKED
                </div>
                <div
                  style={{
                    color: "white",
                    fontSize: 27,
                    fontWeight: 900,
                    marginTop: 9,
                  }}
                >
                  {security.total_keys_checked}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ color: "#999", fontSize: 12 }}>
                  ACTIVE KEYS
                </div>
                <div
                  style={{
                    color: "#4ade80",
                    fontSize: 27,
                    fontWeight: 900,
                    marginTop: 9,
                  }}
                >
                  {security.active_keys}
                </div>
              </div>

              <div style={cardStyle}>
                <div style={{ color: "#999", fontSize: 12 }}>
                  INACTIVE KEYS
                </div>
                <div
                  style={{
                    color: "#f87171",
                    fontSize: 27,
                    fontWeight: 900,
                    marginTop: 9,
                  }}
                >
                  {security.inactive_keys}
                </div>
              </div>
            </section>

            <section style={{ ...cardStyle, marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, marginTop: 0 }}>
                🛡️ Protection Status
              </h2>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "13px 0",
                  borderBottom: "1px solid #292929",
                }}
              >
                <span>Chairman-only access</span>
                <span style={statusStyle(true)}>ACTIVE</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "13px 0",
                }}
              >
                <span>API key monitoring</span>
                <span style={statusStyle(true)}>ACTIVE</span>
              </div>

              <p style={{ color: "#999", fontSize: 12, lineHeight: 1.6 }}>
                Security checks are performed by the protected server route.
                This page does not change customer keys or account balances.
              </p>
            </section>

            <section style={cardStyle}>
              <h2 style={{ fontSize: 17, marginTop: 0 }}>
                🔑 API Key Security List
              </h2>

              {apiKeys.length === 0 ? (
                <p style={{ color: "#999", fontSize: 13 }}>
                  No API keys were found in the latest check.
                </p>
              ) : (
                <div>
                  {apiKeys.map((key) => {
                    const active =
                      key.is_active === true && key.status !== "inactive";

                    return (
                      <div
                        key={key.id}
                        style={{
                          padding: "14px 0",
                          borderBottom: "1px solid #292929",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <strong style={{ fontSize: 13 }}>
                            {key.email || "No email"}
                          </strong>

                          <span style={statusStyle(active)}>
                            {active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>

                        <p
                          style={{
                            color: "#4ade80",
                            fontSize: 12,
                            margin: "8px 0 4px",
                          }}
                        >
                          Key prefix: {key.key_prefix || "Not available"}
                        </p>

                        <p
                          style={{
                            color: "#999",
                            fontSize: 11,
                            margin: 0,
                          }}
                        >
                          {key.is_free ? "FREE KEY" : "PAID KEY"}
                          {" • "}
                          {formatDate(key.created_at)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              <p style={{ color: "#777", fontSize: 11, marginBottom: 0 }}>
                Showing up to 200 recent API keys. Full API keys and secret
                hashes are never displayed here.
              </p>
            </section>

            <p
              style={{
                color: "#777",
                fontSize: 11,
                textAlign: "center",
                marginTop: 20,
              }}
            >
              Last security check: {formatDate(security.last_checked)}
            </p>
          </>
        )}
      </div>
    </main>
  );
}