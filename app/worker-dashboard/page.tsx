"use client";
import { useState, useRef, useEffect } from "react";

export default function WorkerDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState("Pidgin");

  // === SPOTLIGHT: BALANCE + BANK ===
  const [earnings, setEarnings] = useState({ total: 1250, pending: 450, approved: 87 });
  const [bankDetails, setBankDetails] = useState({ bankName: "Opay", accountNumber: "", accountName: "" });
  const [verified, setVerified] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sentences: Record<string, string> = {
    Pidgin: "How you dey? I dey come now now.",
    Igbo: "Kedu? Ana m abịa ugbu a.",
    Hausa: "Yaya kake? Ina zuwa yanzu.",
    Yoruba: "Bawo ni? Mo n bọ nísinsìnyí.",
  };

  useEffect(() => {
    const saved = localStorage.getItem("gin_bank");
    if (saved) { try { const b = JSON.parse(saved); setBankDetails(b); if (b.accountNumber) setVerified(true); } catch {} }
    const savedEarn = localStorage.getItem("gin_earnings");
    if (savedEarn) { try { setEarnings(JSON.parse(savedEarn)); } catch {} }
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 },
      });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setAudioURL(null);
      setTimer(0);
      timerIntervalRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
    } catch (err) { alert("Please allow microphone access to record."); console.error(err); }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const reRecord = () => { setAudioURL(null); setTimer(0); };

  const saveAndNext = () => {
    if (!audioURL) { alert("Please record first!"); return; }
    const a = document.createElement("a");
    a.href = audioURL;
    a.download = `recording-${selectedLang}-${Date.now()}.webm`;
    a.click();
    const newEarn = { total: earnings.total + 50, pending: earnings.pending + 50, approved: earnings.approved + 1 };
    setEarnings(newEarn);
    localStorage.setItem("gin_earnings", JSON.stringify(newEarn));
    setAudioURL(null);
    setTimer(0);
    showToast(`✅ +₦50! Balance ₦${newEarn.total.toLocaleString()}`);
  };

  // === SPOTLIGHT LOGIC ===
  // 1. Check Balance -> 2. Fix Bank + Save -> 3. Withdraw Space Appear
  const handleWithdrawClick = () => {
    if (!verified || !bankDetails.accountNumber) {
      showToast("⚠️ Fix your account details first!");
      setShowBankForm(true); // Spotlight bank form
      return;
    }
    setShowWithdraw(true); // Withdraw space go show
  };

  const saveBank = () => {
    if (!bankDetails.accountNumber || !bankDetails.accountName) { alert("Fill account number and account name"); return; }
    if (bankDetails.accountNumber.length !== 10) { alert("Account number must be 10 digits"); return; }
    setVerified(true);
    localStorage.setItem("gin_bank", JSON.stringify(bankDetails));
    setShowBankForm(false);
    showToast(`✅ Account Saved! ${bankDetails.bankName} ${bankDetails.accountNumber} - Now check your balance to withdraw`);
    // After save, open withdraw space automatically so worker go see am
    setTimeout(() => setShowWithdraw(true), 500);
  };

  const submitWithdrawal = () => {
    if (earnings.total < 5000) {
      showToast(`🔒 Need ₦5,000! You have ₦${earnings.total.toLocaleString()} - Need ₦${(5000 - earnings.total).toLocaleString()} more`);
      return;
    }
    const req = { worker: "WORKER-1234", amount: earnings.total - 50, bank: bankDetails.bankName, account: bankDetails.accountNumber, name: bankDetails.accountName, status: "pending", time: new Date().toLocaleString() };
    const all = JSON.parse(localStorage.getItem("withdraw_requests") || "[]");
    all.push(req);
    localStorage.setItem("withdraw_requests", JSON.stringify(all));
    fetch("/api/request-withdrawal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) }).catch(() => {});
    setShowWithdraw(false);
    alert(`✅ Request Sent!\n₦${req.amount.toLocaleString()} to ${req.bank} ${req.account}\nChairman go confirm and pay you manually.`);
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0F0A] text-white font-sans antialiased">
      {toast && <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-[#00E676] text-black px-4 py-2 rounded-full text-[12px] font-black z-[100] max-w-[300px] text-center">{toast}</div>}
      <div className="px-4 pb-8 max-w-[420px] mx-auto pt-2">
        <div className="flex items-center justify-between mb-4 mt-1">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-[18px] font-black">Worker Dashboard</h1><span>🇳🇬</span></div>
            <p className="text-[12px] text-gray-400">Welcome, <span className="text-[#00C853] font-bold">WORKER-1234</span> <span className="inline-flex items-center gap-1 ml-1"><span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse"></span><span className="text-[#00C853] text-[10px]">Online</span></span></p>
          </div>
        </div>

        <div className="bg-[#121A12] border border-[#1F2F1F] rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-[#00C853]/20 flex items-center justify-center text-2xl">👤</div><div><div className="font-bold text-[13px]">WORKER-1234</div><div className="text-[10px] text-gray-400">📍 Location: Lagos</div><div className="text-[10px] text-gray-400">🎤 Accent: Lagos Pidgin</div></div></div>
          <div className="text-center"><div className="w-10 h-10 rounded-full bg-[#00C853]/20 flex items-center justify-center mb-1"><span className="text-[#00C853] font-bold text-sm">★</span></div><div className="text-[9px] text-[#00C853] font-bold">Pro Level</div></div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {["Pidgin","Igbo","Hausa","Yoruba"].map((lang)=>(
            <button key={lang} onClick={()=>setSelectedLang(lang)} className={`flex-1 min-w-[70px] text-[11px] py-2.5 rounded-xl font-bold ${selectedLang===lang ? "bg-[#00C853] text-black" : "bg-[#121A12] border border-[#1F2F1F] text-gray-300"}`}>[{lang}]</button>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2"><span className="text-[#00C853]">◎</span><h2 className="text-[12px] font-bold">Main Task Workspace</h2></div>
          <div className="bg-[#121A12] border border-[#1F2F1F] rounded-2xl p-4"><div className="flex justify-between items-center mb-2"><span className="text-[12px] font-bold">45 / 500 Recorded</span><span className="text-[10px] text-gray-400">Today: 12 / 50 ↗</span></div><div className="w-full bg-[#1A1A1A] rounded-full h-2.5"><div className="bg-[#00C853] h-2.5 rounded-full" style={{width:"9%"}}></div></div></div>
        </div>

        <div className="bg-[#121A12] border border-[#1F2F1F] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4"><span>🎤</span><h2 className="text-[12px] font-bold text-[#00C853]">Recording Studio</h2></div>
          <div className="text-center mb-6"><p className="text-[16px] font-bold leading-relaxed">{sentences[selectedLang]}</p></div>
          <div className="flex justify-center mb-4"><button onClick={toggleRecording} className={`w-20 h-20 rounded-full flex items-center justify-center active:scale-95 ${isRecording ? "bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.8)]" : "bg-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]"}`}>{isRecording ? <div className="w-8 h-8 bg-white rounded-sm"></div> : <div className="w-8 h-8 rounded-full bg-red-700"></div>}</button></div>
          <div className="text-center text-red-400 font-mono text-[12px] mb-4">{formatTime(timer)} / 00:15</div>
          {audioURL && (<div className="mb-4"><audio controls src={audioURL} className="w-full rounded-lg" /></div>)}
          <div className="flex gap-3"><button onClick={reRecord} disabled={!audioURL && !isRecording} className="flex-1 border border-[#2A3F2A] text-gray-300 text-[11px] font-bold py-3 rounded-xl disabled:opacity-40">↺ Re-record</button><button onClick={saveAndNext} disabled={!audioURL} className="flex-1 bg-[#00C853] text-black text-[11px] font-black py-3 rounded-xl disabled:opacity-40">↑ Save & Next (+₦50)</button></div>
        </div>

        {/* ===== SPOTLIGHT: CHECK ACCOUNT BALANCE ===== */}
        <div className={`rounded-2xl p-4 mb-3 border-2 ${!verified ? "bg-[#1A1500] border-[#FFC107] shadow-[0_0_20px_rgba(255,193,7,0.3)]" : "bg-[#121A12] border-[#00C853]"}`}>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[11px] text-gray-400">🔦 CHECK ACCOUNT BALANCE</div>
              <div className="text-[22px] font-black">₦{earnings.total.toLocaleString()}</div>
              <div className="text-[10px] text-gray-400">Pending ₦{earnings.pending.toLocaleString()} • Approved {earnings.approved}</div>
            </div>
            <div className="text-right">
              {verified ? (
                <div><div className="text-[10px] text-[#00E676] font-bold">✅ SAVED</div><div className="text-[11px] font-bold">{bankDetails.bankName}</div><div className="text-[10px] text-gray-400">•••• {bankDetails.accountNumber.slice(-4)}</div><div className="text-[10px] text-gray-400">{bankDetails.accountName}</div></div>
              ) : (
                <div><div className="text-[10px] text-[#FFC107] font-bold">⚠️ NOT SAVED</div><div className="text-[10px] text-gray-400">No bank yet</div></div>
              )}
            </div>
          </div>

          {/* SPOTLIGHT BUTTON - FIX DETAILS */}
          {!verified ? (
            <button onClick={() => setShowBankForm(true)} className="w-full mt-3 bg-[#FFC107] text-black font-black py-3 rounded-xl text-[12px] animate-pulse">
              🔦 FIX ACCOUNT DETAILS + SAVE →
            </button>
          ) : (
            <button onClick={() => setShowBankForm(true)} className="w-full mt-3 bg-[#1E2F1E] border border-[#2A4A2A] text-gray-300 font-bold py-2.5 rounded-xl text-[11px]">
              ✏️ Edit Account Details
            </button>
          )}

          {/* WITHDRAW SPACE - GO SHOW FOR BALANCE SPACE AFTER SAVE */}
          {verified && (
            <div className="mt-3 bg-[#0A0F0A] rounded-xl p-3 border border-[#1E2F4A]">
              <div className="flex justify-between text-[11px]"><span className="text-gray-400">Withdraw Space</span><span className={earnings.total >= 5000 ? "text-[#00E676] font-bold" : "text-[#FFC107]"}>{earnings.total >= 5000 ? "✅ Ready to Withdraw" : `Need ₦${(5000 - earnings.total).toLocaleString()} more`}</span></div>
              <div className="bg-[#1E2F4A] h-2 rounded-full mt-2 overflow-hidden"><div className="h-full" style={{ width: `${Math.min((earnings.total / 5000) * 100, 100)}%`, background: earnings.total >= 5000 ? "#00E676" : "#FFC107" }}></div></div>
              <button onClick={handleWithdrawClick} className={`w-full mt-3 py-3 rounded-xl font-black text-[12px] ${earnings.total < 5000 ? "bg-[#333] text-gray-400" : "bg-[#4A5AFF] text-white"}`}>
                {earnings.total < 5000 ? `🔒 LOCKED - Need ₦${(5000 - earnings.total).toLocaleString()} More` : `💰 WITHDRAW ₦${(earnings.total - 50).toLocaleString()}`}
              </button>
            </div>
          )}
          {!verified && (
            <div className="mt-2 text-center text-[10px] text-[#FFC107]">👆 Fix + Save your bank first, then Withdraw space go show here</div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => showToast(`Balance: ₦${earnings.total.toLocaleString()}`)} className="bg-[#121A12] border border-[#1F2F1F] rounded-xl py-3 flex flex-col items-center gap-1"><span>📊</span><span className="text-[10px] text-gray-300">Earnings</span></button>
          <button className="bg-[#00C853] text-black rounded-xl py-3 flex flex-col items-center gap-1 font-bold"><span>👑</span><span className="text-[10px]">Levels</span></button>
          <button onClick={handleWithdrawClick} className="bg-[#121A12] border border-[#1F2F1F] rounded-xl py-3 flex flex-col items-center gap-1"><span>💳</span><span className="text-[10px] text-gray-300">Withdraw</span></button>
        </div>
      </div>

      {/* BANK FORM - SPOTLIGHT */}
      {showBankForm && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[70]">
          <div className="bg-[#0F1F0F] border-2 border-[#FFC107] rounded-2xl p-4 w-full max-w-[360px] shadow-[0_0_30px_rgba(255,193,7,0.4)]">
            <div className="flex justify-between mb-1"><b>🔦 FIX ACCOUNT DETAILS</b><button onClick={() => setShowBankForm(false)} className="bg-[#1E2F1E] w-7 h-7 rounded-full">✕</button></div>
            <p className="text-[11px] text-gray-400 mb-3">Check am well, fix am, then SAVE — Withdraw space go show after you save</p>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-gray-400">Bank Name</label>
              <select value={bankDetails.bankName} onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })} className="bg-[#1A2A1A] border border-[#2A4A2A] rounded-lg p-3 text-white"><option>Opay</option><option>Moniepoint</option><option>PalmPay</option><option>Kuda</option><option>First Bank</option><option>GTB</option><option>Access</option><option>UBA</option><option>Zenith</option></select>
              <label className="text-[10px] text-gray-400">Account Number (10 digits)</label>
              <input placeholder="e.g 0123456789" value={bankDetails.accountNumber} onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })} className="bg-[#1A2A1A] border border-[#FFC107] rounded-lg p-3 text-white" />
              <label className="text-[10px] text-gray-400">Account Name</label>
              <input placeholder="e.g Kingsley Suoye" value={bankDetails.accountName} onChange={e => setBankDetails({ ...bankDetails, accountName: e.target.value })} className="bg-[#1A2A1A] border border-[#2A4A2A] rounded-lg p-3 text-white" />
              <div className="bg-[#1A2A1A] rounded-lg p-3 text-[11px]"><span className="text-gray-400">You go receive to: </span><b>{bankDetails.bankName} - {bankDetails.accountNumber || "____"} - {bankDetails.accountName || "____"}</b></div>
              <button onClick={saveBank} className="bg-[#00E676] text-black rounded-lg p-3 font-black mt-1">✅ CHECK + SAVE ACCOUNT DETAILS</button>
              <button onClick={() => setShowBankForm(false)} className="text-gray-400 text-[11px]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[70]">
          <div className="bg-[#0F1F0F] border border-[#1E2F1E] rounded-2xl p-5 w-full max-w-[360px]">
            <div className="flex justify-between mb-3"><b>Withdraw</b><button onClick={() => setShowWithdraw(false)} className="text-gray-400">✕</button></div>
            <div className="text-center"><div className="text-[34px] font-black">₦{earnings.total.toLocaleString()}.00</div><div className="text-[11px] text-gray-400">Balance Space</div></div>
            <div className="mt-3 bg-gradient-to-r from-[#6A7CFF] to-[#4A5AFF] rounded-2xl p-3">
              <div className="text-[10px] text-white/70">Saved Account</div>
              <div className="text-[18px] font-black">₦ {earnings.total.toLocaleString()}.20</div>
              <div className="flex justify-between text-[11px] text-white/80 mt-2"><span>•••• {bankDetails.accountNumber ? bankDetails.accountNumber.slice(-4) : "0212"}</span><span>{bankDetails.bankName}</span></div>
              <div className="text-[10px] text-white/70">{bankDetails.accountName || "WORKER-1234"}</div>
            </div>
            <button onClick={submitWithdrawal} className={`mt-4 w-full rounded-full py-3 font-black ${earnings.total < 5000 ? "bg-[#333] text-gray-400" : "bg-[#4A5AFF] text-white"}`}>
              {earnings.total < 5000 ? `🔒 LOCKED - Need ₦${(5000 - earnings.total).toLocaleString()} More` : `WITHDRAW ₦${(earnings.total - 50).toLocaleString()}`}
            </button>
            <div className="text-[10px] text-gray-400 text-center mt-2">{earnings.total < 5000 ? "Keep recording to reach ₦5,000" : "Chairman go pay you manually after you request"}</div>
          </div>
        </div>
      )}
    </div>
  );
}