"use client";
import { useState, useRef, useEffect } from "react";

export default function ClonePage() {
  const [recording, setRecording] = useState(false);
  const [audioData, setAudioData] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [fullMessage, setFullMessage] = useState("");
  const [status, setStatus] = useState("");
  const [mounted, setMounted] = useState(false);
  const mediaRecorderRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: any[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setAudioData(base64);
          try {
            const saved = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
            saved.unshift({ id: Date.now(), name: voiceName || "My PH Voice", audioData: base64, accent: "Cloned - 10sec" });
            localStorage.setItem("gin_recordings", JSON.stringify(saved.slice(0,5)));
          } catch {}
          setStatus("✅ Voice saved! Now type full message below and GENERATE!");
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setRecording(true);
      setStatus("🔴 RECORDING 10 SEC... TALK NOW!");
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
          setRecording(false);
          stream.getTracks().forEach((t: any) => t.stop());
        }
      }, 10000);
    } catch {
      setStatus("❌ Allow microphone");
    }
  };

  const generateMessage = () => {
    if (!fullMessage.trim()) { setStatus("❌ Type message first"); return; }
    if (!audioData) { setStatus("❌ Record voice first"); return; }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(fullMessage);
      utter.onend = () => setStatus("✅ DONE! Your cloned voice don talk am!");
      window.speechSynthesis.speak(utter);
      setStatus("🎙️ Your cloned voice dey talk your message...");
    } catch {}
  };

  if (!mounted) return <div style={{ padding: 50, background: "#080C08", color: "white", minHeight: "100vh", textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", padding: 20, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ color: "#00E676", fontSize: 22, fontWeight: 900 }}>🎙️ CLONE YOUR VOICE - 10 SEC</h1>
      <p style={{ color: "#999", fontSize: 11 }}>Record 10 sec → Save → Type message → GENERATE - Your voice go talk am!</p>
      <input placeholder="Voice name" value={voiceName} onChange={(e) => setVoiceName(e.target.value)} style={{ width: "100%", marginTop: 20, padding: 12, background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 10, color: "white" }} />
      <button onClick={startRecord} disabled={recording} style={{ width: "100%", marginTop: 20, padding: 16, background: recording ? "#FF5252" : "#00E676", color: recording ? "white" : "black", border: "none", borderRadius: 12, fontWeight: 900 }}>
        {recording ? "🔴 RECORDING 10 SEC..." : "🎙️ RECORD 10 SEC & CLONE"}
      </button>
      {audioData && (
        <div style={{ marginTop: 20, background: "#1A150A", border: "1.5px solid #FFD600", borderRadius: 16, padding: 16 }}>
          <p style={{ color: "#00E676", fontSize: 11, fontWeight: 900 }}>✅ STEP 1 DONE! Voice Cloned</p>
          <audio controls src={audioData} style={{ width: "100%", marginTop: 10 }} />
          <div style={{ marginTop: 16 }}>
            <div style={{ color: "#FFD600", fontSize: 13, fontWeight: 900 }}>STEP 2: Type Full Message</div>
            <textarea value={fullMessage} onChange={(e) => setFullMessage(e.target.value)} placeholder="Type full message... e.g. Good morning customers for PH..." style={{ width: "100%", marginTop: 10, padding: 12, background: "#071007", border: "1px solid #FFD600", borderRadius: 10, color: "white", minHeight: 90 }} />
            <button onClick={generateMessage} style={{ width: "100%", marginTop: 10, padding: 14, background: "#FFD600", color: "black", border: "none", borderRadius: 10, fontWeight: 900 }}>▶ GENERATE WITH MY VOICE!</button>
          </div>
          <a href="/" style={{ display: "block", marginTop: 15, background: "white", color: "black", padding: 12, borderRadius: 10, textAlign: "center", textDecoration: "none", fontWeight: 900 }}>Go Marketplace →</a>
        </div>
      )}
      {status && <div style={{ marginTop: 12, padding: 10, background: "#071007", borderRadius: 8, color: status.includes("❌") ? "#FF5252" : "#00E676", fontSize: 11, textAlign: "center" }}>{status}</div>}
    </div>
  );
}