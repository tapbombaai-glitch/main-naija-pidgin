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
const MIN_SECONDS = 30;
const CONSENT_VERSION = "2026-11-21-v2";

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

  const [recordingType, setRecordingType] =
    useState<"read" | "natural">("read");

  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [transcript, setTranscript] = useState(PROMPTS[0]);

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
  const startedAtRef = useRef<number>(0);

  // ----------------------------------
  // LOGIN AND HISTORY
  // ----------------------------------

  useEffect(() => {
    checkUser();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
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

  // ----------------------------------
  // TRANSCRIPT MANAGEMENT
  // ----------------------------------

  useEffect(() => {
    if (recordingType === "read") {
      setTranscript(prompt);
    } else {
      setTranscript("");
    }
  }, [recordingType, prompt]);

  // ----------------------------------
  // AUDIO PREVIEW
  // ----------------------------------

  function clearPreview() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl("");
    setAudioBlob(null);
    setSeconds(0);
  }

  // ----------------------------------
  // STOP RECORDING
  // ----------------------------------

  function stopRecording(automatic = false) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const elapsed = Math.floor(
      (Date.now() - startedAtRef.current) / 1000
    );

    const finalSeconds = automatic
      ? MAX_SECONDS
      : Math.min(MAX_SECONDS, Math.max(0, elapsed));

    setSeconds(finalSeconds);
    setRecording(false);

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  // ----------------------------------
  // START RECORDING
  // ----------------------------------

  async function startRecording() {
    setError("");
    setMessage("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support microphone recording.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("Your browser does not support audio recording.");
      return;
    }

    try {
      clearPreview();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      let mimeType = "";

      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

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

        stream.getTracks().forEach((track) => {
          track.stop();
        });

        streamRef.current = null;
      };

      recorder.onerror = () => {
        setError("Recording encountered an error. Please try again.");
        setRecording(false);

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();

      startedAtRef.current = Date.now();

      setRecording(true);
      setSeconds(0);

      // Update timer and progress every 200 milliseconds.
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - startedAtRef.current) / 1000
        );

        if (elapsed >= MAX_SECONDS) {
          stopRecording(true);
          return;
        }

        setSeconds(elapsed);
      }, 200);
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;

      setError(
        "Microphone access failed. Please allow microphone permission and try again."
      );
    }
  }

  // ----------------------------------
  // FORMAT TIMER
  // ----------------------------------

  function formatTime(value: number) {
    const minutes = Math.floor(value / 60);
    const remainingSeconds = value % 60;

    return (
      String(minutes).padStart(2, "0") +
      ":" +
      String(remainingSeconds).padStart(2, "0")
    );
  }

  const progress = Math.min(
    100,
    (seconds / MAX_SECONDS) * 100
  );

  // ----------------------------------
  // SUBMIT RECORDING
  // ----------------------------------

  async function submitRecording() {
    setError("");
    setMessage("");

    if (!userId) {
      setError("Please log in to your Worker account first.");
      return;
    }

    if (recording) {
      setError("Please stop your recording before submitting.");
      return;
    }

    if (!audioBlob) {
      setError("Please record your voice and listen to the preview first.");
      return;
    }

    if (seconds < MIN_SECONDS) {
      setError(
        `You recorded ${seconds} seconds. You need at least ${MIN_SECONDS} seconds before submitting.`
      );
      return;
    }

    if (!consentAI) {
      setError("Please tick the required AI training consent before submitting.");
      return;
    }

    if (!transcript.trim()) {
      setError("Please provide the transcript of your recording.");
      return;
    }

    if (audioBlob.size === 0) {
      setError("Your recording is empty. Please record again.");
      return;
    }

    setSubmitting(true);

    let uploadedPath = "";

    try {
      const extension = audioBlob.type.includes("mp4")
        ? "m4a"
        : "webm";

      uploadedPath = `${userId}/${Date.now()}.${extension}`;

      // Upload to existing private storage bucket.
      const { error: uploadError } = await supabase.storage
        .from("naija-voice-dataset")
        .upload(uploadedPath, audioBlob, {
          contentType: audioBlob.type || "audio/webm",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Keep existing database structure.
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
        // Remove only this new upload if its database row failed.
        await supabase.storage
          .from("naija-voice-dataset")
          .remove([uploadedPath]);

        uploadedPath = "";

        throw new Error(insertError.message);
      }

      setMessage(
        "Success! Your voice recording has been submitted for Chairman Review."
      );

      clearPreview();

      if (recordingType === "read") {
        setTranscript(prompt);
      } else {
        setTranscript("");
      }

      setConsentAI(false);
      setConsentSynthetic(false);
      setConsentCommercial(false);

      await loadHistory(userId);
    } catch (err) {
      const errorText =
        err instanceof Error ? err.message : "Submission failed.";

      setError(errorText);
    } finally {
      setSubmitting(false);
    }
  }

  // ----------------------------------
  // DATE FORMAT
  // ----------------------------------

  function formatDate(value: string) {
    return new Date(value).toLocaleString();
  }

  // ----------------------------------
  // LOADING SCREEN
  // ----------------------------------

  if (loading) {
    return (
      <main className="dataset-page">
        <p className="loading">
          Loading Nigerian Voice Dataset...
        </p>
        <DatasetStyles />
      </main>
    );
  }

  // ----------------------------------
  // LOGIN SCREEN
  // ----------------------------------

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

  // ----------------------------------
  // MAIN DATASET PAGE
  // ----------------------------------

  return (
    <main className="dataset-page">

      <header className="topbar">
        <Link href="/worker" className="back-link">
          ← Worker Dashboard
        </Link>

        <span className="badge">
          VOICE DATASET
        </span>
      </header>

      <section className="hero">
        <div className="hero-icon">🎙️</div>

        <p className="eyebrow">
          MAIN NAIJA PIDGIN
        </p>

        <h1>
          Join Nigerian Voice Dataset
        </h1>

        <p>
          Help preserve Nigerian languages, accents and everyday
          conversations through your voice.
        </p>

        <div className="flow-label">
          ARRANGE TEST → RECORD → SUBMIT
        </div>
      </section>

      {/* STEP 1 */}

      <section className="panel">

        <div className="step-heading">
          <span className="step-number">1</span>

          <div>
            <h2>ARRANGE YOUR TEST</h2>
            <p>Choose your language, location and recording type.</p>
          </div>
        </div>

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

        <h3 className="subheading">
          Choose Recording Type
        </h3>

        <div className="mode-buttons">

          <button
            type="button"
            className={recordingType === "read" ? "selected" : ""}
            onClick={() => {
              setRecordingType("read");
              clearPreview();
              setError("");
            }}
            disabled={recording || submitting}
          >
            📖 READ TEXT
          </button>

          <button
            type="button"
            className={recordingType === "natural" ? "selected" : ""}
            onClick={() => {
              setRecordingType("natural");
              clearPreview();
              setError("");
            }}
            disabled={recording || submitting}
          >
            💬 FREE TALK
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

            <div className="prompt-box">
              <span className="prompt-label">
                READ THIS SENTENCE CLEARLY
              </span>

              <p>{prompt}</p>
            </div>

            <div className="tip">
              💡 Read the sentence naturally. You do not need to type
              it again.
            </div>
          </>
        ) : (
          <>
            <div className="prompt-box">
              <span className="prompt-label">
                YOUR FREE TALK TOPIC
              </span>

              <p>
                Talk about your day, your community, your family,
                Nigerian culture or everyday life for up to 60 seconds.
              </p>
            </div>

            <div className="tip">
              💡 Speak naturally in your selected Nigerian language.
            </div>
          </>
        )}

      </section>

      {/* STEP 2 */}

      <section className="panel">

        <div className="step-heading">
          <span className="step-number">2</span>

          <div>
            <h2>RECORD YOUR VOICE</h2>
            <p>Record for up to 60 seconds.</p>
          </div>
        </div>

        <div className="record-box">

          <p className="timer-label">
            RECORDING TIMER
          </p>

          <div className="timer">
            {formatTime(seconds)}
            <span> / 01:00</span>
          </div>

          <div className="progress-background">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="progress-text">
            {recording
              ? `${seconds} seconds recorded...`
              : `${Math.round(progress)}% completed`}
          </p>

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
              onClick={() => stopRecording()}
            >
              ⏹ STOP RECORDING
            </button>
          )}

          {recording && (
            <p className="live-message">
              🔴 Recording in progress. Speak clearly.
            </p>
          )}

          <p className="minimum-note">
            Minimum: 30 seconds · Maximum: 60 seconds
          </p>

          <div className={`duration-status ${
            seconds >= MIN_SECONDS ? "duration-good" : ""
          }`}>
            {seconds >= MIN_SECONDS
              ? `✓ You have recorded ${seconds} seconds. You can submit after reviewing your recording.`
              : `You have recorded ${seconds} seconds. You need at least 30 seconds to submit.`}
          </div>

        </div>

        {audioUrl && (
          <div className="preview">

            <h3>▶️ Play My Recording</h3>

            <audio
              controls
              src={audioUrl}
              preload="metadata"
            />

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                clearPreview();
                setError("");
                setMessage("");
              }}
              disabled={submitting}
            >
              🔁 RE-RECORD
            </button>

          </div>
        )}

        {!audioBlob && !recording && (
          <p className="empty-recording">
            Your recording preview will appear here after you stop recording.
          </p>
        )}

      </section>

      {/* STEP 3 */}

      <section className="panel">

        <div className="step-heading">
          <span className="step-number">3</span>

          <div>
            <h2>COMPLETE YOUR TEST</h2>
            <p>Check your transcript and recording permissions.</p>
          </div>
        </div>

        <label>
          {recordingType === "read"
            ? "Transcript (automatically filled)"
            : "What did you say? (Transcript)"}
        </label>

        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder={
            recordingType === "read"
              ? "Your selected sentence will appear here."
              : "Type the words you spoke in your recording..."
          }
          disabled={recording || submitting}
          readOnly={recordingType === "read"}
        />

        {recordingType === "read" && (
          <p className="tip">
            ✓ Your selected reading sentence is automatically added.
          </p>
        )}

        {/* CONSENT */}

        <div className="consent-heading">
          <h3>Recording Consent</h3>
          <p>
            Please read these permissions carefully before submitting.
          </p>
        </div>

        <label className="consent-row">
          <input
            type="checkbox"
            checked={consentAI}
            onChange={(e) => setConsentAI(e.target.checked)}
            disabled={submitting}
          />

          <span>
            <strong>Required:</strong> I agree that my recording can
            be used for AI training and Nigerian language research.
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
            <strong>Optional:</strong> I separately agree to the use
            of my voice for synthetic voice development.
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
            <strong>Optional:</strong> I separately agree to commercial
            use of my contributed recording.
          </span>
        </label>

        <p className="privacy-note">
          Your recording will be stored privately and submitted for
          Chairman review. Optional permissions are separate from
          the required AI training permission.
        </p>

      </section>

      {/* ERROR AND SUCCESS */}

      {error && (
        <div className="alert error">
          ❌ {error}
        </div>
      )}

      {message && (
        <div className="alert success">
          ✓ {message}
        </div>
      )}

      {/* SUBMIT */}

      <button
        type="button"
        className="submit-button"
        onClick={submitRecording}
        disabled={
          submitting ||
          recording ||
          !audioBlob ||
          seconds < MIN_SECONDS
        }
      >
        {submitting
          ? "SUBMITTING YOUR RECORDING..."
          : "SUBMIT — VOICE TEST COMPLETE"}
      </button>

      <p className="submit-hint">
        Make sure your recording is at least 30 seconds and you have
        accepted the required consent.
      </p>

      {/* HISTORY */}

      <section className="panel history">

        <h2>My Dataset Submissions</h2>

        <p className="history-description">
          Check the review status of your previous recordings.
        </p>

        {history.length === 0 ? (
          <p className="empty">
            You have not submitted any recordings yet.
          </p>
        ) : (
          history.map((item) => (
            <div className="history-item" key={item.id}>

              <div>
                <strong>{item.language}</strong>

                <p>
                  {item.region} ·{" "}
                  {item.recording_type === "read"
                    ? "Read Text"
                    : "Free Talk"}
                </p>

                <small>
                  {item.duration_seconds ?? 0} seconds ·{" "}
                  {formatDate(item.created_at)}
                </small>
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

// ==================================
// STYLES
// ==================================

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

      .flow-label {
        display: inline-block;
        margin-top: 12px;
        padding: 10px 15px;
        border-radius: 25px;
        background: #173b25;
        color: #a5e6b7;
        font-size: 11px;
        font-weight: bold;
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
        margin: 0;
        color: #a5e6b7;
      }

      .step-heading {
        display: flex;
        align-items: center;
        gap: 13px;
        margin-bottom: 22px;
      }

      .step-number {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 38px;
        height: 38px;
        background: #a5e6b7;
        color: #07110d;
        border-radius: 50%;
        font-size: 18px;
        font-weight: bold;
      }

      .step-heading p {
        color: #9db5a5;
        font-size: 12px;
        margin: 5px 0 0;
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
        min-height: 100px;
        resize: vertical;
        line-height: 1.6;
      }

      .subheading {
        color: #d8e8dc;
        font-size: 14px;
        margin-top: 22px;
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
        padding: 17px;
        border-radius: 8px;
        line-height: 1.7;
        margin: 12px 0;
      }

      .prompt-box p {
        font-size: 18px;
        font-weight: bold;
        margin: 8px 0 0;
        color: #ffffff;
      }

      .prompt-label {
        color: #a5e6b7;
        font-size: 10px;
        font-weight: bold;
        letter-spacing: 1px;
      }

      .tip {
        color: #a5e6b7;
        background: #10291a;
        padding: 11px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.6;
        margin: 10px 0;
      }

      .record-box {
        text-align: center;
        padding: 25px 14px;
        background: #0a1710;
        border: 1px solid #244b34;
        border-radius: 14px;
      }

      .timer-label {
        color: #9db5a5;
        font-size: 11px;
        letter-spacing: 2px;
        font-weight: bold;
      }

      .timer {
        font-size: clamp(38px, 10vw, 55px);
        font-weight: bold;
        margin: 15px 0;
        color: #a5e6b7;
        font-variant-numeric: tabular-nums;
      }

      .timer span {
        color: #718b79;
        font-size: 20px;
      }

      .progress-background {
        width: 100%;
        height: 12px;
        background: #24372a;
        border-radius: 20px;
        overflow: hidden;
        margin: 18px 0 8px;
      }

      .progress-fill {
        height: 100%;
        background: #a5e6b7;
        border-radius: 20px;
        transition: width 0.2s linear;
      }

      .progress-text {
        color: #9db5a5;
        font-size: 12px;
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

      .record-button {
        background: #a5e6b7;
        color: #07110d;
        width: 100%;
        margin-top: 15px;
      }

      .stop-button {
        background: #d9534f;
        color: white;
        width: 100%;
        margin-top: 15px;
      }

      .submit-button,
      .primary-button {
        background: #a5e6b7;
        color: #07110d;
      }

      .submit-button {
        width: 100%;
        margin: 5px 0 8px;
        min-height: 55px;
      }

      .minimum-note {
        color: #9db5a5;
        font-size: 12px;
        margin-top: 18px;
      }

      .duration-status {
        background: #392d16;
        color: #ffe59a;
        padding: 12px;
        border-radius: 9px;
        font-size: 12px;
        line-height: 1.6;
        margin-top: 14px;
      }

      .duration-good {
        background: #153b25;
        color: #b9ffca;
      }

      .live-message {
        color: #ff9d9d;
        font-size: 12px;
        font-weight: bold;
        margin-top: 15px;
      }

      .preview {
        margin-top: 20px;
        padding: 15px;
        background: #0a1710;
        border-radius: 12px;
      }

      .preview h3 {
        color: #a5e6b7;
        font-size: 15px;
      }

      .preview audio {
        display: block;
        width: 100%;
        margin: 15px 0;
      }

      .secondary-button {
        width: 100%;
        cursor: pointer;
      }

      .empty-recording {
        color: #718b79;
        font-size: 12px;
        text-align: center;
        line-height: 1.6;
        margin-top: 18px;
      }

      .consent-heading {
        margin-top: 25px;
        border-top: 1px solid #294333;
        padding-top: 20px;
      }

      .consent-heading h3 {
        color: #a5e6b7;
        margin: 0 0 7px;
      }

      .consent-heading p {
        color: #9db5a5;
        font-size: 12px;
        line-height: 1.6;
      }

      .consent-row {
        display: flex !important;
        align-items: flex-start;
        gap: 10px;
        line-height: 1.6;
        padding: 10px 0;
      }

      .consent-row input {
        width: 19px;
        height: 19px;
        flex-shrink: 0;
        accent-color: #a5e6b7;
        margin-top: 2px;
      }

      .consent-row span {
        font-size: 13px;
      }

      .consent-row strong {
        color: #a5e6b7;
      }

      .privacy-note {
        color: #9db5a5;
        font-size: 12px;
        line-height: 1.7;
        margin-top: 15px;
      }

      .alert {
        padding: 14px;
        border-radius: 10px;
        margin: 12px 0;
        line-height: 1.6;
        overflow-wrap: anywhere;
        font-size: 13px;
      }

      .error {
        background: #451d20;
        color: #ffd7d7;
        border: 1px solid #8b3737;
      }

      .success {
        background: #153b25;
        color: #b9ffca;
        border: 1px solid #32734a;
      }

      .submit-hint {
        text-align: center;
        color: #9db5a5;
        font-size: 11px;
        line-height: 1.6;
        margin-bottom: 22px;
      }

      .history-description {
        color: #9db5a5;
        font-size: 12px;
        margin: 8px 0 18px;
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