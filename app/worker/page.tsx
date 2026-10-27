"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Language = "pidgin" | "hausa" | "igbo" | "yoruba";

type RecordingMode = "read" | "free";

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

type WorkerRecording = {
  id: string | number;
  user_id: string;
  file_name: string;
  audio_path?: string | null;
  pidgin_text?: string | null;
  transcription?: string | null;
  language?: string | null;
  word_count?: number | null;
  recording_number?: number | null;
  is_free_talk?: boolean | null;
  is_whatsapp_group?: boolean | null;
  admin_status?: string | null;
  created_at?: string | null;
  duration_seconds?: number | null;
};

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

type Announcement = {
  id: string | number;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
};

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "pidgin", label: "Naija Pidgin" },
  { value: "hausa", label: "Hausa" },
  { value: "igbo", label: "Igbo" },
  { value: "yoruba", label: "Yoruba" },
];

const TEXTS_DATA: Record<Language, string[]> = {
  pidgin: [
    "Abeg make we start today. I wan tell you say this work na important one. Today na another beautiful day.",
    "Chairman, I don finish the work you give me. E clear and e dey approved.",
    "How you dey? This na Naija Pidgin voice recording for our dataset.",
    "Wetin dey sup? I hope say everything dey go well today.",
    "Abeg shift small make I pass. Thank you very much.",
  ],
  hausa: [
    "Don Allah mu fara aiki yau. Wannan aiki yana da mahimmanci.",
    "Ina kwana? Ina fatan komai yana tafiya lafiya.",
    "Na gama aikin da aka ba ni. Na gode sosai.",
  ],
  igbo: [
    "Biko, ka anyi malite oru taa. Oru a di oke mkpa.",
    "Kedu ka i mere taa? Enwere m olileanya na i di mma.",
    "Emechaala m oru e nyere m. Daalụ nke ukwuu.",
  ],
  yoruba: [
    "Jowo, ka a bere ise loni. Ise yi se pataki pupo.",
    "Bawo ni? Mo nireti pe ohun gbogbo n lo daadaa.",
    "Mo ti pari ise ti won fun mi. E se gan-an.",
  ],
};

const REFERENCE_AUDIO: Record<Language, string[]> = {
  pidgin: [
    "/audio1.mp3",
    "/audio2.mp3",
    "/audio3.mp3",
    "/audio4.mp3",
  ],
  hausa: [],
  igbo: [],
  yoruba: [],
};

const MAX_RECORDING_SECONDS = 60;

function escapeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

function readableStatus(status?: string | null): string {
  const normalized = (status || "pending").toLowerCase();

  if (normalized === "approved") return "Approved";
  if (normalized === "rejected") return "Rejected";

  return "Pending Chairman Review";
}

function statusColor(status?: string | null): string {
  const normalized = (status || "pending").toLowerCase();

  if (normalized === "approved") {
    return "border-green-700 bg-green-950/40 text-green-300";
  }

  if (normalized === "rejected") {
    return "border-red-700 bg-red-950/40 text-red-300";
  }

  return "border-yellow-700 bg-yellow-950/40 text-yellow-300";
}

export default function WorkerPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);

  const [language, setLanguage] = useState<Language>("pidgin");
  const [records, setRecords] = useState<WorkerRecording[]>([]);
  const [announcement, setAnnouncement] =
    useState<Announcement | null>(null);

  const [mode, setMode] = useState<RecordingMode>("read");
  const [selectedText, setSelectedText] = useState("");
  const [freeTalkText, setFreeTalkText] = useState("");
  const [isWhatsAppGroup, setIsWhatsAppGroup] = useState(false);

  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("idle");

  const [recordedUrl, setRecordedUrl] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("");

  const [loadingData, setLoadingData] = useState(false);
  const [loadingRecordId, setLoadingRecordId] =
    useState<string | number | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const startingRef = useRef(false);
  const objectUrlRef = useRef("");
  const activeRef = useRef(true);

  const assignedTexts = TEXTS_DATA[language];
  const currentText =
    selectedText ||
    assignedTexts[records.length % assignedTexts.length] ||
    "";

  const totalRecordings = records.length;

  const approvedCount = records.filter(
    (record) => record.admin_status?.toLowerCase() === "approved"
  ).length;

  const pendingCount = records.filter(
    (record) =>
      !["approved", "rejected"].includes(
        (record.admin_status || "pending").toLowerCase()
      )
  ).length;

  const rejectedCount = records.filter(
    (record) => record.admin_status?.toLowerCase() === "rejected"
  ).length;

  const totalWords = records.reduce(
    (sum, record) => sum + (Number(record.word_count) || 0),
    0
  );

  const todayCount = records.filter((record) => {
    if (!record.created_at) return false;

    return (
      new Date(record.created_at).toDateString() ===
      new Date().toDateString()
    );
  }).length;

  const progress = Math.min(100, (totalWords / 1000) * 100);

  const accountNumber =
    profile?.account_number ||
    (profile?.id
      ? `MNP-${profile.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
      : "Not available");

  const isSuspended =
    (profile?.status || "").toLowerCase() === "suspended";

  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearPreviewUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }

    setRecordedUrl("");
  }, []);

  const clearCurrentRecording = useCallback(() => {
    stopTimer();
    clearPreviewUrl();

    blobRef.current = null;
    chunksRef.current = [];
    elapsedRef.current = 0;

    setElapsed(0);
    setSubmissionStatus("");
  }, [clearPreviewUrl, stopTimer]);

  const loadWorkerData = useCallback(async () => {
    setLoadingData(true);
    setErrorMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      const session = sessionData.session;

      if (sessionError || !session) {
        setSignedIn(false);
        setProfile(null);
        setRecords([]);
        return;
      }

      setSignedIn(true);

      const [
        profileResult,
        recordingsResult,
        announcementResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single(),

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

      if (profileResult.error) {
        throw new Error(
          `Could not load your worker profile: ${profileResult.error.message}`
        );
      }

      if (recordingsResult.error) {
        throw new Error(
          `Could not load your recordings: ${recordingsResult.error.message}`
        );
      }

      setProfile(profileResult.data as WorkerProfile);
      setRecords((recordingsResult.data || []) as WorkerRecording[]);
      setAnnouncement(
        (announcementResult.data?.[0] as Announcement | undefined) || null
      );

      const savedLanguage =
        typeof window !== "undefined"
          ? localStorage.getItem("selected_language")
          : null;

      if (
        savedLanguage &&
        LANGUAGES.some((item) => item.value === savedLanguage)
      ) {
        setLanguage(savedLanguage as Language);
      }
    } catch (error) {
      setErrorMessage(escapeError(error));
    } finally {
      setLoadingData(false);
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;

    void loadWorkerData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!activeRef.current) return;

      setSignedIn(Boolean(session));

      if (!session) {
        setProfile(null);
        setRecords([]);
      } else {
        void loadWorkerData();
      }
    });

    return () => {
      activeRef.current = false;
      subscription.unsubscribe();
      stopTimer();

      const recorder = recorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;

        try {
          recorder.stop();
        } catch {
          // The recorder may already have stopped.
        }
      }

      releaseMicrophone();

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, [loadWorkerData, releaseMicrophone, stopTimer]);

  useEffect(() => {
    if (signedIn && !isSuspended) {
      const texts = TEXTS_DATA[language];

      if (!selectedText || !texts.includes(selectedText)) {
        setSelectedText(texts[records.length % texts.length] || "");
      }
    }
  }, [language, records.length, selectedText, signedIn, isSuspended]);

  useEffect(() => {
    if (!signedIn || isSuspended || records.length === 0) return;

    let cancelled = false;

    async function loadSignedAudio() {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      const session = sessionData.session;

      if (sessionError || !session || cancelled) return;

      for (const record of records) {
        if (cancelled) return;

        const fileName = record.file_name || record.audio_path;

        if (!fileName) continue;

        const audioId = `worker-recording-${record.id}`;

        const element = document.getElementById(
          audioId
        ) as HTMLAudioElement | null;

        if (!element || element.dataset.loaded === "true") continue;

        try {
          const response = await fetch(
            `/api/my-voice?file=${encodeURIComponent(fileName)}`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
              cache: "no-store",
            }
          );

          const result = await response.json().catch(() => null);

          if (!response.ok || !result?.signedUrl) continue;

          if (!cancelled && element.isConnected) {
            element.src = result.signedUrl;
            element.dataset.loaded = "true";
            element.load();
          }
        } catch {
          // Keep the recording visible even if playback fails.
        }
      }
    }

    void loadSignedAudio();

    return () => {
      cancelled = true;
    };
  }, [records, signedIn, isSuspended]);

  function changeLanguage(value: string) {
    if (!LANGUAGES.some((item) => item.value === value)) return;

    const nextLanguage = value as Language;

    setLanguage(nextLanguage);
    localStorage.setItem("selected_language", nextLanguage);
    setSelectedText(TEXTS_DATA[nextLanguage][0] || "");
    setMessage("");
    setErrorMessage("");
    clearCurrentRecording();
    setRecordingStatus("idle");
  }

  function startTimer() {
    stopTimer();

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);

      if (elapsedRef.current >= MAX_RECORDING_SECONDS) {
        stopRecording();
      }
    }, 1000);
  }

  async function startRecording(nextMode: RecordingMode) {
    if (startingRef.current || recordingStatus === "uploading") return;

    if (!signedIn) {
      setErrorMessage("Please log in before recording.");
      return;
    }

    if (isSuspended) {
      setErrorMessage("Your worker account is suspended.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        "Your browser cannot access the microphone. Open this website over HTTPS in a supported browser."
      );
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setErrorMessage(
        "Your browser does not support audio recording. Please try another browser."
      );
      return;
    }

    startingRef.current = true;

    try {
      setErrorMessage("");
      setMessage("");
      setSubmissionStatus("");

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        setSignedIn(false);
        throw new Error("Your session has expired. Please log in again.");
      }

      clearCurrentRecording();

      setMode(nextMode);
      setRecordingStatus("idle");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
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
        setErrorMessage("Recording failed. Please try again.");
      };

      recorder.onstop = () => {
        stopTimer();
        releaseMicrophone();

        const blobType = recorder.mimeType || "audio/webm";

        const blob = new Blob(chunksRef.current, {
          type: blobType,
        });

        chunksRef.current = [];

        if (blob.size === 0) {
          blobRef.current = null;
          setRecordingStatus("error");
          setErrorMessage("No audio was captured. Please try again.");
          return;
        }

        blobRef.current = blob;

        const url = URL.createObjectURL(blob);

        objectUrlRef.current = url;
        setRecordedUrl(url);
        setRecordingStatus("ready");
        setMessage("Recording complete. Listen before submitting.");
      };

      recorder.start(250);

      setMode(nextMode);
      setRecordingStatus("recording");
      setMessage(
        nextMode === "read"
          ? "Recording your reading. Speak clearly."
          : "Free Talk recording started. Speak naturally."
      );

      startTimer();
    } catch (error) {
      releaseMicrophone();
      setRecordingStatus("error");
      setErrorMessage(escapeError(error));
    } finally {
      startingRef.current = false;
    }
  }

  function stopRecording() {
    stopTimer();

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        releaseMicrophone();
        setRecordingStatus("error");
        setErrorMessage("Could not stop the recording. Please try again.");
      }
    } else {
      releaseMicrophone();
    }
  }

  async function submitRecording() {
    if (!signedIn) {
      setErrorMessage("Please log in before submitting.");
      return;
    }

    if (isSuspended) {
      setErrorMessage("Your worker account is suspended.");
      return;
    }

    if (!blobRef.current) {
      setErrorMessage("Record your voice before submitting.");
      return;
    }

    if (recordingStatus === "recording") {
      setErrorMessage("Stop recording before submitting.");
      return;
    }

    if (recordingStatus === "uploading") return;

    const text =
      mode === "free" ? freeTalkText.trim() : currentText.trim();

    if (!text) {
      setErrorMessage(
        mode === "free"
          ? "Please type the words you spoke before submitting Free Talk."
          : "Choose an assigned sentence before submitting."
      );
      return;
    }

    setErrorMessage("");
    setMessage("");
    setRecordingStatus("uploading");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      const session = sessionData.session;

      if (sessionError || !session) {
        setSignedIn(false);
        throw new Error("Your session has expired. Please log in again.");
      }

      const audioBlob = blobRef.current;

      const extension = audioBlob.type.includes("ogg")
        ? "ogg"
        : audioBlob.type.includes("mp4")
          ? "m4a"
          : "webm";

      const audioFile = new File(
        [audioBlob],
        `worker-${mode}-${Date.now()}.${extension}`,
        { type: audioBlob.type || "audio/webm" }
      );

      const formData = new FormData();

      formData.append("audio", audioFile);
      formData.append("text", text);
      formData.append("language", language);
      formData.append("isFreeTalk", String(mode === "free"));
      formData.append("isWhatsAppGroup", String(isWhatsAppGroup));

      const response = await fetch("/api/worker-recordings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
        cache: "no-store",
      });

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
        result?.message || "Your recording has been submitted successfully."
      );

      await loadWorkerData();
    } catch (error) {
      setRecordingStatus("ready");
      setErrorMessage(escapeError(error));
    }
  }

  function recordAnother() {
    clearCurrentRecording();
    setRecordingStatus("idle");
    setMessage("");
    setErrorMessage("");
    setFreeTalkText("");
  }

  async function signOut() {
    stopTimer();

    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // Continue signing out.
      }
    }

    releaseMicrophone();
    clearCurrentRecording();

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    window.location.href = "/login";
  }

  async function retryPlayback(record: WorkerRecording) {
    setLoadingRecordId(record.id);
    setErrorMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      const session = sessionData.session;

      if (sessionError || !session) {
        throw new Error("Please log in again to play your recordings.");
      }

      const fileName = record.file_name || record.audio_path;

      if (!fileName) {
        throw new Error("This recording has no saved file path.");
      }

      const response = await fetch(
        `/api/my-voice?file=${encodeURIComponent(fileName)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.signedUrl) {
        throw new Error(result?.error || "Could not load this recording.");
      }

      const audio = document.getElementById(
        `worker-recording-${record.id}`
      ) as HTMLAudioElement | null;

      if (audio) {
        audio.src = result.signedUrl;
        audio.dataset.loaded = "true";
        audio.load();
        await audio.play();
      }
    } catch (error) {
      setErrorMessage(escapeError(error));
    } finally {
      setLoadingRecordId(null);
    }
  }

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-green-800 bg-gray-950 p-6">
          <p className="font-bold text-yellow-300">
            Main Naija Pidgin
          </p>
          <p className="mt-3 text-gray-300">
            Checking your worker account...
          </p>
        </div>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-red-800 bg-gray-950 p-6">
          <h1 className="text-2xl font-extrabold text-yellow-300">
            Worker login required
          </h1>

          <p className="mt-3 leading-7 text-gray-300">
            Please log in with your worker account before recording or
            viewing your private recording history.
          </p>

          <Link
            href="/login"
            className="mt-5 inline-block rounded-lg bg-green-700 px-5 py-3 font-bold"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  if (isSuspended) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto max-w-lg rounded-2xl border border-red-800 bg-gray-950 p-6">
          <h1 className="text-2xl font-extrabold text-red-300">
            Worker account suspended
          </h1>

          <p className="mt-3 leading-7 text-gray-300">
            Your account is currently marked as suspended. Recording
            controls are disabled. Please contact the Chairman for
            assistance.
          </p>

          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-5 rounded-lg bg-gray-800 px-5 py-3 font-bold"
          >
            Sign Out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 border-b border-yellow-600/60 pb-5">
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

        {announcement && (
          <section className="mb-6 rounded-xl border-2 border-white bg-gradient-to-r from-green-400 to-yellow-300 p-4 text-black">
            <h2 className="font-extrabold">
              📢 {announcement.title || "Announcement"}
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
              {announcement.message}
            </p>
          </section>
        )}

        <section className="mb-7 rounded-2xl border border-green-800 bg-gradient-to-br from-green-950 to-gray-950 p-5 sm:p-7">
          <h2 className="text-xl font-bold text-yellow-300">
            Welcome, {profile?.display_name || "Worker"}!
          </h2>

          <p className="mt-2 text-sm text-gray-300">
            {profile?.email || ""}
          </p>

          <div className="mt-5 rounded-xl border border-green-600 bg-black/40 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-green-300">
              Your worker account number
            </p>

            <p className="mt-2 break-all text-xl font-extrabold text-yellow-300">
              {accountNumber}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg border border-gray-600 px-4 py-3 font-semibold hover:bg-gray-800"
            >
              ← Home
            </Link>

            <button
              type="button"
              onClick={() => void loadWorkerData()}
              disabled={loadingData}
              className="rounded-lg border border-green-600 px-4 py-3 font-semibold hover:bg-green-950 disabled:opacity-50"
            >
              {loadingData ? "Refreshing..." : "Refresh Dashboard"}
            </button>

            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg bg-red-800 px-4 py-3 font-bold hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </section>

        <section className="mb-7 rounded-2xl border border-gray-800 bg-gray-950 p-5">
          <h2 className="text-xl font-extrabold text-yellow-300">
            📊 My Work
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Total Recordings", value: totalRecordings },
              { label: "Today", value: todayCount },
              { label: "Approved", value: approvedCount },
              { label: "Pending", value: pendingCount },
              { label: "Rejected", value: rejectedCount },
              { label: "Words Recorded", value: totalWords },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-gray-800 bg-black p-4 text-center"
              >
                <p className="text-2xl font-extrabold text-green-300">
                  {item.value}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-bold text-gray-300">
                Progress toward 1,000 words
              </span>

              <span className="font-bold text-yellow-300">
                {totalWords} / 1,000
              </span>
            </div>

            <div
              className="mt-2 h-3 overflow-hidden rounded-full bg-gray-800"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
            >
              <div
                className="h-full rounded-full bg-green-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-gray-500">
              These totals are calculated from the recordings currently
              visible to your account.
            </p>
          </div>
        </section>

        <section className="mb-7 rounded-2xl border border-gray-800 bg-gray-950 p-5 sm:p-6">
          <h2 className="text-2xl font-extrabold text-yellow-300">
            🎙️ Recording Workspace
          </h2>

          <label
            htmlFor="worker-language"
            className="mt-5 block text-sm font-bold text-green-300"
          >
            Choose your recording language
          </label>

          <select
            id="worker-language"
            value={language}
            onChange={(event) => changeLanguage(event.target.value)}
            disabled={
              recordingStatus === "recording" ||
              recordingStatus === "uploading"
            }
            className="mt-2 w-full rounded-xl border border-green-700 bg-black p-3 text-white disabled:opacity-50"
          >
            {LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode("read");
                setErrorMessage("");
                setMessage("");
              }}
              disabled={
                recordingStatus === "recording" ||
                recordingStatus === "uploading"
              }
              className={`rounded-xl border p-4 text-left font-bold disabled:opacity-50 ${
                mode === "read"
                  ? "border-green-500 bg-green-950/50 text-green-300"
                  : "border-gray-700 bg-black text-gray-300"
              }`}
            >
              📖 Read Assigned Text
              <span className="mt-1 block text-xs font-normal text-gray-400">
                Read a sentence provided for your selected language.
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("free");
                setErrorMessage("");
                setMessage("");
              }}
              disabled={
                recordingStatus === "recording" ||
                recordingStatus === "uploading"
              }
              className={`rounded-xl border p-4 text-left font-bold disabled:opacity-50 ${
                mode === "free"
                  ? "border-yellow-500 bg-yellow-950/40 text-yellow-300"
                  : "border-gray-700 bg-black text-gray-300"
              }`}
            >
              🎤 Free Talk
              <span className="mt-1 block text-xs font-normal text-gray-400">
                Speak naturally and type what you said before submitting.
              </span>
            </button>
          </div>

          {mode === "read" ? (
            <div className="mt-5 rounded-xl border border-green-800 bg-green-950/20 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-green-300">
                Assigned sentence
              </p>

              <p className="mt-3 whitespace-pre-wrap text-lg font-semibold leading-8">
                {currentText}
              </p>

              <p className="mt-4 text-xs text-gray-400">
                Reference audio
              </p>

              {language === "pidgin" ? (
                <audio
                  key={`${language}-${currentText}`}
                  controls
                  preload="none"
                  className="mt-2 w-full"
                >
                  <source
                    src={
                      REFERENCE_AUDIO.pidgin[
                        Math.max(
                          0,
                          assignedTexts.indexOf(currentText) %
                            REFERENCE_AUDIO.pidgin.length
                        )
                      ] || "/audio1.mp3"
                    }
                  />
                  Your browser does not support audio playback.
                </audio>
              ) : (
                <p className="mt-2 rounded-lg border border-yellow-800 bg-yellow-950/20 p-3 text-sm text-yellow-200">
                  Reference audio for this language has not yet been
                  configured. You can still record your reading.
                </p>
              )}

              <label
                htmlFor="assigned-text"
                className="mt-4 block text-sm font-bold text-gray-300"
              >
                Select an assigned sentence
              </label>

              <select
                id="assigned-text"
                value={currentText}
                onChange={(event) => {
                  setSelectedText(event.target.value);
                  setErrorMessage("");
                  setMessage("");
                  clearCurrentRecording();
                  setRecordingStatus("idle");
                }}
                disabled={
                  recordingStatus === "recording" ||
                  recordingStatus === "uploading"
                }
                className="mt-2 w-full rounded-xl border border-gray-700 bg-black p-3 text-white disabled:opacity-50"
              >
                {assignedTexts.map((text, index) => (
                  <option key={`${language}-${index}`} value={text}>
                    {index + 1}. {text}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-yellow-800 bg-yellow-950/20 p-4">
              <h3 className="font-extrabold text-yellow-300">
                🎤 Free Talk
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-300">
                Record up to 60 seconds. After recording, type what you
                said so the Chairman can review the audio and transcription.
              </p>

              <label className="mt-4 flex items-center gap-3 rounded-lg bg-black p-3 text-sm">
                <input
                  type="checkbox"
                  checked={isWhatsAppGroup}
                  onChange={(event) =>
                    setIsWhatsAppGroup(event.target.checked)
                  }
                  disabled={
                    recordingStatus === "recording" ||
                    recordingStatus === "uploading"
                  }
                  className="h-5 w-5 accent-green-500"
                />

                WhatsApp group recording
              </label>

              <label
                htmlFor="free-talk-transcription"
                className="mt-4 block text-sm font-bold text-gray-300"
              >
                Transcription of what you said
              </label>

              <textarea
                id="free-talk-transcription"
                rows={4}
                value={freeTalkText}
                onChange={(event) => setFreeTalkText(event.target.value)}
                disabled={
                  recordingStatus === "recording" ||
                  recordingStatus === "uploading"
                }
                placeholder="Type wetin you talk..."
                className="mt-2 w-full rounded-xl border border-gray-700 bg-black p-3 text-white disabled:opacity-50"
              />
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void startRecording(mode)}
              disabled={
                recordingStatus === "recording" ||
                recordingStatus === "uploading"
              }
              className="rounded-lg bg-yellow-500 px-5 py-3 font-extrabold text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              🎙️ Start Recording
            </button>

            {recordingStatus === "recording" && (
              <button
                type="button"
                onClick={stopRecording}
                className="rounded-lg bg-red-700 px-5 py-3 font-bold hover:bg-red-600"
              >
                ⏹ Stop Recording
              </button>
            )}

            {recordingStatus === "ready" && (
              <button
                type="button"
                onClick={recordAnother}
                className="rounded-lg border border-gray-600 px-5 py-3 font-semibold hover:bg-gray-800"
              >
                Record Again
              </button>
            )}
          </div>

          {recordingStatus === "recording" && (
            <div className="mt-5 rounded-xl border border-red-800 bg-red-950/40 p-4">
              <p className="font-bold text-red-300">
                🔴 Recording in progress
              </p>

              <p className="mt-2 text-3xl font-extrabold tabular-nums">
                {formatTime(elapsed)}
              </p>

              <p className="mt-2 text-sm text-gray-400">
                Recording automatically stops after 60 seconds.
              </p>
            </div>
          )}

          {(recordingStatus === "ready" ||
            recordingStatus === "uploading" ||
            recordingStatus === "submitted") && (
            <div className="mt-5 rounded-xl border border-green-800 bg-green-950/20 p-4">
              <h3 className="font-extrabold text-green-300">
                🎧 Listen to your recording
              </h3>

              {recordedUrl && (
                <audio
                  controls
                  src={recordedUrl}
                  className="mt-3 w-full"
                >
                  Your browser does not support audio playback.
                </audio>
              )}

              {recordingStatus !== "submitted" ? (
                <button
                  type="button"
                  onClick={() => void submitRecording()}
                  disabled={recordingStatus === "uploading"}
                  className="mt-4 rounded-lg bg-green-600 px-5 py-3 font-extrabold text-black hover:bg-green-500 disabled:cursor-wait disabled:opacity-50"
                >
                  {recordingStatus === "uploading"
                    ? "Uploading..."
                    : "📤 Submit to Chairman"}
                </button>
              ) : (
                <div className="mt-4 rounded-lg border border-yellow-700 bg-yellow-950/30 p-4">
                  <p className="font-bold text-yellow-300">
                    ✓ {submissionStatus}
                  </p>

                  <p className="mt-2 text-sm text-gray-300">
                    Your recording has been submitted for review. Check
                    your recording history below for its status.
                  </p>
                </div>
              )}
            </div>
          )}

          {message && (
            <p
              className="mt-4 rounded-lg border border-green-800 bg-green-950/30 p-3 text-sm text-green-300"
              aria-live="polite"
            >
              {message}
            </p>
          )}

          {errorMessage && (
            <p
              className="mt-4 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm leading-6 text-red-300"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-950 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-extrabold text-yellow-300">
                🎧 My Recordings
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Your own submissions and their Chairman review status.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadWorkerData()}
              disabled={loadingData}
              className="rounded-lg border border-green-700 px-4 py-2 text-sm font-bold text-green-300 disabled:opacity-50"
            >
              {loadingData ? "Loading..." : "Refresh"}
            </button>
          </div>

          {records.length === 0 ? (
            <div className="mt-5 rounded-xl border border-gray-800 bg-black p-5 text-sm text-gray-400">
              You have no recordings yet. Your submissions will appear
              here after the server saves them.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {records.map((record) => (
                <article
                  key={record.id}
                  className="rounded-xl border border-gray-800 bg-black p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">
                        {record.is_free_talk ? "🎤 Free Talk" : "📖 Read"}{" "}
                        · {(record.language || "pidgin").toUpperCase()}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {record.created_at
                          ? new Date(record.created_at).toLocaleString()
                          : "Date unavailable"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-2 text-xs font-bold ${statusColor(
                        record.admin_status
                      )}`}
                    >
                      {readableStatus(record.admin_status)}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
                    {record.transcription || record.pidgin_text || "No text saved"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>
                      Words: {Number(record.word_count) || 0}
                    </span>

                    <span>
                      Duration: {Number(record.duration_seconds) || 0}s
                    </span>

                    {record.is_whatsapp_group && (
                      <span className="text-green-300">
                        📱 WhatsApp group
                      </span>
                    )}
                  </div>

                  <audio
                    id={`worker-recording-${record.id}`}
                    controls
                    preload="none"
                    className="mt-3 w-full"
                  >
                    Your browser does not support audio playback.
                  </audio>

                  <button
                    type="button"
                    onClick={() => void retryPlayback(record)}
                    disabled={loadingRecordId === record.id}
                    className="mt-3 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-900 disabled:opacity-50"
                  >
                    {loadingRecordId === record.id
                      ? "Loading audio..."
                      : "Load / Retry Playback"}
                  </button>

                  {record.admin_status?.toLowerCase() === "approved" && (
                    <p className="mt-3 text-sm font-bold text-green-300">
                      ✓ Approved by Chairman
                    </p>
                  )}

                  {record.admin_status?.toLowerCase() === "rejected" && (
                    <p className="mt-3 text-sm font-bold text-red-300">
                      Recording rejected. Please follow the Chairman's
                      instructions before submitting another version.
                    </p>
                  )}

                  {(!record.admin_status ||
                    record.admin_status.toLowerCase() === "pending") && (
                    <p className="mt-3 text-sm text-yellow-300">
                      ✓ Sent to Chairman — awaiting review.
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-7 rounded-xl border border-yellow-800 bg-yellow-950/20 p-5">
          <h2 className="font-extrabold text-yellow-300">
            📋 Worker Rules
          </h2>

          <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
            <li>• Record your own voice.</li>
            <li>• Listen to the reference audio when available.</li>
            <li>• Review your recording before submitting.</li>
            <li>• Recordings are submitted for Chairman review.</li>
            <li>• Approval and rejection are controlled by the server.</li>
          </ul>
        </section>

        <footer className="mt-8 border-t border-gray-800 py-5 text-center text-sm text-gray-500">
          Main Naija Pidgin · Worker Workspace
        </footer>
      </div>
    </main>
  );
}