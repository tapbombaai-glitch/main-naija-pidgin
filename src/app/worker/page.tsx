"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { PIDGIN_500 } from "../data/pidgin-500";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_RECORDING_SECONDS = 60;
const MAX_RECORDING_BYTES = 15 * 1024 * 1024;

export default function WorkerPage() {
  const router = useRouter();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [isWhatsAppGroup, setIsWhatsAppGroup] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRequestedRef = useRef(false);
  const mountedRef = useRef(false);

  const selectedText = PIDGIN_500[selectedIndex] ?? "";

  const releaseMicrophone = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;

    if (mountedRef.current) {
      setIsRecording(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;

    async function checkLogin() {
      try {
        const { data, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const session = data.session;

        if (!session) {
          router.replace("/login");
          return;
        }

        const email = session.user.email?.trim().toLowerCase();

        // Keep the Chairman out of the Worker Panel.
        if (email === CHAIRMAN_EMAIL) {
          router.replace("/admin/dashboard");
          return;
        }

        if (active) {
          setIsLoading(false);
        }
      } catch {
        if (active) {
          setError("We could not verify your login. Please sign in again.");
          setIsLoading(false);
        }
      }
    }

    void checkLogin();

    return () => {
      active = false;
      mountedRef.current = false;

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const recorder = recorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;

        try {
          recorder.stop();
        } catch {
          // The recorder may already have stopped.
        }
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [router]);

  async function submitRecording(blob: Blob, durationSeconds: number) {
    if (!blob.size) {
      setError("No audio was recorded. Please try again.");
      return;
    }

    if (blob.size > MAX_RECORDING_BYTES) {
      setError("This recording exceeds the 15 MB limit.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const session = data.session;

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      // Check again before submitting a worker recording.
      if (
        session.user.email?.trim().toLowerCase() === CHAIRMAN_EMAIL
      ) {
        router.replace("/admin/dashboard");
        return;
      }

      const formData = new FormData();

      const extension = blob.type.includes("mp4") ? "mp4" : "webm";

      formData.append(
        "audio",
        new File([blob], `worker-recording.${extension}`, {
          type: blob.type || "audio/webm",
        })
      );

      formData.append("text", selectedText.trim());
      formData.append("language", "pidgin");
      formData.append("is_free_talk", "false");
      formData.append("is_whatsapp_group", String(isWhatsAppGroup));
      formData.append("duration_seconds", String(durationSeconds));

      const response = await fetch("/api/worker-recordings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            `Recording submission failed (${response.status}).`
        );
      }

      setMessage(
        "Recording submitted successfully. It is awaiting Chairman review."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to submit the recording. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startRecording() {
    setError("");
    setMessage("");

    if (!selectedText.trim()) {
      setError("Please select a sentence first.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(
        "Recording is not supported by this browser. Try a modern browser over HTTPS."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // The component may have unmounted while permission was pending.
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunksRef.current = [];
      startedAtRef.current = Date.now();
      stopRequestedRef.current = false;
      setSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        if (mountedRef.current) {
          setError("A recording error occurred. Please try again.");
        }

        stopRequestedRef.current = true;
        releaseMicrophone();
      };

      recorder.onstop = () => {
        const elapsed = Math.round(
          (Date.now() - startedAtRef.current) / 1000
        );

        const duration = Math.min(
          MAX_RECORDING_SECONDS,
          Math.max(1, elapsed)
        );

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        chunksRef.current = [];
        releaseMicrophone();

        if (!stopRequestedRef.current && mountedRef.current) {
          void submitRecording(blob, duration);
        }
      };

      recorder.start(1000);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - startedAtRef.current) / 1000
        );

        setSeconds(Math.min(elapsed, MAX_RECORDING_SECONDS));

        if (
          elapsed >= MAX_RECORDING_SECONDS &&
          recorder.state !== "inactive"
        ) {
          recorder.stop();
        }
      }, 250);
    } catch {
      releaseMicrophone();

      if (mountedRef.current) {
        setError(
          "Microphone access failed. Allow microphone permission and try again."
        );
      }
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <p>Checking your account...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black p-4 text-white sm:p-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 border-b border-yellow-600 pb-5">
          <p className="text-sm font-semibold uppercase tracking-widest text-yellow-400">
            Main Naija Pidgin
          </p>

          <h1 className="mt-3 text-3xl font-bold">Worker Panel</h1>

          <p className="mt-2 text-gray-400">
            Select a sentence, record your version, and submit it for review.
          </p>
        </header>

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Recording Workspace</h2>

            <span className="rounded-full bg-green-950 px-3 py-1 text-sm text-green-300">
              Pidgin · {PIDGIN_500.length} sentences
            </span>
          </div>

          <label
            htmlFor="sentence"
            className="mt-6 block text-sm font-semibold text-gray-300"
          >
            Choose a sentence
          </label>

          <select
            id="sentence"
            value={selectedIndex}
            disabled={isRecording || isSubmitting}
            onChange={(event) => {
              setSelectedIndex(Number(event.target.value));
              setMessage("");
              setError("");
            }}
            className="mt-2 w-full rounded-lg border border-gray-700 bg-black p-3 text-white"
          >
            {PIDGIN_500.map((text, index) => (
              <option key={`${index}-${text}`} value={index}>
                {index + 1}. {text}
              </option>
            ))}
          </select>

          <div className="mt-4 rounded-lg border border-yellow-700 bg-yellow-950/30 p-4">
            <p className="text-sm font-semibold text-yellow-300">
              Sentence to record
            </p>

            <p className="mt-2 text-lg leading-8">{selectedText}</p>
          </div>

          <label className="mt-5 flex items-start gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={isWhatsAppGroup}
              disabled={isRecording || isSubmitting}
              onChange={(event) =>
                setIsWhatsAppGroup(event.target.checked)
              }
              className="mt-1 h-4 w-4 accent-yellow-500"
            />

            <span>This recording is intended for the WhatsApp group.</span>
          </label>

          <div className="mt-6 rounded-lg border border-gray-700 p-4">
            <p className="font-semibold">Your recording</p>

            <p className="mt-2 text-sm text-gray-400">
              Maximum duration: 60 seconds. Maximum file size: 15 MB.
            </p>

            {isRecording && (
              <p className="mt-4 text-lg font-bold text-red-400">
                Recording: {seconds}s / {MAX_RECORDING_SECONDS}s
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isSubmitting || !PIDGIN_500.length}
                  className="rounded-lg bg-yellow-600 px-5 py-3 font-semibold text-black hover:bg-yellow-500 disabled:opacity-50"
                >
                  Start Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="rounded-lg bg-red-700 px-5 py-3 font-semibold hover:bg-red-600"
                >
                  Stop and Submit
                </button>
              )}

              {isSubmitting && (
                <span className="self-center text-sm text-yellow-300">
                  Uploading recording...
                </span>
              )}
            </div>
          </div>

          {message && (
            <p
              role="status"
              className="mt-5 rounded-lg border border-green-700 bg-green-950/40 p-4 text-green-300"
            >
              {message}
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-red-700 bg-red-950/40 p-4 text-red-300"
            >
              {error}
            </p>
          )}

          <p className="mt-5 text-sm leading-6 text-gray-400">
            Submitted recordings remain pending until the Chairman reviews
            them. The server endpoint must independently verify account access
            and store recordings privately.
          </p>

          <nav className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg border border-gray-600 px-5 py-3 hover:bg-gray-800"
            >
              Home
            </Link>

            <Link
              href="/pricing"
              className="rounded-lg border border-gray-600 px-5 py-3 hover:bg-gray-800"
            >
              View Pricing
            </Link>
          </nav>
        </section>

        <footer className="mt-8 text-center text-sm text-gray-500">
          Main Naija Pidgin · Worker Workspace
        </footer>
      </div>
    </main>
  );
}