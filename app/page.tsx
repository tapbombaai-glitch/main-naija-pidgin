"use client";
import { useState, useRef, useEffect } from "react";

export default function WorkerDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState("Pidgin");
  const [showModal, setShowModal] = useState<string | null>(null);
  const [activeBottom, setActiveBottom] = useState("Levels");
  const [earnings, setEarnings] = useState({ total: 1250, pending: 450, approved: 87 });
  const [taskProgress, setTaskProgress] = useState({ total: 46, today: 13 });
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ✅ FIXED ONLY PIDGIN ADVERTS TO 1500 DAILY - NO STRUCTURE DELETED
  const allSentences: Record<string, string[]> = {
    Pidgin: [
      "Earn 1500 naira daily! Your voice na money! Record Pidgin for MayNaija!",
      "Earn 1500 naira daily! Fifteen seconds equals daily cash! Just talk for phone!",
      "Omo no dull! Earn 1500 naira daily! Your accent na asset for MayNaija!",
      "Earn 1500 naira daily! Fifty clips per day na 1500 naira! Work from phone!",
      "Chairman dey find voices! Earn 1500 naira daily! Record once, collect daily!",
      "Naija talk, world listen! Join 500 workers wey dey earn 1500 naira daily!",
      "No laptop needed! Just your phone, your voice, earn 1500 naira daily!",
      "Help AI understand Naija! Google no sabi Pidgin well, earn 1500 naira daily!",
      "From worker to pro! Level up for MayNaija, pro earn 50000 weekly! Start 1500 daily!",
      "Top earner this week don collect 12500! You fit earn 1500 daily pass am!"
    ],
    Igbo: ["Kedu? Ana m abia ugbu a", "Biko nyere m aka", "Kedu ihe na eme?"],
    Hausa: ["Yaya kake? Ina zuwa yanzu", "Don Allah ka taimake ni"],
    Yoruba: ["Bawo ni? Mo n bo nisisinyi", "Ejo e ran mi lowo"],
  };

  const sentences = allSentences[selectedLang];

  useEffect(() => {
    const saved = localStorage.getItem("naija_progress");
    if (saved) { try { const p = JSON.parse(saved); setTaskProgress(p.progress); setEarnings(p.earnings); setCurrentSentenceIndex(p.index || 0); } catch {} }
    const files = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
    setSavedFiles(files);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mr; audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => { const blob = new Blob(audioChunksRef.current, { type: "audio/webm" }); setAudioURL(URL.createObjectURL(blob)); stream.getTracks().forEach(t => t.stop()); };
      mr.start(); setIsRecording(true); setAudioURL(null); setTimer(0);
      timerRef.current = setInterval(() => setTimer((p: number) => p + 1), 1000);
    } catch { alert("Abeg allow microphone!"); }
  };

  const formatTime = (s: number) => { const m = Math.floor(s/60).toString().padStart(2,"0"); const sec = (s%60).toString().padStart(2,"0"); return `${m}:${sec}`; };
  const reRecord = () => { if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); } setAudioURL(null); setTimer(0); if (timerRef.current) clearInterval(timerRef.current); };

  const saveAndNext = async () => {
    if (!audioURL) { alert("Record first!"); return; }
    const blob = await fetch(audioURL).then(r => r.blob());
    const fileName = `recording-${selectedLang}-${Date.now()}.webm`;
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl; a.download = fileName; a.style.display = "none";
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 500);
    const existing = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
    const newFile = { id: Date.now(), lang: selectedLang, sentence: sentences[currentSentenceIndex], fileName, time: new Date().toISOString() };
    existing.unshift(newFile);
    localStorage.setItem("gin_recordings", JSON.stringify(existing.slice(0,100)));
    setSavedFiles(existing.slice(0,100));
    const newEarnings = { total: earnings.total + 30, pending: earnings.pending + 30, approved: earnings.approved + 1 };
    const newProgress = { total: taskProgress.total + 1, today: taskProgress.today + 1 };
    const nextIndex = (currentSentenceIndex + 1) % sentences.length;
    setEarnings(newEarnings); setTaskProgress(newProgress); setCurrentSentenceIndex(nextIndex);
    localStorage.setItem("naija_progress", JSON.stringify({ progress: newProgress, earnings: newEarnings, index: nextIndex }));
    setAudioURL(null); setTimer(0);
    showToast(`SAVED TO PHONE: ${fileName} 30 naira`);
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop()); }; }, []);
  useEffect(() => { setCurrentSentenceIndex(0); setAudioURL(null); setTimer(0); }, [selectedLang]);

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#00E676", color: "black", padding: "10px 18px", borderRadius: "20px", fontSize: "12px", fontWeight: "900", zIndex: 100 }}>{toast}</div>}
      <div style={{ maxWidth: "390px", margin: "0 auto", padding: "10px", paddingBottom: "90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <div><div style={{ display: "flex", gap: "8px" }}><h1 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>Worker Dashboard</h1><span>🇳🇬</span></div><div style={{ fontSize: "11px", color: "#aaa" }}>Welcome, <span style={{ color: "white", fontWeight: "800" }}>WORKER-1234{savedFiles.length>0?` - ${savedFiles.length} files saved to phone`:''}</span> <span style={{ color: "#00E676", fontSize: "10px" }}> ● Online</span></div></div>
          <div style={{ width: "10px", height: "10px", background: "#00E676", borderRadius: "50%" }}></div>
        </div>
        <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
          {["Pidgin","Igbo","Hausa","Yoruba"].map(lang=>(
            <button key={lang} onClick={()=>setSelectedLang(lang)} style={{ flex: 1, padding: "10px 0", borderRadius: "20px", fontSize: "11px", fontWeight: "900", border: selectedLang===lang?"1.5px solid #00E676":"1px solid #2A3A2A", background: selectedLang===lang?"#00E676":"#222", color: selectedLang===lang?"black":"#aaa" }}>{lang}</button>
          ))}
        </div>
        <div style={{ marginTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "12px", fontWeight: "800" }}>Main Task Workspace</span><span style={{ fontSize: "10px", color: "#888" }}>{taskProgress.total}/500 Recorded Today {taskProgress.today}/50</span></div>
          <div style={{ width: "100%", height: "6px", background: "#1A2A1A", borderRadius: "10px", marginTop: "4px" }}><div style={{ width: `${(taskProgress.total/500)*100}%`, height: "100%", background: "#00E676" }}></div></div>
        </div>
        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: "16px", padding: "14px", marginTop: "12px" }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}><span style={{ fontSize: "11px", fontWeight: "800" }}>🎙️ Recording Studio</span><span style={{ fontSize: "10px", color: "#888" }}> - {selectedLang} - {currentSentenceIndex+1}/{sentences.length}</span></div>
          <div style={{ textAlign: "center", minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}><p style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>{sentences[currentSentenceIndex]}</p></div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
            <button onClick={toggleRecording} style={{ width: "68px", height: "68px", borderRadius: "50%", background: isRecording?"#CC0000":"#E53935", border: "4px solid #7f1d1d" }}>
              {isRecording ? <div style={{ width: "22px", height: "22px", background: "white", borderRadius: "3px", margin: "auto" }}></div> : <div style={{ width: "24px", height: "24px", background: "#7f1d1d", borderRadius: "50%", margin: "auto" }}></div>}
            </button>
          </div>
          <div style={{ textAlign: "center", fontSize: "11px", color: "#ff5252", fontFamily: "monospace", fontWeight: "700" }}>REC {formatTime(timer)} / 00:15</div>
          <div style={{ display: "flex", gap: "2px", marginTop: "14px", marginBottom: "14px", height: "32px", alignItems: "center" }}>
            {Array.from({ length: 45 }).map((_, i) => (<div key={i} style={{ flex: 1, height: `${6 + Math.sin(i + timer) * 10 + Math.random() * 12}px`, background: isRecording || audioURL ? "#00E676" : "#1E3A1E", borderRadius: "2px" }}></div>))}
            <button onClick={()=>audioURL && new Audio(audioURL).play()} style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#00E676", border: "none" }}>▶</button>
          </div>
          {audioURL && <audio controls src={audioURL} style={{ width: "100%", marginBottom: "12px", height: "32px" }} />}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={reRecord} style={{ flex: 1, background: "#1E2F1E", border: "1px solid #2A4A2A", color: "#ccc", padding: "13px", borderRadius: "12px", fontSize: "12px", fontWeight: "800" }}>↻ Re-record</button>
            <button onClick={saveAndNext} style={{ flex: 1.5, background: "#00E676", color: "black", border: "none", padding: "13px", borderRadius: "12px", fontSize: "12px", fontWeight: "900" }}>Save & Next →</button>
          </div>
        </div>

        {savedFiles.length > 0 && (
          <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px", marginTop: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#00E676", marginBottom: "6px" }}>📂 {savedFiles.length} Files Saved to Phone for Chairman</div>
            {savedFiles.slice(0,10).map((f:any)=>(
              <div key={f.id} style={{ fontSize: "9px", color: "#aaa", padding: "5px 0", borderBottom: "1px solid #1A2A1A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                - {f.fileName} - {f.sentence}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginTop: "10px" }}>
          <div onClick={()=>setShowModal("earnings")} style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px" }}><div style={{ fontSize: "9px", color: "#888" }}>💳 Earnings</div><div style={{ fontSize: "16px", fontWeight: "900", marginTop: "4px" }}>₦{earnings.total.toLocaleString()}</div></div>
          <div onClick={()=>setShowModal("pending")} style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px" }}><div style={{ fontSize: "9px", color: "#FFC107" }}>🕐 Pending</div><div style={{ fontSize: "16px", fontWeight: "900", marginTop: "4px" }}>₦{earnings.pending}</div></div>
          <div onClick={()=>setShowModal("approved")} style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px" }}><div style={{ fontSize: "9px", color: "#888" }}>✅ Approved</div><div style={{ fontSize: "16px", fontWeight: "900", marginTop: "4px" }}>{earnings.approved} clips</div></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px", marginTop: "8px" }}>
          {[{ label: "Earnings", icon: "🏦", id: "earnings" }, { label: "Levels", icon: "👑", id: "levels" }, { label: "Crown", icon: "👑", id: "crown" }, { label: "Withdraw", icon: "🏦", id: "withdraw" }].map(item=>(
            <button key={item.id} onClick={()=>{setActiveBottom(item.label); setShowModal(item.id);}} style={{ background: activeBottom===item.label?"#00E67622":"#121C12", border: activeBottom===item.label?"1px solid #00E676":"1px solid #1E2F1E", borderRadius: "12px", padding: "10px 4px" }}>
              <div style={{ fontSize: "16px", textAlign: "center" }}>{item.icon}</div><div style={{ fontSize: "9px", marginTop: "2px", fontWeight: "800", textAlign: "center", color: activeBottom===item.label?"#00E676":"#888" }}>{item.label}</div>
            </button>
          ))}
        </div>
      </div>
      {showModal && (
        <div onClick={()=>setShowModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background: "#121C12", border: "1px solid #00E676", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "340px" }}>
            {showModal==="levels" && <><div style={{ fontSize: "16px", fontWeight: "900" }}>👑 Pro Level</div><div style={{ fontSize: "12px", color: "#00E676", marginTop: "6px" }}>You are Pro Level Worker!</div></>}
            {showModal==="crown" && <><div style={{ fontSize: "16px", fontWeight: "900" }}>👑 Leaderboard</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>Your rank: #12<br/>Keep recording!</div></>}
            {showModal==="withdraw" && <><div style={{ fontSize: "16px", fontWeight: "900" }}>💳 Withdraw</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>Available: ₦{earnings.total}</div><button style={{ width: "100%", marginTop: "14px", background: "#00E676", color: "black", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "900" }}>Withdraw ₦{earnings.total}</button></>}
            {showModal==="earnings" && <><div style={{ fontSize: "16px", fontWeight: "900" }}>💳 Earnings</div><div style={{ fontSize: "28px", fontWeight: "900", color: "#00E676", marginTop: "10px" }}>₦{earnings.total.toLocaleString()}</div></>}
            <button onClick={()=>setShowModal(null)} style={{ width: "100%", marginTop: "16px", background: "#222", color: "white", border: "none", padding: "10px", borderRadius: "10px" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}