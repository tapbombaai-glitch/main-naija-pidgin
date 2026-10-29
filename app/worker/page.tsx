"use client";
import Link from "next/link";
import { useState, useRef } from "react";

export default function WorkerPanelReal() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setHasRecording(true);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setHasRecording(false);
      setSeconds(0);
      setAudioUrl("");

      // REAL COUNTING TIMER
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      setError("Mic blocked! Allow microphone for this site for Chrome settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "white", padding: "20px", fontFamily: "sans-serif" }}>
      <Link href="/" style={{ color: "#22c55e", fontSize: "14px" }}>← Back Home</Link>

      <div style={{ maxWidth: "600px", margin: "30px auto" }}>
        <h1 style={{ color: "#22c55e", fontSize: "20px" }}>🎙️ Worker Panel - Level 2 REAL</h1>
        <p style={{ color: "#888", fontSize: "12px" }}>Real Mic + Real Counting Timer</p>

        <div style={{ marginTop: "16px", padding: "16px", background: "#0a0a0a", border: "1px solid #222", borderRadius: "12px" }}>
          <p style={{ fontSize: "11px", color: "#22c55e" }}>TODAY'S SENTENCE:</p>
          <p style={{ fontSize: "18px", marginTop: "6px", fontWeight: "bold" }}>"How you dey? How body? You don chop?"</p>
        </div>

        {error && <p style={{ marginTop: "12px", background: "#2a1212", border: "1px solid #5a2222", color: "#ff5555", padding: "10px", borderRadius: "8px", fontSize: "13px" }}>{error}</p>}

        <div style={{ marginTop: "16px", padding: "24px", background: "#0a0a0a", border: isRecording ? "2px solid #ff4444" : "1px solid #333", borderRadius: "16px", textAlign: "center" }}>
          
          <div style={{ fontSize: "36px", fontWeight: "bold", color: isRecording ? "#ff4444" : "white", fontFamily: "monospace" }}>
            {formatTime(seconds)}
          </div>
          <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{isRecording ? "● REC — dey count..." : hasRecording ? "Done" : "Ready"}</p>

          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: isRecording ? "#ff4444" : "#22c55e", margin: "16px auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", animation: isRecording ? "pulse 0.8s infinite" : "none" }}>
            🎤
          </div>

          {!isRecording ? (
            <button onClick={startRecording} style={{ width: "100%", padding: "14px", background: "#22c55e", color: "black", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
              Start Recording (Real Mic)
            </button>
          ) : (
            <button onClick={stopRecording} style={{ width: "100%", padding: "14px", background: "#ff4444", color: "white", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
              Stop Recording — {formatTime(seconds)}
            </button>
          )}

          {hasRecording && audioUrl && (
            <div style={{ marginTop: "16px", textAlign: "left" }}>
              <p style={{ fontSize: "12px", color: "#22c55e" }}>✓ Your voice recorded — {formatTime(seconds)}s</p>
              <audio controls src={audioUrl} style={{ width: "100%", marginTop: "10px" }} />
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={() => { setHasRecording(false); setAudioUrl(""); setSeconds(0); }} style={{ flex: 1, padding: "10px", background: "#111", border: "1px solid #333", color: "#aaa", borderRadius: "8px" }}>Record Again</button>
                <button style={{ flex: 1, padding: "10px", background: "#22c55e", border: "none", color: "black", borderRadius: "8px", fontWeight: "bold" }}>Submit to Chairman →</button>
              </div>
            </div>
          )}
        </div>

        <p style={{ marginTop: "12px", textAlign: "center", color: "#555", fontSize: "11px" }}>Level 2 REAL — Timer dey count, Mic na real — Next na Level 3 save to Supabase</p>
      </div>
    </div>
  );
}