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
  const [taskProgress, setTaskProgress] = useState({ total: 46, today: 0 });
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ✅ FIXED - NO MORE 1500 - COMPLETE TEXT
  const allSentences: Record<string, string[]> = {
    Pidgin: [
      "How you dey? I dey come now",
      "Abeg help me, I no sabi road",
      "Wetin dey happen for here?",
      "I wan chop, I dey hungry",
      "Good morning, how your night be?",
      "How far? Make we go together",
      "No vex, traffic hold me for road",
      "Wetin you talk? Repeat am again",
      "My name na Emeka, I dey stay Lagos",
      "I dey go market now, you dey come?",
      "Omo this Naija sun too hot today",
      "Abeg shift small, make I pass",
      "I don tire, work too much today",
      "Shey you don chop? Food don ready",
      "For inside this life, na patience",
      "You sabi this place? I be new here",
      "Come make we gist small",
      "I wan buy fuel, where station dey?",
      "NEPA don take light again",
      "How your family? Dem dey fine?"
    ],
    Igbo: ["Kedu ka i mere?", "Ana m abia ugbu a", "Biko nyere m aka", "Kedu ihe na eme?", "Ututu oma", "Kedu aha gi? Aha m bu Chinedu", "Ana m aga ahia", "Ndewo, kedu ka ezi nulo gi di?", "Daalu, imela", "Chineke gozie gi"],
    Hausa: ["Yaya kake? Ina kwana?", "Ina zuwa yanzu", "Don Allah ka taimake ni", "Me ke faruwa?", "Ina jin yunwa", "Menene sunanka? Sunana Musa", "Ina zuwa kasuwa", "Sannu, yaya iyalinka?", "Na gode sosai", "Allah ya saka"],
    Yoruba: ["Bawo ni? Mo wa daadaa", "Mo n bo nisisinyi", "Ejo e ran mi lowo", "Kini n sele?", "Ebi n pa mi", "Kini oruko re? Oruko mi ni Tolu", "Mo n lo si oja", "Bawo ni ebi yin?", "E seun pupo", "Olorun a bukun yin"],
  };

  const sentences = allSentences[selectedLang];

  useEffect(() => {
    const saved = localStorage.getItem("naija_progress");
    if (saved) { try { const p = JSON.parse(saved); setTaskProgress({ total: p.progress.total, today: p.progress.today >=5 ? 0 : p.progress.today }); setEarnings(p.earnings); setCurrentSentenceIndex(p.index || 0); } catch {} }
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

  // ✅ FIXED - SAVE AUDIO DATA + 5 PER DAY - VOICE COMPLETE
  const saveAndNext = async () => {
    if (taskProgress.today >= 5) { showToast("You don finish 5 for today! Come tomorrow ✓"); return; }
    if (!audioURL) { alert("Record first!"); return; }
    const blob = await fetch(audioURL).then(r => r.blob());
    const reader = new FileReader();
    reader.onload = () => {
      const existing = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
      const fileName = `recording-${selectedLang}-${Date.now()}.webm`;
      const newFile = { id: Date.now(), lang: selectedLang, sentence: sentences[currentSentenceIndex], fileName, audioData: reader.result, time: new Date().toISOString() };
      existing.unshift(newFile);
      localStorage.setItem("gin_recordings", JSON.stringify(existing.slice(0,100)));
      setSavedFiles(existing.slice(0,100));
      const newEarnings = { total: earnings.total + 30, pending: earnings.pending + 30, approved: earnings.approved + 1 };
      const newProgress = { total: taskProgress.total + 1, today: taskProgress.today + 1 };
      const nextIndex = (currentSentenceIndex + 1) % sentences.length;
      setEarnings(newEarnings); setTaskProgress(newProgress); setCurrentSentenceIndex(nextIndex);
      localStorage.setItem("naija_progress", JSON.stringify({ progress: newProgress, earnings: newEarnings, index: nextIndex }));
      setAudioURL(null); setTimer(0);
      if (newProgress.today >= 5) showToast("5/5 DONE! Come back tomorrow ✓");
      else showToast(`SAVED! ${newProgress.today}/5 today`);
    };
    reader.readAsDataURL(blob);
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop()); }; }, []);
  useEffect(() => { setCurrentSentenceIndex(0); setAudioURL(null); setTimer(0); }, [selectedLang]);

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#00E676", color: "black", padding: "10px 18px", borderRadius: 20, fontSize: 12, fontWeight: 900, zIndex: 100 }}>{toast}</div>}
      <div style={{ maxWidth: 390, margin: "0 auto", padding: 10, paddingBottom: 90 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div><div style={{ display: "flex", gap: 8 }}><h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Worker Dashboard</h1><span>🇳🇬</span></div><div style={{ fontSize: 11, color: "#aaa" }}>Welcome, WORKER-1234{savedFiles.length>0?` - ${savedFiles.length} files`:''} <span style={{ color: "#00E676", fontSize: 10 }}> ● Online</span></div></div>
          <div style={{ width: 10, height: 10, background: "#00E676", borderRadius: 50 }}></div>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {["Pidgin","Igbo","Hausa","Yoruba"].map(lang=>(
            <button key={lang} onClick={()=>setSelectedLang(lang)} style={{ flex: 1, padding: "10px 0", borderRadius: 20, fontSize: 11, fontWeight: 900, border: selectedLang===lang?"1.5px solid #00E676":"1px solid #2A3A2A", background: selectedLang===lang?"#00E676":"#222", color: selectedLang===lang?"black":"#aaa" }}>{lang}</button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, fontWeight: 800 }}>Main Task Workspace</span><span style={{ fontSize: 10, color: "#888" }}>{taskProgress.total}/500 Total | Today {taskProgress.today}/5</span></div>
          <div style={{ width: "100%", height: 6, background: "#1A2A1A", borderRadius: 10, marginTop: 4 }}><div style={{ width: `${(taskProgress.total/500)*100}%`, height: "100%", background: "#00E676" }}></div></div>
        </div>
        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: 16, padding: 14, marginTop: 12 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}><span style={{ fontSize: 11, fontWeight: 800 }}>🎙️ Recording Studio</span><span style={{ fontSize: 10, color: "#888" }}> - {selectedLang} - {currentSentenceIndex+1}/{sentences.length}</span></div>
          <div style={{ textAlign: "center", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><p style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{sentences[currentSentenceIndex]}</p></div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <button onClick={toggleRecording} style={{ width: 68, height: 68, borderRadius: 50, background: isRecording?"#CC0000":"#E53935", border: "4px solid #7f1d1d" }}>
              {isRecording ? <div style={{ width: 22, height: 22, background: "white", borderRadius: 3, margin: "auto" }}></div> : <div style={{ width: 24, height: 24, background: "#7f1d1d", borderRadius: 50, margin: "auto" }}></div>}
            </button>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: "#ff5252", fontFamily: "monospace", fontWeight: 700 }}>REC {formatTime(timer)} / 00:15</div>
          {audioURL && <audio controls src={audioURL} style={{ width: "100%", margin: "12px 0", height: 32 }} />}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reRecord} style={{ flex: 1, background: "#1E2F1E", border: "1px solid #2A4A2A", color: "#ccc", padding: 13, borderRadius: 12, fontSize: 12, fontWeight: 800 }}>↻ Re-record</button>
            <button onClick={saveAndNext} style={{ flex: 1.5, background: taskProgress.today>=5?"#333":"#00E676", color: taskProgress.today>=5?"#888":"black", border: "none", padding: 13, borderRadius: 12, fontSize: 12, fontWeight: 900 }}>{taskProgress.today>=5?"Done for today":"Save & Next →"}</button>
          </div>
        </div>

        {savedFiles.length > 0 && (
          <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10, marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#00E676", marginBottom: 6 }}>📂 {savedFiles.length} Files Saved - VOICE COMPLETE ✓</div>
            {savedFiles.slice(0,5).map((f:any)=>(
              <div key={f.id} style={{ background: "#121C12", padding: 6, borderRadius: 8, marginTop: 6 }}>
                <div style={{ fontSize: 9, color: "#aaa" }}>{f.fileName} - {f.sentence}</div>
                {f.audioData && <audio controls src={f.audioData} style={{ width: "100%", height: 25, marginTop: 4 }} />}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 9, color: "#888" }}>💳 Earnings</div><div style={{ fontSize: 16, fontWeight: 900 }}>₦{earnings.total.toLocaleString()}</div></div>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 9, color: "#FFC107" }}>🕐 Pending</div><div style={{ fontSize: 16, fontWeight: 900 }}>₦{earnings.pending}</div></div>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 9, color: "#888" }}>✅ Approved</div><div style={{ fontSize: 16, fontWeight: 900 }}>{earnings.approved} clips</div></div>
        </div>
      </div>
    </div>
  );
}