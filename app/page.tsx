"use client";
import { useState, useRef, useEffect } from "react";

export default function WorkerDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState("Pidgin");
  const [showModal, setShowModal] = useState<string | null>(null);
  const [earnings, setEarnings] = useState({ total: 1250, pending: 450, approved: 87 });
  const [taskProgress, setTaskProgress] = useState({ total: 45, today: 12 });
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const allSentences: Record<string, string[]> = {
    Pidgin: ["How you dey? I dey come now now.", "Abeg come help me for here.", "Wetin dey happen for Lagos today?", "I no go gree make dem cheat me.", "Oga, how much be this?", "Make we go market tomorrow morning.", "My pikin dey school for Port Harcourt."],
    Igbo: ["Kedu? Ana m abia ugbu a.", "Biko nyere m aka.", "Kedu ihe na-eme?", "Agaghi m ekwe ka ha ghogbuo m.", "Oga, ego ole ka nke a bu?", "Anyi ga-aga ahia echi."],
    Hausa: ["Yaya kake? Ina zuwa yanzu.", "Don Allah ka taimake ni.", "Me ke faruwa?", "Ba zan yarda su yaudare ni ba.", "Oga, nawa ne wannan?", "Mu je kasuwa gobe."],
    Yoruba: ["Bawo ni? Mo n bo nisisinyi.", "Ejo e ran mi lowo.", "Kini n sele?", "Mi o ni gba ki won tan mi.", "Oga, elo ni eyi?", "Jeka lo si oja laaro."],
  };

  const sentences = allSentences[selectedLang];

  useEffect(() => {
    const saved = localStorage.getItem("naija_progress");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setTaskProgress(p.progress);
        setEarnings(p.earnings);
        setCurrentSentenceIndex(p.index || 0);
      } catch {}
    }
    setSavedFiles(JSON.parse(localStorage.getItem("gin_recordings") || "[]"));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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
      timerRef.current = setInterval(() => setTimer((p: number) => p + 1), 1000);
    } catch { alert("Abeg allow microphone!"); }
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

  // ✅ FIXED - SAFE TO PHONE FILE
  const saveAndNext = async () => {
    if (!audioURL) { alert("🎤 Record first!"); return; }

    try {
      const blob = await fetch(audioURL).then(r => r.blob());
      const fileName = `GIN-${selectedLang}-${Date.now()}.webm`;
      
      // FIXED SAVE - PHONE MUST DOWNLOAD
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a); // FIX FOR PHONE!
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 500);

      // Save for Chairman as file
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = {
          id: Date.now(),
          worker_id: "WORKER-1234",
          lang: selectedLang,
          sentence: sentences[currentSentenceIndex],
          fileName,
          audioData: reader.result,
          time: new Date().toISOString(),
          earnings: 30,
          status: "saved_to_phone",
          approved: false
        };
        const old = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
        old.unshift(data);
        localStorage.setItem("gin_recordings", JSON.stringify(old.slice(0,100)));
        setSavedFiles(old.slice(0,100));
      };
      reader.readAsDataURL(blob);

      // Next
      const newEarnings = { total: earnings.total + 30, pending: earnings.pending + 30, approved: earnings.approved };
      const newProgress = { total: taskProgress.total + 1, today: taskProgress.today + 1 };
      const nextIndex = (currentSentenceIndex + 1) % sentences.length;
      setEarnings(newEarnings);
      setTaskProgress(newProgress);
      setCurrentSentenceIndex(nextIndex);
      localStorage.setItem("naija_progress", JSON.stringify({ progress: newProgress, earnings: newEarnings, index: nextIndex }));
      setAudioURL(null); 
      setTimer(0);
      showToast(`✅ SAVED TO PHONE FILE: ${fileName} ₦30`);
    } catch (e) {
      alert("Save fail: " + e);
    }
  };

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop()); }; }, []);
  useEffect(() => { setCurrentSentenceIndex(0); setAudioURL(null); setTimer(0); }, [selectedLang]);

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#00E676", color: "black", padding: "10px 18px", borderRadius: "20px", fontSize: "12px", fontWeight: "900", zIndex: 100 }}>{toast}</div>}
      <div style={{ maxWidth: "390px", margin: "0 auto", padding: "10px", paddingBottom: "90px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <div><h1 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>Worker Dashboard 🇳🇬</h1><div style={{ fontSize: "11px", color: "#aaa" }}>WORKER-1234 ● {savedFiles.length} files saved to phone</div></div>
          <div style={{ width: "10px", height: "10px", background: "#00E676", borderRadius: "50%" }}></div>
        </div>
        <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
          {["Pidgin","Igbo","Hausa","Yoruba"].map(lang=>(
            <button key={lang} onClick={()=>setSelectedLang(lang)} style={{ flex: 1, padding: "10px 0", borderRadius: "20px", fontSize: "11px", fontWeight: "900", border: selectedLang===lang?"1.5px solid #00E676":"1px solid #2A3A2A", background: selectedLang===lang?"#00E676":"#222", color: selectedLang===lang?"black":"#aaa" }}>{lang}</button>
          ))}
        </div>
        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: "16px", padding: "14px", marginTop: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: "800", marginBottom: "10px" }}>🎙️ {selectedLang} — {currentSentenceIndex+1}/{sentences.length}</div>
          <div style={{ textAlign: "center", minHeight: "48px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "14px" }}><p style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>{sentences[currentSentenceIndex]}</p></div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
            <button onClick={toggleRecording} style={{ width: "70px", height: "70px", borderRadius: "50%", background: isRecording?"#CC0000":"#E53935", border: "4px solid #7f1d1d" }}>
              {isRecording ? <div style={{ width: "22px", height: "22px", background: "white", borderRadius: "3px", margin: "auto" }}></div> : <div style={{ width: "26px", height: "26px", background: "#7f1d1d", borderRadius: "50%", margin: "auto" }}></div>}
            </button>
          </div>
          <div style={{ textAlign: "center", fontSize: "11px", color: "#ff5252", fontFamily: "monospace" }}>REC {formatTime(timer)} / 00:15</div>
          {audioURL && <audio controls src={audioURL} style={{ width: "100%", margin: "12px 0", height: "36px" }} />}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={reRecord} style={{ flex: 1, background: "#1E2F1E", color: "#ccc", padding: "14px", borderRadius: "12px", border: "1px solid #2A4A2A" }}>↻ Re-record</button>
            <button onClick={saveAndNext} style={{ flex: 1.6, background: audioURL ? "#00E676" : "#1A3A1A", color: audioURL ? "black" : "#666", padding: "14px", borderRadius: "12px", border: "none", fontWeight: "900" }}>{audioURL ? "💾 SAVE TO PHONE FILE →" : "Save & Next →"}</button>
          </div>
        </div>
        {savedFiles.length > 0 && (
          <div style={{ marginTop: "12px", background: "#0A150A", border: "1px solid #00E67640", borderRadius: "12px", padding: "10px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#00E676" }}>📁 {savedFiles.length} Files Saved to Phone for Chairman</div>
            {savedFiles.slice(0,3).map((f: any)=> <div key={f.id} style={{ fontSize: "10px", color: "#aaa", marginTop: "4px" }}>• {f.fileName} — {f.sentence.slice(0,20)}...</div>)}
          </div>
        )}
      </div>
    </div>
  );
}