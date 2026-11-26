"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type RecordingStatus = "pending" | "approved" | "rejected" | "clean" | "noisy";
type Filter = "all" | "pending" | "clean" | "noisy" | "approved" | "rejected";

function getRecordingStatus(recording: any): RecordingStatus {
  const qualityStatus = String(recording.quality_status || "").toLowerCase();
  const status = String(recording.status || "").toLowerCase();
  if (qualityStatus === "noisy") return "noisy";
  if (qualityStatus === "clean") return "clean";
  if (status === "approved" && recording.is_approved === true) return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

function getStatusStyle(status: RecordingStatus) {
  switch (status) {
    case "clean": return { background: "#052e16", color: "#4ade80" };
    case "noisy": return { background: "#431407", color: "#fb923c" };
    case "approved": return { background: "#064e3b", color: "#6ee7b7" };
    case "rejected": return { background: "#450a0a", color: "#f87171" };
    default: return { background: "#422006", color: "#fbbf24" };
  }
}

const PAGE_SIZE = 100;

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [serverCounts, setServerCounts] = useState<any>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const counts = serverCounts || {
    total: recordings.length,
    pending: recordings.filter((r) => getRecordingStatus(r) === "pending").length,
    clean: recordings.filter((r) => getRecordingStatus(r) === "clean").length,
    noisy: recordings.filter((r) => getRecordingStatus(r) === "noisy").length,
    approved: recordings.filter((r) => getRecordingStatus(r) === "approved").length,
    rejected: recordings.filter((r) => getRecordingStatus(r) === "rejected").length,
  };

  useEffect(() => {
    loadAllRecordings(page, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter]);

  async function getToken() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    if (!session?.access_token) throw new Error("Your Chairman session was not found. Please log in again.");
    return session.access_token;
  }

  async function loadAllRecordings(pageToLoad = page, filterToLoad = filter) {
    setLoading(true);
    setMessage("");
    setMessageType("");
    try {
      const token = await getToken();
      const response = await fetch(`/api/admin/recordings?page=${pageToLoad}&limit=${PAGE_SIZE}&filter=${filterToLoad}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load recordings.");
      setRecordings(result.recordings || []);
      if (typeof result.total === "number") setTotal(result.total);
      if (typeof result.totalPages === "number") {
        setPage((currentPage) => Math.min(currentPage, Math.max(1, result.totalPages)));
      }
      if (result.counts) setServerCounts(result.counts);
    } catch (error: any) {
      console.error("Could not load recordings:", error);
      setMessage(error.message || "Could not load recordings.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuality(id: string, quality: "clean" | "noisy") {
    if (busyId) return;
    const confirmed = window.confirm(quality === "clean" ? "Mark this recording as CLEAN?" : "Mark this recording as NOISY?\n\nThe recording will NOT be deleted.");
    if (!confirmed) return;
    setBusyId(id); setMessage(""); setMessageType("");
    try {
      const token = await getToken();
      const response = await fetch("/api/admin/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, quality_status: quality }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update recording quality.");
      setMessage(result.message || `Recording marked ${quality.toUpperCase()}.`);
      setMessageType("success");
      await loadAllRecordings();
    } catch (error: any) {
      setMessage(error.message || "Could not update recording.");
      setMessageType("error");
    } finally { setBusyId(null); }
  }

  async function handleApproval(id: string, newStatus: "approved" | "rejected") {
    if (busyId) return;
    const confirmed = window.confirm(newStatus === "approved" ? "Are you sure you want to approve this recording?" : "Are you sure you want to reject this recording?");
    if (!confirmed) return;
    setBusyId(id); setMessage(""); setMessageType("");
    try {
      const token = await getToken();
      const response = await fetch("/api/admin/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Recording review failed.");
      setMessage(result.message || "Recording updated successfully.");
      setMessageType("success");
      await loadAllRecordings();
    } catch (error: any) {
      setMessage(error.message || "Could not update recording.");
      setMessageType("error");
    } finally { setBusyId(null); }
  }

  async function handleDelete(id: string) {
    if (busyId) return;
    const confirmed = window.confirm("Remove this recording from the Chairman review list?\n\nThe voice/audio file will NOT be deleted.");
    if (!confirmed) return;
    setBusyId(id); setMessage(""); setMessageType("");
    try {
      const token = await getToken();
      const response = await fetch("/api/admin/recordings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove recording.");
      setRecordings((current) => current.filter((r) => r.id !== id));
      setMessage(result.message || "Recording removed from review.");
      setMessageType("success");
      await loadAllRecordings();
    } catch (error: any) {
      setMessage(error.message || "Could not remove recording.");
      setMessageType("error");
    } finally { setBusyId(null); }
  }

  const filtered = recordings;
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "ALL", count: counts.total },
    { key: "pending", label: "PENDING", count: counts.pending },
    { key: "clean", label: "CLEAN", count: counts.clean },
    { key: "noisy", label: "NOISY", count: counts.noisy },
    { key: "approved", label: "APPROVED", count: counts.approved },
    { key: "rejected", label: "REJECTED", count: counts.rejected },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#080d0b", padding: "16px", color: "#ffffff" }}>
      <Link href="/admin" style={{ color: "#22c55e", fontSize: "12px", textDecoration: "none", fontWeight: 700 }}>← Back to Chairman Overview</Link>
      <h1 style={{ fontSize: "22px", marginTop: "16px", fontWeight: 900 }}>Recording Review</h1>
      <p style={{ color: "#94a3b8", fontSize: "12px", lineHeight: 1.7 }}>Listen to worker recordings, check audio quality, then approve or reject submissions.</p>
      <div style={{ marginTop: "14px", padding: "12px", borderRadius: "10px", background: "#1c1208", border: "1px solid #7c2d12", color: "#fdba74", fontSize: "11px", lineHeight: 1.6 }}>
        <strong>🔊 QUALITY CHECK:</strong> Listen before approval. Mark recordings with unacceptable noise as <strong>NOISY</strong>. Good recordings can be marked <strong>CLEAN</strong>.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "9px", marginTop: "18px" }}>
        {[["TOTAL", counts.total, "#38bdf8"], ["PENDING", counts.pending, "#fbbf24"], ["CLEAN", counts.clean, "#4ade80"], ["NOISY", counts.noisy, "#fb923c"], ["APPROVED", counts.approved, "#6ee7b7"], ["REJECTED", counts.rejected, "#f87171"]].map(([label, value, color]) => (
          <div key={String(label)} style={{ background: "#111a15", border: "1px solid #243329", borderRadius: "12px", padding: "14px" }}>
            <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: String(color), marginTop: "5px" }}>{value}</div>
          </div>
        ))}
      </div>
      {message && (<div role="status" style={{ marginTop: "14px", padding: "12px", borderRadius: "9px", background: messageType === "success" ? "#052e16" : "#450a0a", border: messageType === "success" ? "1px solid #166534" : "1px solid #991b1b", color: messageType === "success" ? "#86efac" : "#fecaca", fontSize: "12px", overflowWrap: "anywhere" }}>{message}</div>)}
      <button onClick={() => loadAllRecordings()} disabled={loading} style={{ marginTop: "16px", background: "#14532d", color: "#ffffff", border: "1px solid #166534", padding: "10px 15px", borderRadius: "9px", fontSize: "12px", fontWeight: 800, opacity: loading ? 0.6 : 1 }}>
        {loading ? "Loading..." : "↻ Refresh Recordings"}
      </button>
      <div style={{ display: "flex", gap: "7px", marginTop: "16px", overflowX: "auto", paddingBottom: "7px" }}>
        {filters.map(({ key, label, count }) => (
          <button key={key} onClick={() => { setFilter(key); setPage(1); }} style={{ background: filter === key ? (key === "noisy" ? "#ea580c" : "#22c55e") : "#17231b", color: filter === key ? "#041008" : "#cbd5e1", border: "1px solid #26372c", padding: "9px 13px", borderRadius: "20px", fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap" }}>
            {label} ({count})
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "16px", background: "#111a15", border: "1px solid #243329", borderRadius: "10px", padding: "12px" }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} style={{ background: page <= 1 ? "#1f2937" : "#14532d", color: "#fff", border: "1px solid #166534", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 800, opacity: page <= 1 || loading ? 0.5 : 1 }}>← Prev</button>
        <div style={{ fontSize: "12px", fontWeight: 800, textAlign: "center" }}>Page {page} of {totalPages}<br /><span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>Showing {recordings.length} of {total} recordings</span></div>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} style={{ background: page >= totalPages ? "#1f2937" : "#14532d", color: "#fff", border: "1px solid #166534", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 800, opacity: page >= totalPages || loading ? 0.5 : 1 }}>Next →</button>
      </div>
      <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
        {filtered.map((recording) => {
          const status = getRecordingStatus(recording);
          const statusStyle = getStatusStyle(status);
          const isBusy = busyId === recording.id;
          return (
            <section key={recording.id} style={{ background: "#101813", border: "1px solid #26372c", borderRadius: "13px", padding: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                <div style={{ fontSize: "12px", fontWeight: 900, overflowWrap: "anywhere" }}>{recording.id}</div>
                <span style={{ background: statusStyle.background, color: statusStyle.color, padding: "5px 9px", borderRadius: "20px", fontSize: "9px", fontWeight: 900 }}>{status.toUpperCase()}</span>
              </div>
              <p style={{ color: "#a1a1aa", fontSize: "11px", lineHeight: 1.8, marginTop: "9px", overflowWrap: "anywhere" }}>
                Worker: {recording.worker_id || "Unknown"}<br />Language: {recording.language || "Unknown"}<br />Text: {(recording.text || recording.pidgin_text || recording.transcript || "No transcript available").slice(0, 160)}<br />Date: {recording.created_at ? new Date(recording.created_at).toLocaleString() : "Unavailable"}<br />Earnings: ₦{Number(recording.earnings || 0).toLocaleString()}
              </p>
              <div style={{ background: "#080d0b", border: "1px solid #26372c", borderRadius: "9px", padding: "12px", marginTop: "10px" }}>
                {recording.signedUrl ? (
                  <>
                    <audio id={`audio-${recording.id}`} src={recording.signedUrl} preload="none" onEnded={() => setPlayingId(null)} onPause={() => setPlayingId((c) => (c === recording.id ? null : c))} style={{ display: "none" }} />
                    <button onClick={async () => {
                      const audio = document.getElementById(`audio-${recording.id}`) as HTMLAudioElement | null;
                      if (!audio) return;
                      if (playingId === recording.id) { audio.pause(); setPlayingId(null); return; }
                      document.querySelectorAll("audio").forEach((item) => (item as HTMLAudioElement).pause());
                      try { await audio.play(); setPlayingId(recording.id); } catch (e) { console.error(e); setMessage("Could not play this recording."); setMessageType("error"); }
                    }} style={{ background: playingId === recording.id ? "#dc2626" : "#15803d", color: "#ffffff", border: "none", borderRadius: "8px", padding: "10px 16px", fontWeight: 800, fontSize: "11px" }}>
                      {playingId === recording.id ? "⏸ Pause Recording" : "▶ Play Recording"}
                    </button>
                  </>
                ) : (<span style={{ fontSize: "11px", color: "#fbbf24" }}>No audio file available for this recording.</span>)}
              </div>
              <div style={{ marginTop: "12px", padding: "10px", background: "#0b120e", border: "1px solid #26372c", borderRadius: "10px" }}>
                <div style={{ color: "#94a3b8", fontSize: "9px", fontWeight: 900, marginBottom: "8px", letterSpacing: "0.5px" }}>AUDIO QUALITY</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => handleQuality(recording.id, "clean")} disabled={busyId !== null} style={{ flex: 1, background: status === "clean" ? "#166534" : "#052e16", border: "1px solid #22c55e", color: "#86efac", padding: "10px 5px", borderRadius: "8px", fontSize: "10px", fontWeight: 900, opacity: busyId !== null ? 0.55 : 1 }}>✓ CLEAN</button>
                  <button onClick={() => handleQuality(recording.id, "noisy")} disabled={busyId !== null} style={{ flex: 1, background: status === "noisy" ? "#c2410c" : "#431407", border: "1px solid #f97316", color: "#fdba74", padding: "10px 5px", borderRadius: "8px", fontSize: "10px", fontWeight: 900, opacity: busyId !== null ? 0.55 : 1 }}>⚠ NOISY</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button onClick={() => handleApproval(recording.id, "approved")} disabled={status === "approved" || busyId !== null} style={{ flex: 1, background: status === "approved" ? "#14532d" : "#052e16", border: "1px solid #166534", color: "#86efac", padding: "11px 5px", borderRadius: "8px", fontSize: "10px", fontWeight: 900, opacity: status === "approved" || busyId !== null ? 0.55 : 1 }}>{isBusy ? "Processing..." : status === "approved" ? "✓ Approved" : "✓ Approve"}</button>
                <button onClick={() => handleApproval(recording.id, "rejected")} disabled={status === "rejected" || busyId !== null} style={{ flex: 1, background: status === "rejected" ? "#7f1d1d" : "#450a0a", border: "1px solid #991b1b", color: "#fca5a5", padding: "11px 5px", borderRadius: "8px", fontSize: "10px", fontWeight: 900, opacity: status === "rejected" || busyId !== null ? 0.55 : 1 }}>{isBusy ? "Processing..." : status === "rejected" ? "✕ Rejected" : "✕ Reject"}</button>
              </div>
              <button onClick={() => handleDelete(recording.id)} disabled={busyId !== null} style={{ width: "100%", marginTop: "9px", background: "#1f2937", border: "1px solid #475569", color: "#cbd5e1", padding: "11px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: 900, opacity: busyId !== null ? 0.55 : 1 }}>{isBusy ? "Removing..." : "🗑 Remove from Review"}</button>
            </section>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ background: "#101813", border: "1px solid #26372c", borderRadius: "12px", padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "12px" }}>
            {messageType === "error" ? "Recordings could not be loaded. Check the error above." : "No recordings found in this category."}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "16px", background: "#111a15", border: "1px solid #243329", borderRadius: "10px", padding: "12px" }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} style={{ background: page <= 1 ? "#1f2937" : "#14532d", color: "#fff", border: "1px solid #166534", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 800, opacity: page <= 1 || loading ? 0.5 : 1 }}>← Prev</button>
        <div style={{ fontSize: "12px", fontWeight: 800, textAlign: "center" }}>Page {page} of {totalPages}</div>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading} style={{ background: page >= totalPages ? "#1f2937" : "#14532d", color: "#fff", border: "1px solid #166534", padding: "10px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 800, opacity: page >= totalPages || loading ? 0.5 : 1 }}>Next →</button>
      </div>
      <footer style={{ marginTop: "28px", textAlign: "center", color: "#64748b", fontSize: "10px" }}>MAIN NAIJA PIDGIN • CHAIRMAN RECORDING CONTROL</footer>
    </main>
  );
}