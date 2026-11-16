"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

type ApiCustomer = {
  id: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  business_name: string | null;
  key_prefix: string | null;

  credits_remaining: number;
  credits_used: number;
  credits_total: number;

  free_requests_remaining: number;
  paid_requests_remaining: number;

  plan: string | null;
  tier: string | null;
  type: string | null;

  status: string | null;
  is_active: boolean;
  is_approved: boolean;
  is_free: boolean;
  has_claimed_free: boolean;

  amount_paid: number;
  paystack_ref: string | null;
  payment_ref: string | null;
  payment_status: string | null;

  created_at: string;
};

type Summary = {
  total_keys: number;
  active_keys: number;
  inactive_keys: number;
  free_customers: number;
  paid_customers: number;
  total_remaining_credits: number;
  total_used_credits: number;
};

const EMPTY_SUMMARY: Summary = {
  total_keys: 0,
  active_keys: 0,
  inactive_keys: 0,
  free_customers: 0,
  paid_customers: 0,
  total_remaining_credits: 0,
  total_used_credits: 0,
};

export default function ApiManagementPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadApiManagement(showRefresh = false) {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/admin/login";
        return;
      }

      const email = session.user.email?.trim().toLowerCase();

      if (email !== ADMIN_EMAIL.toLowerCase()) {
        await supabase.auth.signOut();
        window.location.href = "/admin/login";
        return;
      }

      const response = await fetch("/api/admin/api", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Could not load API Management."
        );
      }

      setCustomers(data.customers || []);
      setSummary(data.summary || EMPTY_SUMMARY);
    } catch (err) {
      console.error("API MANAGEMENT LOAD ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load API Management."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadApiManagement();
  }, []);

  function formatNumber(value: number) {
    return new Intl.NumberFormat("en-NG").format(value || 0);
  }

  function formatDate(value: string | null) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  }

  function customerName(customer: ApiCustomer) {
    return (
      customer.business_name ||
      customer.name ||
      customer.email ||
      "API Customer"
    );
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          padding: 20,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              color: "#22c55e",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            MAIN NAIJA PIDGIN
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              margin: "8px 0 0",
            }}
          >
            API Management
          </h1>

          <div
            style={{
              marginTop: 35,
              background: "#090909",
              border: "1px solid #262626",
              borderRadius: 18,
              padding: 24,
            }}
          >
            <p style={{ color: "#a1a1aa", margin: 0 }}>
              Loading API customers...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #000000 0%, #050505 55%, #00140a 100%)",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "22px 16px 90px",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                color: "#22c55e",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 2,
              }}
            >
              MAIN NAIJA PIDGIN
            </div>

            <h1
              style={{
                fontSize: 27,
                fontWeight: 900,
                margin: "7px 0 0",
              }}
            >
              API Management
            </h1>

            <p
              style={{
                color: "#71717a",
                fontSize: 13,
                margin: "5px 0 0",
              }}
            >
              Chairman Control Centre
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadApiManagement(true)}
            disabled={refreshing}
            style={{
              border: "1px solid #166534",
              background: "#052e16",
              color: "#4ade80",
              borderRadius: 12,
              padding: "10px 13px",
              fontSize: 12,
              fontWeight: 800,
              cursor: refreshing ? "default" : "pointer",
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {/* BACK */}
        <Link
          href="/admin"
          style={{
            display: "inline-block",
            marginTop: 20,
            color: "#4ade80",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ← Back to Chairman Dashboard
        </Link>

        {/* ERROR */}
        {error && (
          <div
            style={{
              marginTop: 20,
              border: "1px solid #7f1d1d",
              background: "#2b0b0b",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div
              style={{
                color: "#fca5a5",
                fontWeight: 800,
              }}
            >
              API Management Error
            </div>

            <p
              style={{
                color: "#fecaca",
                fontSize: 13,
                marginTop: 6,
              }}
            >
              {error}
            </p>

            <button
              type="button"
              onClick={() => loadApiManagement(true)}
              style={{
                marginTop: 10,
                background: "#dc2626",
                color: "#fff",
                border: 0,
                borderRadius: 10,
                padding: "9px 14px",
                fontWeight: 800,
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* SUMMARY */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 10,
            marginTop: 24,
          }}
        >
          <SummaryCard
            label="TOTAL API KEYS"
            value={formatNumber(summary.total_keys)}
          />

          <SummaryCard
            label="ACTIVE KEYS"
            value={formatNumber(summary.active_keys)}
            green
          />

          <SummaryCard
            label="FREE CUSTOMERS"
            value={formatNumber(summary.free_customers)}
          />

          <SummaryCard
            label="PAID CUSTOMERS"
            value={formatNumber(summary.paid_customers)}
            gold
          />
        </section>

        {/* CREDIT SUMMARY */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 10,
            marginTop: 10,
          }}
        >
          <SummaryCard
            label="CREDITS REMAINING"
            value={formatNumber(
              summary.total_remaining_credits
            )}
            green
          />

          <SummaryCard
            label="CREDITS USED"
            value={formatNumber(
              summary.total_used_credits
            )}
          />
        </section>

        {/* CUSTOMER LIST */}
        <section style={{ marginTop: 30 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontSize: 19,
                fontWeight: 900,
                margin: 0,
              }}
            >
              API Customers
            </h2>

            <span
              style={{
                color: "#71717a",
                fontSize: 12,
              }}
            >
              {customers.length} customer
              {customers.length === 1 ? "" : "s"}
            </span>
          </div>

          {customers.length === 0 ? (
            <div
              style={{
                border: "1px solid #27272a",
                background: "#090909",
                borderRadius: 18,
                padding: 30,
                textAlign: "center",
              }}
            >
              <div style={{ color: "#a1a1aa" }}>
                No API customers yet.
              </div>

              <div
                style={{
                  color: "#52525b",
                  fontSize: 12,
                  marginTop: 7,
                }}
              >
                Customer API keys will appear here
                automatically.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 14,
              }}
            >
              {customers.map((customer) => (
                <article
                  key={customer.id}
                  style={{
                    background:
                      "linear-gradient(145deg, #0b0b0b, #050505)",
                    border: "1px solid #262626",
                    borderRadius: 18,
                    padding: 16,
                    boxShadow:
                      "0 10px 35px rgba(0,0,0,0.35)",
                  }}
                >
                  {/* CUSTOMER HEADER */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {customerName(customer)}
                      </h3>

                      <p
                        style={{
                          color: "#71717a",
                          fontSize: 12,
                          margin: "5px 0 0",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {customer.email || "No email"}
                      </p>
                    </div>

                    <div
                      style={{
                        flexShrink: 0,
                        borderRadius: 999,
                        padding: "5px 9px",
                        fontSize: 10,
                        fontWeight: 900,
                        border:
                          customer.is_active &&
                          (!customer.status ||
                            customer.status === "active")
                            ? "1px solid #166534"
                            : "1px solid #7f1d1d",
                        background:
                          customer.is_active &&
                          (!customer.status ||
                            customer.status === "active")
                            ? "#052e16"
                            : "#2b0b0b",
                        color:
                          customer.is_active &&
                          (!customer.status ||
                            customer.status === "active")
                            ? "#4ade80"
                            : "#f87171",
                      }}
                    >
                      {customer.is_active &&
                      (!customer.status ||
                        customer.status === "active")
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </div>
                  </div>

                  {/* API KEY PREFIX */}
                  <div
                    style={{
                      marginTop: 15,
                      border: "1px solid #262626",
                      background: "#000",
                      borderRadius: 13,
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        color: "#52525b",
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: 1,
                      }}
                    >
                      API KEY PREFIX
                    </div>

                    <div
                      style={{
                        color: "#86efac",
                        fontFamily: "monospace",
                        fontSize: 13,
                        marginTop: 5,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {customer.key_prefix ||
                        "Key prefix unavailable"}
                    </div>
                  </div>

                  {/* CREDITS */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(3, minmax(0, 1fr))",
                      gap: 7,
                      marginTop: 10,
                    }}
                  >
                    <CreditBox
                      label="REMAINING"
                      value={formatNumber(
                        customer.credits_remaining
                      )}
                      green
                    />

                    <CreditBox
                      label="USED"
                      value={formatNumber(
                        customer.credits_used
                      )}
                    />

                    <CreditBox
                      label="TOTAL"
                      value={formatNumber(
                        customer.credits_total
                      )}
                    />
                  </div>

                  {/* FREE / PAID */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: 7,
                      marginTop: 8,
                    }}
                  >
                    <InfoBox
                      label="FREE LEFT"
                      value={formatNumber(
                        customer.free_requests_remaining
                      )}
                    />

                    <InfoBox
                      label="PAID LEFT"
                      value={formatNumber(
                        customer.paid_requests_remaining
                      )}
                    />
                  </div>

                  {/* DETAILS */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: "14px 18px",
                      marginTop: 17,
                    }}
                  >
                    <Detail
                      label="PLAN"
                      value={
                        customer.plan ||
                        customer.tier ||
                        "—"
                      }
                    />

                    <Detail
                      label="TYPE"
                      value={
                        customer.type ||
                        (customer.is_free
                          ? "Free"
                          : "Paid")
                      }
                    />

                    <Detail
                      label="PAYMENT"
                      value={
                        customer.payment_status || "—"
                      }
                    />

                    <Detail
                      label="AMOUNT PAID"
                      value={`₦${formatNumber(
                        customer.amount_paid
                      )}`}
                    />

                    <Detail
                      label="APPROVED"
                      value={
                        customer.is_approved
                          ? "Yes"
                          : "No"
                      }
                    />

                    <Detail
                      label="CREATED"
                      value={formatDate(
                        customer.created_at
                      )}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* CHAIRMAN NOTICE */}
        <div
          style={{
            marginTop: 28,
            border: "1px solid #14532d",
            background:
              "linear-gradient(135deg, #03140a, #061b0d)",
            borderRadius: 18,
            padding: 16,
          }}
        >
          <div
            style={{
              color: "#4ade80",
              fontSize: 14,
              fontWeight: 900,
            }}
          >
            Chairman Controls
          </div>

          <p
            style={{
              color: "#71717a",
              fontSize: 12,
              lineHeight: 1.6,
              margin: "7px 0 0",
            }}
          >
            Credit adjustments and key activation
            controls will be added after we verify
            the existing billing functions. Your
            current Marketplace credit system remains
            untouched.
          </p>
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  green,
  gold,
}: {
  label: string;
  value: string;
  green?: boolean;
  gold?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: green
          ? "1px solid #166534"
          : gold
          ? "1px solid #713f12"
          : "1px solid #27272a",
        background: green
          ? "linear-gradient(145deg, #052e16, #03140a)"
          : gold
          ? "linear-gradient(145deg, #271300, #100900)"
          : "#090909",
        padding: 15,
      }}
    >
      <div
        style={{
          color: green
            ? "#4ade80"
            : gold
            ? "#facc15"
            : "#71717a",
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: 0.8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: green
            ? "#4ade80"
            : gold
            ? "#facc15"
            : "#fff",
          fontSize: 23,
          fontWeight: 900,
          marginTop: 7,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function CreditBox({
  label,
  value,
  green,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div
      style={{
        background: "#111111",
        borderRadius: 12,
        padding: 11,
      }}
    >
      <div
        style={{
          color: "#52525b",
          fontSize: 9,
          fontWeight: 800,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: green ? "#4ade80" : "#fff",
          fontSize: 14,
          fontWeight: 900,
          marginTop: 5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #27272a",
        borderRadius: 12,
        padding: 11,
        background: "#080808",
      }}
    >
      <div
        style={{
          color: "#52525b",
          fontSize: 9,
          fontWeight: 800,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#d4d4d8",
          fontSize: 13,
          fontWeight: 700,
          marginTop: 5,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          color: "#52525b",
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: 0.6,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#d4d4d8",
          fontSize: 13,
          marginTop: 4,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}