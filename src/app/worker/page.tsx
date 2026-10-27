"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { PIDGIN_500 } from "../data/pidgin-500";
import {
  CHAIRMAN_EMAIL,
  MAX_AUDIO_BYTES,
  MAX_RECORDING_SECONDS,
  SUPPORTED_LANGUAGES,
} from "../../lib/constants";

type Language = (typeof SUPPORTED_LANGUAGES)[number];
type RecordingMode = "read" | "free-talk";

type Submission = {
  id: string;
  status: string;
  language: string;
  is_free_talk: boolean;
  duration_seconds: number;
  created_at: string;
};

const LANGUAGE_NAMES: Record<Language, string> = {
  pidgin: "Naija Pidgin",
  hausa: "Hausa",
  igbo: "Igbo",
  yoruba: "Yoruba",
};

function chooseMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const choices = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];

  return choices.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default function WorkerPage() {
  const router = useRouter();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const stoppedByLimitRef = useRef(false);
  const audioUrlRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [workerEmail, setWorkerEmail] = useState("");
  const [language, setLanguage] = useState<Language>("pidgin");
  const [mode, setMode] = useState<RecordingMode>("read");
  const [currentText, setCurrentText] = useState("");
  const [freeTalkText, setFreeTalkText] = useState("");
  const [isWhatsAppGroup, setIsWhatsAppGroup] = useState(false);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const readTexts: string[] =
    Array.isArray(PIDGIN_500) && PIDGIN_500.length > 0
      ? PIDGIN_500
      : ["Abeg, make we start today."];

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearPreview = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setAudioUrl("");
    setAudioBlob(null);
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) return;

      const { data, error: historyError } = await supabase
        .from("worker_recordings")
        .select(
          "id,status,language,is_free_talk,duration_seconds,created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (historyError) {
        console.error("Could not load recording history:", historyError.message);
        return;
      }

      setSubmissions((data ?? []) as Submission[]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initialise() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        router.replace("/login");
        return;
      }

      const email = session.user.email?.trim().toLowerCase() ?? "";

      if (email === CHAIRMAN_EMAIL.trim().toLowerCase()) {
        router.replace("/admin/dashboard");
        return;
      }

      setWorkerEmail(session.user.email ?? "");
      setLoading(false);
    }

    void initialise();

    return () => {
      active = false;
      stopTimer();

      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }

      stopTracks();

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [router, stopTimer, stopTracks]);

  useEffect(() => {
    if (!loading) void loadHistory();
  }, [loading, loadHistory]);

  useEffect(() => {
    if (language !== "pidgin") {
      setCurrentText("");
    } else if (readTexts.length > 0) {
      setCurrentText(readTexts[0]);
    }
  }, [language]); // Language change selects a fresh text below.

  function chooseNextText() {
    if (language !== "pidgin") {
      setError(
        `The reading-text list for ${LANGUAGE_NAMES[language]} must be added before Read mode can be used for that language.`
      );
      return;
    }

    if (readTexts.length === 0) {
      setError("No reading texts are available.");
      return;
    }

    const next =
      readTexts[Math.floor(Math.random() * readTexts.length)];

    setCurrentText(next);
    setError("");
    setMessage("");
    clearPreview();
  }

  async function startRecording() {
    setError("");
    setMessage("");

    if (recording || uploading) return;

    if (mode === "read" && !currentText.trim()) {
      setError("Choose a reading text before recording.");
      return;
    }

    if (mode === "free-talk" && !freeTalkText.trim()) {
      setError("Enter a short description or topic for your Free Talk recording.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Your browser does not support microphone recording.");
      return;
    }

    try {
      clearPreview();
      setSeconds(0);
      stoppedByLimitRef.current = false;
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const mimeType = chooseMimeType();

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("A recording error occurred. Please try again.");
        stopTimer();
        stopTracks();
        setRecording(false);
      };

      recorder.onstop = () => {
        stopTimer();
        stopTracks();
        setRecording(false);

        const actualDuration = Math.min(
          MAX_RECORDING_SECONDS,
          Math.max(
            0,
            Math.round((Date.now() - startTimeRef.current) / 1000)
          )
        );

        setSeconds(actualDuration);

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size === 0) {
          setError("No audio was captured. Please record again.");
          return;
        }

        if (blob.size > MAX_AUDIO_BYTES) {
          setError("This recording exceeds the 15 MB limit. Please record again.");
          return;
        }

        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);

        setMessage(
          stoppedByLimitRef.current
            ? "The 60-second recording limit was reached. Review your audio before submitting."
            : "Recording complete. Review your audio before submitting."
        );
      };

      startTimeRef.current = Date.now();
      recorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        );

        setSeconds(Math.min(elapsed, MAX_RECORDING_SECONDS));

        if (
          elapsed >= MAX_RECORDING_SECONDS &&
          recorder.state === "recording"
        ) {
          stoppedByLimitRef.current = true;
          recorder.stop();
        }
      }, 250);
    } catch (err) {
      console.error("Could not start recording:", err);
      stopTimer();
      stopTracks();
      setRecording(false);
      setError(
        "Could not access your microphone. Allow microphone permission and try again."
      );
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;

    if (recorder?.state === "recording") {
      recorder.stop();
    }
  }

  function discardRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }

    stopTimer();
    stopTracks();
    clearPreview();
    setSeconds(0);
    setMessage("Recording discarded.");
    setError("");
  }

  async function submitRecording() {
    if (!audioBlob) {
      setError("Record and review your audio before submitting.");
      return;
    }

    if (uploading || recording) return;

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError("Your session has expired. Please log in again.");
        router.replace("/login");
        return;
      }

      const extension = audioBlob.type.includes("ogg")
        ? "ogg"
        : audioBlob.type.includes("mp4")
          ? "m4a"
          : audioBlob.type.includes("mpeg")
            ? "mp3"
            : audioBlob.type.includes("wav")
              ? "wav"
              : "webm";

      const formData = new FormData();

      formData.append(
        "audio",
        new File([audioBlob], `recording-${Date.now()}.${extension}`, {
          type: audioBlob.type || "audio/webm",
        })
      );

      formData.append(
        "text",
        mode === "read" ? currentText.trim() : freeTalkText.trim()
      );
      formData.append("language", language);
      formData.append("is_free_talk", String(mode === "free-talk"));
      formData.append("is_whatsapp_group", String(isWhatsAppGroup));
      formData.append("duration_seconds", String(seconds));

      const response = await fetch("/api/worker-recordings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error || "Could not submit the recording. Please try again."
        );
      }

      clearPreview();
      setSeconds(0);
      setFreeTalkText("");
      setIsWhatsAppGroup(false);
      setMessage("Recording submitted successfully for chairman review.");

      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while submitting."
      );
    } finally {
      setUploading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="worker-loading">
        <p>Loading Worker Panel...</p>
      </main>
    );
  }

  return (
    <main className="worker-page">
      <header className="worker-header">
        <div>
          <h1>Main Naija Pidgin</h1>
          <p>Worker Recording Panel</p>
          <small>{workerEmail}</small>
        </div>

        <button className="secondary-button" onClick={signOut}>
          Sign out
        </button>
      </header>

      <section className="worker-card">
        <h2>Recording setup</h2>

        <label htmlFor="language">Choose language</label>
        <select
          id="language"
          value={language}
          disabled={recording || uploading}
          onChange={(event) => {
            setLanguage(event.target.value as Language);
            setError("");
            setMessage("");
            clearPreview();
          }}
        >
          {SUPPORTED_LANGUAGES.map((item) => (
            <option key={item} value={item}>
              {LANGUAGE_NAMES[item]}
            </option>
          ))}
        </select>

        <label htmlFor="mode">Recording mode</label>
        <select
          id="mode"
          value={mode}
          disabled={recording || uploading}
          onChange={(event) => {
            setMode(event.target.value as RecordingMode);
            setError("");
            setMessage("");
            clearPreview();
          }}
        >
          <option value="read">Read text</option>
          <option value="free-talk">Free Talk</option>
        </select>

        {mode === "read" ? (
          <div className="reading-box">
            <h3>Text to read</h3>
            <p>{currentText || "No reading text selected."}</p>

            <button
              className="secondary-button"
              onClick={chooseNextText}
              disabled={recording || uploading || language !== "pidgin"}
            >
              Choose another text
            </button>

            {language !== "pidgin" && (
              <p className="help-text">
                Add the appropriate language text list before using Read mode
                in this language.
              </p>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="freeTalkText">Free Talk topic or description</label>
            <textarea
              id="freeTalkText"
              value={freeTalkText}
              disabled={recording || uploading}
              maxLength={5000}
              onChange={(event) => setFreeTalkText(event.target.value)}
              placeholder="Enter the topic for your recording..."
              rows={4}
            />
          </div>
        )}

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={isWhatsAppGroup}
            disabled={recording || uploading}
            onChange={(event) => setIsWhatsAppGroup(event.target.checked)}
          />
          This recording is for the WhatsApp group
        </label>
      </section>

      <section className="worker-card">
        <h2>Record your voice</h2>

        <div className="timer">{formatTime(seconds)}</div>
        <p className="help-text">
          Maximum duration: {formatTime(MAX_RECORDING_SECONDS)}. Maximum file
          size: 15 MB.
        </p>

        {!recording ? (
          <button
            className="primary-button"
            onClick={startRecording}
            disabled={uploading || Boolean(audioBlob)}
          >
            Start recording
          </button>
        ) : (
          <button className="stop-button" onClick={stopRecording}>
            Stop recording
          </button>
        )}

        {audioUrl && (
          <div className="preview-box">
            <h3>Preview recording</h3>
            <audio controls src={audioUrl} />

            <div className="button-row">
              <button
                className="secondary-button"
                onClick={discardRecording}
                disabled={uploading}
              >
                Discard
              </button>

              <button
                className="primary-button"
                onClick={submitRecording}
                disabled={uploading}
              >
                {uploading ? "Submitting..." : "Submit recording"}
              </button>
            </div>
          </div>
        )}

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </section>

      <section className="worker-card">
        <h2>Recent submissions</h2>

        {loadingHistory ? (
          <p>Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p>No submissions found yet.</p>
        ) : (
          <div className="history-list">
            {submissions.map((item) => (
              <article key={item.id} className="history-item">
                <div>
                  <strong>
                    {item.is_free_talk ? "Free Talk" : "Read recording"}
                  </strong>
                  <p>
                    {LANGUAGE_NAMES[item.language as Language] ??
                      item.language}
                    {" · "}
                    {formatTime(item.duration_seconds ?? 0)}
                  </p>
                  <small>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : ""}
                  </small>
                </div>

                <span
                  className={`status-badge ${item.status
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "")}`}
                >
                  {item.status}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .worker-page {
          min-height: 100vh;
          background: #0b0b0b;
          color: #f5f5f5;
          padding: 24px;
          font-family: Arial, sans-serif;
        }

        .worker-header {
          max-width: 850px;
          margin: 0 auto 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        h1 {
          color: #e7c35a;
          margin: 0 0 6px;
        }

        h2 {
          margin-top: 0;
          color: #e7c35a;
        }

        .worker-header p,
        .worker-header small {
          color: #bcbcbc;
        }

        .worker-card {
          max-width: 850px;
          margin: 0 auto 20px;
          padding: 22px;
          border: 1px solid #383838;
          border-radius: 14px;
          background: #171717;
        }

        label {
          display: block;
          margin: 16px 0 8px;
          font-weight: 600;
        }

        select,
        textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #555;
          border-radius: 8px;
          background: #101010;
          color: #fff;
          font: inherit;
        }

        textarea {
          resize: vertical;
        }

        .reading-box,
        .preview-box {
          margin-top: 20px;
          padding: 16px;
          border-radius: 10px;
          background: #222;
        }

        .reading-box p {
          white-space: pre-wrap;
          line-height: 1.6;
        }

        .timer {
          margin: 20px 0;
          font-size: 42px;
          font-weight: bold;
          text-align: center;
          color: #e7c35a;
        }

        .primary-button,
        .secondary-button,
        .stop-button {
          border: 0;
          border-radius: 8px;
          padding: 12px 16px;
          font-weight: bold;
          cursor: pointer;
        }

        .primary-button {
          background: #e7c35a;
          color: #171717;
        }

        .secondary-button {
          background: #363636;
          color: #fff;
        }

        .stop-button {
          background: #b83232;
          color: #fff;
        }

        button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .checkbox-row input {
          width: 18px;
          height: 18px;
        }

        audio {
          display: block;
          width: 100%;
          margin: 12px 0;
        }

        .button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
        }

        .success-message {
          color: #8be0a0;
          margin-top: 16px;
        }

        .error-message {
          color: #ff8d8d;
          margin-top: 16px;
        }

        .help-text {
          color: #aaa;
          font-size: 13px;
          line-height: 1.5;
        }

        .history-list {
          display: grid;
          gap: 12px;
        }

        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px;
          background: #222;
          border-radius: 8px;
        }

        .history-item p {
          margin: 6px 0;
          color: #ccc;
        }

        .history-item small {
          color: #aaa;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 9px;
          border-radius: 20px;
          background: #444;
          text-transform: capitalize;
          font-size: 12px;
        }

        .status-badge.pending {
          background: #6b531c;
          color: #ffe7a1;
        }

        .status-badge.approved {
          background: #194c2b;
          color: #a4f3b9;
        }

        .status-badge.rejected {
          background: #642626;
          color: #ffb5b5;
        }

        .worker-loading {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #0b0b0b;
          color: #e7c35a;
        }

        @media (max-width: 600px) {
          .worker-page {
            padding: 14px;
          }

          .worker-card {
            padding: 16px;
          }

          .worker-header {
            align-items: flex-start;
          }

          .history-item {
            align-items: flex-start;
          }
        }
      `}</style>
    </main>
  );
}