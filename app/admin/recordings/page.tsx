"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type RecordingStatus = "pending" | "approved" | "rejected";

function getRecordingStatus(recording: any): RecordingStatus {
  if (recording.status === "rejected") return "rejected";

  if (recording.is_approved === true) return "approved";

  // An old row may say approved without is_approved being true.
  // Show it as pending so the Chairman can approve it again.
  return "pending";
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("all");

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const counts = {
    total: recordings.length,
    pending: recordings.filter(
      (r) => getRecordingStatus(r) === "pending"
    ).length,
    approved: recordings.filter(
      (r) => getRecordingStatus(r) === "approved"
    ).length,
    rejected: recordings.filter(
      (r) => getRecordingStatus(r) === "rejected"
    ).length,
  };

  useEffect(() => {
    loadAllRecordings();
  }, []);

  async function getToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("Please log in again as Chairman.");
    }

    return session.access_token;
  }

  async function loadAllRecordings() {
    setLoading(true);
    setMessage("");

    try {
      const token = await getToken();

      const response = await fetch("/api/admin/recordings", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load recordings.");
      }

      setRecordings(result.recordings || []);
    } catch (error: any) {
      console.error("Could not load recordings:", error);
      setMessage(error.message || "Could not load recordings.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApproval(
    id: string,
    newStatus: "approved" | "rejected"
  ) {
    if (busyId) return;

    const confirmation =
      newStatus === "approved"
        ? "Approve this recording?"
        : "Reject this recording?";

    if (!window.confirm(confirmation)) return;

    setBusyId(id);
    setMessage("");

    try {
      const token = await getToken();

      const response = await fetch("/api/admin/recordings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Recording review failed.");
      }

      setMessage(result.message || "Recording updated successfully.");

      // Reload the actual database values after approval.
      await loadAllRecordings();
    } catch (error: any) {
      console.error("Recording review failed:", error);
      setMessage(error.message || "Could not update recording.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = recordings.filter((recording) => {
    if (filter === "all") return true;
    return getRecordingStatus(recording) === filter;
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        padding: "16px",
        color: "white",
      }}
    >
      <Link
        href="/admin"
        style={{
          color: "#22c55e",
          fontSize: "12px",
          textDecoration: "none",
        }}
      >
        ← Back to Chairman Overview
      </Link>

      <h1
        style={{
          fontSize: "20px",
          marginTop: "12px",
          fontWeight: 800,
        }}
      >
        Recording Review
      </h1>

      <p style={{ color: "#94a3b8", fontSize: "11px" }}>
        {loading
          ? "Loading live recordings..."
          : `${counts.total} total • ${counts.pending} pending • ${counts.approved} approved • ${counts.rejected} rejected`}
      </p>

      {message && (
        <div
          style={{
            background: "#172554",
            border: "1px solid #1d4ed8",
            padding: "10px",
            borderRadius: "8px",
            marginTop: "12px",
            fontSize: "12px",
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </div>
      )}

      <button
        onClick={loadAllRecordings}
        disabled={loading}
        style={{
          marginTop: "12px",
          background: "#14532d",
          color: "white",
          border: "1px solid #166534",
          padding: "8px 14px",
          borderRadius: "8px",
          fontSize: "11px",
          fontWeight: 700,
        }}
      >
        {loading ? "Refreshing..." : "↻ Refresh"}
      </button>

      <div
        style={{
          display: "flex",
          gap: "6px",
          marginTop: "12px",
          overflowX: "auto",
        }}
      >
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              background: filter === f ? "#f59e0b" : "#1e293b",
              color: filter === f ? "black" : "#94a3b8",
              border: "none",
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {f.toUpperCase()} (
            {f === "all"
              ? counts.total
              : f === "pending"
              ? counts.pending
              : f === "approved"
              ? counts.approved
              : counts.rejected}
            )
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gap: "10px",
          marginTop: "16px",
        }}
      >
        {filtered.map((r) => {
          const status = getRecordingStatus(r);

          return (
            <div
              key={r.id}
              style={{
                background: "#020617",
                border: "1px solid #1e293b",
                borderRadius: "12px",
                padding: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    fontWeight: 700,
                    overflowWrap: "anywhere",
                  }}
                >
                  {r.id} • {r.type || r.language || "Recording"}
                </p>

                <span
                  style={{
                    background:
                      status === "pending"
                        ? "#422006"
                        : status === "approved"
                        ? "#052e16"
                        : "#450a0a",
                    color:
                      status === "pending"
                        ? "#fbbf24"
                        : status === "approved"
                        ? "#4ade80"
                        : "#f87171",
                    padding: "3px 8px",
                    borderRadius: "20px",
                    fontSize: "9px",
                    fontWeight: 800,
                    height: "fit-content",
                  }}
                >
                  {status.toUpperCase()}
                </span>
              </div>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "11px",
                  color: "#94a3b8",
                  overflowWrap: "anywhere",
                }}
              >
                {r.worker_id || "Worker ID unavailable"} •{" "}
                {r.language || "Language unavailable"} •{" "}
                {r.text?.slice(0, 60) ||
                  r.pidgin_text?.slice(0, 60) ||
                  "Recording"}{" "}
                •{" "}
                {r.created_at
                  ? new Date(r.created_at).toLocaleString()
                  : "Date unavailable"}
              </p>

              <div
                style={{
                  background: "#0f172a",
                  borderRadius: "8px",
                  padding: "10px",
                  marginTop: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                {r.signedUrl ? (
                  <>
                    <audio
                      id={`audio-${r.id}`}
                      src={r.signedUrl}
                      onEnded={() => setPlayingId(null)}
                      style={{ display: "none" }}
                    />

                    <button
                      onClick={() => {
                        const audio = document.getElementById(
                          `audio-${r.id}`
                        ) as HTMLAudioElement;

                        if (!audio) return;

                        if (playingId === r.id) {
                          audio.pause();
                          setPlayingId(null);
                        } else {
                          document.querySelectorAll("audio").forEach((item) =>
                            (item as HTMLAudioElement).pause()
                          );

                          audio
                            .play()
                            .then(() => setPlayingId(r.id))
                            .catch((error) => {
                              console.error("Audio playback failed:", error);
                              alert("Could not play this recording.");
                            });
                        }
                      }}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background:
                          playingId === r.id ? "#ef4444" : "#f59e0b",
                        border: "none",
                        fontSize: "14px",
                      }}
                    >
                      {playingId === r.id ? "⏸️" : "▶️"}
                    </button>

                    <span
                      style={{
                        fontSize: "10px",
                        color: "#94a3b8",
                      }}
                    >
                      Chairman Play
                    </span>
                  </>
                ) : (
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#94a3b8",
                    }}
                  >
                    No audio available
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "10px",
                }}
              >
                <button
                  onClick={() => handleApproval(r.id, "approved")}
                  disabled={status === "approved" || busyId !== null}
                  style={{
                    flex: 1,
                    background:
                      status === "approved" ? "#14532d" : "#052e16",
                    border: "1px solid #14532d",
                    color: "#4ade80",
                    padding: "9px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    opacity:
                      status === "approved" || busyId !== null ? 0.6 : 1,
                  }}
                >
                  {busyId === r.id
                    ? "Processing..."
                    : status === "approved"
                    ? "✓ Approved"
                    : "✓ Approve"}
                </button>

                <button
                  onClick={() => handleApproval(r.id, "rejected")}
                  disabled={status === "rejected" || busyId !== null}
                  style={{
                    flex: 1,
                    background:
                      status === "rejected" ? "#7f1d1d" : "#450a0a",
                    border: "1px solid #7f1d1d",
                    color: "#f87171",
                    padding: "9px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    opacity:
                      status === "rejected" || busyId !== null ? 0.6 : 1,
                  }}
                >
                  {busyId === r.id
                    ? "Processing..."
                    : status === "rejected"
                    ? "✕ Rejected"
                    : "✕ Reject"}
                </button>
              </div>
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>
            No recordings found in this category.
          </p>
        )}
      </div>

      <p
        style={{
          marginTop: "24px",
          textAlign: "center",
          color: "#64748b",
          fontSize: "10px",
        }}
      >
        MAIN NAIJA PIDGIN • CHAIRMAN RECORDING CONTROL
      </p>
    </main>
  );
}