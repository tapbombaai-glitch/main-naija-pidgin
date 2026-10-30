"use client";
import { useState, useRef, useEffect } from "react";

export default function WorkerDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState("Pidgin");
  const [activeBottom, setActiveBottom] = useState("Levels");
  const [showModal, setShowModal] = useState<string | null>(null);
  const [earnings] = useState({ total: 1250, pending: 450, approved: 87 });
  const [taskProgress, setTaskProgress] = useState({ total: 45, today: 12 });
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const allSentences: Record<string, string[]> = {
    Pidgin: ["How you dey? I dey come now now.", "Abeg come help me for here.", "Wetin dey happen for Lagos today?", "I no go gree make dem cheat me."],
    Igbo: ["Kedu? Ana m abia ugbu a.", "Biko nyere m aka.", "Kedu ihe na-eme?", "Agaghi m ekwe ka ha ghogbuo m."],
    Hausa: ["Yaya kake? Ina zuwa yanzu.", "Don Allah ka taimake ni.", "Me ke faruwa?", "Ba zan yarda su yaudare ni ba."],
    Yoruba: ["Bawo ni? Mo n bo nisisinyi.", "Ejo e ran mi lowo.", "Kini n sele?", "Mi o ni gba ki won tan mi."],
  };

  const sentences = allSentences[selectedLang];

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setAudioURL(null);
      setTimer(0);
      timerRef.current = setInterval(() => setTimer(p => p + 1), 1000);
      if (navigator.vibrate) navigator.vibrate(80);
    } catch { alert("Abeg allow microphone access!"); }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const reRecord = () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); }
    setAudioURL(null); setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const saveAndNext = () => {
    if (!audioURL) { alert("🎤 Abeg record first before saving!"); return; }
    const a = document.createElement("a");
    a.href = audioURL;
    a.download = `recording-${selectedLang}-${Date.now()}.webm`;
    a.click();
    setTaskProgress(p => ({ total: p.total + 1, today: p.today + 1 }));
    setCurrentSentenceIndex(prev => (prev + 1) % sentences.length);
    setAudioURL(null); setTimer(0);
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); }; }, []);
  useEffect(() => { setCurrentSentenceIndex(0); setAudioURL(null); setTimer(0); }, [selectedLang]);

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: "390px", margin: "0 auto", padding: "10px", paddingBottom: "90px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><h1 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>Worker Dashboard</h1><span>🇳🇬</span></div><div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>Welcome, <span style={{ color: "white", fontWeight: "800" }}>WORKER-1234</span> <span style={{ color: "#00E676", fontSize: "10px" }}> ● Online</span></div></div>
          <div style={{ width: "10px", height: "10px", background: "#00E676", borderRadius: "50%", boxShadow: "0 0 8px #00E676" }}></div>
        </div>

        <div onClick={()=>setShowModal("profile")} style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "14px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#0F2A14", border: "1.5px solid #00E676", display: "flex", alignItems: "center", justifyContent: "center", color: "#00E676", fontWeight: "900", fontSize: "20px" }}>W</div>
            <div><div style={{ fontWeight: "900", fontSize: "12px" }}>WORKER-1234</div><div style={{ fontSize: "10px", color: "#999", marginTop: "2px" }}>📍 Location • Lagos</div><div style={{ fontSize: "10px", color: "#999" }}>💬 Accent • Lagos Pidgin</div></div>
          </div>
          <div style={{ textAlign: "center" }}><div style={{ background: "#FFD54F20", border: "1.5px solid #FFD54F", borderRadius: "8px", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px" }}><span>⭐</span><span style={{ fontSize: "10px", fontWeight: "900", color: "#FFD54F" }}>Pro Level</span></div></div>
        </div>

        <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
          {["Pidgin","Igbo","Hausa","Yoruba"].map(lang=>(
            <button key={lang} onClick={()=>setSelectedLang(lang)} style={{ flex: 1, padding: "10px 0", borderRadius: "20px", fontSize: "11px", fontWeight: "900", border: selectedLang===lang?"1.5px solid #00E676":"1px solid #2A3A2A", background: selectedLang===lang?"#00E676":"#222", color: selectedLang===lang?"black":"#aaa" }}>{lang}</button>
          ))}
        </div>

        <div style={{ marginTop: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}><span style={{ fontSize: "12px", fontWeight: "800" }}>Main Task Workspace</span><span style={{ fontSize: "10px", color: "#888" }}>{taskProgress.total}/500 Recorded Today {taskProgress.today}/50</span></div>
          <div style={{ width: "100%", height: "6px", background: "#1A2A1A", borderRadius: "10px" }}><div style={{ width: `${(taskProgress.total/500)*100}%`, height: "100%", background: "#00E676", borderRadius: "10px" }}></div></div>
        </div>

        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: "16px", padding: "14px", marginTop: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}><div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "1.5px solid #00E676", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>🎙️</div><span style={{ fontSize: "11px", fontWeight: "800" }}>Recording Studio</span></div>
          <div style={{ textAlign: "center", marginBottom: "14px", minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ fontSize: "18px", fontWeight: "900", lineHeight: "24px", margin: 0 }}>{sentences[currentSentenceIndex]}</p></div>
          
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "30px", marginBottom: "8px" }}>
            <button onClick={toggleRecording} style={{ width: "68px", height: "68px", borderRadius: "50%", background: isRecording?"#CC0000":"#E53935", border: "4px solid #7f1d1d", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isRecording?"0 0 30px rgba(255,0,0,0.7)":"0 0 15px rgba(229,57,53,0.4)" }}>
              {isRecording ? <div style={{ width: "22px", height: "22px", background: "white", borderRadius: "3px" }}></div> : <div style={{ width: "24px", height: "24px", background: "#7f1d1d", borderRadius: "50%" }}></div>}
            </button>
          </div>
          <div style={{ textAlign: "center", fontSize: "11px", color: "#ff5252", fontFamily: "monospace", fontWeight: "700" }}>REC</div>
          <div style={{ textAlign: "center", fontSize: "14px", color: "#ff5252", fontFamily: "monospace", fontWeight: "700", marginTop: "2px" }}>{formatTime(timer)} / 00:15</div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", marginBottom: "14px" }}>
            <div style={{ flex: 1, height: "32px", display: "flex", alignItems: "center", gap: "2px" }}>
              {Array.from({ length: 45 }).map((_, i) => (<div key={i} style={{ flex: 1, height: `${6 + Math.sin(i + timer) * 10 + Math.random() * 12}px`, background: isRecording || audioURL ? "#00E676" : "#1E3A1E", borderRadius: "2px", transition: "height 0.1s" }}></div>))}
            </div>
            <button onClick={()=>audioURL && new Audio(audioURL).play()} style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#00E676", border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>▶</button>
          </div>

          {audioURL && <audio controls src={audioURL} style={{ width: "100%", marginBottom: "12px", height: "32px", borderRadius: "8px" }} />}

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={reRecord} style={{ flex: 1, background: "#1E2F1E", border: "1px solid #2A4A2A", color: "#ccc", padding: "13px", borderRadius: "12px", fontSize: "12px", fontWeight: "800" }}>↻ Re-record</button>
            <button onClick={saveAndNext} style={{ flex: 1.5, background: "#00E676", color: "black", border: "none", padding: "13px", borderRadius: "12px", fontSize: "12px", fontWeight: "900" }}>Save & Next →</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginTop: "10px" }}>
          <div onClick={()=>setShowModal("earnings")} style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px", cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ fontSize: "14px" }}>💳</span><span style={{ fontSize: "9px", color: "#888" }}>Earnings</span></div><div style={{ fontSize: "16px", fontWeight: "900", marginTop: "4px" }}>₦{earnings.total.toLocaleString()}</div></div>
          <div onClick={()=>setShowModal("pending")} style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px", cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ fontSize: "14px" }}>🕐</span><span style={{ fontSize: "9px", color: "#FFC107" }}>Pending</span></div><div style={{ fontSize: "16px", fontWeight: "900", marginTop: "4px" }}>₦{earnings.pending}</div></div>
          <div onClick={()=>setShowModal("approved")} style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px", cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: "4px" }}><span style={{ fontSize: "14px" }}>✅</span><span style={{ fontSize: "9px", color: "#888" }}>Approved</span></div><div style={{ fontSize: "16px", fontWeight: "900", marginTop: "4px" }}>{earnings.approved} clips</div></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px", marginTop: "8px" }}>
          {[
            { label: "Earnings", icon: "🏦", id: "earnings" },
            { label: "Levels", icon: "👑", id: "levels", active: true },
            { label: "Crown", icon: "👑", id: "crown" },
            { label: "Withdraw", icon: "🏦", id: "withdraw" },
          ].map(item=>(
            <button key={item.id} onClick={()=>{setActiveBottom(item.label); setShowModal(item.id);}} style={{ background: activeBottom===item.label?"#00E67622":"#121C12", border: activeBottom===item.label?"1px solid #00E676":"1px solid #1E2F1E", borderRadius: "12px", padding: "10px 4px", textAlign: "center" }}>
              <div style={{ fontSize: "16px" }}>{item.icon}</div>
              <div style={{ fontSize: "9px", marginTop: "2px", fontWeight: "800", color: activeBottom===item.label?"#00E676":"#888" }}>{item.label}</div>
              {activeBottom===item.label && <div style={{ width: "20px", height: "2px", background: "#00E676", margin: "3px auto 0", borderRadius: "2px" }}></div>}
            </button>
          ))}
        </div>
      </div>

      {/* ALL MODALS WORKING */}
      {showModal && (
        <div onClick={()=>setShowModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", zIndex: 50 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background: "#121C12", border: "1px solid #00E676", borderRadius: "16px", padding: "20px", width: "100%", maxWidth: "340px" }}>
            {showModal==="earnings" && <><div style={{ fontSize: "18px", fontWeight: "900" }}>💰 Earnings</div><div style={{ fontSize: "32px", fontWeight: "900", color: "#00E676", marginTop: "12px" }}>₦{earnings.total.toLocaleString()}</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>Total: 45 recordings<br/>Rate: ₦30 per clip<br/>Next payout: Friday</div></>}
            {showModal==="pending" && <><div style={{ fontSize: "18px", fontWeight: "900" }}>🕐 Pending</div><div style={{ fontSize: "32px", fontWeight: "900", color: "#FFC107", marginTop: "12px" }}>₦{earnings.pending}</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>15 clips under review<br/>Usually approved in 24hrs</div></>}
            {showModal==="approved" && <><div style={{ fontSize: "18px", fontWeight: "900" }}>✅ Approved Clips</div><div style={{ fontSize: "32px", fontWeight: "900", marginTop: "12px" }}>{earnings.approved}</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>87 clips approved<br/>Quality score: 4.8/5.0</div></>}
            {showModal==="levels" && <><div style={{ fontSize: "18px", fontWeight: "900" }}>👑 Pro Level</div><div style={{ fontSize: "12px", color: "#00E676", marginTop: "8px", fontWeight: "800" }}>You are Pro Level Worker!</div><div style={{ background: "#000", height: "8px", borderRadius: "10px", marginTop: "12px" }}><div style={{ width: "70%", height: "100%", background: "#00E676", borderRadius: "10px" }}></div></div><div style={{ fontSize: "10px", color: "#888", marginTop: "6px" }}>70% to Master Level (500 clips)</div></>}
            {showModal==="withdraw" && <><div style={{ fontSize: "18px", fontWeight: "900" }}>💳 Withdraw</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>Available: ₦1,250<br/>Min withdrawal: ₦1,000</div><button onClick={()=>{alert("Withdraw request sent!"); setShowModal(null);}} style={{ width: "100%", marginTop: "14px", background: "#00E676", color: "black", border: "none", padding: "12px", borderRadius: "10px", fontWeight: "900" }}>Withdraw ₦1,250</button></>}
            {showModal==="profile" && <><div style={{ fontSize: "18px", fontWeight: "900" }}>👤 WORKER-1234</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>📍 Lagos<br/>🎤 Lagos Pidgin<br/>⭐ Pro Level<br/>📅 Joined: Oct 2024</div></>}
            {showModal==="crown" && <><div style={{ fontSize: "18px", fontWeight: "900" }}>👑 Leaderboard</div><div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>Your rank: #12<br/>Top worker: 892 clips<br/>Keep recording to rank up!</div></>}
            <button onClick={()=>setShowModal(null)} style={{ width: "100%", marginTop: "16px", background: "#222", color: "white", border: "none", padding: "10px", borderRadius: "10px", fontWeight: "800" }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}