"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type RecordingStatus =
  | "idle"
  | "recording"
  | "ready"
  | "uploading"
  | "submitted"
  | "error";

type AssignedAudio = {
  id: number;
  text: string;
  src: string;
};

const assignedAudios: AssignedAudio[] = [
  {
    id: 1,
    text: "How you dey?",
    src: "/audio1.mp3",
  },
  {
    id: 2,
    text: "I dey come now now",
    src: "/audio2.mp3",
  },
  {
    id: 3,
    text: "Wetin dey sup?",
    src: "/audio3.mp3",
  },
  {
    id: 4,
    text: "Abeg shift small",
    src: "/audio4.mp3",
  },
];

export default function WorkerPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("idle");

  const [recordedUrl, setRecordedUrl] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const startingRef = useRef(false);

  const selectedAudio =
    assignedAudios.find((audio) => audio.id === selectedId) ?? null;

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!active) return;

        if (error || !data.session) {
          setSignedIn(false);
        } else {
          setSignedIn(true);
        }
      } catch {
        if (active) setSignedIn(false);
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setSignedIn(Boolean(session));
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      recorderRef.current?.stop();

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function clearCurrentRecording() {
    stopTimer();

    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }

    setRecordedUrl("");
    blobRef.current = null;
    chunksRef.current = [];
    setElapsed(0);
    elapsedRef.current = 0;
    setSubmissionStatus("");
  }

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  function releaseMicrophone() {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;
  }

  function startTimer() {
    stopTimer();

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);

      // Prevent recordings from exceeding one minute.
      if (elapsedRef.current >= 60) {
        stopRecording();
      }
    }, 1000);
  }

  async function startRecording(audio: AssignedAudio) {
    if (startingRef.current) return;

    startingRef.current = true;

    try {
      setErrorMessage("");
      setMessage("");
      setSubmissionStatus("");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Your browser cannot access the microphone. Open the website in a supported browser over HTTPS."
        );
      }

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setSignedIn(false);
        throw new Error("Please log in before recording.");
      }

      clearCurrentRecording();

      setSelectedId(audio.id);
      setRecordingStatus("idle");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg",
        "audio/mp4",
      ];

      const mimeType = supportedTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stopTimer();
        releaseMicrophone();
        setRecordingStatus("error");
        setErrorMessage(
          "Recording failed. Please try recording again."
        );
      };

      recorder.onstop = () => {
        stopTimer();
        releaseMicrophone();

        const actualType =
          recorder.mimeType || "audio/webm";

        const blob = new Blob(chunksRef.current, {
          type: actualType,
        });

        chunksRef.current = [];

        if (blob.size === 0) {
          setRecordingStatus("error");
          setErrorMessage(
            "No audio was captured. Please try again."
          );
          return;
        }

        blobRef.current = blob;

        setRecordedUrl(URL.createObjectURL(blob));
        setRecordingStatus("ready");
        setMessage(
          "Recording complete. Listen to it before submitting."
        );
      };

      recorder.start(250);

      setRecordingStatus("recording");
      setMessage("Recording your voice. Speak clearly.");
      startTimer();
    } catch (error) {
      releaseMicrophone();
      setRecordingStatus("error");

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not start recording."
      );
    } finally {
      startingRef.current = false;
    }
  }

  function stopRecording() {
    stopTimer();

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      releaseMicrophone();
    }
  }

  async function submitRecording() {
    if (!selectedAudio || !blobRef.current) {
      setErrorMessage(
        "Record your voice before submitting."
      );
      return;
    }

    if (recordingStatus === "recording") {
      setErrorMessage("Stop recording before submitting.");
      return;
    }

    if (recordingStatus === "uploading") return;

    setErrorMessage("");
    setMessage("");
    setRecordingStatus("uploading");

    try {
      // Obtain the current authenticated worker session.
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      const session = sessionData.session;

      if (sessionError || !session) {
        setSignedIn(false);
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const audioBlob = blobRef.current;

      const extension = audioBlob.type.includes("ogg")
        ? "ogg"
        : audioBlob.type.includes("mp4")
          ? "m4a"
          : "webm";

      const audioFile = new File(
        [audioBlob],
        `worker-recording-${selectedAudio.id}-${Date.now()}.${extension}`,
        {
          type: audioBlob.type,
        }
      );

      const formData = new FormData();

      formData.append("audio", audioFile);
      formData.append("text", selectedAudio.text);
      formData.append("language", "pidgin");
      formData.append("isFreeTalk", "false");

      const response = await fetch(
        "/api/worker-recordings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
          cache: "no-store",
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error ||
            `Submission failed with status ${response.status}.`
        );
      }

      setRecordingStatus("submitted");
      setSubmissionStatus("Pending Chairman Review");
      setMessage(
        result?.message ||
          "Your recording was submitted successfully."
      );
    } catch (error) {
      setRecordingStatus("ready");

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Submission failed. Please try again."
      );
    }
  }

  function recordAnother() {
    clearCurrentRecording();
    setRecordingStatus("idle");
    setMessage("");
    setErrorMessage("");
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 border-b border-yellow-600/60 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-yellow-400">
                Main Naija Pidgin
              </p>

              <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
                Worker Panel
              </h1>

              <p className="mt-2 text-gray-400">
                Listen. Record. Review. Submit.
              </p>
            </div>

            <span className="rounded-full border border-green-700 bg-green-950 px-3 py-2 text-xs font-semibold text-green-300">
              🎙️ Recording Workspace
            </span>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-green-800 bg-gradient-to-br from-green-950 to-gray-950 p-5 sm:p-7">
          <h2 className="text-xl font-bold text-yellow-300">
            Welcome, Worker!
          </h2>

          <p className="mt-3 leading-7 text-gray-300">
            Select an assigned sentence, listen to the reference
            audio, record your own voice, and listen to your
            recording before submitting it to the Chairman.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg border border-gray-600 px-4 py-3 font-semibold hover:bg-gray-800"
            >
              ← Home
            </Link>

            <Link
              href="/login"
              className="rounded-lg bg-green-700 px-5 py-3 font-bold hover:bg-green-600"
            >
              {signedIn ? "Login / Account" : "Go to Login"}
            </Link>

            <Link
              href="/pricing"
              className="rounded-lg border border-yellow-700 px-4 py-3 font-semibold text-yellow-300 hover:bg-yellow-950"
            >
              View Pricing
            </Link>
          </div>
        </section>

        {!checkingSession && !signedIn && (
          <section className="mb-8 rounded-xl border border-red-800 bg-red-950/40 p-5">
            <h2 className="font-bold text-red-300">
              Login required
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-300">
              You can view the assigned sentences, but you must
              log in with your worker account before recording
              and submitting audio.
            </p>

            <Link
              href="/login"
              className="mt-4 inline-block rounded-lg bg-red-700 px-5 py-3 font-bold hover:bg-red-600"
            >
              Log in to Record
            </Link>
          </section>
        )}

        <section className="rounded-2xl border border-gray-800 bg-gray-950 p-4 sm:p-6">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-green-400">
              Your assigned tasks
            </p>

            <h2 className="mt-2 text-2xl font-bold text-yellow-300">
              Assigned Audios
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Each recording has a maximum length of 60 seconds.
              Your submission goes to the Chairman for review.
            </p>
          </div>

          <div className="space-y-5">
            {assignedAudios.map((audio) => {
              const isSelected = selectedId === audio.id;

              return (
                <article
                  key={audio.id}
                  className={`rounded-xl border p-4 sm:p-5 ${
                    isSelected
                      ? "border-yellow-500 bg-yellow-950/20"
                      : "border-gray-800 bg-gray-900"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-950 font-bold text-yellow-300">
                      {audio.id}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold">
                        {audio.text}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Reference audio
                      </p>
                    </div>
                  </div>

                  <audio
                    controls
                    preload="none"
                    className="mt-4 w-full"
                  >
                    <source src={audio.src} />
                    Your browser does not support audio playback.
                  </audio>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={
                        !signedIn ||
                        checkingSession ||
                        recordingStatus === "recording" ||
                        recordingStatus === "uploading"
                      }
                      onClick={() => void startRecording(audio)}
                      className="rounded-lg bg-yellow-600 px-4 py-3 font-bold text-black hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSelected &&
                      recordingStatus === "recording"
                        ? "Recording..."
                        : "🎙️ Record My Version"}
                    </button>

                    {isSelected &&
                      recordingStatus === "recording" && (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="rounded-lg bg-red-700 px-4 py-3 font-bold hover:bg-red-600"
                        >
                          ⏹ Stop Recording
                        </button>
                      )}

                    {isSelected &&
                      recordingStatus === "ready" && (
                        <button
                          type="button"
                          onClick={recordAnother}
                          className="rounded-lg border border-gray-600 px-4 py-3 font-semibold hover:bg-gray-800"
                        >
                          Record Again
                        </button>
                      )}
                  </div>

                  {isSelected &&
                    recordingStatus === "recording" && (
                      <div
                        className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-4"
                        aria-live="polite"
                      >
                        <p className="font-bold text-red-300">
                          🔴 Recording in progress
                        </p>

                        <p className="mt-1 text-2xl font-bold tabular-nums">
                          {formatTime(elapsed)}
                        </p>

                        <p className="mt-1 text-sm text-gray-400">
                          Speak clearly. Recording stops
                          automatically at 60 seconds.
                        </p>
                      </div>
                    )}

                  {isSelected &&
                    (recordingStatus === "ready" ||
                      recordingStatus === "uploading" ||
                      recordingStatus === "submitted") && (
                      <div className="mt-5 rounded-lg border border-green-800 bg-green-950/30 p-4">
                        <h4 className="font-bold text-green-300">
                          Your recording
                        </h4>

                        {recordedUrl && (
                          <audio
                            controls
                            src={recordedUrl}
                            className="mt-3 w-full"
                          >
                            Your browser does not support audio playback.
                          </audio>
                        )}

                        {recordingStatus !== "submitted" && (
                          <button
                            type="button"
                            disabled={
                              recordingStatus === "uploading"
                            }
                            onClick={() => void submitRecording()}
                            className="mt-4 w-full rounded-lg bg-green-700 px-5 py-3 font-bold hover:bg-green-600 disabled:cursor-wait disabled:opacity-50 sm:w-auto"
                          >
                            {recordingStatus === "uploading"
                              ? "Uploading..."
                              : "📤 Submit to Chairman"}
                          </button>
                        )}

                        {recordingStatus === "submitted" && (
                          <div
                            className="mt-4 rounded-lg border border-yellow-700 bg-yellow-950/40 p-4"
                            aria-live="polite"
                          >
                            <p className="font-bold text-yellow-300">
                              ✓ {submissionStatus}
                            </p>

                            <p className="mt-2 text-sm text-gray-300">
                              Your recording has been submitted.
                              It must be reviewed by the Chairman.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                  {isSelected && message && (
                    <p
                      className="mt-4 text-sm leading-6 text-green-300"
                      aria-live="polite"
                    >
                      {message}
                    </p>
                  )}

                  {isSelected && errorMessage && (
                    <p
                      className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm leading-6 text-red-300"
                      role="alert"
                    >
                      {errorMessage}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-yellow-800 bg-yellow-950/20 p-5">
          <h2 className="font-bold text-yellow-300">
            📋 Submission rules
          </h2>

          <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
            <li>• Listen to the reference sentence first.</li>
            <li>• Record your own voice and review it.</li>
            <li>• Submit only when you are satisfied.</li>
            <li>• New submissions are marked pending review.</li>
            <li>
              • The Chairman controls approval and API availability.
            </li>
          </ul>
        </section>

        <footer className="mt-8 border-t border-gray-800 py-5 text-center text-sm text-gray-500">
          Main Naija Pidgin · Worker Workspace
        </footer>
      </div>
    </main>
  );
}