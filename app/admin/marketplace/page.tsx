"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const PACKAGE_NAMES: Record<string, string> = {
  starter: "Starter",
  basic: "Basic",
  standard: "Standard",
  business: "Business",
  premium: "Premium",
};

type Analytics = {
  visitors: {
    total: number;
    unique: number;
    today: number;
  };
  buyClicks: number;
  purchases: number;
  revenue: number;
  packageSales: Record<
    string,
    { purchases: number; revenue: number }
  >;
  dailyActivity: {
    date: string;
    visitors: number;
  }[];
  monthlyActivity: {
    month: string;
    visitors: number;
    revenue: number;
  }[];
};

export default function ChairmanMarketplaceAnalytics() {
  const router = useRouter();

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_chairman")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_chairman !== true) {
        setError("Chairman permission not found.");
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Your login session has expired.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        "/api/admin/marketplace/analytics",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Analytics could not load."
        );
      }

      setAnalytics(result);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Analytics loading error:", err);
      setError(err.message || "Connection failed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const money = (amount: number) =>
    `₦${Number(amount || 0).toLocaleString("en-NG")}`;

  const cardStyle: React.CSSProperties = {
    background: "#101A10",
    border: "1px solid #263D26",
    borderRadius: "14px",
    padding: "15px",
  };

  const numberStyle: React.CSSProperties = {
    color: "#00E676",
    fontSize: "25px",
    fontWeight: 900,
    marginTop: "9px",
  };

  function MetricCard({
    title,
    value,
    subtitle,
  }: {
    title: string;
    value: string;
    subtitle: string;
  }) {
    return (
      <div style={cardStyle}>
        <div style={{ color: "#A5D6A7", fontSize: "11px", fontWeight: 800 }}>
          {title}
        </div>

        <div style={numberStyle}>{value}</div>

        <div style={{ color: "#777", fontSize: "10px", marginTop: "5px" }}>
          {subtitle}
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070C07",
        color: "white",
        padding: "16px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "850px", margin: "0 auto" }}>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#00E676",
                fontSize: "10px",
                fontWeight: 900,
              }}
            >
              MAIN NAIJA PIDGIN • CHAIRMAN PANEL
            </div>

            <h1 style={{ fontSize: "23px", margin: "8px 0 4px" }}>
              Marketplace Analytics
            </h1>

            <div style={{ color: "#888", fontSize: "11px" }}>
              Real visitors, sales and revenue
            </div>
          </div>

          <button
            onClick={loadAnalytics}
            disabled={loading}
            style={{
              background: "#00C853",
              border: "none",
              color: "white",
              padding: "11px 15px",
              borderRadius: "9px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        <Link
          href="/admin"
          style={{
            display: "inline-block",
            color: "#81C784",
            fontSize: "12px",
            textDecoration: "none",
            marginTop: "17px",
          }}
        >
          ← Back to Chairman Dashboard
        </Link>

        {error && (
          <div
            style={{
              marginTop: "18px",
              background: "#351414",
              border: "1px solid #7A2929",
              color: "#FF8A80",
              padding: "13px",
              borderRadius: "10px",
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        )}

        {loading && !analytics && (
          <div
            style={{
              marginTop: "30px",
              textAlign: "center",
              color: "#00E676",
              padding: "30px",
            }}
          >
            Loading real Marketplace analytics...
          </div>
        )}

        {analytics && (
          <>
            <div
              style={{
                color: "#777",
                fontSize: "10px",
                marginTop: "15px",
              }}
            >
              Last updated: {lastUpdated}
            </div>

            <h2 style={{ fontSize: "15px", marginTop: "22px" }}>
              VISITOR ANALYTICS
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                gap: "10px",
                marginTop: "10px",
              }}
            >
              <MetricCard
                title="TOTAL PAGE VISITS"
                value={analytics.visitors.total.toLocaleString()}
                subtitle="Recorded Marketplace views"
              />

              <MetricCard
                title="UNIQUE VISITORS"
                value={analytics.visitors.unique.toLocaleString()}
                subtitle="Distinct browser visitor IDs"
              />

              <MetricCard
                title="TODAY'S VISITORS"
                value={analytics.visitors.today.toLocaleString()}
                subtitle="Unique visitors today"
              />
            </div>

            <h2 style={{ fontSize: "15px", marginTop: "25px" }}>
              SALES PERFORMANCE
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                gap: "10px",
                marginTop: "10px",
              }}
            >
              <MetricCard
                title="BUY BUTTON CLICKS"
                value={analytics.buyClicks.toLocaleString()}
                subtitle="Package purchase attempts"
              />

              <MetricCard
                title="SUCCESSFUL PURCHASES"
                value={analytics.purchases.toLocaleString()}
                subtitle="Verified successful payments"
              />

              <MetricCard
                title="TOTAL REVENUE"
                value={money(analytics.revenue)}
                subtitle="Successful payments only"
              />
            </div>

            <h2 style={{ fontSize: "15px", marginTop: "25px" }}>
              PACKAGE SALES
            </h2>

            <div style={{ marginTop: "10px", display: "grid", gap: "9px" }}>
              {Object.entries(PACKAGE_NAMES).map(([id, name]) => {
                const item = analytics.packageSales[id] || {
                  purchases: 0,
                  revenue: 0,
                };

                return (
                  <div key={id} style={cardStyle}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <strong style={{ color: "white", fontSize: "13px" }}>
                        {name}
                      </strong>

                      <strong style={{ color: "#00E676", fontSize: "13px" }}>
                        {money(item.revenue)}
                      </strong>
                    </div>

                    <div
                      style={{
                        color: "#999",
                        fontSize: "11px",
                        marginTop: "7px",
                      }}
                    >
                      {item.purchases} successful purchases
                    </div>
                  </div>
                );
              })}
            </div>

            <h2 style={{ fontSize: "15px", marginTop: "25px" }}>
              LAST 7 DAYS
            </h2>

            <div style={{ ...cardStyle, marginTop: "10px" }}>
              {analytics.dailyActivity.map((day) => (
                <div
                  key={day.date}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "9px 0",
                    borderBottom: "1px solid #263326",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ color: "#AAA" }}>{day.date}</span>
                  <strong style={{ color: "#00E676" }}>
                    {day.visitors} visits
                  </strong>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: "15px", marginTop: "25px" }}>
              LAST 6 MONTHS
            </h2>

            <div style={{ ...cardStyle, marginTop: "10px" }}>
              {analytics.monthlyActivity.map((month) => (
                <div
                  key={month.month}
                  style={{
                    padding: "11px 0",
                    borderBottom: "1px solid #263326",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "12px",
                    }}
                  >
                    <strong>{month.month}</strong>
                    <strong style={{ color: "#00E676" }}>
                      {month.visitors} visits
                    </strong>
                  </div>

                  <div style={{ color: "#999", fontSize: "11px", marginTop: "5px" }}>
                    Revenue: {money(month.revenue)}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "20px",
                background: "#102515",
                border: "1px solid #245C2D",
                padding: "13px",
                borderRadius: "10px",
                color: "#A5D6A7",
                fontSize: "10px",
                lineHeight: 1.6,
              }}
            >
              🔒 SECURE ANALYTICS

              <br />

              Visitor statistics come from marketplace_events.

              <br />

              Revenue and purchases come only from successful
              api_payments records. Buy clicks are not counted as sales.
            </div>
          </>
        )}
      </div>
    </main>
  );
}