"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Worker = {
  user_id?: string | null;
  worker_id: string;
  full_name?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  accent?: string | null;
  status?: string | null;
  created_at?: string | null;
  recordings_count?: number;
};

const supabase = createClient();

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadWorkers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Please log in again.");
      }

      const response = await fetch("/api/admin/workers", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await response.text();

        console.error("Workers API returned non-JSON:", text);

        throw new Error(
          `Workers API returned an invalid response (${response.status}).`
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Could not load workers.");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Could not load workers.");
      }

      setWorkers(Array.isArray(data.workers) ? data.workers : []);
    } catch (err) {
      console.error("Load workers error:", err);

      setWorkers([]);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load workers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const filteredWorkers = workers.filter((worker) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      worker.worker_id?.toLowerCase().includes(query) ||
      worker.full_name?.toLowerCase().includes(query) ||
      worker.email?.toLowerCase().includes(query) ||
      worker.city?.toLowerCase().includes(query) ||
      worker.state?.toLowerCase().includes(query) ||
      worker.accent?.toLowerCase().includes(query)
    );
  });

  const activeWorkers = workers.filter(
    (worker) => worker.status?.toLowerCase() === "active"
  ).length;

  const totalRecordings = workers.reduce(
    (total, worker) => total + Number(worker.recordings_count || 0),
    0
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050806",
        color: "#ffffff",
        paddingBottom: 100,
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: "#0b110d",
          borderBottom: "1px solid #1d2b21",
          padding: "18px 16px",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                color: "#22c55e",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.5,
                marginBottom: 5,
              }}
            >
              MAIN NAIJA PIDGIN
            </div>

            <h1
              style={{
                margin: 0,
                color: "#ffffff",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              Workers Management
            </h1>
          </div>

          <button
            onClick={loadWorkers}
            disabled={loading}
            style={{
              border: "1px solid #2d6a3b",
              background: loading ? "#142018" : "#12351d",
              color: "#86efac",
              borderRadius: 10,
              padding: "10px 13px",
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </header>

      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "20px 16px",
        }}
      >
        {/* BACK */}
        <Link
          href="/admin"
          style={{
            display: "inline-block",
            color: "#86efac",
            textDecoration: "none",
            fontWeight: 700,
            marginBottom: 18,
          }}
        >
          ← Back to Chairman Dashboard
        </Link>

        {/* STATS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
            marginBottom: 18,
          }}
        >
          <StatCard
            title="TOTAL WORKERS"
            value={workers.length}
            valueColor="#ffffff"
          />

          <StatCard
            title="ACTIVE WORKERS"
            value={activeWorkers}
            valueColor="#4ade80"
          />

          <StatCard
            title="RECORDINGS"
            value={totalRecordings}
            valueColor="#facc15"
          />
        </section>

        {/* SEARCH */}
        <section
          style={{
            background: "#0c120e",
            border: "1px solid #1d2b21",
            borderRadius: 14,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search worker ID, name, email, city..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#050806",
              color: "#ffffff",
              border: "1px solid #304337",
              borderRadius: 10,
              padding: "13px 14px",
              outline: "none",
              fontSize: 15,
            }}
          />
        </section>

        {/* ERROR */}
        {error && (
          <section
            style={{
              background: "#241010",
              border: "1px solid #7f1d1d",
              borderRadius: 14,
              padding: 16,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                color: "#fca5a5",
                fontWeight: 900,
                marginBottom: 6,
              }}
            >
              Could not load workers
            </div>

            <div
              style={{
                color: "#fecaca",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>

            <button
              onClick={loadWorkers}
              style={{
                marginTop: 12,
                background: "#dc2626",
                color: "#ffffff",
                border: 0,
                borderRadius: 9,
                padding: "10px 14px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </section>
        )}

        {/* LOADING */}
        {loading && !error && (
          <section
            style={{
              background: "#0c120e",
              border: "1px solid #1d2b21",
              borderRadius: 14,
              padding: 30,
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#86efac",
                fontWeight: 800,
              }}
            >
              Loading workers...
            </div>
          </section>
        )}

        {/* EMPTY */}
        {!loading && !error && filteredWorkers.length === 0 && (
          <section
            style={{
              background: "#0c120e",
              border: "1px solid #1d2b21",
              borderRadius: 14,
              padding: 35,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 40,
                marginBottom: 10,
              }}
            >
              👷🏽
            </div>

            <h2
              style={{
                color: "#ffffff",
                margin: "0 0 8px",
                fontSize: 19,
              }}
            >
              {search ? "No matching workers" : "No worker profiles found"}
            </h2>

            <p
              style={{
                color: "#9ca3af",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {search
                ? "Try another search."
                : "Workers will appear here when worker profiles or recording activity are available."}
            </p>
          </section>
        )}

        {/* WORKER LIST */}
        {!loading && !error && filteredWorkers.length > 0 && (
          <section
            style={{
              display: "grid",
              gap: 14,
            }}
          >
            {filteredWorkers.map((worker) => {
              const status =
                worker.status?.trim() || "Registered";

              const isActive =
                status.toLowerCase() === "active";

              return (
                <article
                  key={worker.worker_id}
                  style={{
                    background: "#0c120e",
                    border: "1px solid #26382b",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  {/* WORKER TOP */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#ffffff",
                          fontSize: 18,
                          fontWeight: 900,
                        }}
                      >
                        {worker.full_name || worker.worker_id}
                      </div>

                      <div
                        style={{
                          color: "#86efac",
                          fontSize: 13,
                          fontWeight: 800,
                          marginTop: 4,
                        }}
                      >
                        {worker.worker_id}
                      </div>
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: 999,
                        padding: "6px 9px",
                        background: isActive
                          ? "#12351d"
                          : "#172018",
                        color: isActive
                          ? "#4ade80"
                          : "#d1d5db",
                        fontSize: 11,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  {/* DETAILS */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    <InfoBox
                      label="EMAIL"
                      value={worker.email || "Not provided"}
                    />

                    <InfoBox
                      label="LOCATION"
                      value={
                        worker.city || worker.state
                          ? [worker.city, worker.state]
                              .filter(Boolean)
                              .join(", ")
                          : "Not provided"
                      }
                    />

                    <InfoBox
                      label="ACCENT"
                      value={worker.accent || "Not provided"}
                    />

                    <InfoBox
                      label="RECORDINGS"
                      value={String(
                        worker.recordings_count || 0
                      )}
                      valueColor="#facc15"
                    />
                  </div>

                  {worker.created_at && (
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: "1px solid #1d2b21",
                        color: "#6b7280",
                        fontSize: 12,
                      }}
                    >
                      Registered:{" "}
                      {new Date(
                        worker.created_at
                      ).toLocaleDateString()}
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          background: "#080d0a",
          borderTop: "1px solid #1d2b21",
          padding: "10px 12px",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-around",
            gap: 8,
          }}
        >
          <NavLink href="/admin" label="Home" />
          <NavLink href="/admin/workers" label="Workers" active />
          <NavLink
            href="/admin/recordings"
            label="Recordings"
          />
          <NavLink href="/admin/api" label="API" />
          <NavLink href="/admin/more" label="More" />
        </div>
      </nav>
    </main>
  );
}

function StatCard({
  title,
  value,
  valueColor,
}: {
  title: string;
  value: number;
  valueColor: string;
}) {
  return (
    <div
      style={{
        background: "#0c120e",
        border: "1px solid #26382b",
        borderRadius: 14,
        padding: 14,
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#9ca3af",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 0.7,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: valueColor,
          fontSize: 25,
          fontWeight: 900,
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
  valueColor = "#ffffff",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        background: "#080d0a",
        border: "1px solid #1d2b21",
        borderRadius: 10,
        padding: 10,
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: 0.7,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: valueColor,
          fontSize: 13,
          fontWeight: 700,
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        flex: 1,
        textAlign: "center",
        textDecoration: "none",
        color: active ? "#4ade80" : "#9ca3af",
        fontSize: 11,
        fontWeight: 800,
        padding: "7px 4px",
        borderRadius: 8,
        background: active ? "#12351d" : "transparent",
      }}
    >
      {label}
    </Link>
  );
}