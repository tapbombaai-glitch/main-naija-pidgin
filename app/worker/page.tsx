"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../src/lib/supabase";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_RECORDING_SECONDS = 60;

type Language = "pidgin" | "hausa" | "igbo" | "yoruba";
type RecordingMode = "read" | "free";

type WorkerProfile = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  account_number?: string | null;
  status?: string | null;
  total_words?: number | null;
  recordings_count?: number | null;
  is_chairman?: boolean | null;
};

type WorkerRecording = {
  id: string;
  user_id?: string;
  file_name?: string | null;
  audio_path?: string | null;
  pidgin_text?: string | null;
  transcription?: string | null;
  language?: string | null;
  word_count?: number | null;
  recording_number?: string | null;
  is_free_talk?: boolean | null;
  is_whatsapp_group?: boolean | null;
  admin_status?: string | null;
  created_at?: string | null;
  duration_seconds?: number | null;
};

type Announcement = {
  id: string;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
};

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "pidgin", label: "Nigerian Pidgin" },
  { value: "hausa", label: "Hausa" },
  { value: "igbo", label: "Igbo" },
  { value: "yoruba", label: "Yoruba" },
];

const TEXTS_DATA: Record<Language, string[]> = {
  pidgin: [
    "Abeg make we start today. I wan make everything go well.",
    "Good morning. How body? I hope say everything dey fine.",
    "If you need help, abeg make you tell me.",
    "Make we work together so we fit achieve our goal.",
  ],
  hausa: [
    "Ina kwana? Ina fatan kana lafiya.",
    "Na gode da taimakon da ka ba ni.",
    "Yau rana ce mai kyau.",
    "Mu yi aiki tare domin mu cimma burinmu.",
  ],
  igbo: [
    "Ụtụtụ ọma. Kedu ka ị mere taa?",
    "Daalụ maka enyemaka gị.",
    "Ka anyị rụọ ọrụ ọnụ.",
    "Enwere m olileanya na ihe niile ga-adị mma.",
  ],
  yoruba: [
    "E kaaro. Bawo ni ara re?",
    "E se fun iranlowo re.",
    "Jẹ́ ká ṣiṣẹ́ pọ̀.",
    "Mo nireti pe ohun gbogbo yoo dara.",
  ],
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  submitted: "bg-blue-100 text-blue-800",
};

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function formatDate(value?: string | null): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString();
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainder
  ).padStart(2, "0")}`;
}

function statusLabel(status?: string | null): string {
  const value = (status || "pending").toLowerCase();

  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";

  return "Sent to Chairman";
}

export default function WorkerPage() {
  const router = useRouter();

  const activeRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startingRef = useRef(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [records, setRecords] = useState<WorkerRecording[]>([]);
  const [announcement, setAnnouncement] =
    useState<Announcement | null>(null);

  const [language, setLanguage] = useState<Language>("pidgin");
  const [mode, setMode] = useState<RecordingMode>("read");
  const [textIndex, setTextIndex] = useState(0);
  const [freeTalkText, setFreeTalkText] = useState("");
  const [isWhatsAppGroup, setIsWhatsAppGroup] = useState(false);

  const [recordingStatus, setRecordingStatus] = useState<
    "idle" | "recording" | "ready" | "uploading" | "submitted" | "error"
  >("idle");

  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isBusy =
    recordingStatus === "recording" ||
    recordingStatus === "uploading";

  const selectedText =
    mode === "read"
      ? TEXTS_DATA[language][
          textIndex % TEXTS_DATA[language].length
        ]
      : freeTalkText.trim();

  const loadWorkerData = useCallback(async () => {
    if (!activeRef.current) return;

    setLoadingData(true);
    setErrorMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      const session = sessionData.session;

      if (!session) {
        setSignedIn(false);
        setProfile(null);
        setRecords([]);
        setAnnouncement(null);

        router.replace("/worker-login");
        return;
      }

      const normalizedEmail = (session.user.email || "")
        .trim()
        .toLowerCase();

      // Only the allowlisted email belongs in the Chairman dashboard.
      if (normalizedEmail === CHAIRMAN_EMAIL) {
        setSignedIn(false);
        setProfile(null);
        router.replace("/admin/dashboard");
        return;
      }

      const profileResult = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileResult.error) {
        throw new Error(
          `Could not load your profile: ${profileResult.error.message}`
        );
      }

      const workerProfile =
        profileResult.data as WorkerProfile | null;

      // A non-Chairman account must have a worker profile.
      if (
        !workerProfile ||
        workerProfile.is_chairman === true
      ) {
        await supabase.auth.signOut();

        setSignedIn(false);
        setProfile(null);
        setRecords([]);
        setAnnouncement(null);

        router.replace("/worker-login");
        return;
      }

      const [recordingsResult, announcementResult] =
        await Promise.all([
          supabase
            .from("recordings")
            .select(
              "id,user_id,file_name,audio_path,pidgin_text,transcription,language,word_count,recording_number,is_free_talk,is_whatsapp_group,admin_status,created_at,duration_seconds"
            )
            .eq("user_id", session.user.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("announcements")
            .select("id,title,message,created_at")
            .eq("is_published", true)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

      if (recordingsResult.error) {
        throw new Error(
          `Could not load your recording history: ${recordingsResult.error.message}`
        );
      }

      if (!activeRef.current) return;

      setSignedIn(true);
      setProfile(workerProfile);

      setRecords(
        (recordingsResult.data || []) as WorkerRecording[]
      );

      setAnnouncement(
        announcementResult.error
          ? null
          : ((announcementResult.data?.[0] as
              | Announcement
              | undefined) || null)
      );

      const savedLanguage =
        typeof window !== "undefined"
          ? localStorage.getItem("selected_language")
          : null;

      if (
        savedLanguage &&
        LANGUAGES.some(
          (item) => item.value === savedLanguage
        )
      ) {
        setLanguage(savedLanguage as Language);
      }
    } catch (error) {
      if (activeRef.current) {
        setErrorMessage(errorText(error));
      }
    } finally {
      if (activeRef.current) {
        setLoadingData(false);
        setCheckingSession(false);
      }
    }
  }, [router]);

  useEffect(() => {
    activeRef.current = true;

    void loadWorkerData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Defer the next auth check until the callback has returned.
      setTimeout(() => {
        if (activeRef.current) {
          void loadWorkerData();
        }
      }, 0);
    });

    return () => {
      activeRef.current = false;
      subscription.unsubscribe();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [loadWorkerData]);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopMicrophone() {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;
  }

  function clearAudioPreview() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(null);
    setAudioBlob(null);
  }

  function resetRecording() {
    stopTimer();
    stopMicrophone();

    recorderRef.current = null;
    chunksRef.current = [];

    setRecordingSeconds(0);
    setRecordingStatus("idle");
    clearAudioPreview();
  }

  function startTimer() {
    stopTimer();

    timerRef.current = setInterval(() => {
      setRecordingSeconds((previous) => {
        const next = previous + 1;

        if (next >= MAX_RECORDING_SECONDS) {
          setTimeout(() => {
            if (
              recorderRef.current?.state === "recording"
            ) {
              recorderRef.current.stop();
            }
          }, 0);

          return MAX_RECORDING_SECONDS;
        }

        return next;
      });
    }, 1000);
  }

  async function startRecording() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!signedIn || !profile) {
      router.replace("/worker-login");
      return;
    }

    if (profile.status?.toLowerCase() === "suspended") {
      setErrorMessage(
        "Your account is suspended. Please contact the Chairman."
      );
      return;
    }

    if (startingRef.current || isBusy) return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setErrorMessage(
        "Your browser does not support microphone recording."
      );
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setErrorMessage(
        "Audio recording is not supported by this browser."
      );
      return;
    }

    if (mode === "free" && !freeTalkText.trim()) {
      setErrorMessage(
        "Please enter the text or a short description for your Free Talk recording."
      );
      return;
    }

    startingRef.current = true;

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/worker-login");
        return;
      }

      clearAudioPreview();

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      streamRef.current = stream;
      chunksRef.current = [];

      let recorder: MediaRecorder;

      try {
        recorder = new MediaRecorder(stream);
      } catch {
        stopMicrophone();

        throw new Error(
          "Your browser could not create an audio recorder."
        );
      }

      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        stopTimer();
        stopMicrophone();

        setRecordingStatus("error");
        setErrorMessage(
          "Recording failed. Please try again."
        );
      };

      recorder.onstop = () => {
        stopTimer();
        stopMicrophone();

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        chunksRef.current = [];

        if (blob.size === 0) {
          setRecordingStatus("error");
          setErrorMessage(
            "No audio was recorded. Please try again."
          );
          return;
        }

        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(url);
        setRecordingStatus("ready");
      };

      recorder.start(250);

      setRecordingSeconds(0);
      setRecordingStatus("recording");

      startTimer();
    } catch (error) {
      stopTimer();
      stopMicrophone();

      setRecordingStatus("error");
      setErrorMessage(errorText(error));
    } finally {
      startingRef.current = false;
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  async function submitRecording() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!audioBlob) {
      setErrorMessage(
        "Please record audio before submitting."
      );
      return;
    }

    if (!selectedText.trim()) {
      setErrorMessage(
        "Please provide the text for this recording."
      );
      return;
    }

    setRecordingStatus("uploading");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/worker-login");
        return;
      }

      const formData = new FormData();

      const extension =
        audioBlob.type.includes("mp4") ||
        audioBlob.type.includes("aac")
          ? "m4a"
          : "webm";

      formData.append(
        "audio",
        audioBlob,
        `recording-${Date.now()}.${extension}`
      );

      formData.append("text", selectedText.trim());
      formData.append("language", language);
      formData.append("isFreeTalk", String(mode === "free"));
      formData.append(
        "isWhatsAppGroup",
        String(isWhatsAppGroup)
      );
      formData.append(
        "durationSeconds",
        String(recordingSeconds)
      );

      const response = await fetch(
        "/api/worker-recordings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          "The recording API did not return JSON. Check that /api/worker-recordings is deployed correctly."
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Recording submission failed."
        );
      }

      setSuccessMessage(
        "Recording submitted successfully. Status: Sent to Chairman."
      );

      setRecordingStatus("submitted");

      stopTimer();
      stopMicrophone();

      clearAudioPreview();

      setFreeTalkText("");
      setIsWhatsAppGroup(false);
      setRecordingSeconds(0);

      await loadWorkerData();
    } catch (error) {
      setRecordingStatus("ready");
      setErrorMessage(errorText(error));
    }
  }

  async function signOut() {
    setErrorMessage("");
    await supabase.auth.signOut();

    setSignedIn(false);
    setProfile(null);
    setRecords([]);
    setAnnouncement(null);

    router.replace("/worker-login");
  }

  function changeLanguage(value: Language) {
    setLanguage(value);
    setTextIndex(0);

    if (typeof window !== "undefined") {
      localStorage.setItem("selected_language", value);
    }
  }

  const today = new Date().toDateString();

  const todayCount = records.filter((record) => {
    if (!record.created_at) return false;

    return (
      new Date(record.created_at).toDateString() === today
    );
  }).length;

  const approvedCount = records.filter(
    (record) =>
      record.admin_status?.toLowerCase() === "approved"
  ).length;

  const pendingCount = records.filter(
    (record) =>
      !record.admin_status ||
      record.admin_status.toLowerCase() === "pending"
  ).length;

  const rejectedCount = records.filter(
    (record) =>
      record.admin_status?.toLowerCase() === "rejected"
  ).length;

  const wordCount = records.reduce(
    (total, record) =>
      total + Number(record.word_count || 0),
    0
  );

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
        <p>Checking your worker account...</p>
      </main>
    );
  }

  if (!signedIn || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
        <section className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-8 text-center">
          <h1 className="text-2xl font-bold text-yellow-400">
            Main Naija Pidgin
          </h1>

          <p className="mt-3 text-gray-300">
            Please sign in with your worker account.
          </p>

          {errorMessage && (
            <p className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-200">
              {errorMessage}
            </p>
          )}

          <Link
            href="/worker-login"
            className="mt-6 inline-block rounded-lg bg-yellow-400 px-5 py-3 font-bold text-black"
          >
            Worker Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-green-400">
              Main Naija Pidgin
            </p>

            <h1 className="mt-1 text-2xl font-bold text-yellow-400">
              Worker Dashboard
            </h1>

            <p className="mt-1 text-sm text-gray-300">
              Welcome, {profile.display_name || "Worker"}.
            </p>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold hover:bg-gray-800"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-200"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="rounded-xl border border-green-800 bg-green-950 p-4 text-green-200"
          >
            {successMessage}
          </div>
        )}

        {announcement && (
          <section className="rounded-2xl border border-yellow-700 bg-yellow-950/40 p-5">
            <h2 className="text-lg font-bold text-yellow-300">
              {announcement.title || "Chairman Announcement"}
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-gray-200">
              {announcement.message}
            </p>

            <p className="mt-3 text-xs text-gray-400">
              {formatDate(announcement.created_at)}
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-xl font-bold">
            Your Statistics
          </h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {[
              ["Total Recordings", records.length],
              ["Today", todayCount],
              ["Approved", approvedCount],
              ["Pending", pendingCount],
              ["Rejected", rejectedCount],
              ["Words Recorded", wordCount],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-xl border border-gray-800 bg-gray-900 p-4"
              >
                <p className="text-xs text-gray-400">
                  {label}
                </p>

                <p className="mt-2 text-2xl font-bold text-yellow-400">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 md:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-yellow-400">
              Record Your Voice
            </h2>

            <p className="mt-2 text-sm text-gray-300">
              Record clearly and submit your audio for review.
              Maximum recording time is 60 seconds.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="language"
                className="mb-2 block text-sm font-semibold"
              >
                Recording Language
              </label>

              <select
                id="language"
                value={language}
                disabled={isBusy || recordingStatus === "ready"}
                onChange={(event) =>
                  changeLanguage(
                    event.target.value as Language
                  )
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3"
              >
                {LANGUAGES.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="recordingMode"
                className="mb-2 block text-sm font-semibold"
              >
                Recording Type
              </label>

              <select
                id="recordingMode"
                value={mode}
                disabled={isBusy || recordingStatus === "ready"}
                onChange={(event) => {
                  setMode(
                    event.target.value as RecordingMode
                  );
                  setErrorMessage("");
                }}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3"
              >
                <option value="read">Read Provided Text</option>
                <option value="free">Free Talk</option>
              </select>
            </div>
          </div>

          {mode === "read" ? (
            <div className="mt-5 rounded-xl border border-gray-700 bg-gray-950 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-green-400">
                Text to Read
              </p>

              <p className="mt-3 text-lg leading-8">
                {TEXTS_DATA[language][
                  textIndex % TEXTS_DATA[language].length
                ]}
              </p>

              <button
                type="button"
                disabled={isBusy || recordingStatus === "ready"}
                onClick={() =>
                  setTextIndex(
                    (previous) =>
                      (previous + 1) %
                      TEXTS_DATA[language].length
                  )
                }
                className="mt-4 rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                Next Text
              </button>
            </div>
          ) : (
            <div className="mt-5">
              <label
                htmlFor="freeTalkText"
                className="mb-2 block text-sm font-semibold"
              >
                What will you talk about?
              </label>

              <textarea
                id="freeTalkText"
                rows={4}
                value={freeTalkText}
                disabled={isBusy || recordingStatus === "ready"}
                onChange={(event) =>
                  setFreeTalkText(event.target.value)
                }
                placeholder="Enter the topic or text for your Free Talk recording..."
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-3"
              />
            </div>
          )}

          <label className="mt-5 flex items-start gap-3 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={isWhatsAppGroup}
              disabled={isBusy || recordingStatus === "ready"}
              onChange={(event) =>
                setIsWhatsAppGroup(event.target.checked)
              }
              className="mt-1"
            />

            <span>
              This recording is for the WhatsApp group.
            </span>
          </label>

          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-950 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-400">
                  Recording Timer
                </p>

                <p className="mt-1 font-mono text-3xl font-bold text-yellow-400">
                  {formatTime(recordingSeconds)}
                </p>
              </div>

              <p className="text-sm text-gray-400">
                {recordingStatus === "recording"
                  ? "Recording..."
                  : recordingStatus === "ready"
                  ? "Audio ready to submit"
                  : recordingStatus === "uploading"
                  ? "Submitting..."
                  : recordingStatus === "submitted"
                  ? "Submitted"
                  : "Ready to record"}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {recordingStatus !== "recording" ? (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={
                    isBusy ||
                    recordingStatus === "ready" ||
                    recordingStatus === "submitted" ||
                    startingRef.current
                  }
                  className="rounded-lg bg-green-500 px-5 py-3 font-bold text-black hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Start Recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="rounded-lg bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-500"
                >
                  Stop Recording
                </button>
              )}

              {recordingStatus === "ready" && (
                <>
                  <button
                    type="button"
                    onClick={submitRecording}
                    disabled={isBusy || !audioBlob}
                    className="rounded-lg bg-yellow-400 px-5 py-3 font-bold text-black hover:bg-yellow-300 disabled:opacity-50"
                  >
                    Submit Recording
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage("");
                      setSuccessMessage("");
                      resetRecording();
                    }}
                    disabled={isBusy}
                    className="rounded-lg border border-gray-600 px-5 py-3 font-semibold hover:bg-gray-800 disabled:opacity-50"
                  >
                    Discard
                  </button>
                </>
              )}

              {recordingStatus === "submitted" && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage("");
                    setErrorMessage("");
                    setRecordingStatus("idle");
                  }}
                  className="rounded-lg border border-gray-600 px-5 py-3 font-semibold hover:bg-gray-800"
                >
                  Record Another
                </button>
              )}
            </div>

            {audioUrl && (
              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold">
                  Preview Your Recording
                </p>

                <audio
                  controls
                  src={audioUrl}
                  className="w-full"
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-yellow-400">
                My Recording History
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Submitted recordings and their review status.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadWorkerData()}
              disabled={loadingData}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              {loadingData ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {records.length === 0 ? (
            <p className="mt-6 rounded-lg bg-gray-950 p-5 text-sm text-gray-400">
              No recordings have been submitted yet.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {records.map((record) => {
                const status = (
                  record.admin_status || "pending"
                ).toLowerCase();

                const badgeStyle =
                  STATUS_STYLES[status] ||
                  "bg-gray-700 text-gray-200";

                return (
                  <article
                    key={record.id}
                    className="rounded-xl border border-gray-800 bg-gray-950 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {record.recording_number ||
                            record.file_name ||
                            "Voice Recording"}
                        </h3>

                        <p className="mt-1 text-xs text-gray-400">
                          {formatDate(record.created_at)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${badgeStyle}`}
                      >
                        {statusLabel(record.admin_status)}
                      </span>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                      {record.pidgin_text ||
                        record.transcription ||
                        "No text was saved for this recording."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
                      <span className="rounded bg-gray-800 px-2 py-1">
                        {record.language || "Unknown language"}
                      </span>

                      <span className="rounded bg-gray-800 px-2 py-1">
                        {record.is_free_talk
                          ? "Free Talk"
                          : "Read Text"}
                      </span>

                      <span className="rounded bg-gray-800 px-2 py-1">
                        {Number(record.word_count || 0)} words
                      </span>

                      <span className="rounded bg-gray-800 px-2 py-1">
                        {Number(record.duration_seconds || 0)} seconds
                      </span>

                      {record.is_whatsapp_group && (
                        <span className="rounded bg-green-950 px-2 py-1 text-green-300">
                          WhatsApp Group
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="border-t border-gray-800 py-5 text-center text-xs text-gray-500">
          Main Naija Pidgin · Worker Dashboard
        </footer>
      </div>
    </main>
  );
}