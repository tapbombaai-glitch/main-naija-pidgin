"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function WorkerPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const router = useRouter();

  const taskText = "How are you doing today?";

  const speakTask = () => {
    const u = new SpeechSynthesisUtterance(taskText);
    u.lang = "en-NG";
    speechSynthesis.speak(u);
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      rec.start();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch { alert("Abeg allow mic 🎤"); }
  };

  const stopRec = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  return (
    <main style={{minHeight:"100vh", background:"#0a0f0a", color:"white", padding:"16px", display:"flex", justifyContent:"center"}}>
      <div style={{width:"100%", maxWidth:"420px"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h1 style={{fontWeight:"bold"}}><span style={{color:"#22c55e"}}>Main</span> Naija Pidgin</h1>
          <button onClick={async()=>{const s=createClient(); await s.auth.signOut(); router.push("/worker/login");}} style={{border:"1px solid #333", padding:"6px 12px", borderRadius:"8px", background:"transparent", color:"#aaa"}}>Logout</button>
        </div>

        <div style={{marginTop:"20px", background:"#151d15", border:"1px solid rgba(34,197,94,0.2)", borderRadius:"20px", padding:"20px"}}>
          <h2 style={{fontSize:"20px", fontWeight:"bold"}}>Welcome, Kingsley! 👋</h2>
          <p style={{color:"#888", fontSize:"13px"}}>Ready to record?</p>
          <div style={{display:"flex", gap:"10px", marginTop:"16px"}}>
            <div style={{flex:1, background:"rgba(0,0,0,0.4)", borderRadius:"12px", padding:"12px", textAlign:"center"}}><p style={{fontSize:"22px", fontWeight:"bold", color:"#22c55e"}}>12</p><p style={{fontSize:"10px", color:"#888"}}>RECORDED</p></div>
            <div style={{flex:1, background:"rgba(0,0,0,0.4)", borderRadius:"12px", padding:"12px", textAlign:"center"}}><p style={{fontSize:"22px", fontWeight:"bold", color:"#eab308"}}>5</p><p style={{fontSize:"10px", color:"#888"}}>TODAY</p></div>
            <div style={{flex:1, background:"rgba(0,0,0,0.4)", borderRadius:"12px", padding:"12px", textAlign:"center"}}><p style={{fontSize:"22px", fontWeight:"bold"}}>₦2k</p><p style={{fontSize:"10px", color:"#888"}}>EARNED</p></div>
          </div>
        </div>

        <div style={{marginTop:"20px", background:"linear-gradient(to bottom, #1a261a, #131a13)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:"24px", padding:"24px", boxShadow:"0 0 40px rgba(34,197,94,0.15)"}}>
          <div style={{display:"flex", justifyContent:"space-between"}}><span style={{fontSize:"11px", letterSpacing:"2px", color:"#22c55e", fontWeight:"bold"}}>TODAY'S TASK • #013</span><span style={{fontSize:"11px", background:"rgba(34,197,94,0.2)", color:"#86efac", padding:"2px 8px", borderRadius:"999px"}}>Pidgin</span></div>
          <h3 style={{fontSize:"22px", fontWeight:"bold", marginTop:"16px"}}>"{taskText}"</h3>
          <button onClick={speakTask} style={{marginTop:"16px", width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"999px", padding:"12px", color:"white", cursor:"pointer"}}>🔊 Listen</button>
          <div style={{display:"flex", flexDirection:"column", alignItems:"center", marginTop:"32px"}}>
            <button onClick={isRecording ? stopRec : startRec} style={{width:"112px", height:"112px", borderRadius:"999px", fontSize:"36px", background: isRecording ? "#ef4444" : "#22c55e", border:"none", boxShadow: isRecording ? "0 0 50px rgba(239,68,68,0.5)" : "0 0 50px rgba(34,197,94,0.5)", cursor:"pointer"}}>{isRecording ? "■" : "🎤"}</button>
            <p style={{marginTop:"20px", fontFamily:"monospace", fontSize:"32px", fontWeight:"bold", color: isRecording ? "#22c55e" : "white"}}>00:{String(seconds).padStart(2,"0")}</p>
            <p style={{fontSize:"12px", color:"#888"}}>{isRecording ? "Recording... Tap to stop" : "Tap to start recording"}</p>
            {audioUrl && <audio controls src={audioUrl} style={{width:"100%", marginTop:"20px"}} />}
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginTop:"32px"}}>
            <button style={{borderRadius:"999px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", padding:"14px", color:"white"}}>Next Task</button>
            <button style={{borderRadius:"999px", background:"#22c55e", color:"black", padding:"14px", fontWeight:"bold", border:"none"}}>Submit ✓</button>
          </div>
        </div>
      </div>
    </main>
  );
}