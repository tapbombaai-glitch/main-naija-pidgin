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

function errorText(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
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

  return "Sent to Chairman · Pending review";
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

  const pendingCount