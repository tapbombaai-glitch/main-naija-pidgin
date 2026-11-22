"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getTodayPidgin } from "@/app/data/pidgin-500";
import {
  getTodayNigerianVoice,
  getAllNigerianVoiceParagraphs,
  NIGERIAN_VOICE_REWARD,
  NIGERIAN_VOICE_MIN_DURATION,
  countNigerianVoiceWords,
  isNigerianVoiceRecordingLongEnough,
} from "@/lib/nigerian-voice-data";

const DAILY_RECORDING_LIMIT = 30;
const APPROVED_SENTENCE_RATE = 20;

const CAMPAIGN_START_ISO = "2026-11-21T16:00:00.000Z";
const CAMPAIGN_START_MS = new Date(CAMPAIGN_START_ISO).getTime();

const NIGERIAN_VOICE_DAILY_LIMIT = 10;

export type RecordingDataset = "pidgin" | "nigerian_english";
const DATASET_PIDGIN: RecordingDataset = "pidgin";
const DATASET_NIGERIAN_ENGLISH: RecordingDataset = "nigerian_english";

// NOTE: Keep your existing AKWAIBOM_500, IGBO_15, HAUSA_15, YORUBA_15, IJAW_15 arrays here unchanged.
// They are DRAFT ONLY - no recording for them. I removed them from this paste only to keep file readable,
// but your deployed file must keep them if you still want them in code. They do not affect Pidgin / Nigerian English.

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
function shuffleArray<T>(arr: T[], seedKey = "default"): T[] {
  const a = [...arr];
  const rand = seededRandom(hashString(seedKey) || 12345);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function getLagosRecordingWindow(now = new Date()) {
  const offset = 60 * 60 * 1000;
  const lagosNow = new Date(now.getTime() + offset);
  let start = Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), lagosNow.getUTCDate(), 17, 0, 0);
  if (lagosNow.getUTCHours() < 17) { start -= 24 * 60 * 60 * 1000; }
  const startUtc = start - offset;
  return { startMs: startUtc, startIso: new Date(startUtc).toISOString(), key: String(startUtc), nextResetMs: startUtc + 24 * 60 * 60 * 1000 };
}
function getLagosDayKey(iso: string) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function WorkersPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState("Pidgin");
  const [showModal, setShowModal] = useState<string | null>(null);
  const [workerId, setWorkerId] = useState("WORKER");
  const [recordingDayKey, setRecordingDayKey] = useState(() => getLagosRecordingWindow().key);
  const [earnings, setEarnings] = useState({ approved: 0 });
  const [taskProgress, setTaskProgress] = useState({ total: 0, today: 0, approved: 0, pending: 0, rejected: 0 });
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);
  const [savingRecording, setSavingRecording] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [noiseScore, setNoiseScore] = useState(0);
  const [noiseWarning, setNoiseWarning] = useState("");
  const [remoteSentences, setRemoteSentences] = useState<string[] | null>(null);
  const [frozenSentence, setFrozenSentence] = useState<string | null>(null);
  const frozenSentenceRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const stopTimeoutRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const TOTAL_RECORDING_TARGET = 500;

  const [recordingMode, setRecordingMode] = useState<RecordingDataset>(DATASET_PIDGIN);
  const [nigerianVoiceIndex, setNigerianVoiceIndex] = useState(0);
  const [nigerianVoiceToday, setNigerianVoiceToday] = useState(0);
  const isNigerianVoiceMode = recordingMode === DATASET_NIGERIAN_ENGLISH;
  const isPidginMode = recordingMode === DATASET_PIDGIN;
  const currentDataset: RecordingDataset = isNigerianVoiceMode ? DATASET_NIGERIAN_ENGLISH : DATASET_PIDGIN;
  const nigerianVoiceParagraphs = useMemo(() => getAllNigerianVoiceParagraphs(), []);
  const todayNigerianVoice = useMemo(() => getTodayNigerianVoice(), [recordingDayKey]);
  const currentNigerianVoice = nigerianVoiceParagraphs[nigerianVoiceIndex % nigerianVoiceParagraphs.length] || todayNigerianVoice;
  const nigerianVoiceWordCount = countNigerianVoiceWords(currentNigerianVoice?.text || "");

  const isTooShort = isPidginMode && timer > 0 && timer < 11;
  const isPass = isPidginMode && timer >= 11;
  const isPerfect = isPidginMode && timer >= 12 && timer <= 13;
  const isVoiceTooShort = isNigerianVoiceMode && timer > 0 && timer < NIGERIAN_VOICE_MIN_DURATION;
  const isVoicePass = isNigerianVoiceMode && isNigerianVoiceRecordingLongEnough(timer);
  const isVoicePerfect = isNigerianVoiceMode && timer >= 60 && timer <= 65;
  const remainingToday = Math.max(0, DAILY_RECORDING_LIMIT - taskProgress.today);
  const remainingTotal = Math.max(0, TOTAL_RECORDING_TARGET - taskProgress.total);
  const [balance, setBalance] = useState({ amount: 0, count: 0 });
  const [todayEarn, setTodayEarn] = useState({ amount: 0, count: 0 });
  const [dailyHistory, setDailyHistory] = useState<{ date: string; count: number; amount: number }[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankSavedLabel, setBankSavedLabel] = useState("");

  // Sentences: remote first, fallback to today Pidgin
  const sentences = useMemo(() => {
    if (remoteSentences && remoteSentences.length > 0) return remoteSentences;
    try { return getTodayPidgin(); } catch { return []; }
  }, [remoteSentences]);

  // Ijaw is DRAFT - no recording
  const isIjawDraft = selectedLang === "Ijaw / Izon";

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // --- LOAD WORKER DATA (UNCHANGED LOGIC) ---
  // FIXED: Reads from workers table, not worker_bank
  const loadBankFromSupabase = async (wid: string) => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setBankSavedLabel("");
        return;
      }

      const { data, error } = await supabase
        .from("workers")
        .select("account_name, bank_name, account_number, phone")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Bank details loading error:", error);
        setBankSavedLabel("");
        return;
      }

      if (!data) {
        setAccountName("");
        setBankName("");
        setAccountNumber("");
        setPhoneNumber("");
        setBankSavedLabel("");
        return;
      }

      setAccountName(data.account_name || "");
      setBankName(data.bank_name || "");
      setAccountNumber(data.account_number || "");
      setPhoneNumber(data.phone || "");

      if (data.account_name && data.bank_name && data.account_number) {
        setBankSavedLabel(
          `Saved: ${data.bank_name} • ${data.account_number} • ${data.account_name}`
        );
      } else {
        setBankSavedLabel("");
      }
    } catch (error) {
      console.error("Bank details loading error:", error);
      setBankSavedLabel("");
    }
  };

  const loadWorkerData = async (wid: string) => {
    const { data: anns } = await supabase.from("announcements").select("id, title, message, type, created_at").eq("is_published", true).order("created_at", { ascending: false }).limit(5);
    if (anns) setAnnouncements(anns);
    setAnnouncementLoading(false);
    const window = getLagosRecordingWindow();
    let recs: any[] | null = null;
    let { data, error } = await supabase.from("recordings").select("earnings, status, created_at, is_paid, language").eq("worker_id", wid);
    if (error && String(error.message).includes("is_paid")) {
      const retry = await supabase.from("recordings").select("earnings, status, created_at, language").eq("worker_id", wid);
      data = retry.data as any; error = retry.error as any;
    }
    if (error) { console.error("Worker recordings loading error:", error.message); return; }
    recs = data || [];
    let allTimeEarnings = 0, campaignApproved = 0, campaignPending = 0, campaignRejected = 0, campaignToday = 0;
    let todayAmount = 0, todayCount = 0, balanceAmount = 0, balanceCount = 0, nvTodayCount = 0;
    const byDay: Record<string, { count: number; amount: number }> = {};
    recs.forEach((r: any) => {
      const createdMs = r.created_at ? new Date(r.created_at).getTime() : 0;
      const isNewCampaign = createdMs >= CAMPAIGN_START_MS;
      const amt = Number(r.earnings) || 0;
      if (r.status === "approved") {
        allTimeEarnings += amt;
        const dayKey = getLagosDayKey(r.created_at);
        if (!byDay[dayKey]) byDay[dayKey] = { count: 0, amount: 0 };
        byDay[dayKey].count += 1; byDay[dayKey].amount += amt;
      }
      if (isNewCampaign && r.status === "approved" && r.is_paid !== true) { balanceAmount += amt; balanceCount += 1; }
      if (isNewCampaign) {
        if (r.status === "approved") campaignApproved += 1;
        else if (r.status === "rejected") campaignRejected += 1;
        else campaignPending += 1;
        if (createdMs >= window.startMs && createdMs < window.nextResetMs) {
          campaignToday += 1;
          if (r.status === "approved") { todayAmount += amt; todayCount += 1; }
          if (r.language === DATASET_NIGERIAN_ENGLISH || r.language === "nigerian-voice") nvTodayCount += 1;
        }
      }
    });
    setEarnings({ approved: allTimeEarnings });
    setTaskProgress({ total: campaignApproved, today: campaignToday, approved: campaignApproved, pending: campaignPending, rejected: campaignRejected });
    setBalance({ amount: balanceAmount, count: balanceCount });
    setTodayEarn({ amount: todayAmount, count: todayCount });
    setNigerianVoiceToday(nvTodayCount);
    const history = Object.keys(byDay).sort().reverse().map(d => ({ date: d, count: byDay[d].count, amount: byDay[d].amount }));
    setDailyHistory(history);
    const { data: pays } = await supabase.from("payment_history").select("*").eq("worker_id", wid).order("paid_at", { ascending: false }).limit(10);
    if (pays) setPaymentHistory(pays);
    await loadBankFromSupabase(wid);
  };

  // Init workerId from storage / session
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const wid = localStorage.getItem("gin_worker_id") || localStorage.getItem("worker_id") || "";
        if (wid) { setWorkerId(wid); loadWorkerData(wid); }
        if (!session) { /* keep login page redirect logic in your existing auth guard if any */ }
      } catch {}
    };
    init();
  }, []);

  useEffect(() => {
    if (workerId === "WORKER") return;
    const progressKey = `naija_progress:${workerId}:${selectedLang}:${recordingDayKey}`;
    try {
      const saved = localStorage.getItem(progressKey);
      if (saved) { const progress = JSON.parse(saved); const index = Number(progress.index) || 0; setCurrentSentenceIndex(Math.max(0, Math.min(index, Math.min(30, sentences.length)))); }
      else setCurrentSentenceIndex(0);
    } catch { setCurrentSentenceIndex(0); }
    setAudioURL(null); setTimer(0); setFrozenSentence(null); frozenSentenceRef.current = null;
  }, [workerId, selectedLang, recordingDayKey, sentences.length]);

  useEffect(() => {
    const checkRecordingDay = () => {
      const window = getLagosRecordingWindow();
      if (window.key !== recordingDayKey) {
        setRecordingDayKey(window.key); setCurrentSentenceIndex(0); setNigerianVoiceIndex(0); setNigerianVoiceToday(0);
        setTaskProgress(prev => ({ ...prev, today: 0 }));
        if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); }
        setIsRecording(false); setAudioURL(null); setTimer(0);
        setFrozenSentence(null); frozenSentenceRef.current = null;
        if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        audioChunksRef.current = [];
        if (timerRef.current) clearInterval(timerRef.current);
        if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; }
        if (workerId !== "WORKER") loadWorkerData(workerId);
        showToast("🌅 NEW RECORDING DAY! Your 30-recording allowance has reset.");
      }
    };
    const interval = setInterval(checkRecordingDay, 15000);
    return () => clearInterval(interval);
  }, [recordingDayKey, workerId]);

  useEffect(() => {
    if (workerId === "WORKER") return;
    const poll = setInterval(() => { loadWorkerData(workerId); }, 20000);
    const channel = supabase.channel(`worker-earnings-${workerId}`).on("postgres_changes", { event: "*", schema: "public", table: "recordings", filter: `worker_id=eq.${workerId}` }, () => { loadWorkerData(workerId); }).subscribe();
    const onVisible = () => { if (document.visibilityState === "visible") loadWorkerData(workerId); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(poll); supabase.removeChannel(channel); document.removeEventListener("visibilitychange", onVisible); };
  }, [workerId]);

  useEffect(() => {
    if (workerId === "WORKER") return;
    let cancelled = false;
    const loadSentences = async () => {
      const { data, error } = await supabase.from("sentences").select("text").eq("language", selectedLang.toLowerCase()).eq("is_active", true).order("sort_order", { ascending: true }).limit(30);
      if (!cancelled && !error && data && data.length > 0) {
        const texts = data.map((r: any) => String(r.text)).filter(Boolean);
        if (texts.length > 0) setRemoteSentences(texts);
      }
    };
    loadSentences();
    const channel = supabase.channel(`sentences-${selectedLang}`).on("postgres_changes", { event: "*", schema: "public", table: "sentences" }, () => { loadSentences(); }).subscribe();
    const poll = setInterval(loadSentences, 60000);
    return () => { cancelled = true; supabase.removeChannel(channel); clearInterval(poll); };
  }, [workerId, selectedLang]);

  useEffect(() => {
    let active = true;
    async function loadAnnouncements() {
      const { data, error } = await supabase.from("announcements").select("id, title, message, type, created_at").eq("is_published", true).order("created_at", { ascending: false });
      if (!active) return;
      if (error) console.error("Announcement loading error:", error.message);
      else setAnnouncements(data || []);
      setAnnouncementLoading(false);
    }
    loadAnnouncements();
    const channel = supabase.channel("worker-announcements").on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => loadAnnouncements()).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    try {
      if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); }
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      await supabase.auth.signOut();
      localStorage.removeItem("gin_worker_id"); localStorage.removeItem("worker_id");
      router.replace("/worker/login"); router.refresh();
    } catch { localStorage.removeItem("gin_worker_id"); localStorage.removeItem("worker_id"); router.replace("/worker/login"); router.refresh(); }
  };

  // FIXED: Calls /api/worker/bank-details, not worker_bank table
  const saveBankDetails = async () => {
    if (!accountName.trim()) {
      return alert("Please enter your account name.");
    }
    if (!bankName.trim()) {
      return alert("Please select your bank.");
    }
    if (!/^\d{10}$/.test(accountNumber.trim())) {
      return alert("Account number must contain exactly 10 digits.");
    }
    if (!phoneNumber.trim()) {
      return alert("Please enter your phone number.");
    }

    setBankSaving(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch("/api/worker/bank-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          accountName: accountName.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || result.success !== true) {
        throw new Error(result.error || "Could not save your bank details.");
      }

      await loadBankFromSupabase(workerId);
      setShowModal(null);
      showToast("✅ Bank details saved successfully!");
    } catch (error: any) {
      console.error("Bank details save error:", error);
      alert(error.message || "Could not save bank details.");
    } finally {
      setBankSaving(false);
    }
  };

  async function analyzeNoise(blob: Blob): Promise<{ status: string; reason: string; score: number }> {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const data = audioBuffer.getChannelData(0);
      let sum = 0, silenceCount = 0, loudCount = 0;
      for (let i = 0; i < data.length; i++) { const s = Math.abs(data[i]); sum += s * s; if (s < 0.005) silenceCount++; if (s > 0.9) loudCount++; }
      const rms = Math.sqrt(sum / data.length);
      const silenceRatio = silenceCount / data.length;
      const loudRatio = loudCount / data.length;
      await audioCtx.close();
      let score = 100;
      if (rms < 0.01) score -= 50; if (silenceRatio > 0.6) score -= 40; if (loudRatio > 0.05) score -= 30; if (rms > 0.3) score -= 20;
      if (score < 60) return { status: "NOISY", reason: "🔊 NOISY! Background noise too much! Go quiet room, close door, no music, no generator, record again!", score };
      if (score < 80) return { status: "WARNING", reason: "⚠️ Small noise dey! Try go more quiet place!", score };
      return { status: "CLEAN", reason: "✅ CLEAN - Good voice!", score };
    } catch { return { status: "CLEAN", reason: "Could not check noise", score: 100 }; }
  }

  const toggleRecording = async () => {
    if (isNigerianVoiceMode) {
      if (!isRecording && nigerianVoiceToday >= NIGERIAN_VOICE_DAILY_LIMIT) { alert("You have completed your 10 Nigerian English recordings for today."); return; }
      if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; } return; }
      try {
        const textToRecord = currentNigerianVoice.text;
        setFrozenSentence(textToRecord); frozenSentenceRef.current = textToRecord;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } });
        streamRef.current = stream;
        const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = mr; audioChunksRef.current = [];
        mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mr.onstop = () => {
          if (timerRef.current) clearInterval(timerRef.current);
          if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; }
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); setAudioURL(URL.createObjectURL(blob)); stream.getTracks().forEach(t => t.stop());
        };
        mr.start(); setIsRecording(true); setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning("");
        timerRef.current = setInterval(() => setTimer((p: number) => p + 1), 1000);
      } catch { alert("Abeg allow microphone!"); }
      return;
    }
    // Pidgin 11-15 sec
    if (selectedLang !== "Pidgin") { alert("Only Pidgin recording is currently available."); return; }
    if (isIjawDraft) { alert("Ijaw / Izon recording is temporarily unavailable."); return; }
    if (!isRecording) {
      if (taskProgress.today >= DAILY_RECORDING_LIMIT) { alert("You have completed your 30 recordings for today. Come back after 5:00 p.m. Lagos time."); return; }
      if (currentSentenceIndex >= Math.min(DAILY_RECORDING_LIMIT, sentences.length)) { alert("You have completed today's unique sentences in this language."); return; }
    }
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; } return; }
    try {
      const sentenceToRecord = sentences[currentSentenceIndex];
      setFrozenSentence(sentenceToRecord); frozenSentenceRef.current = sentenceToRecord;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mr; audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; }
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); setAudioURL(URL.createObjectURL(blob)); stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); setIsRecording(true); setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning("");
      timerRef.current = setInterval(() => setTimer((p: number) => p + 1), 1000);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = setTimeout(() => { if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.stop(); setIsRecording(false); } }, 15000);
    } catch { alert("Abeg allow microphone!"); }
  };

  const formatTime = (s: number) => { const m = Math.floor(s / 60).toString().padStart(2, "0"); const sec = (s % 60).toString().padStart(2, "0"); return `${m}:${sec}`; };
  const reRecord = () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); }
    setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning(""); setFrozenSentence(null); frozenSentenceRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; }
  };
  const dailySentenceCount = Math.min(DAILY_RECORDING_LIMIT, sentences.length);

  const saveAndNext = async () => {
    // ===== NIGERIAN ENGLISH SUBMIT — UNTOUCHED (OLD WAY, ₦30) =====
    if (isNigerianVoiceMode) {
      if (!isNigerianVoiceRecordingLongEnough(timer)) { alert(`❌ FAIL! Your voice na ${timer} seconds only! E too short! For Nigerian English, you must reach 60 seconds.`); return; }
      if (nigerianVoiceToday >= NIGERIAN_VOICE_DAILY_LIMIT) return alert("You have completed your 10 Nigerian English recordings for today.");
      if (!audioURL) return alert("🎤 Record first!");
      if (savingRecording) return;
      const wid = localStorage.getItem("gin_worker_id");
      if (!wid) return alert("Worker account not found. Please logout and login again.");
      try {
        const window = getLagosRecordingWindow();
        const { data: todayRows } = await supabase.from("recordings").select("id").eq("worker_id", wid).eq("language", DATASET_NIGERIAN_ENGLISH).gte("created_at", new Date(window.startMs).toISOString()).lt("created_at", new Date(window.nextResetMs).toISOString());
        if (todayRows && todayRows.length >= NIGERIAN_VOICE_DAILY_LIMIT) { setNigerianVoiceToday(todayRows.length); return alert("You have completed your 10 Nigerian English recordings for today (verified from database)."); }
      } catch {}
      setSavingRecording(true);
      try {
        const blob = await fetch(audioURL).then((r) => r.blob());
        showToast("🔍 Checking for background noise...");
        const noiseResult = await analyzeNoise(blob);
        setNoiseScore(noiseResult.score);
        if (noiseResult.status === "NOISY") { setSavingRecording(false); setNoiseWarning(noiseResult.reason); alert(`❌ REJECTED - NOISY!\n\n${noiseResult.reason}\n\nScore: ${noiseResult.score}/100 (Need 60+)`); return; }
        if (noiseResult.status === "WARNING") { const goAhead = confirm(`⚠️ ${noiseResult.reason}\n\nScore: ${noiseResult.score}/100\n\nYou want submit am still, or you want record again?`); if (!goAhead) { setSavingRecording(false); return; } }
        const fileName = `GIN-NigerianEnglish-${Date.now()}.webm`;
        const storagePath = `${wid}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("voice-clips").upload(storagePath, blob, { contentType: "audio/webm", upsert: false });
        if (uploadError) throw new Error("Audio upload failed: " + uploadError.message);
        const { data: publicData } = supabase.storage.from("voice-clips").getPublicUrl(storagePath);
        const audioUrl = publicData?.publicUrl || "";
        const recordingText = frozenSentenceRef.current || frozenSentence || currentNigerianVoice.text;
        const { data: recordingRow, error: insertError } = await supabase.from("recordings").insert({ worker_id: wid, language: DATASET_NIGERIAN_ENGLISH, text: recordingText, audio_url: audioUrl, file_name: fileName, duration: timer, earnings: NIGERIAN_VOICE_REWARD, status: "pending", is_approved: false }).select().single();
        if (insertError) { try { await supabase.storage.from("voice-clips").remove([storagePath]); } catch {} throw new Error("Recording could not be submitted: " + insertError.message); }
        const nextNvIndex = nigerianVoiceIndex + 1; const nextNvToday = nigerianVoiceToday + 1;
        setNigerianVoiceIndex(nextNvIndex); setNigerianVoiceToday(nextNvToday);
        localStorage.setItem(`nigerian_english_progress:${wid}:${recordingDayKey}`, JSON.stringify({ index: nextNvIndex, dayKey: recordingDayKey }));
        localStorage.setItem(`nigerian_english_today:${wid}:${recordingDayKey}`, String(nextNvToday));
        setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning(""); setFrozenSentence(null); frozenSentenceRef.current = null;
        showToast("✅ NIGERIAN ENGLISH SUBMITTED • ₦30 • Awaiting Approval");
        loadWorkerData(wid);
      } catch (error) { alert(error instanceof Error ? error.message : "Recording submission failed."); }
      finally { setSavingRecording(false); }
      return;
    }

    // ===== PIDGIN SUBMIT — ✅ CORRECTED: VIA NEW SECURE API ONLY =====
    if (selectedLang !== "Pidgin") { alert("Only Pidgin recordings can be submitted right now."); return; }
    if (isIjawDraft) { alert("Ijaw / Izon recordings cannot be submitted until native-speaker validation is complete."); return; }
    if (timer < 11) { alert(`❌ FAIL! Your voice na ${timer} seconds only! E too short! Abeg do am again, make e reach 11 or 12 seconds.`); return; }
    if (taskProgress.today >= DAILY_RECORDING_LIMIT) return alert("You have completed your 30 recordings for today. Your next recording day starts at 5:00 p.m. Lagos time.");
    if (currentSentenceIndex >= dailySentenceCount) return alert("You have completed all the unique sentences available for today.");
    if (!audioURL) return alert("🎤 Record first!");
    if (savingRecording) return;
    setSavingRecording(true);
    try {
      const blob = await fetch(audioURL).then((r) => r.blob());
      showToast("🔍 Checking for background noise...");
      const noiseResult = await analyzeNoise(blob);
      setNoiseScore(noiseResult.score);
      if (noiseResult.status === "NOISY") { setSavingRecording(false); setNoiseWarning(noiseResult.reason); alert(`❌ REJECTED - NOISY!\n\n${noiseResult.reason}\n\nScore: ${noiseResult.score}/100 (Need 60+)`); return; }
      if (noiseResult.status === "WARNING") { const goAhead = confirm(`⚠️ ${noiseResult.reason}\n\nScore: ${noiseResult.score}/100\n\nYou want submit am still, or you want record again?`); if (!goAhead) { setSavingRecording(false); return; } }

      // NEW: Get real Supabase session - no localStorage worker ID
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setSavingRecording(false); return alert("Session expired. Please logout and login again."); }

      const recordingText = frozenSentenceRef.current || frozenSentence || sentences[currentSentenceIndex];
      const form = new FormData();
      form.append("audio", blob, `GIN-Pidgin-${Date.now()}.webm`);
      form.append("language", "pidgin"); // API expects "language", NOT "dataset"
      form.append("text", recordingText);

      const res = await fetch("/api/worker/submit-recording", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.error || "Pidgin submission failed.");
      const recordingRow = result.recording;

      // Local UI only - no earnings here, API sets earnings: 0
      const data = { id: recordingRow?.id || Date.now(), worker_id: workerId, lang: DATASET_PIDGIN, sentence: recordingText, fileName: `GIN-Pidgin-${Date.now()}.webm`, time: new Date().toISOString(), earnings: 0, status: "pending", approved: false };
      let old: any[] = [];
      try { const raw = localStorage.getItem("gin_recordings"); const parsed = raw ? JSON.parse(raw) : []; old = Array.isArray(parsed) ? parsed : []; } catch { old = []; }
      old.unshift(data);
      try { localStorage.setItem("gin_recordings", JSON.stringify(old.slice(0, 100))); setSavedFiles(old.slice(0, 100)); } catch {}

      const nextIndex = currentSentenceIndex + 1;
      setTaskProgress(prev => ({ ...prev, today: prev.today + 1, pending: prev.pending + 1 }));
      setCurrentSentenceIndex(nextIndex);
      localStorage.setItem(`naija_progress:${workerId}:${selectedLang}:${recordingDayKey}`, JSON.stringify({ index: nextIndex, dayKey: recordingDayKey }));
      setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning(""); setFrozenSentence(null); frozenSentenceRef.current = null;
      showToast("✅ SUBMITTED TO CHAIRMAN • Awaiting Approval");
      if (workerId !== "WORKER") loadWorkerData(workerId);
    } catch (error) { alert(error instanceof Error ? error.message : "Recording submission failed. Please try again."); }
    finally { setSavingRecording(false); }
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current); streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop()); }; }, []);

  // --- UI (same as before, simplified layout, same data) ---
  const currentText = isNigerianVoiceMode ? currentNigerianVoice?.text : sentences[currentSentenceIndex];

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#00E676", color: "black", padding: "10px 18px", borderRadius: "20px", fontSize: "12px", fontWeight: "900", zIndex: 1000 }}>{toast}</div>}
      <div style={{ maxWidth: "390px", margin: "0 auto", padding: "10px", paddingBottom: "90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
          <div><h1 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>Worker Dashboard 🇳🇬</h1>
            <div style={{ fontSize: "11px", color: "#aaa", marginTop: "3px" }}>{workerId} ● {taskProgress.approved} approved • {taskProgress.pending} waiting • {taskProgress.rejected} rejected</div>
            <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>New Campaign: From 21 Nov 2026, 5:00 PM Lagos</div></div>
          <button type="button" onClick={handleLogout} style={{ background: "#2A0A0A", color: "#FF6B6B", border: "1px solid #7F1D1D", borderRadius: "10px", padding: "9px 11px", fontSize: "11px", fontWeight: "900", cursor: "pointer" }}>🚪 LOGOUT</button>
        </div>

        <div style={{ background: "#111A11", border: "1px solid #EAB308", borderRadius: "12px", padding: "12px", marginTop: "12px" }}>
          <strong style={{ color: "#FACC15", fontSize: "14px" }}>📢 CHAIRMAN ANNOUNCEMENTS</strong>
          {announcementLoading ? <p style={{ color: "#aaa", fontSize: "12px" }}>Loading announcements...</p> : announcements.length === 0 ? <p style={{ color: "#888", fontSize: "12px" }}>No announcements yet.</p> : announcements.map((a) => (
            <div key={a.id} style={{ background: "#080E08", border: "1px solid #263526", borderRadius: "10px", padding: "10px", marginTop: "10px" }}>
              <div style={{ color: "#FACC15", fontSize: "10px", fontWeight: "900" }}>📢 {String(a.type || "GENERAL").toUpperCase()}</div>
              <div style={{ fontWeight: "900", fontSize: "14px", marginTop: "5px" }}>{a.title}</div>
              <p style={{ color: "#ccc", fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.message}</p>
              <div style={{ color: "#777", fontSize: "10px" }}>{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#111A11", border: "1px solid #00E676", borderRadius: "12px", padding: "16px", marginTop: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>💰 APPROVED EARNINGS — ALL TIME</div>
          <div style={{ color: "#00E676", fontWeight: "900", fontSize: "28px", marginTop: "8px" }}>₦{earnings.approved.toLocaleString("en-NG")}</div>
          <div style={{ fontSize: "11px", color: "#ccc", marginTop: "8px" }}>✅ New Campaign Approved: {taskProgress.approved} • ⏳ Waiting: {taskProgress.pending} • ❌ Rejected: {taskProgress.rejected}</div>
        </div>

        <div style={{ background: "#111A11", border: "1px solid #FACC15", borderRadius: "12px", padding: "12px", marginTop: "10px" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>📅 TODAY — Resets daily at 5 PM Lagos</div>
          <div style={{ color: "#FACC15", fontWeight: "900", fontSize: "22px", marginTop: "6px" }}>₦{todayEarn.amount.toLocaleString("en-NG")}</div>
          <div style={{ fontSize: "11px", color: "#ccc" }}>{todayEarn.count} approved today • {taskProgress.today} total today (incl. pending)</div>
        </div>

        <div style={{ background: "#111A11", border: "1px solid #00E676", borderRadius: "12px", padding: "12px", marginTop: "10px" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>💰 BALANCE — New Campaign Unpaid</div>
          <div style={{ color: "#00E676", fontWeight: "900", fontSize: "26px", marginTop: "6px" }}>₦{balance.amount.toLocaleString("en-NG")}</div>
          <div style={{ fontSize: "11px", color: "#ccc" }}>{balance.count} unpaid approved recordings in New Campaign</div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
          <button type="button" onClick={() => { if (isRecording || audioURL || savingRecording) return alert("Please finish or discard your current recording first."); setRecordingMode(DATASET_PIDGIN); }} style={{ flex: 1, padding: "13px 0", borderRadius: "12px", fontSize: "12px", fontWeight: "900", border: !isNigerianVoiceMode ? "2px solid #00E676" : "1px solid #333", background: !isNigerianVoiceMode ? "#00E676" : "#171717", color: !isNigerianVoiceMode ? "black" : "#ccc", cursor: "pointer" }}>🇳🇬 PIDGIN<br /><span style={{ fontSize: "10px" }}>11–15 sec • ₦20</span></button>
          <button type="button" onClick={() => { if (isRecording || audioURL || savingRecording) return alert("Please finish or discard your current recording first."); setRecordingMode(DATASET_NIGERIAN_ENGLISH); }} style={{ flex: 1, padding: "13px 0", borderRadius: "12px", fontSize: "12px", fontWeight: "900", border: isNigerianVoiceMode ? "2px solid #FACC15" : "1px solid #333", background: isNigerianVoiceMode ? "#FACC15" : "#171717", color: isNigerianVoiceMode ? "black" : "#ccc", cursor: "pointer" }}>🎙️ NIGERIAN ENGLISH<br /><span style={{ fontSize: "10px" }}>60+ sec • ₦30 • No max</span></button>
        </div>

        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "14px", marginTop: "12px" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>{isNigerianVoiceMode ? "🎙️ NIGERIAN ENGLISH PARAGRAPH" : `🇳🇬 PIDGIN SENTENCE ${currentSentenceIndex + 1}`}</div>
          <p style={{ fontSize: "15px", lineHeight: 1.7, marginTop: "8px" }}>{frozenSentence || currentText || "Loading..."}</p>
          <div style={{ fontSize: "22px", fontWeight: "900", marginTop: "10px" }}>{formatTime(timer)} {isTooShort && "❌ Too short"} {isPass && !isNigerianVoiceMode && "✅ Pass"} {isVoiceTooShort && "❌ Too short - need 60s"} {isVoicePass && "✅ Pass"}</div>
          {noiseWarning && <div style={{ color: "#FF6B6B", fontSize: "12px", marginTop: "8px" }}>{noiseWarning}</div>}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button onClick={toggleRecording} style={{ flex: 1, padding: "14px", borderRadius: "12px", background: isRecording ? "#7F1D1D" : "#00E676", color: isRecording ? "white" : "black", fontWeight: "900", border: "none", cursor: "pointer" }}>{isRecording ? "⏹️ STOP" : "🎤 RECORD"}</button>
            <button onClick={reRecord} style={{ padding: "14px", borderRadius: "12px", background: "#222", color: "white", fontWeight: "900", border: "1px solid #444", cursor: "pointer" }}>↩️ Re-record</button>
          </div>
          <button onClick={saveAndNext} disabled={savingRecording || !audioURL} style={{ width: "100%", marginTop: "10px", padding: "14px", borderRadius: "12px", background: "#00E676", color: "black", fontWeight: "900", border: "none", cursor: "pointer", opacity: !audioURL ? 0.5 : 1 }}>{savingRecording ? "Saving..." : "✅ SAVE & NEXT"}</button>
          {audioURL && <audio controls src={audioURL} style={{ width: "100%", marginTop: "10px" }} />}
        </div>

        <button type="button" onClick={() => setShowModal("bank")} style={{ width: "100%", marginTop: "12px", padding: "15px", borderRadius: "12px", border: "1px solid #EAB308", background: "linear-gradient(135deg, #3a2d00, #191500)", color: "#FACC15", fontWeight: "900", fontSize: "13px", cursor: "pointer" }}>💳 PAYMENT / BANK DETAILS {bankSavedLabel ? "✅ SAVED" : ""}</button>
        <a href="/worker/dataset" style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "16px", marginTop: "12px", background: "#064e3b", color: "#ffffff", border: "1px solid #00E676", borderRadius: "12px", textAlign: "center", fontWeight: "900", fontSize: "13px", textDecoration: "none" }}>🎙️ JOIN NIGERIAN VOICE DATASET →</a>

        {showModal === "bank" && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", zIndex: 2000, padding: "16px" }}>
            <div style={{ background: "#111A11", borderRadius: "14px", padding: "18px", width: "100%", maxWidth: "360px" }}>
              <h3 style={{ margin: 0 }}>💳 Bank Details</h3>
              {bankSavedLabel && <div style={{ marginTop: "10px", fontSize: "12px", color: "#00E676", fontWeight: "700" }}>{bankSavedLabel}</div>}
              <input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account Name" style={{ width: "100%", padding: "12px", marginTop: "12px", borderRadius: "10px", border: "1px solid #333", background: "#0A0A0A", color: "white", boxSizing: "border-box" }} />
              <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank Name" style={{ width: "100%", padding: "12px", marginTop: "8px", borderRadius: "10px", border: "1px solid #333", background: "#0A0A0A", color: "white", boxSizing: "border-box" }} />
              <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account Number (10 digits)" style={{ width: "100%", padding: "12px", marginTop: "8px", borderRadius: "10px", border: "1px solid #333", background: "#0A0A0A", color: "white", boxSizing: "border-box" }} />
              <input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Phone Number" style={{ width: "100%", padding: "12px", marginTop: "8px", borderRadius: "10px", border: "1px solid #333", background: "#0A0A0A", color: "white", boxSizing: "border-box" }} />
              <button onClick={saveBankDetails} disabled={bankSaving} style={{ width: "100%", marginTop: "12px", padding: "13px", borderRadius: "10px", background: "#00E676", color: "black", fontWeight: "900", border: "none" }}>{bankSaving ? "Saving..." : "Save Bank"}</button>
              <button onClick={() => setShowModal(null)} style={{ width: "100%", marginTop: "8px", padding: "12px", borderRadius: "10px", background: "#222", color: "white", border: "1px solid #444" }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}