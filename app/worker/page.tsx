"use client";
import Link from "next/link";
import { useState, useRef } from "react";

export default function WorkerPanelLevel2() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [sentence] = useState("How you dey? How body? You don chop?");
  const timerRef = useRef<any>(null);

  const toggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasRecording(true);
      clearTimeout(timerRef.current);
    } else {
      setIsRecording(true);
      setHasRecording(false);
      // Fake 3 sec recording
      timerRef.current = setTimeout(() => {
        setIsRecording(false);
        setHasRecording(true);
      }, 3000);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "white", padding: "20px", fontFamily: "sans-serif" }}>
      <Link href="/" style={{ color: "#22c55e", fontSize: "14px" }}>← Back Home</Link>

      <div style={{ maxWidth: "600px", margin: "30px auto" }}>
        <h1 style={{ color: "#22c55e" }}>🎙️ Worker Panel - Level 2</h1>
        <p style={{ color: "#888", fontSize: "13px" }}>Test Mic + Submit UI (No database yet)</p>

        <div style={{ marginTop: "20px", padding: "16px", background: "#0a0a0a", border: "1px solid #222", borderRadius: "12px" }}>
          <p style={{ fontSize: "12px", color: "#22c55e", letterSpacing: "1px" }}>TODAY'S SENTENCE:</p>
          <p style={{ fontSize: "20px", marginTop: "8px", fontWeight: "bold" }}>"{sentence}"</p>
          
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button style={{ padding: "8px 12px", background: "#111", border: "1px solid #333", borderRadius: "8px", color: "#aaa", fontSize: "12px" }}>▶️ Listen</button>
            <button style={{ padding: "8px 12px", background: "#111", border: "1px solid #333", borderRadius: "8px", color: "#aaa", fontSize: "12px" }}>🔊 Text to Speech</button>
          </div>
        </div>

        <div style={{ marginTop: "20px", padding: "24px", background: "#0a0a0a", border: isRecording ? "2px solid #ff4444" : "1px solid #222", borderRadius: "16px", textAlign: "center" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: isRecording ? "#ff4444" : "#22c55e", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", animation: isRecording ? "pulse 1s infinite" : "none" }}>
            🎤
          </div>
          <p style={{ marginTop: "12px", color: isRecording ? "#ff4444" : "#888" }}>{isRecording ? "● Recording... 3 sec test" : hasRecording ? "Recording done!" : "Ready to record"}</p>
          
          <button onClick={toggleRecord} style={{ marginTop: "16px", width: "100%", padding: "14px", background: isRecording ? "#ff4444" : "#22c55e", color: isRecording ? "white" : "black", border: "none", borderRadius: "12px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
            {isRecording ? "Stop Recording" : hasRecording ? "Record Again" : "Start Recording"}
          </button>

          {hasRecording && (
            <div style={{ marginTop: "16px" }}>
              <audio controls style={{ width: "100%" }}><source src="" /></audio>
              <button style={{ marginTop: "12px", width: "100%", padding: "12px", background: "#22c55e", color: "black", border: "none", borderRadius: "10px", fontWeight: "bold" }}>
                Submit to Chairman →
              </button>
              <p style={{ marginTop: "8px", fontSize: "12px", color: "#22c55e" }}>✓ Level 2 working — Mic UI alive!</p>
            </div>
          )}
        </div>

        <div style={{ marginTop: "20px", padding: "12px", background: "#111", borderRadius: "8px", fontSize: "12px", color: "#666" }}>
          <p>Recent Recordings: 0 | Status: Waiting for Level 3 (Supabase)</p>
        </div>
      </div>
    </div>
  );
}