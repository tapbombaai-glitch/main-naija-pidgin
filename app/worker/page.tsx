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

// === PASTE YOUR ARRAYS HERE — AKWAIBOM_500, IGBO_15, HAUSA_15, YORUBA_15, IJAW_15 ===
// === PASTE YOUR HELPERS HERE — seededRandom, hashString, shuffleArray, getLagosRecordingWindow, getLagosDayKey ===

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

  // ===== WITHDRAWAL — COMPLETE — ADDED =====
  const [availableWithdrawal, setAvailableWithdrawal] = useState({ amount: 0, count: 0 });
  const [activeWithdrawal, setActiveWithdrawal] = useState<any | null>(null);
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [withdrawalMessage, setWithdrawalMessage] = useState("");
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);

  // ===== SENTENCES + IJAW — REBUILT FROM YOUR CODE =====
  const sentences = useMemo(() => {
    if (remoteSentences && remoteSentences.length > 0) return remoteSentences;
    if (selectedLang === "Pidgin") return getTodayPidgin(recordingDayKey);
    if (selectedLang === "Igbo") return IGBO_15;
    if (selectedLang === "Hausa") return HAUSA_15;
    if (selectedLang === "Yoruba") return YORUBA_15;
    if (selectedLang === "Akwa Ibom") return AKWAIBOM_500.slice(0, 30);
    if (selectedLang === "Ijaw / Izon") return IJAW_15;
    return getTodayPidgin(recordingDayKey);
  }, [remoteSentences, selectedLang, recordingDayKey]);
  const isIjawDraft = selectedLang === "Ijaw / Izon";
  const isAkwaIbomDraft = selectedLang === "Akwa Ibom";

  // ===== INIT — LOAD WORKER =====
  useEffect(() => {
    const wid = localStorage.getItem("gin_worker_id") || localStorage.getItem("worker_id") || "WORKER";
    setWorkerId(wid);
    if (wid !== "WORKER") {
      loadWorkerData(wid);
      try {
        const nvToday = localStorage.getItem(`nigerian_english_today:${wid}:${recordingDayKey}`);
        if (nvToday) setNigerianVoiceToday(Number(nvToday) || 0);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBankFromSupabase = async (wid: string) => {
    const { data } = await supabase.from("worker_bank").select("*").eq("worker_id", wid).maybeSingle();
    if (data) {
      setAccountName(data.account_name || "");
      setBankName(data.bank_name || "");
      setAccountNumber(data.account_number || "");
      setPhoneNumber(data.phone_number || "");
      setBankSavedLabel(`Saved: ${data.bank_name} • ${data.account_number} • ${data.account_name}`);
      return;
    }
    try {
      const savedBank = localStorage.getItem("gin_bank_details");
      if (savedBank) {
        const bank = JSON.parse(savedBank);
        setAccountName(bank.accountName || "");
        setBankName(bank.bankName || "");
        setAccountNumber(bank.accountNumber || "");
        setPhoneNumber(bank.phoneNumber || "");
      }
    } catch {}
  };

  // ===== loadWorkerData — COMPLETE WITH WITHDRAWAL + ALLOCATION =====
  const loadWorkerData = async (wid: string) => {
    const { data: anns } = await supabase.from("announcements").select("id, title, message, type, created_at").eq("is_published", true).order("created_at", { ascending: false }).limit(5);
    if (anns) setAnnouncements(anns);
    setAnnouncementLoading(false);
    const window = getLagosRecordingWindow();
    let { data, error } = await supabase.from("recordings").select("id, earnings, status, created_at, is_paid, language").eq("worker_id", wid);
    if (error && String(error.message).includes("is_paid")) {
      const retry = await supabase.from("recordings").select("id, earnings, status, created_at, language").eq("worker_id", wid);
      data = retry.data as any; error = retry.error as any;
    }
    if (error) { console.error("Worker recordings loading error:", error.message); return; }
    const recs: any[] = data || [];
    let allTimeEarnings = 0, campaignApproved = 0, campaignPending = 0, campaignRejected = 0, campaignToday = 0, todayAmount = 0, todayCount = 0, balanceAmount = 0, balanceCount = 0, availableAmount = 0, availableCount = 0, nvTodayCount = 0;
    const byDay: Record<string, { count: number; amount: number }> = {};
    const allocatedIds = new Set<string>();
    let allocationFailed = false;
    setAllocationLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Login session unavailable.");
      const allocRes = await fetch("/api/worker/allocated-recordings", { method: "GET", headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const allocJson = await allocRes.json();
      if (!allocRes.ok) throw new Error(allocJson.error || "Allocation lookup failed.");
      (allocJson.allocatedIds || []).forEach((id: string) => allocatedIds.add(String(id)));
    } catch (e: any) { console.error("Allocation lookup failed:", e.message); allocationFailed = true; }
    finally { setAllocationLoading(false); }
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
      const isAllocated = allocatedIds.has(String(r.id));
      if (isNewCampaign && r.status === "approved" && r.is_paid !== true) {
        balanceAmount += amt; balanceCount += 1;
        if (!allocationFailed && !isAllocated) { availableAmount += amt; availableCount += 1; }
      }
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
    setAvailableWithdrawal({ amount: availableAmount, count: availableCount });
    setTodayEarn({ amount: todayAmount, count: todayCount });
    setNigerianVoiceToday(nvTodayCount);
    setDailyHistory(Object.keys(byDay).sort().reverse().map((d) => ({ date: d, count: byDay[d].count, amount: byDay[d].amount })));
    const { data: pays } = await supabase.from("payment_history").select("*").eq("worker_id", wid).order("paid_at", { ascending: false }).limit(10);
    if (pays) setPaymentHistory(pays);
    const { data: withdrawals } = await supabase.from("withdrawal_requests").select("id, amount, fee, net_amount, status, requested_at, processed_at, payment_reference").eq("worker_id", wid).order("requested_at", { ascending: false });
    if (withdrawals) {
      setWithdrawalHistory(withdrawals);
      setActiveWithdrawal(withdrawals.find((x: any) => x.status === "pending" || x.status === "approved") || null);
    }
    await loadBankFromSupabase(wid);
  };

  // ===== handleRequestWithdrawal — COMPLETE — 30% FEE =====
  const handleRequestWithdrawal = async () => {
    if (allocationLoading) { setWithdrawalMessage("⏳ Still checking your balance. Please wait."); return; }
    if (activeWithdrawal) { setWithdrawalMessage("You already have an active withdrawal request waiting for Chairman."); return; }
    if (availableWithdrawal.amount <= 0) { setWithdrawalMessage("No available balance to withdraw yet."); return; }
    const gross = availableWithdrawal.amount;
    const fee = Math.round(gross * 0.30);
    const net = gross - fee;
    const confirmed = window.confirm("Request Withdrawal?\n\n" + "Gross: ₦" + gross.toLocaleString("en-NG") + " (" + availableWithdrawal.count + " recordings)\n" + "Fee (30%): ₦" + fee.toLocaleString("en-NG") + "\n" + "You go receive: ₦" + net.toLocaleString("en-NG") + "\n\n" + "Press OK to send request to Chairman.");
    if (!confirmed) return;
    setRequestingWithdrawal(true); setWithdrawalMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Please log in again.");
      const response = await fetch("/api/worker/withdrawal-request", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token }, body: JSON.stringify({}), cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Withdrawal request failed.");
      setWithdrawalMessage("✅ Request submitted! You go receive ₦" + Number(result.net_amount || net).toLocaleString("en-NG") + ". Waiting for Chairman.");
      if (workerId) await loadWorkerData(workerId);
    } catch (e: any) { setWithdrawalMessage("❌ " + e.message); }
    finally { setRequestingWithdrawal(false); }
  };

  // ===== KEEP YOUR REST — showToast, handleLogout, saveBankDetails, analyzeNoise, toggleRecording, formatTime, reRecord, saveAndNext, useEffects =====
  // Paste your existing functions here unchanged — they were correct in your file.
  // DO NOT DELETE THEM. Only the 2 functions above (loadWorkerData + handleRequestWithdrawal) are replaced/added.

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const handleLogout = async () => {
    const confirmed = window.confirm("Are you sure you want to logout?");
    if (!confirmed) return;
    try {
      if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; }
      await supabase.auth.signOut();
      localStorage.removeItem("gin_worker_id"); localStorage.removeItem("worker_id");
      router.replace("/worker/login"); router.refresh();
    } catch { localStorage.removeItem("gin_worker_id"); localStorage.removeItem("worker_id"); router.replace("/worker/login"); router.refresh(); }
  };
  const saveBankDetails = async () => {
    if (!accountName.trim()) return alert("Please enter your Account Name.");
    if (!bankName.trim()) return alert("Please select your Bank Name.");
    if (!accountNumber.trim()) return alert("Please enter your Account Number.");
    if (!phoneNumber.trim()) return alert("Please enter your Phone Number.");
    if (accountNumber.trim().length !== 10) return alert("Account Number must be 10 digits.");
    const wid = localStorage.getItem("gin_worker_id") || workerId;
    if (!wid || wid === "WORKER") return alert("Worker account not found. Please logout and login again.");
    setBankSaving(true);
    const bankDetails = { accountName: accountName.trim(), bankName: bankName.trim(), accountNumber: accountNumber.trim(), phoneNumber: phoneNumber.trim() };
    try { localStorage.setItem("gin_bank_details", JSON.stringify(bankDetails)); } catch {}
    const { error } = await supabase.from("worker_bank").upsert({ worker_id: wid, bank_name: bankDetails.bankName, account_number: bankDetails.accountNumber, account_name: bankDetails.accountName, phone_number: bankDetails.phoneNumber, updated_at: new Date().toISOString() }, { onConflict: "worker_id" });
    setBankSaving(false);
    if (error) { setShowModal(null); showToast("✅ Bank saved on this phone. Tell Chairman to create worker_bank table for Supabase backup."); return; }
    setBankSavedLabel(`Saved: ${bankDetails.bankName} • ${bankDetails.accountNumber} • ${bankDetails.accountName}`);
    setShowModal(null); showToast("✅ Bank details saved to Supabase successfully.");
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
        mr.onstop = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; } const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); setAudioURL(URL.createObjectURL(blob)); stream.getTracks().forEach((t) => t.stop()); };
        mr.start(); setIsRecording(true); setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning("");
        timerRef.current = setInterval(() => setTimer((p: number) => p + 1), 1000);
      } catch { alert("Abeg allow microphone!"); }
      return;
    }
    if (selectedLang !== "Pidgin") { alert("Only Pidgin recording is currently available."); return; }
    if (isIjawDraft) { alert("Ijaw / Izon recording is temporarily unavailable."); return; }
    if (!isRecording) {
      if (taskProgress.today >= DAILY_RECORDING_LIMIT) { alert("You have completed your 30 recordings for today."); return; }
      if (currentSentenceIndex >= Math.min(DAILY_RECORDING_LIMIT, sentences.length)) { alert("You have completed today's unique sentences."); return; }
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
      mr.onstop = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; } const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); setAudioURL(URL.createObjectURL(blob)); stream.getTracks().forEach((t) => t.stop()); };
      mr.start(); setIsRecording(true); setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning("");
      timerRef.current = setInterval(() => setTimer((p: number) => p + 1), 1000);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = setTimeout(() => { if (mediaRecorderRef.current?.state === "recording") { mediaRecorderRef.current.stop(); setIsRecording(false); } }, 15000);
    } catch { alert("Abeg allow microphone!"); }
  };
  const formatTime = (s: number) => { const m = Math.floor(s / 60).toString().padStart(2, "0"); const sec = (s % 60).toString().padStart(2, "0"); return `${m}:${sec}`; };
  const reRecord = () => { if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); } setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning(""); setFrozenSentence(null); frozenSentenceRef.current = null; if (timerRef.current) clearInterval(timerRef.current); if (stopTimeoutRef.current) { clearTimeout(stopTimeoutRef.current); stopTimeoutRef.current = null; } };
  const dailySentenceCount = Math.min(DAILY_RECORDING_LIMIT, sentences.length);
  const saveAndNext = async () => {
    if (isNigerianVoiceMode) {
      if (!isNigerianVoiceRecordingLongEnough(timer)) { alert(`❌ FAIL! Your voice na ${timer} seconds only! E too short! For Nigerian English, you must reach 60 seconds.`); return; }
      if (nigerianVoiceToday >= NIGERIAN_VOICE_DAILY_LIMIT) return alert("You have completed your 10 Nigerian English recordings for today.");
      if (!audioURL) return alert("🎤 Record first!"); if (savingRecording) return;
      const wid = localStorage.getItem("gin_worker_id"); if (!wid) return alert("Worker account not found.");
      setSavingRecording(true);
      try {
        const blob = await fetch(audioURL).then((r) => r.blob());
        const noiseResult = await analyzeNoise(blob); setNoiseScore(noiseResult.score);
        if (noiseResult.status === "NOISY") { setSavingRecording(false); setNoiseWarning(noiseResult.reason); alert(`❌ REJECTED - NOISY!\n\n${noiseResult.reason}\n\nScore: ${noiseResult.score}/100`); return; }
        if (noiseResult.status === "WARNING") { const go = confirm(`⚠️ ${noiseResult.reason}\n\nScore: ${noiseResult.score}/100\n\nSubmit still?`); if (!go) { setSavingRecording(false); return; } }
        const fileName = `GIN-NigerianEnglish-${Date.now()}.webm`;
        const storagePath = `${wid}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from("voice-clips").upload(storagePath, blob, { contentType: "audio/webm", upsert: false });
        if (uploadError) throw new Error("Audio upload failed: " + uploadError.message);
        const { data: publicData } = supabase.storage.from("voice-clips").getPublicUrl(storagePath);
        const audioUrl = publicData?.publicUrl || "";
        const recordingText = frozenSentenceRef.current || frozenSentence || currentNigerianVoice.text;
        const { data: recordingRow, error: insertError } = await supabase.from("recordings").insert({ worker_id: wid, language: DATASET_NIGERIAN_ENGLISH, text: recordingText, audio_url: audioUrl, file_name: fileName, duration: timer, earnings: NIGERIAN_VOICE_REWARD, status: "pending", is_approved: false }).select().single();
        if (insertError) throw new Error("Recording could not be submitted: " + insertError.message);
        setNigerianVoiceIndex(nigerianVoiceIndex + 1); setNigerianVoiceToday(nigerianVoiceToday + 1);
        setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning(""); setFrozenSentence(null); frozenSentenceRef.current = null;
        showToast("✅ NIGERIAN ENGLISH SUBMITTED • ₦30 • Awaiting Approval");
        loadWorkerData(wid);
      } catch (e: any) { alert(e.message); } finally { setSavingRecording(false); }
      return;
    }
    if (selectedLang !== "Pidgin") return alert("Only Pidgin recordings can be submitted right now.");
    if (isIjawDraft) return alert("Ijaw / Izon recordings cannot be submitted until validation is complete.");
    if (timer < 11) { alert(`❌ FAIL! Your voice na ${timer} seconds only! E too short!`); return; }
    if (taskProgress.today >= DAILY_RECORDING_LIMIT) return alert("You have completed your 30 recordings for today.");
    if (currentSentenceIndex >= dailySentenceCount) return alert("You have completed all unique sentences for today.");
    if (!audioURL) return alert("🎤 Record first!"); if (savingRecording) return;
    const wid = localStorage.getItem("gin_worker_id"); if (!wid) return alert("Worker account not found.");
    setSavingRecording(true);
    try {
      const blob = await fetch(audioURL).then((r) => r.blob());
      const noiseResult = await analyzeNoise(blob); setNoiseScore(noiseResult.score);
      if (noiseResult.status === "NOISY") { setSavingRecording(false); setNoiseWarning(noiseResult.reason); alert(`❌ REJECTED - NOISY!\n\n${noiseResult.reason}`); return; }
      if (noiseResult.status === "WARNING") { const go = confirm(`⚠️ ${noiseResult.reason}\n\nSubmit still?`); if (!go) { setSavingRecording(false); return; } }
      const safeLang = selectedLang.replace(/\s/g, "");
      const fileName = `GIN-${safeLang}-${Date.now()}.webm`;
      const storagePath = `${wid}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("voice-clips").upload(storagePath, blob, { contentType: "audio/webm", upsert: false });
      if (uploadError) throw new Error("Audio upload failed: " + uploadError.message);
      const { data: publicData } = supabase.storage.from("voice-clips").getPublicUrl(storagePath);
      const audioUrl = publicData?.publicUrl || "";
      const recordingText = frozenSentenceRef.current || frozenSentence || sentences[currentSentenceIndex];
      const { data: recordingRow, error: insertError } = await supabase.from("recordings").insert({ worker_id: wid, language: DATASET_PIDGIN, text: recordingText, audio_url: audioUrl, file_name: fileName, duration: timer, earnings: APPROVED_SENTENCE_RATE, status: "pending", is_approved: false }).select().single();
      if (insertError) throw new Error("Recording could not be submitted: " + insertError.message);
      setCurrentSentenceIndex(currentSentenceIndex + 1);
      setAudioURL(null); setTimer(0); setNoiseScore(0); setNoiseWarning(""); setFrozenSentence(null); frozenSentenceRef.current = null;
      showToast(`✅ SUBMITTED TO CHAIRMAN • ${fileName} • Awaiting Approval`);
    } catch (e: any) { alert(e.message); } finally { setSavingRecording(false); }
  };

  useEffect(() => {
    if (workerId === "WORKER") return;
    const progressKey = `naija_progress:${workerId}:${selectedLang}:${recordingDayKey}`;
    try { const saved = localStorage.getItem(progressKey); if (saved) { const p = JSON.parse(saved); setCurrentSentenceIndex(Math.max(0, Math.min(Number(p.index) || 0, Math.min(30, sentences.length)))); } else setCurrentSentenceIndex(0); } catch { setCurrentSentenceIndex(0); }
    setAudioURL(null); setTimer(0); setFrozenSentence(null); frozenSentenceRef.current = null;
  }, [workerId, selectedLang, recordingDayKey, sentences.length]);
  useEffect(() => {
    if (workerId === "WORKER") return;
    const poll = setInterval(() => { loadWorkerData(workerId); }, 20000);
    const channel = supabase.channel(`worker-earnings-${workerId}`).on("postgres_changes", { event: "*", schema: "public", table: "recordings", filter: `worker_id=eq.${workerId}` }, () => { loadWorkerData(workerId); }).subscribe();
    return () => { clearInterval(poll); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);
  useEffect(() => {
    if (workerId === "WORKER") return;
    let cancelled = false;
    const loadSentences = async () => {
      const { data, error } = await supabase.from("sentences").select("text").eq("language", selectedLang.toLowerCase()).eq("is_active", true).order("sort_order", { ascending: true }).limit(30);
      if (!cancelled && !error && data && data.length > 0) { const texts = data.map((r: any) => String(r.text)).filter(Boolean); if (texts.length > 0) setRemoteSentences(texts); }
    };
    loadSentences();
    return () => { cancelled = true; };
  }, [workerId, selectedLang]);
  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current); streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop()); }; }, []);

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#00E676", color: "black", padding: "10px 18px", borderRadius: "20px", fontSize: "12px", fontWeight: "900", zIndex: 1000 }}>{toast}</div>}
      <div style={{ maxWidth: "390px", margin: "0 auto", padding: "10px", paddingBottom: "90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>Worker Dashboard 🇳🇬</h1>
            <div style={{ fontSize: "11px", color: "#aaa", marginTop: "3px" }}>{workerId} ● {taskProgress.approved} approved • {taskProgress.pending} waiting • {taskProgress.rejected} rejected</div>
            <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>New Campaign: From 21 Nov 2026, 5:00 PM Lagos</div>
          </div>
          <button type="button" onClick={handleLogout} style={{ flexShrink: 0, background: "#2A0A0A", color: "#FF6B6B", border: "1px solid #7F1D1D", borderRadius: "10px", padding: "9px 11px", fontSize: "11px", fontWeight: "900", cursor: "pointer" }}>🚪 LOGOUT</button>
        </div>

        <div style={{ background: "#111A11", border: "1px solid #EAB308", borderRadius: "12px", padding: "12px", marginTop: "12px" }}>
          <strong style={{ color: "#FACC15", fontSize: "14px" }}>📢 CHAIRMAN ANNOUNCEMENTS</strong>
          {announcementLoading ? <p style={{ color: "#aaa", fontSize: "12px" }}>Loading announcements...</p> : announcements.length === 0 ? <p style={{ color: "#888", fontSize: "12px" }}>No announcements yet.</p> : announcements.map((a) => (<div key={a.id} style={{ background: "#080E08", border: "1px solid #263526", borderRadius: "10px", padding: "10px", marginTop: "10px" }}><div style={{ color: a.type === "urgent" ? "#ff5252" : "#FACC15", fontSize: "10px", fontWeight: "900" }}>📢 {String(a.type || "GENERAL").toUpperCase()}</div><div style={{ fontWeight: "900", fontSize: "14px", marginTop: "5px" }}>{a.title}</div><p style={{ color: "#ccc", fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.message}</p></div>))}
        </div>

        <div style={{ background: "#111A11", border: "1px solid #00E676", borderRadius: "12px", padding: "16px", marginTop: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>💰 APPROVED EARNINGS — ALL TIME</div>
          <div style={{ color: "#00E676", fontWeight: "900", fontSize: "28px", marginTop: "8px" }}>₦{earnings.approved.toLocaleString("en-NG")}</div>
          <div style={{ fontSize: "11px", color: "#ccc", marginTop: "8px" }}>✅ New Campaign Approved: {taskProgress.approved} • ⏳ Waiting: {taskProgress.pending} • ❌ Rejected: {taskProgress.rejected}</div>
        </div>

        <div style={{ background: "#111A11", border: "1px solid #FACC15", borderRadius: "12px", padding: "12px", marginTop: "10px" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>📅 TODAY — Resets daily at 5 PM Lagos</div>
          <div style={{ color: "#FACC15", fontWeight: "900", fontSize: "22px", marginTop: "6px" }}>₦{todayEarn.amount.toLocaleString("en-NG")}</div>
          <div style={{ fontSize: "11px", color: "#ccc" }}>{todayEarn.count} approved today • {taskProgress.today} total today</div>
        </div>

        <div style={{ background: "#111A11", border: "1px solid #00E676", borderRadius: "12px", padding: "12px", marginTop: "10px" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>💰 BALANCE — New Campaign Unpaid</div>
          <div style={{ color: "#00E676", fontWeight: "900", fontSize: "26px", marginTop: "6px" }}>₦{balance.amount.toLocaleString("en-NG")}</div>
          <div style={{ fontSize: "11px", color: "#ccc" }}>{balance.count} unpaid approved recordings in New Campaign</div>
        </div>

        {/* ===== WITHDRAWAL UI — COMPLETE ===== */}
        {withdrawalMessage && (<div style={{ background: "#111A11", border: "1px solid #00E676", borderRadius: "12px", padding: "12px", marginTop: "10px", fontSize: "12px", fontWeight: "900", color: "#00E676" }}>{withdrawalMessage}</div>)}
        <button type="button" onClick={handleRequestWithdrawal} disabled={requestingWithdrawal || allocationLoading} style={{ display: "block", width: "100%", marginTop: "10px", padding: "15px", borderRadius: "12px", border: "1px solid #00E676", background: "#00E676", color: "black", fontWeight: "900", fontSize: "13px", cursor: "pointer", opacity: requestingWithdrawal || allocationLoading ? 0.6 : 1 }}>
          {requestingWithdrawal ? "⏳ SENDING..." : `💰 REQUEST WITHDRAWAL — ₦${availableWithdrawal.amount.toLocaleString("en-NG")} AVAILABLE`}
        </button>
        <a href="/worker/withdrawal" style={{ display: "block", width: "100%", marginTop: "10px", padding: "15px", borderRadius: "12px", border: "1px solid #00E676", background: "#102010", color: "#00E676", fontWeight: "900", fontSize: "13px", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>🏧 WITHDRAWAL DASHBOARD →</a>

        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "12px", marginTop: "10px" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>📅 DAILY HISTORY</div>
          {dailyHistory.length === 0 ? <div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>No history yet</div> : dailyHistory.slice(0, 7).map((h) => (<div key={h.date} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "8px 0", borderBottom: "1px solid #1E2F1E" }}><span>{h.date} • {h.count} recordings</span><b>₦{h.amount.toLocaleString("en-NG")}</b></div>))}
          <div style={{ fontSize: "11px", color: "#aaa", marginTop: "8px", fontWeight: "900" }}>💵 PAYMENT HISTORY</div>
          {paymentHistory.length === 0 ? <div style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}>No payment yet.</div> : paymentHistory.map((p: any) => (<div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0" }}><span>{new Date(p.paid_at).toLocaleDateString()} • You collect</span><b style={{ color: "#00E676" }}>₦{Number(p.amount_paid || 0).toLocaleString("en-NG")}</b></div>))}
        </div>

        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "12px", marginTop: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}><span style={{ color: "#aaa" }}>TASK PROGRESS — NEW CAMPAIGN</span><strong style={{ color: "#00E676" }}>{taskProgress.today} today</strong></div>
          <div style={{ height: "7px", background: "#1A251A", borderRadius: "10px", overflow: "hidden", marginTop: "8px" }}><div style={{ width: `${Math.min((taskProgress.today / 30) * 100, 100)}%`, height: "100%", background: "#00E676", borderRadius: "10px" }} /></div>
        </div>

        <div style={{ background: "#111A11", border: "1px solid #00E676", borderRadius: "12px", padding: "12px", marginTop: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "900", color: "#00E676" }}>🎯 NEW CAMPAIGN TARGET</h3>
          <p style={{ margin: "8px 0 0", fontSize: "16px", fontWeight: "900" }}>{taskProgress.total} / {TOTAL_RECORDING_TARGET} Voices</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#aaa" }}>{remainingTotal} Voices Remaining</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#ccc" }}>Today: {taskProgress.today} / {DAILY_RECORDING_LIMIT} — {remainingToday} remaining</p>
        </div>

        <a href="/worker/announcements" style={{ display: "block", width: "100%", marginTop: "12px", padding: "15px", borderRadius: "12px", border: "1px solid #00E676", background: "#102010", color: "#00E676", fontWeight: "900", fontSize: "13px", textAlign: "center", textDecoration: "none", boxSizing: "border-box" }}>📢 ANNOUNCEMENT BOARD</a>
        <button type="button" onClick={() => setShowModal("bank")} style={{ width: "100%", marginTop: "12px", padding: "15px", borderRadius: "12px", border: "1px solid #EAB308", background: "linear-gradient(135deg, #3a2d00, #191500)", color: "#FACC15", fontWeight: "900", fontSize: "13px", cursor: "pointer" }}>💳 PAYMENT / BANK DETAILS {bankSavedLabel ? "✅ SAVED" : ""}</button>

        <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
          <button type="button" onClick={() => { if (isRecording || audioURL || savingRecording) { alert("Please finish or discard your current recording first."); return; } setRecordingMode(DATASET_PIDGIN); }} style={{ flex: 1, padding: "13px 0", borderRadius: "12px", fontSize: "12px", fontWeight: "900", border: !isNigerianVoiceMode ? "2px solid #00E676" : "1px solid #333", background: !isNigerianVoiceMode ? "#00E676" : "#171717", color: !isNigerianVoiceMode ? "black" : "#ccc", cursor: "pointer" }}>🇳🇬 PIDGIN<br /><span style={{ fontSize: "10px" }}>11–15 sec • ₦20</span></button>
          <button type="button" onClick={() => { if (isRecording || audioURL || savingRecording) { alert("Please finish or discard your current recording first."); return; } setRecordingMode(DATASET_NIGERIAN_ENGLISH); }} style={{ flex: 1, padding: "13px 0", borderRadius: "12px", fontSize: "12px", fontWeight: "900", border: isNigerianVoiceMode ? "2px solid #FACC15" : "1px solid #333", background: isNigerianVoiceMode ? "#FACC15" : "#171717", color: isNigerianVoiceMode ? "black" : "#ccc", cursor: "pointer" }}>🎙️ NIGERIAN ENGLISH<br /><span style={{ fontSize: "10px" }}>60+ sec • ₦30 • No max</span></button>
        </div>

        {isNigerianVoiceMode && (<div style={{ background: "#1A1400", border: "1px solid #FACC15", borderRadius: "12px", padding: "12px", marginTop: "10px", fontSize: "12px", lineHeight: 1.6, color: "#FFD580" }}>🎙️ <strong>NIGERIAN ENGLISH DATASET</strong><br />Minimum <strong>60 seconds, no maximum</strong>. Today: <strong>{nigerianVoiceToday} / {NIGERIAN_VOICE_DAILY_LIMIT}</strong> • Reward <strong>₦30</strong></div>)}
        {!isNigerianVoiceMode && (<div style={{ display: "flex", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>{["Pidgin", "Hausa", "Igbo", "Yoruba", "Akwa Ibom", "Ijaw / Izon"].map((lang) => { const isPidgin = lang === "Pidgin"; return (<button key={lang} type="button" disabled={!isPidgin} onClick={() => { if (isRecording || audioURL || savingRecording) { alert("Please finish or discard your current recording first."); return; } setSelectedLang("Pidgin"); }} style={{ flex: lang === "Akwa Ibom" || lang === "Ijaw / Izon" ? "1 1 48%" : "1", padding: "10px 0", borderRadius: "20px", fontSize: "11px", fontWeight: "900", border: isPidgin ? "1.5px solid #00E676" : "1px solid #444", background: isPidgin ? "#00E676" : "#171717", color: isPidgin ? "black" : "#777", cursor: isPidgin ? "pointer" : "not-allowed", opacity: isPidgin ? 1 : 0.65 }}>{lang === "Pidgin" ? "🇳🇬 PIDGIN ✓" : `${lang} 🔒`}{!isPidgin && (<span style={{ display: "block", fontSize: "8px", color: "#EAB308", marginTop: "3px" }}>COMING SOON</span>)}</button>); })}</div>)}
        {isIjawDraft && !isNigerianVoiceMode && (<div style={{ background: "#2A1A00", border: "1px solid #FFA500", borderRadius: "10px", padding: "14px", marginTop: "10px", fontSize: "12px", color: "#FFD580", lineHeight: 1.7, fontWeight: "700" }}>🌊 IJAW / IZON — VALIDATION IN PROGRESS<br /><br />Recording is temporarily disabled because the current sentences are AI-generated drafts and have not been verified by native Ijaw / Izon speakers.</div>)}
        <a href="/worker/dataset" style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "16px", marginTop: "16px", background: "#064e3b", color: "#ffffff", border: "1px solid #00E676", borderRadius: "12px", textAlign: "center", fontWeight: "900", fontSize: "13px", textDecoration: "none" }}>🎙️ JOIN NIGERIAN VOICE DATASET →</a>
        {!isNigerianVoiceMode && (<div style={{ background: "#2A1A00", border: "1px solid #EAB308", borderRadius: "12px", padding: "12px", marginTop: "12px", fontSize: "12px", lineHeight: 1.6, color: "#FFD580" }}>⚠️ <strong>READ FIRST, JOKE AFTER</strong><br />Read sentence exactly as e dey for first 11 seconds. No laugh, no sing, no shout inside sentence.</div>)}

        {/* RECORDING BOX */}
        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: "16px", padding: "14px", marginTop: "12px" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>{isNigerianVoiceMode ? "🎙️ NIGERIAN ENGLISH — READ THIS PARAGRAPH" : `🇳🇬 ${selectedLang.toUpperCase()} — READ THIS`}</div>
          <p style={{ fontSize: "15px", lineHeight: 1.7, marginTop: "10px", minHeight: "90px" }}>{isNigerianVoiceMode ? currentNigerianVoice?.text : frozenSentence || sentences[currentSentenceIndex] || "Loading sentence..."}</p>
          <div style={{ fontSize: "28px", fontWeight: "900", textAlign: "center", margin: "10px 0", color: isNigerianVoiceMode ? (isVoicePass ? "#00E676" : "#FACC15") : (isPass ? "#00E676" : "#FACC15") }}>{formatTime(timer)}</div>
          <div style={{ fontSize: "11px", textAlign: "center", color: "#aaa" }}>{isNigerianVoiceMode ? (isVoiceTooShort ? `❌ Too short — need 60s` : isVoicePass ? `✅ PASS — ${nigerianVoiceWordCount} words` : "🎤 Press RECORD") : (isTooShort ? `❌ Too short — need 11s` : isPass ? `✅ PASS ${isPerfect ? "• PERFECT!" : ""}` : "🎤 Press RECORD")}</div>
          {noiseWarning && <div style={{ fontSize: "12px", color: "#FF6B6B", marginTop: "8px", textAlign: "center" }}>{noiseWarning}</div>}
          <button type="button" onClick={toggleRecording} style={{ width: "100%", marginTop: "12px", padding: "16px", borderRadius: "12px", border: "none", background: isRecording ? "#FF3B30" : "#00E676", color: isRecording ? "white" : "black", fontWeight: "900", fontSize: "15px", cursor: "pointer" }}>{isRecording ? "⏹️ STOP RECORDING" : "🎤 START RECORDING"}</button>
          {audioURL && (<><audio controls src={audioURL} style={{ width: "100%", marginTop: "12px" }} /><div style={{ display: "flex", gap: "8px", marginTop: "10px" }}><button type="button" onClick={reRecord} style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "1px solid #555", background: "#222", color: "white", fontWeight: "900", fontSize: "12px", cursor: "pointer" }}>🔄 RE-RECORD</button><button type="button" onClick={saveAndNext} disabled={savingRecording} style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "none", background: "#00E676", color: "black", fontWeight: "900", fontSize: "12px", cursor: "pointer" }}>{savingRecording ? "⏳ SAVING..." : "✅ SUBMIT"}</button></div></>)}
          <div style={{ fontSize: "11px", color: "#888", marginTop: "10px", textAlign: "center" }}>{isNigerianVoiceMode ? `${nigerianVoiceToday} / ${NIGERIAN_VOICE_DAILY_LIMIT} today • ₦30 each` : `Sentence ${Math.min(currentSentenceIndex + 1, dailySentenceCount)} / ${dailySentenceCount} • ₦20 each`}</div>
        </div>

        {showModal === "bank" && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <div style={{ background: "#111A11", border: "1px solid #EAB308", borderRadius: "16px", padding: "18px", width: "100%", maxWidth: "360px" }}>
              <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "900", color: "#FACC15" }}>💳 BANK DETAILS</h3>
              <input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account Name" style={{ width: "100%", marginTop: "12px", padding: "12px", borderRadius: "10px", border: "1px solid #333", background: "#080E08", color: "white", boxSizing: "border-box" }} />
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Name" style={{ width: "100%", marginTop: "8px", padding: "12px", borderRadius: "10px", border: "1px solid #333", background: "#080E08", color: "white", boxSizing: "border-box" }} />
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account Number (10 digits)" maxLength={10} style={{ width: "100%", marginTop: "8px", padding: "12px", borderRadius: "10px", border: "1px solid #333", background: "#080E08", color: "white", boxSizing: "border-box" }} />
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone Number" style={{ width: "100%", marginTop: "8px", padding: "12px", borderRadius: "10px", border: "1px solid #333", background: "#080E08", color: "white", boxSizing: "border-box" }} />
              <button type="button" onClick={saveBankDetails} disabled={bankSaving} style={{ width: "100%", marginTop: "12px", padding: "14px", borderRadius: "12px", border: "none", background: "#FACC15", color: "black", fontWeight: "900", fontSize: "13px", cursor: "pointer" }}>{bankSaving ? "⏳ SAVING..." : "✅ SAVE BANK DETAILS"}</button>
              <button type="button" onClick={() => setShowModal(null)} style={{ width: "100%", marginTop: "8px", padding: "12px", borderRadius: "12px", border: "1px solid #333", background: "transparent", color: "#aaa", fontWeight: "900", fontSize: "12px", cursor: "pointer" }}>CLOSE</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}