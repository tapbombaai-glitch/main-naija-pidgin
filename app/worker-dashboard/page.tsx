"use client";
import { useState, useRef, useEffect } from "react";

export default function WorkerDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState("Pidgin");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const sentences: Record<string, string> = {
    Pidgin: "How you dey? I dey come now now.",
    Igbo: "Kedu? Ana m abịa ugbu a.",
    Hausa: "Yaya kake? Ina zuwa yanzu.",
    Yoruba: "Bawo ni? Mo n bọ nísinsìnyí.",
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 },
      });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setAudioURL(null);
      setTimer(0);
      timerIntervalRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
    } catch (err) {
      alert("Please allow microphone access to record.");
      console.error(err);
    }
  };

  // FIXED FORMAT - NO ERROR AGAIN
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const reRecord = () => { setAudioURL(null); setTimer(0); };

  // FIXED DOWNLOAD NAME
  const saveAndNext = () => {
    if (!audioURL) { alert("Please record first!"); return; }
    const a = document.createElement("a");
    a.href = audioURL;
    a.download = `recording-${selectedLang}-${Date.now()}.webm`;
    a.click();
    setAudioURL(null);
    setTimer(0);
    alert("Recording saved! Ready for next sentence.");
  };

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0F0A] text-white font-sans antialiased">
      <div className="px-4 pb-8 max-w-[420px] mx-auto pt-2">
        <div className="flex items-center justify-between mb-4 mt-1">
          <div>
            <div className="flex items-center gap-2"><h1 className="text-[18px] font-black">Worker Dashboard</h1><span>🇳🇬</span></div>
            <p className="text-[12px] text-gray-400">Welcome, <span className="text-[#00C853] font-bold">WORKER-1234</span> <span className="inline-flex items-center gap-1 ml-1"><span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse"></span><span className="text-[#00C853] text-[10px]">Online</span></span></p>
          </div>
        </div>

        <div className="bg-[#121A12] border border-[#1F2F1F] rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-[#00C853]/20 flex items-center justify-center text-2xl">👤</div><div><div className="font-bold text-[13px]">WORKER-1234</div><div className="text-[10px] text-gray-400">📍 Location: Lagos</div><div className="text-[10px] text-gray-400">🎤 Accent: Lagos Pidgin</div></div></div>
          <div className="text-center"><div className="w-10 h-10 rounded-full bg-[#00C853]/20 flex items-center justify-center mb-1"><span className="text-[#00C853] font-bold text-sm">★</span></div><div className="text-[9px] text-[#00C853] font-bold">Pro Level</div></div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {["Pidgin","Igbo","Hausa","Yoruba"].map((lang)=>(
            <button key={lang} onClick={()=>setSelectedLang(lang)} className={`flex-1 min-w-[70px] text-[11px] py-2.5 rounded-xl font-bold ${selectedLang===lang ? "bg-[#00C853] text-black" : "bg-[#121A12] border border-[#1F2F1F] text-gray-300"}`}>[{lang}]</button>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2"><span className="text-[#00C853]">◎</span><h2 className="text-[12px] font-bold">Main Task Workspace</h2></div>
          <div className="bg-[#121A12] border border-[#1F2F1F] rounded-2xl p-4"><div className="flex justify-between items-center mb-2"><span className="text-[12px] font-bold">45 / 500 Recorded</span><span className="text-[10px] text-gray-400">Today: 12 / 50 ↗</span></div><div className="w-full bg-[#1A1A1A] rounded-full h-2.5"><div className="bg-[#00C853] h-2.5 rounded-full" style={{width:"9%"}}></div></div></div>
        </div>

        <div className="bg-[#121A12] border border-[#1F2F1F] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4"><span>🎤</span><h2 className="text-[12px] font-bold text-[#00C853]">Recording Studio</h2></div>
          <div className="text-center mb-6"><p className="text-[16px] font-bold leading-relaxed">{sentences[selectedLang]}</p></div>
          <div className="flex justify-center mb-4"><button onClick={toggleRecording} className={`w-20 h-20 rounded-full flex items-center justify-center active:scale-95 ${isRecording ? "bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.8)]" : "bg-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]"}`}>{isRecording ? <div className="w-8 h-8 bg-white rounded-sm"></div> : <div className="w-8 h-8 rounded-full bg-red-700"></div>}</button></div>
          <div className="text-center text-red-400 font-mono text-[12px] mb-4">{formatTime(timer)} / 00:15</div>
          {audioURL && (<div className="mb-4"><audio controls src={audioURL} className="w-full rounded-lg" /></div>)}
          <div className="flex gap-3"><button onClick={reRecord} disabled={!audioURL && !isRecording} className="flex-1 border border-[#2A3F2A] text-gray-300 text-[11px] font-bold py-3 rounded-xl disabled:opacity-40">↺ Re-record</button><button onClick={saveAndNext} disabled={!audioURL} className="flex-1 bg-[#00C853] text-black text-[11px] font-black py-3 rounded-xl disabled:opacity-40">↑ Save & Next</button></div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#121A12] border border-[#1F2F1F] rounded-xl p-3 text-center"><div className="text-[16px] mb-1">💰</div><div className="text-[13px] font-black">₦1,250</div><div className="text-[9px] text-gray-400">Earnings</div></div>
          <div className="bg-[#121A12] border border-[#1F2F1F] rounded-xl p-3 text-center"><div className="text-[16px] mb-1">⏱</div><div className="text-[13px] font-black">₦450</div><div className="text-[9px] text-gray-400">Pending</div></div>
          <div className="bg-[#121A12] border border-[#1F2F1F] rounded-xl p-3 text-center"><div className="text-[16px] mb-1">✓</div><div className="text-[13px] font-black">87</div><div className="text-[9px] text-gray-400">Approved</div></div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button className="bg-[#121A12] border border-[#1F2F1F] rounded-xl py-3 flex flex-col items-center gap-1"><span>📊</span><span className="text-[10px] text-gray-300">Earnings</span></button>
          <button className="bg-[#00C853] text-black rounded-xl py-3 flex flex-col items-center gap-1 font-bold"><span>👑</span><span className="text-[10px]">Levels</span></button>
          <button className="bg-[#121A12] border border-[#1F2F1F] rounded-xl py-3 flex flex-col items-center gap-1"><span>💳</span><span className="text-[10px] text-gray-300">Withdraw</span></button>
        </div>
      </div>
    </div>
  );
}