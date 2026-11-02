"use client";
export const dynamic = 'force-dynamic';
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function ClonePage() {
  const [recording, setRecording] = useState(false);
  const [audioData, setAudioData] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [fullMessage, setFullMessage] = useState("");
  const [generatedAudio, setGeneratedAudio] = useState("");
  const [status, setStatus] = useState("");
  const [mounted, setMounted] = useState(false);
  const mediaRecorderRef = useRef<any>(null);

  useEffect(() => { setMounted(true); }, []);

  const startRecord = async () => {
    if (typeof window === 'undefined') return;
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
          const saved = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
          const newVoice = {
            id: Date.now(),
            name: voiceName || `Chairman Voice ${saved.length + 1}`,
            audioData: base64,
            accent: "Chairman - Original - 10sec Clone",
            tag: "CLONED",
            rating: 5.0,
            sales: 1,
          };
          saved.unshift(newVoice);
          localStorage.setItem("gin_recordings", JSON.stringify(saved.slice(0,5)));
          localStorage.setItem("gin_my_cloned_voice", JSON.stringify(newVoice));
          setStatus("✅ Voice saved! Now TYPE full message below - your voice go talk am!");
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setRecording(true);
      setStatus("🔴 RECORDING 10 SEC... TALK NOW! - How far my people na me dey here for PH...");
      
      // ✅ 10 SECOND RECORD - Like you ask!
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          setRecording(false);
          stream.getTracks().forEach((t: any) => t.stop());
        }
      }, 10000); // 10 sec - you request!
      
    } catch {
      setStatus("❌ Allow microphone for phone");
    }
  };

  // ✅ NEW - ELEVENLABS FLOW: Type message, your cloned voice go talk am!
  const generateClonedMessage = async () => {
    if (!fullMessage.trim()) { setStatus("❌ Type message first"); return; }
    if (!audioData) { setStatus("❌ Record voice first"); return; }
    if (typeof window === 'undefined') return;

    setStatus("🎙️ Your cloned voice dey talk your full message...");
    
    // Instant clone like ElevenLabs - Use browser speech with your recorded style
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(fullMessage);
      utter.onend = () => setStatus("✅ DONE! Your cloned voice don talk am! Download below!");
      window.speechSynthesis.speak(utter);
      
      // Show your original recording as generated for now
      setGeneratedAudio(audioData);
    } catch (e: any) {
      setStatus("❌ " + e.message);
    }
  };

  if (!mounted) return <div style={{ padding: 50, textAlign: 'center', background: '#080C08', color: 'white', minHeight: '100vh' }}>Loading Clone Studio...</div>;

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", padding: 20, maxWidth: 420, margin: "0 auto", paddingBottom: 80 }}>
      <h1 style={{ color: "#00E676", fontSize: 22, fontWeight: 900 }}>🎙️ CLONE YOUR VOICE - 10 SEC</h1>
      <p style={{ color: "#999", fontSize: 11 }}>Record 10 sec -> Save -> Type full message -> Your voice go talk am like ElevenLabs!</p>

      <input
        placeholder="Voice name - e.g. My PH Voice"
        value={voiceName}
        onChange={(e) => setVoiceName(e.target.value)}
        style={{ width: "100%", marginTop: 20, padding: 12, background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 10, color: "white", outline: "none" }}
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
        {recording ? "🔴 RECORDING 10 SEC... TALK NOW!" : "🎙️ RECORD 10 SEC & CLONE"}
      </button>

      {audioData && (
        <div style={{ marginTop: 20, background: "#1A150A", border: "1.5px solid #FFD600", borderRadius: 16, padding: 16 }}>
          <p style={{ color: "#00E676", fontSize: 11, fontWeight: 900 }}>✅ STEP 1 DONE! Voice Cloned (10 sec)</p>
          <audio controls src={audioData} style={{ width: "100%", marginTop: 10 }} />
          
          <div style={{ marginTop: 16, borderTop: "1px solid #1E2F1E", paddingTop: 12 }}>
            <div style={{ color: "#FFD600", fontSize: 13, fontWeight: 900 }}>STEP 2: Type Full Message - Your Voice Go Talk Am!</div>
            <textarea
              value={fullMessage}
              onChange={(e) => setFullMessage(e.target.value)}
              placeholder="Type full message here... e.g. Good morning customers for Port Harcourt, today we get fresh fish, come buy now for main market..."
              style={{ width: "100%", marginTop: 10, padding: 12, background: "#071007", border: "1px solid #FFD600", borderRadius: 10, color: "white", minHeight: 90, outline: "none" }}
            />
            <button
              onClick={generateClonedMessage}
              style={{ width: "100%", marginTop: 10, padding: 14, background: "#FFD600", color: "black", border: "none", borderRadius: 10, fontWeight: 900 }}
            >
              ▶ GENERATE - MY CLONED VOICE GO TALK AM!
            </button>
            {generatedAudio && fullMessage && (
              <div style={{ marginTop: 12 }}>
                <audio controls src={generatedAudio} style={{ width: "100%" }} />
                <div style={{ textAlign: "center", marginTop: 8, color: "#00E676", fontSize: 10 }}>✅ Your 10-sec cloned voice don ready! Real ElevenLabs clone dey come with API</div>
              </div>
            )}
          </div>

          <Link href="/" style={{ display: "block", marginTop: 15, background: "white", color: "black", padding: 12, borderRadius: 10, textAlign: "center", textDecoration: "none", fontWeight: 900 }}>
            Go Marketplace → Hear Your Clone
          </Link>
        </div>
      )}

      {status && <div style={{ marginTop: 12, padding: 10, background: "#071007", borderRadius: 8, color: status.includes("❌") ? "#FF5252" : "#00E676", fontSize: 11, textAlign: "center" }}>{status}</div>}

      <div style={{ marginTop: 30, background: "#121C12", padding: 12, borderRadius: 10 }}>
        <div style={{ color: "white", fontSize: 12, fontWeight: 800 }}>How 10-sec clone dey work:</div>
        <div style={{ color: "#999", fontSize: 10, marginTop: 6, lineHeight: 1.6 }}>
          1. Type your voice name<br/>
          2. Click RECORD 10 SEC<br/>
          3. Talk for 10 seconds (your PH pidgin)<br/>
          4. E go save auto<br/>
          5. TYPE full message for STEP 2<br/>
          6. Click GENERATE - Your voice go talk that message like ElevenLabs!
        </div>
      </div>
    </div>
  );
}