"use client";
import { useState, useRef, useEffect } from "react";

export default function WorkerDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(3);
  const [selectedLang, setSelectedLang] = useState("Pidgin");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sentences: Record<string, string> = {
    Pidgin: "How you dey?\nI dey come now now.",
    Igbo: "Kedu?\nAna m abịa ugbu a.",
    Hausa: "Yaya kake?\nIna zuwa yanzu.",
    Yoruba: "Bawo ni?\nMo n bọ nísinsìnyí.",
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
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
      timerIntervalRef.current = setInterval(() => setTimer(p => p + 1), 1000);
      if (navigator.vibrate) navigator.vibrate(100);
    } catch { alert("Allow microphone!"); }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const reRecord = () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); }
    setAudioURL(null); setTimer(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const saveAndNext = () => {
    if (!audioURL) { alert("Record first!"); return; }
    const a = document.createElement("a"); a.href = audioURL;
    a.download = `recording-${selectedLang}-${Date.now()}.webm`; a.click();
    setAudioURL(null); setTimer(0);
    alert("Saved! Next task.");
  };

  useEffect(() => { return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); streamRef.current?.getTracks().forEach(t => t.stop()); } }, []);

  return (
    <div style={{ background: "#080E08", minHeight: "100vh", color: "white", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: "390px", margin: "0 auto", padding: "14px 12px 30px" }}>
        
        {/* Header like screenshot */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "17px", fontWeight: "900", margin: 0 }}>Worker Dashboard</h1>
              <span style={{ fontSize: "16px" }}>🇳🇬</span>
            </div>
            <div style={{ fontSize: "11px", color: "#aaa", marginTop: "2px" }}>
              Welcome, <span style={{ color: "white", fontWeight: "800" }}>WORKER-1234</span> 
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginLeft: "6px" }}>
                <span style={{ width: "6px", height: "6px", background: "#00E676", borderRadius: "50%", display: "inline-block" }}></span>
                <span style={{ color: "#00E676", fontSize: "10px" }}>Online</span>
              </span>
            </div>
          </div>
          <div style={{ width: "10px", height: "10px", background: "#00E676", borderRadius: "50%", marginTop: "6px", boxShadow: "0 0 8px #00E676" }}></div>
        </div>

        {/* Profile Card */}
        <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "14px", padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#0F2A14", border: "1.5px solid #00E676", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>👤</div>
            <div>
              <div style={{ fontWeight: "900", fontSize: "12px" }}>WORKER-1234</div>
              <div style={{ fontSize: "10px", color: "#999", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>📍 Location: Lagos</div>
              <div style={{ fontSize: "10px", color: "#999", display: "flex", alignItems: "center", gap: "4px" }}>🎤 Accent: Lagos Pidgin</div>
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#0F2A14", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #1E3A1E" }}>
              <span style={{ color: "#00E676", fontSize: "14px" }}>★</span>
            </div>
            <div style={{ fontSize: "9px", color: "#00E676", fontWeight: "800", marginTop: "3px" }}>Pro<br/>Level</div>
          </div>
        </div>

        {/* Language Tabs */}
        <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
          {["Pidgin","Igbo","Hausa","Yoruba"].map(lang=>(
            <button key={lang} onClick={()=>setSelectedLang(lang)} style={{ flex: 1, padding: "9px 0", borderRadius: "8px", fontSize: "11px", fontWeight: "900", border: selectedLang===lang?"none":"1px solid #1E2F1E", background: selectedLang===lang?"#00E676":"#121C12", color: selectedLang===lang?"black":"#aaa" }}>
              [{lang}]
            </button>
          ))}
        </div>

        {/* Main Task Workspace */}
        <div style={{ marginTop: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <span style={{ color: "#00E676", fontSize: "12px" }}>◉</span>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#00E676" }}>Main Task Workspace</span>
          </div>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "900" }}>45 <span style={{ fontWeight: "400", color: "#888", fontSize: "12px" }}>/ 500 Recorded</span></div>
              <div style={{ width: "90px", height: "6px", background: "#1A2A1A", borderRadius: "10px", marginTop: "6px" }}>
                <div style={{ width: "18%", height: "100%", background: "#00E676", borderRadius: "10px" }}></div>
              </div>
            </div>
            <div style={{ background: "#0A1A0F", border: "1px solid #1E2F1E", borderRadius: "8px", padding: "6px 10px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "10px", color: "#ccc" }}>Today: <span style={{ color: "#00E676", fontWeight: "800" }}>12 / 50</span></span>
              <span style={{ color: "#00E676" }}>↗</span>
            </div>
          </div>
        </div>

        {/* Recording Studio - EXACT LIKE SCREENSHOT */}
        <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "14px", padding: "12px", marginTop: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <span style={{ color: "#00E676", fontSize: "12px" }}>🎙️</span>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#00E676" }}>Recording Studio</span>
          </div>
          
          <div style={{ textAlign: "center", marginBottom: "16px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "17px", fontWeight: "900", lineHeight: "22px", whiteSpace: "pre-line", margin: 0 }}>{sentences[selectedLang]}</p>
          </div>

          {/* Red Record Button */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
            <button onClick={toggleRecording} style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#E53935", border: "4px solid #7f1d1d", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isRecording ? "0 0 30px rgba(229,57,53,0.8)" : "0 0 18px rgba(229,57,53,0.5)", transition: "all 0.2s" }}>
              {isRecording ? <div style={{ width: "24px", height: "24px", background: "white", borderRadius: "3px" }}></div> : <div style={{ width: "28px", height: "28px", background: "#7f1d1d", borderRadius: "50%" }}></div>}
            </button>
          </div>

          <div style={{ textAlign: "center", fontSize: "12px", fontFamily: "monospace", color: "#ff5252", marginBottom: "12px", fontWeight: "700" }}>{formatTime(timer)} / 00:15</div>

          {/* Waveform + Play */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1A2E1A", border: "1px solid #2A4A2A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>▶</div>
            <div style={{ flex: 1, height: "24px", display: "flex", alignItems: "center", gap: "2px" }}>
              {Array.from({ length: 38 }).map((_, i) => (
                <div key={i} style={{ flex: 1, height: `${4 + Math.random() * 18}px`, background: isRecording || audioURL ? "#00E676" : "#1A3A1A", borderRadius: "2px", opacity: isRecording ? 0.6 + Math.random()*0.4 : 1 }}></div>
              ))}
            </div>
            <div style={{ width: "28px", height: "2px", background: "#00E676", borderRadius: "2px" }}></div>
          </div>

          {audioURL && <audio controls src={audioURL} style={{ width: "100%", marginBottom: "12px", height: "32px" }} />}

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={reRecord} style={{ flex: 1, background: "#1A2E1A", border: "1px solid #2A4A2A", color: "#aaa", padding: "12px", borderRadius: "10px", fontSize: "11px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>↻ Re-record</button>
            <button onClick={saveAndNext} style={{ flex: 1.4, background: "#00E676", color: "black", border: "none", padding: "12px", borderRadius: "10px", fontSize: "11px", fontWeight: "900", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>↑ Save & Next</button>
          </div>
        </div>

        {/* Earnings Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginTop: "10px" }}>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px", display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{ fontSize: "16px" }}>💰</div>
            <div><div style={{ fontSize: "8px", color: "#888" }}>Earnings</div><div style={{ fontSize: "12px", fontWeight: "900", color: "#00E676" }}>₦1,250</div></div>
          </div>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px", display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{ fontSize: "16px" }}>🕒</div>
            <div><div style={{ fontSize: "8px", color: "#888" }}>Pending</div><div style={{ fontSize: "12px", fontWeight: "900", color: "#00E676" }}>₦450</div></div>
          </div>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px", display: "flex", gap: "6px", alignItems: "center" }}>
            <div style={{ fontSize: "16px" }}>✅</div>
            <div><div style={{ fontSize: "8px", color: "#888" }}>Approved clips</div><div style={{ fontSize: "12px", fontWeight: "900" }}>87</div></div>
          </div>
        </div>

        {/* Bottom Nav */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginTop: "8px" }}>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
            <span>📊</span><span style={{ fontSize: "10px", color: "#aaa" }}>Earnings</span>
          </div>
          <div style={{ background: "#00E676", borderRadius: "12px", padding: "10px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
            <span>👑</span><span style={{ fontSize: "10px", color: "black", fontWeight: "900" }}>Levels</span>
          </div>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px", display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
            <span>💳</span><span style={{ fontSize: "10px", color: "#aaa" }}>Withdraw</span>
          </div>
        </div>

      </div>
    </div>
  );
}