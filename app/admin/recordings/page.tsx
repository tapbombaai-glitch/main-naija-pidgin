"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type RecordingStatus = "pending" | "approved" | "rejected";

function getRecordingStatus(recording: any): RecordingStatus {
  if (recording.status === "rejected") return "rejected";

  if (
    recording.status === "approved" &&
    recording.is_approved === true
  ) {
    return "approved";
  }

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
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

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

    if (error) {
      throw new Error(error.message);
    }

    if (!session?.access_token) {
      throw new Error(
        "Your Chairman session was not found. Please log in again."
      );
    }

    return session.access_token;
  }

  async function loadAllRecordings() {
    setLoading(true);
    setMessage("");
    setMessageType("");

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
        throw new Error(
          result.error || "Could not load recordings."
        );
      }

      setRecordings(result.recordings || []);
    } catch (error: any) {
      console.error("Could not load recordings:", error);

      setMessage(
        error.message || "Could not load recordings."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleApproval(
    id: string,
    newStatus: "approved" | "rejected"
  ) {
    if (busyId) return;

    const confirmed = window.confirm(
      newStatus === "approved"
        ? "Are you sure you want to approve this recording?"
        : "Are you sure you want to reject this recording?"
    );

    if (!confirmed) return;

    setBusyId(id);
    setMessage("");
    setMessageType("");

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
        throw new Error(
          result.error || "Recording review failed."
        );
      }

      setMessage(
        result.message || "Recording updated successfully."
      );
      setMessageType("success");

      await loadAllRecordings();
    } catch (error: any) {
      console.error("Recording review failed:", error);

      setMessage(
        error.message || "Could not update recording."
      );
      setMessageType("error");
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
        background: "#080d0b",
        padding: "16px",
        color: "#ffffff",
      }}
    >
      <Link
        href="/admin"
        style={{
          color: "#22c55e",
          fontSize: "12px",
          textDecoration: "none",
          fontWeight: 700,
        }}
      >
        ← Back to Chairman Overview
      </Link>

      <h1
        style={{
          fontSize: "22px",
          marginTop: "16px",
          fontWeight: 900,
        }}
      >
        Recording Review
      </h1>

      <p
        style={{
          color: "#94a3b8",
          fontSize: "12px",
          lineHeight: 1.7,
        }}
      >
        Review worker recordings and approve or reject submissions.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "9px",
          marginTop: "18px",
        }}
      >
        {[
          ["TOTAL", counts.total, "#38bdf8"],
          ["PENDING", counts.pending, "#fbbf24"],
          ["APPROVED", counts.approved, "#4ade80"],
          ["REJECTED", counts.rejected, "#f87171"],
        ].map(([label, value, color]) => (
          <div
            key={String(label)}
            style={{
              background: "#111a15",
              border: "1px solid #243329",
              borderRadius: "12px",
              padding: "14px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#94a3b8",
                fontWeight: 800,
              }}
            >
              {label}
            </div>

            <div
              style={{
                fontSize: "24px",
                fontWeight: 900,
                color: String(color),
                marginTop: "5px",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div
          role="status"
          style={{
            marginTop: "14px",
            padding: "12px",
            borderRadius: "9px",
            background:
              messageType === "success" ? "#052e16" : "#450a0a",
            border:
              messageType === "success"
                ? "1px solid #166534"
                : "1px solid #991b1b",
            color:
              messageType === "success" ? "#86efac" : "#fecaca",
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
          marginTop: "16px",
          background: "#14532d",
          color: "#ffffff",
          border: "1px solid #166534",
          padding: "10px 15px",
          borderRadius: "9px",
          fontSize: "12px",
          fontWeight: 800,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Loading..." : "↻ Refresh Recordings"}
      </button>

      <div
        style={{
          display: "flex",
          gap: "7px",
          marginTop: "16px",
          overflowX: "auto",
          paddingBottom: "5px",
        }}
      >
        {(["all", "pending", "approved", "rejected"] as const).map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background:
                  filter === f ? "#22c55e" : "#17231b",
                color:
                  filter === f ? "#041008" : "#cbd5e1",
                border: "1px solid #26372c",
                padding: "9px 13px",
                borderRadius: "20px",
                fontSize: "10px",
                fontWeight: 900,
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
          )
        )}
      </div>

      <div
        style={{
          display: "grid",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        {filtered.map((recording) => {
          const status = getRecordingStatus(recording);
          const isBusy = busyId === recording.id;

          return (
            <section
              key={recording.id}
              style={{
                background: "#101813",
                border: "1px solid #26372c",
                borderRadius: "13px",
                padding: "13px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 900,
                    overflowWrap: "anywhere",
                  }}
                >
                  {recording.id}
                </div>

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
                    padding: "5px 9px",
                    borderRadius: "20px",
                    fontSize: "9px",
                    fontWeight: 900,
                  }}
                >
                  {status.toUpperCase()}
                </span>
              </div>

              <p
                style={{
                  color: "#a1a1aa",
                  fontSize: "11px",
                  lineHeight: 1.8,
                  marginTop: "9px",
                  overflowWrap: "anywhere",
                }}
              >
                Worker: {recording.worker_id || "Unknown"}
                <br />
                Language: {recording.language || "Unknown"}
                <br />
                Text:{" "}
                {(
                  recording.text ||
                  recording.pidgin_text ||
                  recording.transcript ||
                  "No transcript available"
                ).slice(0, 160)}
                <br />
                Date:{" "}
                {recording.created_at
                  ? new Date(recording.created_at).toLocaleString()
                  : "Unavailable"}
                <br />
                Earnings: ₦
                {Number(recording.earnings || 0).toLocaleString()}
              </p>

              <div
                style={{
                  background: "#080d0b",
                  border: "1px solid #26372c",
                  borderRadius: "9px",
                  padding: "12px",
                  marginTop: "10px",
                }}
              >
                {recording.signedUrl ? (
                  <>
                    <audio
                      id={`audio-${recording.id}`}
                      src={recording.signedUrl}
                      preload="none"
                      onEnded={() => setPlayingId(null)}
                      onPause={() =>
                        setPlayingId((current) =>
                          current === recording.id ? null : current
                        )
                      }
                      style={{ display: "none" }}
                    />

                    <button
                      onClick={async () => {
                        const audio = document.getElementById(
                          `audio-${recording.id}`
                        ) as HTMLAudioElement | null;

                        if (!audio) return;

                        if (playingId === recording.id) {
                          audio.pause();
                          setPlayingId(null);
                          return;
                        }

                        document
                          .querySelectorAll("audio")
                          .forEach((item) => {
                            (item as HTMLAudioElement).pause();
                          });

                        try {
                          await audio.play();
                          setPlayingId(recording.id);
                        } catch (error) {
                          console.error("Audio playback failed:", error);
                          setMessage("Could not play this recording.");
                          setMessageType("error");
                        }
                      }}
                      style={{
                        background:
                          playingId === recording.id
                            ? "#dc2626"
                            : "#15803d",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "10px 16px",
                        fontWeight: 800,
                        fontSize: "11px",
                      }}
                    >
                      {playingId === recording.id
                        ? "⏸ Pause Recording"
                        : "▶ Play Recording"}
                    </button>
                  </>
                ) : (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#fbbf24",
                    }}
                  >
                    No audio file available for this recording.
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "12px",
                }}
              >
                <button
                  onClick={() =>
                    handleApproval(recording.id, "approved")
                  }
                  disabled={status === "approved" || busyId !== null}
                  style={{
                    flex: 1,
                    background:
                      status === "approved" ? "#14532d" : "#052e16",
                    border: "1px solid #166534",
                    color: "#86efac",
                    padding: "11px 5px",
                    borderRadius: "8px",
                    fontSize: "10px",
                    fontWeight: 900,
                    opacity:
                      status === "approved" || busyId !== null
                        ? 0.55
                        : 1,
                  }}
                >
                  {isBusy
                    ? "Processing..."
                    : status === "approved"
                    ? "✓ Approved"
                    : "✓ Approve"}
                </button>

                <button
                  onClick={() =>
                    handleApproval(recording.id, "rejected")
                  }
                  disabled={status === "rejected" || busyId !== null}
                  style={{
                    flex: 1,
                    background:
                      status === "rejected" ? "#7f1d1d" : "#450a0a",
                    border: "1px solid #991b1b",
                    color: "#fca5a5",
                    padding: "11px 5px",
                    borderRadius: "8px",
                    fontSize: "10px",
                    fontWeight: 900,
                    opacity:
                      status === "rejected" || busyId !== null
                        ? 0.55
                        : 1,
                  }}
                >
                  {isBusy
                    ? "Processing..."
                    : status === "rejected"
                    ? "✕ Rejected"
                    : "✕ Reject"}
                </button>
              </div>
            </section>
          );
        })}

        {!loading && filtered.length === 0 && (
          <div
            style={{
              background: "#101813",
              border: "1px solid #26372c",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: "12px",
            }}
          >
            {messageType === "error"
              ? "Recordings could not be loaded. Check the error above."
              : "No recordings found in this category."}
          </div>
        )}
      </div>

      <footer
        style={{
          marginTop: "28px",
          textAlign: "center",
          color: "#64748b",
          fontSize: "10px",
        }}
      >
        MAIN NAIJA PIDGIN • CHAIRMAN RECORDING CONTROL
      </footer>
    </main>
  );
}