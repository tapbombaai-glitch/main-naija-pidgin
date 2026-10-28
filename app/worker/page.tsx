"use client";
import { useState, useRef } from "react";

export default function WorkerWorkspace() {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(5);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const timerRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const taskText = "How are you doing today?";
  const userName = "Kingsley";

  const speakTask = () => {
    const utter = new SpeechSynthesisUtterance(taskText);
    utter.lang = "en-NG";
    speechSynthesis.speak(utter);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      
      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err) {
      alert("Abeg allow microphone access 🙏");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  return (
    <main className="min-h-screen bg-[#0a0f0a] text-white p-4 flex justify-center">
      <div className="w-full max-w-[420px] space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center pt-2">
          <h1 className="font-bold text-lg"><span className="text-green-400">Main</span> Naija Pidgin</h1>
          <div className="w-8 h-8 rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center">K</div>
        </div>

        {/* Welcome Card */}
        <div className="rounded-[20px] bg-[#151d15] border border-green-900/30 p-5">
          <h2 className="text-xl font-bold">Welcome, {userName}! 👋</h2>
          <p className="text-sm text-gray-400 mt-1">Ready to record some Pidgin?</p>
          <div className="flex gap-3 mt-4">
            <div className="flex-1 bg-black/40 rounded-xl p-3 text-center border border-white/5">
              <p className="text-2xl font-bold text-green-400">12</p>
              <p className="text-[11px] text-gray-400">RECORDED</p>
            </div>
            <div className="flex-1 bg-black/40 rounded-xl p-3 text-center border border-white/5">
              <p className="text-2xl font-bold text-yellow-400">5</p>
              <p className="text-[11px] text-gray-400">TODAY</p>
            </div>
            <div className="flex-1 bg-black/40 rounded-xl p-3 text-center border border-white/5">
              <p className="text-2xl font-bold text-white">₦2k</p>
              <p className="text-[11px] text-gray-400">EARNED</p>
            </div>
          </div>
        </div>

        {/* Task Card */}
        <div className="rounded-[24px] bg-gradient-to-b from-[#1a261a] to-[#131a13] border border-green-500/20 p-6 shadow-[0_0_40px_rgba(34,197,94,0.15)]">
          <div className="flex justify-between items-center">
            <span className="text-[11px] tracking-widest text-green-400 font-bold">TODAY'S TASK • #013</span>
            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">● Pidgin</span>
          </div>

          <h3 className="text-[22px] font-bold leading-8 mt-4">"{taskText}"</h3>

          <button onClick={speakTask} className="mt-4 w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full py-3 text-sm transition">
            <span>🔊</span> Listen
            <span className="flex gap-[3px] ml-2">
              <span className="w-[3px] h-3 bg-green-400 rounded-full animate-pulse"></span>
              <span className="w-[3px] h-5 bg-green-400 rounded-full animate-pulse delay-75"></span>
              <span className="w-[3px] h-3 bg-green-400 rounded-full animate-pulse delay-150"></span>
            </span>
          </button>

          {/* BIG MIC BUTTON */}
          <div className="flex flex-col items-center mt-8">
            <div className="relative">
              {isRecording && <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-30"></div>}
              {isRecording && <div className="absolute -inset-4 bg-green-500/20 rounded-full animate-pulse"></div>}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`relative w-28 h-28 rounded-full flex items-center justify-center text-4xl shadow-[0_0_50px_rgba(34,197,94,0.5)] transition-all active:scale-95 ${isRecording ? 'bg-red-500 shadow-red-500/50' : 'bg-green-500 hover:bg-green-400'}`}
              >
                {isRecording ? '■' : '🎤'}
              </button>
            </div>

            <p className={`mt-5 font-mono text-3xl font-bold tracking-widest ${isRecording ? 'text-green-400' : 'text-white'}`}>
              00:{String(seconds).padStart(2,'0')}
            </p>
            <p className="text-xs text-gray-400 mt-1">{isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}</p>

            {/* Waveform Animation */}
            {isRecording && (
              <div className="flex items-center gap-1 mt-4 h-8">
                {[...Array(12)].map((_,i) => (
                  <div key={i} className="w-1 bg-green-400 rounded-full animate-[wave_0.5s_ease-in-out_infinite]" style={{height: `${12 + Math.random()*20}px`, animationDelay: `${i*0.05}s`}}></div>
                ))}
              </div>
            )}

            {audioUrl && (
              <div className="w-full mt-6">
                <audio controls src={audioUrl} className="w-full" />
              </div>
            )}
          </div>

          {/* Bottom Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-8">
            <button className="rounded-full bg-white/5 border border-white/10 py-3.5 text-sm font-semibold hover:bg-white/10">Next Task</button>
            <button className="rounded-full bg-green-500 text-black py-3.5 text-sm font-bold hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]">Submit ✓</button>
          </div>
        </div>

        <style>{`@keyframes wave { 0%,100%{transform:scaleY(0.5)} 50%{transform:scaleY(1.5)} }`}</style>
      </div>
    </main>
  );
}