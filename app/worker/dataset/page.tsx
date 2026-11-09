"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const LANGUAGES = [
  "Nigerian Pidgin",
  "Hausa",
  "Igbo",
  "Yoruba",
  "Other Nigerian Language",
];

const REGIONS = [
  "Port Harcourt",
  "Warri",
  "Lagos",
  "Abuja",
  "Benin City",
  "Enugu",
  "Owerri",
  "Calabar",
  "Uyo",
  "Kano",
  "Other",
];

const PROMPTS = [
  "Good morning. How everybody dey today?",
  "Abeg, make we talk about wetin happen yesterday.",
  "I wan buy something for market. How much e cost?",
  "No matter wetin happen, make we continue to work hard.",
  "Nigeria get many different languages and cultures.",
];

const MAX_SECONDS = 60;
const CONSENT_VERSION = "2026-11-07-v1";

type DatasetRecording = {
  id: string;
  language: string;
  region: string;
  recording_type: string;
  status: string;
  duration_seconds: number | null;
  created_at: string;
};

export default function NigerianVoiceDatasetPage() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("Nigerian Pidgin");
  const [region, setRegion] = useState("Port Harcourt");
  const [recordingType, setRecordingType] = useState<"read" | "natural">("read");
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [transcript, setTranscript] = useState("");

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");

  const [consentAI, setConsentAI] = useState(false);
  const [consentSynthetic, setConsentSynthetic] = useState(false);
  const [consentCommercial, setConsentCommercial] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<DatasetRecording[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkUser();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function checkUser() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setUserId(user.id);
      await loadHistory(user.id);
    }

    setLoading(false);
  }

  async function loadHistory(id: string) {
    const { data, error } = await supabase
      .from("dataset_recordings")
      .select(
        "id,language,region,recording_type,status,duration_seconds,created_at"
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && data) {
      setHistory(data as DatasetRecording[]);
    }
  }

  function clearPreview() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);

    setAudioUrl("");
    setAudioBlob(null);
    setSeconds(0);
  }

  async function startRecording() {
    setError("");
    setMessage("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support microphone recording.");
      return;
    }

    try {
      clearPreview();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();
      setRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((previous) => {
          if (previous + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }

          return previous + 1;
        });
      }, 1000);
    } catch {
      setError(
        "Microphone access failed. Please allow microphone permission and try again."
      );
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    setRecording(false);
  }

  async function submitRecording() {
    setError("");
    setMessage("");

    if (!userId) {
      setError("Please log in to your Worker account first.");
      return;
    }

    if (!audioBlob) {
      setError("Please record your voice and listen to the preview first.");
      return;
    }

    if (!consentAI) {
      setError("You must agree to AI training use before submitting.");
      return;
    }

    if (!transcript.trim()) {
      setError("Please enter the words spoken in your recording.");
      return;
    }

    if (seconds < 2) {
      setError("Please make a recording of at least 2 seconds.");
      return;
    }

    setSubmitting(true);

    let uploadedPath = "";

    try {
      const extension = audioBlob.type.includes("mp4") ? "m4a" : "webm";

      uploadedPath = `${userId}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("naija-voice-dataset")
        .upload(uploadedPath, audioBlob, {
          contentType: audioBlob.type || "audio/webm",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: insertError } = await supabase
        .from("dataset_recordings")
        .insert({
          user_id: userId,
          language,
          region,
          recording_type: recordingType,
          prompt_text: recordingType === "read" ? prompt : null,
          transcript: transcript.trim(),
          storage_path: uploadedPath,
          duration_seconds: seconds,
          mime_type: audioBlob.type || "audio/webm",
          consent_ai_training: consentAI,
          consent_synthetic_voice: consentSynthetic,
          consent_commercial_use: consentCommercial,
          consent_version: CONSENT_VERSION,
          consented_at: new Date().toISOString(),
          status: "pending",
        });

      if (insertError) {
        // Remove only this new upload if its database row could not be saved.
        await supabase.storage
          .from("naija-voice-dataset")
          .remove([uploadedPath]);

        throw new Error(insertError.message);
      }

      setMessage("Your recording has been submitted successfully!");

      clearPreview();
      setTranscript("");
      setSeconds(0);

      await loadHistory(userId);
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "Submission failed.";

      setError(text);
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleString();
  }

  if (loading) {
    return (
      <main className="dataset-page">
        <p className="loading">Loading Nigerian Voice Dataset...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="dataset-page">
        <section className="login-card">
          <div className="logo">🎙️</div>
          <h1>Join Nigerian Voice Dataset</h1>
          <p>
            Please log in to your Worker account before contributing
            recordings.
          </p>
          <Link href="/worker/login" className="primary-button">
            LOGIN TO WORKER ACCOUNT
          </Link>
          <Link href="/" className="back-link">
            Back to Homepage
          </Link>
        </section>
        <DatasetStyles />
      </main>
    );
  }

  return (
    <main className="dataset-page">
      <header className="topbar">
        <Link href="/worker" className="back-link">
          ← Worker Dashboard
        </Link>
        <span className="badge">VOICE DATASET</span>
      </header>

      <section className="hero">
        <div className="hero-icon">🎙️</div>
        <p className="eyebrow">MAIN NAIJA PIDGIN</p>
        <h1>Join Nigerian Voice Dataset</h1>
        <p>
          Help preserve Nigerian languages, accents and everyday
          conversations through your voice.
        </p>
      </section>

      <section className="panel">
        <h2>1. Your Recording Details</h2>

        <label>Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={recording || submitting}
        >
          {LANGUAGES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <label>City or Region</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          disabled={recording || submitting}
        >
          {REGIONS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </section>

      <section className="panel">
        <h2>2. Choose Recording Type</h2>

        <div className="mode-buttons">
          <button
            type="button"
            className={recordingType === "read" ? "selected" : ""}
            onClick={() => {
              setRecordingType("read");
              clearPreview();
            }}
            disabled={recording || submitting}
          >
            📖 Read Text
          </button>

          <button
            type="button"
            className={recordingType === "natural" ? "selected" : ""}
            onClick={() => {
              setRecordingType("natural");
              clearPreview();
            }}
            disabled={recording || submitting}
          >
            💬 Free Talk
          </button>
        </div>

        {recordingType === "read" ? (
          <>
            <label>Sentence to read</label>
            <select
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={recording || submitting}
            >
              {PROMPTS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <div className="prompt-box">{prompt}</div>
          </>
        ) : (
          <div className="prompt-box">
            Speak naturally in your selected language. Talk about
            your day, your community or everyday Nigerian life.
          </div>
        )}

        <label>What did you say? (Transcript)</label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Type the words you spoke in your recording..."
          disabled={recording || submitting}
        />

        <div className="record-box">
          <div className="timer">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:
            {String(seconds % 60).padStart(2, "0")}
          </div>

          {!recording ? (
            <button
              type="button"
              className="record-button"
              onClick={startRecording}
              disabled={submitting}
            >
              🔴 START RECORDING
            </button>
          ) : (
            <button
              type="button"
              className="stop-button"
              onClick={stopRecording}
            >
              ⏹ STOP RECORDING
            </button>
          )}

          <p>Maximum recording time: 60 seconds</p>
        </div>

        {audioUrl && (
          <div className="preview">
            <h3>Listen to Your Recording</h3>
            <audio controls src={audioUrl} />
            <button
              type="button"
              className="secondary-button"
              onClick={clearPreview}
              disabled={submitting}
            >
              Record Again
            </button>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>3. Recording Consent</h2>

        <label className="consent-row">
          <input
            type="checkbox"
            checked={consentAI}
            onChange={(e) => setConsentAI(e.target.checked)}
            disabled={submitting}
          />
          <span>
            I agree that my recording can be used for AI training
            and Nigerian language research. (Required)
          </span>
        </label>

        <label className="consent-row">
          <input
            type="checkbox"
            checked={consentSynthetic}
            onChange={(e) => setConsentSynthetic(e.target.checked)}
            disabled={submitting}
          />
          <span>
            I separately agree to the use of my voice for synthetic
            voice development.
          </span>
        </label>

        <label className="consent-row">
          <input
            type="checkbox"
            checked={consentCommercial}
            onChange={(e) => setConsentCommercial(e.target.checked)}
            disabled={submitting}
          />
          <span>
            I separately agree to commercial use of my contributed
            recording.
          </span>
        </label>

        <p className="privacy-note">
          Your recording will be stored privately and submitted for
          review. Optional permissions are separate from the required
          AI training permission.
        </p>
      </section>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <button
        type="button"
        className="submit-button"
        onClick={submitRecording}
        disabled={submitting || recording || !audioBlob}
      >
        {submitting ? "SUBMITTING..." : "SUBMIT VOICE RECORDING"}
      </button>

      <section className="panel history">
        <h2>4. My Dataset Submissions</h2>

        {history.length === 0 ? (
          <p className="empty">You have not submitted any recordings yet.</p>
        ) : (
          history.map((item) => (
            <div className="history-item" key={item.id}>
              <div>
                <strong>{item.language}</strong>
                <p>
                  {item.region} ·{" "}
                  {item.recording_type === "read" ? "Read Text" : "Free Talk"}
                </p>
                <small>{formatDate(item.created_at)}</small>
              </div>

              <span
                className={`status ${item.status.toLowerCase()}`}
              >
                {item.status}
              </span>
            </div>
          ))
        )}
      </section>

      <footer>
        MAIN NAIJA PIDGIN · NIGERIAN VOICE DATASET
      </footer>

      <DatasetStyles />
    </main>
  );
}

function DatasetStyles() {
  return (
    <style jsx global>{`
      .dataset-page {
        min-height: 100vh;
        background: #07110d;
        color: #f4fff7;
        padding: 18px;
        max-width: 850px;
        margin: auto;
        font-family: Arial, sans-serif;
      }

      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 25px;
      }

      .back-link {
        color: #a5e6b7;
        text-decoration: none;
        font-size: 14px;
      }

      .badge {
        color: #07110d;
        background: #a5e6b7;
        padding: 7px 11px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: bold;
      }

      .hero {
        text-align: center;
        padding: 30px 12px;
      }

      .hero-icon {
        font-size: 45px;
      }

      .eyebrow {
        color: #9de4b1;
        font-size: 12px;
        letter-spacing: 2px;
        font-weight: bold;
      }

      .hero h1 {
        font-size: clamp(25px, 6vw, 38px);
        margin: 10px 0;
      }

      .hero p {
        color: #b5c9bd;
        line-height: 1.6;
      }

      .panel,
      .login-card {
        background: #101f17;
        border: 1px solid #244b34;
        border-radius: 17px;
        padding: 20px;
        margin-bottom: 18px;
      }

      .panel h2 {
        font-size: 18px;
        margin: 0 0 18px;
        color: #a5e6b7;
      }

      .dataset-page label {
        display: block;
        font-size: 13px;
        margin: 15px 0 8px;
        color: #d8e8dc;
      }

      .dataset-page select,
      .dataset-page textarea {
        display: block;
        width: 100%;
        box-sizing: border-box;
        background: #07110d;
        border: 1px solid #365b43;
        color: white;
        border-radius: 10px;
        padding: 13px;
        font-size: 15px;
        margin-bottom: 12px;
      }

      .dataset-page textarea {
        min-height: 90px;
        resize: vertical;
      }

      .mode-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .mode-buttons button,
      .secondary-button {
        background: #172b20;
        border: 1px solid #3d694b;
        color: white;
        padding: 13px 8px;
        border-radius: 10px;
        font-weight: bold;
      }

      .mode-buttons button.selected {
        background: #a5e6b7;
        color: #07110d;
        border-color: #a5e6b7;
      }

      .prompt-box {
        background: #172b20;
        border-left: 4px solid #a5e6b7;
        padding: 15px;
        border-radius: 8px;
        line-height: 1.6;
        margin: 12px 0;
      }

      .record-box {
        text-align: center;
        padding: 22px 10px;
        background: #0a1710;
        border-radius: 12px;
      }

      .timer {
        font-size: 34px;
        font-weight: bold;
        margin-bottom: 15px;
      }

      .record-button,
      .stop-button,
      .submit-button,
      .primary-button {
        display: inline-block;
        border: 0;
        border-radius: 10px;
        padding: 15px 20px;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
        text-align: center;
        text-decoration: none;
      }

      .record-button,
      .submit-button,
      .primary-button {
        background: #a5e6b7;
        color: #07110d;
      }

      .stop-button {
        background: #d9534f;
        color: white;
      }

      .submit-button {
        width: 100%;
        margin: 5px 0 20px;
        min-height: 52px;
      }

      .record-box p,
      .privacy-note,
      .empty {
        color: #9db5a5;
        font-size: 12px;
        line-height: 1.6;
      }

      .preview {
        margin-top: 20px;
        padding: 15px;
        background: #0a1710;
        border-radius: 12px;
      }

      .preview audio {
        display: block;
        width: 100%;
        margin: 12px 0;
      }

      .consent-row {
        display: flex !important;
        align-items: flex-start;
        gap: 10px;
        line-height: 1.5;
      }

      .consent-row input {
        width: 19px;
        height: 19px;
        flex-shrink: 0;
        accent-color: #a5e6b7;
      }

      .alert {
        padding: 13px;
        border-radius: 10px;
        margin: 12px 0;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }

      .error {
        background: #451d20;
        color: #ffd7d7;
      }

      .success {
        background: #153b25;
        color: #b9ffca;
      }

      .history-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 14px 0;
        border-bottom: 1px solid #294333;
      }

      .history-item p,
      .history-item small {
        color: #9db5a5;
        font-size: 12px;
        margin: 5px 0;
      }

      .status {
        padding: 6px 9px;
        border-radius: 20px;
        font-size: 11px;
        background: #473a19;
        color: #ffe59a;
        text-transform: capitalize;
      }

      .status.approved {
        background: #16472a;
        color: #b9ffca;
      }

      .status.rejected {
        background: #4b2020;
        color: #ffc0c0;
      }

      footer {
        text-align: center;
        color: #718b79;
        font-size: 10px;
        padding: 20px 0;
      }

      .login-card {
        max-width: 420px;
        margin: 15vh auto;
        text-align: center;
      }

      .login-card p {
        color: #b5c9bd;
        line-height: 1.6;
      }

      .login-card .primary-button {
        display: block;
        margin: 20px 0;
      }

      .loading {
        text-align: center;
        padding: 50px 10px;
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @media (max-width: 420px) {
        .dataset-page {
          padding: 12px;
        }

        .panel {
          padding: 15px;
        }

        .history-item {
          align-items: flex-start;
        }
      }
    `}</style>
  );
}