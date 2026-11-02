"use client";
import { useState, useRef } from "react";

export default function ClonePage() {
  const [recording, setRecording] = useState(false);
  const [audioData, setAudioData] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const mediaRecorderRef = useRef<any>(null);

  const startRecord = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    const chunks: any[] = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/mp3" });
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAudioData(base64);
        // Save to marketplace
        const saved = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
        saved.push({
          id: Date.now(),
          name: voiceName || `Chairman Voice ${saved.length + 1}`,
          audioData: base64,
          accent: "Chairman - Original",
        });
        localStorage.setItem("gin_recordings", JSON.stringify(saved));
        alert("✅ Voice cloned! Go marketplace to hear am!");
      };
      reader.readAsDataURL(blob);
    };

    recorder.start();
    setRecording(true);
    setTimeout(() => {
      recorder.stop();
      setRecording(false);
      stream.getTracks().forEach(t => t.stop());
    }, 5000); // 5 sec record
  };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", padding: 20, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ color: "#00E676", fontSize: 22, fontWeight: 900 }}>🎙️ CLONE YOUR VOICE</h1>
      <p style={{ color: "#999", fontSize: 11 }}>Record 5 sec - E go clone for marketplace</p>

      <input
        placeholder="Voice name - e.g. My PH Voice"
        value={voiceName}
        onChange={(e) => setVoiceName(e.target.value)}
        style={{ width: "100%", marginTop: 20, padding: 12, background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 10, color: "white" }}
      />

      <button
        onClick={startRecord}
        disabled={recording}
        style={{
          width: "100%", marginTop: 20, padding: 16,
          background: recording ? "#FF5252" : "#00E676",
          color: recording ? "white" : "black",
          border: "none", borderRadius: 12, fontWeight: 900, fontSize: 14
        }}
      >
        {recording ? "🔴 RECORDING... TALK NOW! (5 sec)" : "🎙️ HOLD & CLONE MY VOICE"}
      </button>

      {audioData && (
        <div style={{ marginTop: 20 }}>
          <p style={{ color: "#00E676", fontSize: 11 }}>✅ Cloned! Preview:</p>
          <audio controls src={audioData} style={{ width: "100%" }} />
          <a href="/" style={{ display: "block", marginTop: 15, background: "white", color: "black", padding: 12, borderRadius: 10, textAlign: "center", textDecoration: "none", fontWeight: 900 }}>
            Go Marketplace → Hear Your Clone
          </a>
        </div>
      )}

      <div style={{ marginTop: 30, background: "#121C12", padding: 12, borderRadius: 10 }}>
        <div style={{ color: "white", fontSize: 12, fontWeight: 800 }}>How clone dey work for phone:</div>
        <div style={{ color: "#999", fontSize: 10, marginTop: 6, lineHeight: 1.6 }}>
          1. Type your voice name<br/>
          2. Click clone button<br/>
          3. Talk for 5 seconds for your phone mic<br/>
          4. E go save auto for marketplace<br/>
          5. Your voice go show for "YOUR VOICE READY"
        </div>
      </div>
    </div>
  );
}