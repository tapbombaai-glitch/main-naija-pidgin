"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";
const DATASET_BUCKET = "naija-voice-dataset";

type DatasetRecording = {
  id: string;
  user_id: string;
  language: string;
  region: string;
  recording_type: string;
  prompt_text: string | null;
  transcript: string | null;
  storage_path: string;
  duration_seconds: number;
  mime_type: string | null;
  consent_ai_training: boolean;
  consent_synthetic_voice: boolean;
  consent_commercial_use: boolean;
  consent_version: string;
  consented_at: string;
  status: string;
  created_at: string;
};

type Filter = "all" | "pending" | "approved" | "rejected";

export default function AdminDatasetPage() {
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [items, setItems] = useState<DatasetRecording[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    duration: 0,
    workers: 0,
  });

  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);

  const [workingId, setWorkingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    verifyAdmin();
  }, []);

  async function verifyAdmin() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (
        authError ||
        !user ||
        user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      ) {
        window.location.replace("/admin/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email,is_chairman")
        .eq("id", user.id)
        .maybeSingle();

      if (
        profileError ||
        !profile ||
        profile.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase() ||
        profile.is_chairman !== true
      ) {
        await supabase.auth.signOut();
        window.location.replace("/admin/login");
        return;
      }

      setAuthorized(true);

      await loadDataset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Chairman verification failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDataset() {
    setError("");

    try {
      const { data, error: datasetError } = await supabase
        .from("dataset_recordings")
        .select(
          `
          id,
          user_id,
          language,
          region,
          recording_type,
          prompt_text,
          transcript,
          storage_path,
          duration_seconds,
          mime_type,
          consent_ai_training,
          consent_synthetic_voice,
          consent_commercial_use,
          consent_version,
          consented_at,
          status,
          created_at
        `
        )
        .order("created_at", { ascending: false });

      if (datasetError) {
        throw new Error(datasetError.message);
      }

      const recordings = (data || []) as DatasetRecording[];

      setItems(recordings);

      const uniqueWorkers = new Set(
        recordings.map((item) => item.user_id)
      );

      const totalDuration = recordings.reduce(
        (sum, item) => sum + Number(item.duration_seconds || 0),
        0
      );

      setStats({
        total: recordings.length,
        pending: recordings.filter(
          (item) => item.status?.toLowerCase() === "pending"
        ).length,
        approved: recordings.filter(
          (item) => item.status?.toLowerCase() === "approved"
        ).length,
        rejected: recordings.filter(
          (item) => item.status?.toLowerCase() === "rejected"
        ).length,
        duration: totalDuration,
        workers: uniqueWorkers.size,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load dataset recordings."
      );
    }
  }

  async function refresh() {
    setRefreshing(true);
    setNotice("");
    setError("");

    await loadDataset();

    setRefreshing(false);
  }

  async function getAudioUrl(item: DatasetRecording) {
    if (audioUrls[item.id]) {
      return audioUrls[item.id];
    }

    setLoadingAudio(item.id);
    setError("");

    try {
      const { data, error: signedError } = await supabase.storage
        .from(DATASET_BUCKET)
        .createSignedUrl(item.storage_path, 60);

      if (signedError || !data?.signedUrl) {
        throw new Error(
          signedError?.message || "Could not create secure audio URL."
        );
      }

      setAudioUrls((previous) => ({
        ...previous,
        [item.id]: data.signedUrl,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load audio."
      );
    } finally {
      setLoadingAudio(null);
    }
  }

  async function updateStatus(
    id: string,
    status: "approved" | "rejected"
  ) {
    if (workingId) return;

    setWorkingId(id);
    setNotice("");
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        window.location.replace("/admin/login");
        return;
      }

      const response = await fetch("/api/chairman/dataset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not update dataset recording."
        );
      }

      setNotice(
        status === "approved"
          ? "Dataset recording approved successfully."
          : "Dataset recording rejected successfully."
      );

      await loadDataset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Dataset update failed."
      );
    } finally {
      setWorkingId(null);
    }
  }

  function formatDuration(seconds: number) {
    const total = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(total / 60);
    const remaining = total % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remaining
    ).padStart(2, "0")}`;
  }

  function formatHours(seconds: number) {
    const hours = Number(seconds || 0) / 3600;

    return `${hours.toFixed(2)} hrs`;
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString();
  }

  function filteredItems() {
    if (filter === "all") return items;

    return items.filter(
      (item) => item.status?.toLowerCase() === filter
    );
  }

  function consentBadge(
    enabled: boolean,
    label: string
  ) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "5px 8px",
          borderRadius: 20,
          fontSize: 9,
          fontWeight: 900,
          background: enabled ? "#153b25" : "#3b2020",
          color: enabled ? "#9dffb6" : "#ffaaaa",
          border: `1px solid ${
            enabled ? "#287a39" : "#7a3030"
          }`,
          marginRight: 5,
          marginBottom: 5,
        }}
      >
        {enabled ? "✓" : "✕"} {label}
      </span>
    );
  }

  if (loading) {
    return (
      <main className="dataset-admin-page">
        <div className="loading-box">
          <div style={{ fontSize: 38 }}>🇳🇬</div>
          <h2>MAIN NAIJA PIDGIN</h2>
          <p>Verifying Chairman Dataset Access...</p>
        </div>

        <DatasetAdminStyles />
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  const visibleItems = filteredItems();

  return (
    <main className="dataset-admin-page">
      <div className="dataset-container">
        <header className="topbar">
          <div>
            <Link href="/admin" className="back-link">
              ← Chairman Control Centre
            </Link>

            <div className="eyebrow">
              MAIN NAIJA PIDGIN
            </div>

            <h1>🇳🇬 Nigeria Pidgin Dataset</h1>

            <p className="subtitle">
              Review and manage worker voice data for the
              Nigerian voice dataset.
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="refresh-button"
          >
            {refreshing ? "Loading..." : "↻ Refresh"}
          </button>
        </header>

        {notice && (
          <div className="notice success">
            {notice}
            <button onClick={() => setNotice("")}>✕</button>
          </div>
        )}

        {error && (
          <div className="notice error">
            {error}
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}

        <section className="stats-grid">
          <StatCard
            label="TOTAL DATASET"
            value={stats.total}
            color="#ffffff"
          />

          <StatCard
            label="PENDING"
            value={stats.pending}
            color="#FFC107"
          />

          <StatCard
            label="APPROVED"
            value={stats.approved}
            color="#00E676"
          />

          <StatCard
            label="REJECTED"
            value={stats.rejected}
            color="#FF5252"
          />

          <StatCard
            label="AUDIO DURATION"
            value={formatHours(stats.duration)}
            color="#A5E6B7"
          />

          <StatCard
            label="CONTRIBUTING WORKERS"
            value={stats.workers}
            color="#D4AF37"
          />
        </section>

        <section className="dataset-info">
          <div>
            <strong>Dataset source</strong>
            <span>dataset_recordings</span>
          </div>

          <div>
            <strong>Storage</strong>
            <span>Private · {DATASET_BUCKET}</span>
          </div>

          <div>
            <strong>Purpose</strong>
            <span>
              Nigerian voice AI training and development
            </span>
          </div>
        </section>

        <section className="review-section">
          <div className="section-heading">
            <div>
              <h2>Dataset Review</h2>
              <p>
                Review submitted recordings before they become
                approved voice data.
              </p>
            </div>

            <span className="count-badge">
              {visibleItems.length} shown
            </span>
          </div>

          <div className="filters">
            {(
              [
                ["pending", "Pending"],
                ["all", "All"],
                ["approved", "Approved"],
                ["rejected", "Rejected"],
              ] as [Filter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  filter === value ? "filter active" : "filter"
                }
                onClick={() => setFilter(value)}
              >
                {label}
                {value === "pending" && stats.pending > 0 && (
                  <span className="filter-number">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          {visibleItems.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: 42 }}>🎙️</div>
              <h3>No dataset recordings found</h3>
              <p>
                There are no recordings in this filter yet.
              </p>
            </div>
          ) : (
            <div>
              {visibleItems.map((item) => {
                const status =
                  item.status?.toLowerCase() || "pending";

                const audioUrl = audioUrls[item.id];

                return (
                  <article
                    className="recording-card"
                    key={item.id}
                  >
                    <div className="recording-header">
                      <div>
                        <div className="recording-title">
                          Dataset Recording
                        </div>

                        <div className="recording-id">
                          ID: {item.id}
                        </div>
                      </div>

                      <span
                        className={`status ${status}`}
                      >
                        {status.toUpperCase()}
                      </span>
                    </div>

                    <div className="details-grid">
                      <Detail
                        label="Language"
                        value={item.language}
                      />

                      <Detail
                        label="Region"
                        value={item.region}
                      />

                      <Detail
                        label="Recording"
                        value={
                          item.recording_type === "read"
                            ? "Read Text"
                            : "Free Talk"
                        }
                      />

                      <Detail
                        label="Duration"
                        value={formatDuration(
                          item.duration_seconds
                        )}
                      />

                      <Detail
                        label="Worker/User"
                        value={item.user_id}
                      />

                      <Detail
                        label="Submitted"
                        value={formatDate(item.created_at)}
                      />
                    </div>

                    {item.prompt_text && (
                      <div className="text-box">
                        <div className="box-label">
                          PROMPT
                        </div>
                        <div>{item.prompt_text}</div>
                      </div>
                    )}

                    <div className="text-box">
                      <div className="box-label">
                        TRANSCRIPT
                      </div>

                      <div>
                        {item.transcript ||
                          "No transcript supplied."}
                      </div>
                    </div>

                    <div className="consent-box">
                      <div className="box-label">
                        CONSENT
                      </div>

                      <div>
                        {consentBadge(
                          item.consent_ai_training,
                          "AI TRAINING"
                        )}

                        {consentBadge(
                          item.consent_synthetic_voice,
                          "SYNTHETIC VOICE"
                        )}

                        {consentBadge(
                          item.consent_commercial_use,
                          "COMMERCIAL"
                        )}
                      </div>

                      <div className="consent-version">
                        Version: {item.consent_version} ·{" "}
                        {formatDate(item.consented_at)}
                      </div>
                    </div>

                    <div className="audio-section">
                      <div className="box-label">
                        PRIVATE AUDIO
                      </div>

                      {!audioUrl ? (
                        <button
                          type="button"
                          className="audio-load-button"
                          onClick={() =>
                            getAudioUrl(item)
                          }
                          disabled={
                            loadingAudio === item.id
                          }
                        >
                          {loadingAudio === item.id
                            ? "Preparing secure audio..."
                            : "▶ Load Secure Audio"}
                        </button>
                      ) : (
                        <>
                          <audio
                            controls
                            preload="none"
                            src={audioUrl}
                          />

                          <div className="audio-note">
                            Secure audio URL expires after
                            60 seconds.
                          </div>
                        </>
                      )}
                    </div>

                    {status === "pending" && (
                      <div className="action-row">
                        <button
                          type="button"
                          className="approve-button"
                          disabled={
                            workingId === item.id
                          }
                          onClick={() =>
                            updateStatus(
                              item.id,
                              "approved"
                            )
                          }
                        >
                          {workingId === item.id
                            ? "Working..."
                            : "✓ Approve Dataset"}
                        </button>

                        <button
                          type="button"
                          className="reject-button"
                          disabled={
                            workingId === item.id
                          }
                          onClick={() =>
                            updateStatus(
                              item.id,
                              "rejected"
                            )
                          }
                        >
                          {workingId === item.id
                            ? "Working..."
                            : "✕ Reject"}
                        </button>
                      </div>
                    )}

                    {status === "approved" && (
                      <div className="approved-note">
                        ✓ This recording is approved dataset
                        data.
                      </div>
                    )}

                    {status === "rejected" && (
                      <div className="rejected-note">
                        ✕ This recording was rejected. The
                        original dataset record remains stored.
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer>
          MAIN NAIJA PIDGIN · NIGERIAN VOICE DATASET
        </footer>
      </div>

      <DatasetAdminStyles />
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>

      <div
        className="stat-value"
        style={{ color }}
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
    <div className="detail">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}

function DatasetAdminStyles() {
  return (
    <style jsx global>{`
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #050505;
      }

      .dataset-admin-page {
        min-height: 100vh;
        background: #070707;
        color: white;
        font-family: Arial, sans-serif;
        padding: 18px 14px 50px;
      }

      .dataset-container {
        width: 100%;
        max-width: 1150px;
        margin: 0 auto;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 15px;
        margin-bottom: 22px;
      }

      .back-link {
        display: inline-block;
        color: #9de4b1;
        text-decoration: none;
        font-size: 12px;
        margin-bottom: 15px;
      }

      .eyebrow {
        color: #d4af37;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 2px;
      }

      .topbar h1 {
        margin: 6px 0;
        font-size: clamp(23px, 5vw, 32px);
      }

      .subtitle {
        margin: 0;
        color: #888;
        font-size: 12px;
        line-height: 1.5;
        max-width: 650px;
      }

      .refresh-button {
        flex-shrink: 0;
        background: #171717;
        color: #00e676;
        border: 1px solid #00e676;
        border-radius: 20px;
        padding: 9px 12px;
        font-weight: 800;
        cursor: pointer;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 15px;
      }

      .stat-card {
        background: #151515;
        border: 1px solid #292929;
        border-radius: 13px;
        padding: 14px;
        min-width: 0;
      }

      .stat-label {
        color: #888;
        font-size: 8px;
        font-weight: 900;
        line-height: 1.3;
      }

      .stat-value {
        font-size: 23px;
        font-weight: 900;
        margin-top: 8px;
        overflow-wrap: anywhere;
      }

      .dataset-info {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        background: #101010;
        border: 1px solid #292929;
        border-radius: 13px;
        padding: 14px;
        margin-bottom: 22px;
      }

      .dataset-info div {
        min-width: 0;
      }

      .dataset-info strong {
        display: block;
        color: #d4af37;
        font-size: 9px;
        margin-bottom: 5px;
      }

      .dataset-info span {
        color: #aaa;
        font-size: 11px;
        overflow-wrap: anywhere;
      }

      .notice {
        position: relative;
        padding: 12px 42px 12px 12px;
        border-radius: 9px;
        margin-bottom: 15px;
        font-size: 12px;
        overflow-wrap: anywhere;
      }

      .notice button {
        position: absolute;
        right: 10px;
        top: 9px;
        border: 0;
        background: transparent;
        color: white;
        cursor: pointer;
      }

      .notice.success {
        background: #172017;
        border: 1px solid #287a39;
        color: #d9ffe0;
      }

      .notice.error {
        background: #3a1717;
        border: 1px solid #7a3030;
        color: #ffd6d6;
      }

      .review-section {
        background: #0d0d0d;
        border: 1px solid #252525;
        border-radius: 16px;
        padding: 15px;
      }

      .section-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
      }

      .section-heading h2 {
        margin: 0;
        font-size: 18px;
      }

      .section-heading p {
        margin: 5px 0 0;
        color: #888;
        font-size: 11px;
        line-height: 1.5;
      }

      .count-badge {
        background: #1b1b1b;
        border: 1px solid #333;
        color: #bbb;
        border-radius: 20px;
        padding: 7px 10px;
        font-size: 10px;
        white-space: nowrap;
      }

      .filters {
        display: flex;
        gap: 7px;
        overflow-x: auto;
        padding-bottom: 10px;
        margin-bottom: 8px;
      }

      .filter {
        flex-shrink: 0;
        background: #151515;
        border: 1px solid #303030;
        color: #aaa;
        border-radius: 20px;
        padding: 8px 11px;
        font-size: 10px;
        font-weight: 800;
        cursor: pointer;
      }

      .filter.active {
        background: #a5e6b7;
        color: #07110d;
        border-color: #a5e6b7;
      }

      .filter-number {
        margin-left: 5px;
      }

      .recording-card {
        background: #151515;
        border: 1px solid #303030;
        border-radius: 14px;
        padding: 14px;
        margin-bottom: 12px;
        overflow: hidden;
      }

      .recording-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 13px;
      }

      .recording-title {
        font-size: 13px;
        font-weight: 900;
      }

      .recording-id {
        color: #666;
        font-size: 8px;
        margin-top: 5px;
        word-break: break-all;
      }

      .status {
        padding: 6px 8px;
        border-radius: 20px;
        font-size: 8px;
        font-weight: 900;
        white-space: nowrap;
      }

      .status.pending {
        background: #473a19;
        color: #ffe59a;
      }

      .status.approved {
        background: #16472a;
        color: #b9ffca;
      }

      .status.rejected {
        background: #4b2020;
        color: #ffc0c0;
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }

      .detail {
        background: #101010;
        border-radius: 9px;
        padding: 9px;
        min-width: 0;
      }

      .detail-label {
        color: #666;
        font-size: 8px;
        font-weight: 900;
        margin-bottom: 5px;
      }

      .detail-value {
        color: #ddd;
        font-size: 10px;
        overflow-wrap: anywhere;
        line-height: 1.4;
      }

      .text-box,
      .consent-box,
      .audio-section {
        background: #101010;
        border: 1px solid #252525;
        border-radius: 10px;
        padding: 11px;
        margin-top: 9px;
        line-height: 1.5;
        font-size: 12px;
        overflow-wrap: anywhere;
      }

      .box-label {
        color: #d4af37;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 1px;
        margin-bottom: 6px;
      }

      .consent-version {
        color: #666;
        font-size: 8px;
        margin-top: 7px;
      }

      .audio-section audio {
        width: 100%;
        height: 40px;
        margin-top: 5px;
      }

      .audio-load-button {
        width: 100%;
        background: #172b20;
        color: #a5e6b7;
        border: 1px solid #3d694b;
        border-radius: 9px;
        padding: 11px;
        font-weight: 800;
        cursor: pointer;
      }

      .audio-note {
        color: #666;
        font-size: 8px;
        margin-top: 6px;
      }

      .action-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 9px;
        margin-top: 12px;
      }

      .approve-button,
      .reject-button {
        border: 0;
        border-radius: 9px;
        padding: 12px 8px;
        font-weight: 900;
        cursor: pointer;
      }

      .approve-button {
        background: #16a34a;
        color: white;
      }

      .reject-button {
        background: #dc2626;
        color: white;
      }

      .approved-note,
      .rejected-note {
        margin-top: 12px;
        padding: 10px;
        border-radius: 9px;
        font-size: 10px;
      }

      .approved-note {
        background: #153b25;
        color: #b9ffca;
      }

      .rejected-note {
        background: #3b2020;
        color: #ffc0c0;
      }

      .empty,
      .loading-box {
        text-align: center;
        padding: 50px 15px;
        color: #888;
      }

      .empty h3 {
        color: white;
        margin-bottom: 5px;
      }

      .empty p,
      .loading-box p {
        font-size: 12px;
      }

      footer {
        text-align: center;
        color: #555;
        font-size: 9px;
        padding: 25px 0 5px;
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @media (min-width: 700px) {
        .dataset-admin-page {
          padding: 25px;
        }

        .stats-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }

        .details-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .recording-card {
          padding: 18px;
        }
      }

      @media (max-width: 500px) {
        .topbar {
          flex-direction: column;
        }

        .refresh-button {
          width: 100%;
        }

        .stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .dataset-info {
          grid-template-columns: 1fr;
        }

        .section-heading {
          align-items: flex-start;
        }
      }
    `}</style>
  );
}