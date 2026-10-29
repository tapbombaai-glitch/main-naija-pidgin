"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WorkerDashboard() {
  const router = useRouter();
  const [workerEmail, setWorkerEmail] = useState("worker@example.com");
  const [activeTab, setActiveTab] = useState<"home" | "record" | "mywork" | "profile">("home");
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [selectedLang, setSelectedLang] = useState("Pidgin");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const email = localStorage.getItem("worker_email");
    // If you no get login page yet, comment this check
    // const loggedIn = localStorage.getItem("worker_logged_in");
    // if (!loggedIn) { router.push("/worker/login"); return; }
    if (email) setWorkerEmail(email);
  }, [router]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setHasRecording(true);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      setHasRecording(false);
      setSeconds(0);
      setAudioUrl("");
      timerRef.current = setInterval(() => { setSeconds((prev) => prev + 1); }, 1000);
    } catch (err) { alert("Please allow microphone access"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // FIXED FORMAT
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const logout = () => {
    localStorage.removeItem("worker_logged_in");
    localStorage.removeItem("worker_email");
    router.push("/");
  };

  const stats = { total: 12, pending: 4, approved: 7, rejected: 1 };
  const recent = [
    { id: "REC-024", lang: "Pidgin", status: "Pending", date: "Today" },
    { id: "REC-023", lang: "Hausa", status: "Approved", date: "Yesterday" },
    { id: "REC-022", lang: "Igbo", status: "Approved", date: "2 days ago" },
    { id: "REC-021", lang: "Yoruba", status: "Pending", date: "3 days ago" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-[#0B0D12]/95 backdrop-blur border-b border-[#1F232B] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-[#D9AE52] font-medium">WORKER WORKSPACE</p>
          <h1 className="text-base font-bold">Main Naija Pidgin</h1>
        </div>
        <Link href="/" className="w-9 h-9 rounded-full bg-[#D9AE52] flex items-center justify-center text-black font-bold text-sm">
          {workerEmail[0].toUpperCase()}
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {activeTab === "home" && (
          <div className="space-y-5">
            <div><h2 className="text-xl font-bold">How far, Worker 👋</h2><p className="text-sm text-gray-400 mt-1">Your voice dey help build Naija AI</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#151820] rounded-2xl p-4 border border-[#252A35]"><p className="text-xs text-gray-400">Total</p><p className="text-2xl font-bold text-[#22c55e] mt-1">{stats.total}</p></div>
              <div className="bg-[#151820] rounded-2xl p-4 border border-[#252A35]"><p className="text-xs text-gray-400">Pending</p><p className="text-2xl font-bold text-orange-400 mt-1">{stats.pending}</p></div>
              <div className="bg-[#151820] rounded-2xl p-4 border border-[#252A35]"><p className="text-xs text-gray-400">Approved</p><p className="text-2xl font-bold text-purple-400 mt-1">{stats.approved}</p></div>
              <div className="bg-[#151820] rounded-2xl p-4 border border-[#252A35]"><p className="text-xs text-gray-400">Rejected</p><p className="text-2xl font-bold text-red-400 mt-1">{stats.rejected}</p></div>
            </div>
            <button onClick={() => setActiveTab("record")} className="w-full bg-[#22c55e] text-black font-bold py-4 rounded-2xl">🎙️ Start New Recording</button>
            <div className="bg-[#1A160F] border border-[#3A3020] rounded-2xl p-4">
              <p className="text-sm font-semibold text-[#D9AE52]">📢 Announcement</p><p className="text-xs text-gray-400 mt-1">Start recording Pidgin, Hausa, Igbo, Yoruba. Max 60 seconds.</p>
            </div>
            <div className="space-y-2">{recent.slice(0,3).map(item=>(
              <div key={item.id} className="bg-[#151820] border border-[#252A35] rounded-xl px-4 py-3 flex justify-between"><div><p className="text-sm font-medium">{item.id}</p><p className="text-xs text-gray-400">{item.lang} • {item.date}</p></div><span className="text-xs px-2.5 py-1 rounded-full bg-orange-900/40 text-orange-400">{item.status}</span></div>
            ))}</div>
          </div>
        )}

        {activeTab === "record" && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold">Record Voice</h2>
            <div className="grid grid-cols-2 gap-2">{["Pidgin","Hausa","Igbo","Yoruba"].map(lang=>(
              <button key={lang} onClick={()=>setSelectedLang(lang)} className={`py-3 rounded-xl text-sm font-medium border ${selectedLang===lang?"bg-[#22c55e] text-black border-[#22c55e]":"bg-[#151820] border-[#252A35] text-gray-300"}`}>{lang}</button>
            ))}</div>
            <div className="bg-[#151820] border border-[#252A35] rounded-3xl p-6 text-center">
              <div className={`text-4xl font-mono font-bold mb-2 ${isRecording?"text-red-500":"text-white"}`}>{formatTime(seconds)}</div>
              <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl mb-6 ${isRecording?"bg-red-500 animate-pulse":"bg-[#22c55e]"}`}>🎤</div>
              {!isRecording ? (
                <button onClick={startRecording} className="w-full bg-[#22c55e] text-black font-bold py-4 rounded-2xl">Start Recording</button>
              ) : (
                <button onClick={stopRecording} className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl">Stop Recording</button>
              )}
              {hasRecording && audioUrl && (
                <div className="mt-5 space-y-3"><audio controls src={audioUrl} className="w-full"/><div className="flex gap-3"><button onClick={()=>{setHasRecording(false);setAudioUrl("");setSeconds(0);}} className="flex-1 py-3 rounded-xl border border-[#333] text-sm">Again</button><button className="flex-1 py-3 rounded-xl bg-[#22c55e] text-black font-bold text-sm">Submit →</button></div></div>
              )}
            </div>
          </div>
        )}

        {activeTab === "mywork" && (
          <div className="space-y-4"><h2 className="text-xl font-bold">My Recordings</h2>{recent.map(item=>(
            <div key={item.id} className="bg-[#151820] border border-[#252A35] rounded-2xl p-4 flex justify-between"><div><p className="font-medium">{item.id}</p><p className="text-sm text-gray-400">{item.lang}</p></div><span className="text-xs px-2.5 py-1 rounded-full bg-green-900/40 text-green-400">{item.status}</span></div>
          ))}</div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-5 text-center pt-4">
            <div className="w-20 h-20 rounded-full bg-[#D9AE52] mx-auto flex items-center justify-center text-3xl font-bold text-black">{workerEmail[0].toUpperCase()}</div>
            <h2 className="text-lg font-bold">{workerEmail}</h2>
            <button onClick={logout} className="w-full py-3.5 rounded-2xl border border-red-900/50 text-red-400">Logout → Dashboard</button>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0F1218] border-t border-[#1F232B] px-2 py-2 flex justify-around">
        {[{id:"home",label:"Home",icon:"🏠"},{id:"record",label:"Record",icon:"🎙️"},{id:"mywork",label:"My Work",icon:"📁"},{id:"profile",label:"Profile",icon:"👤"}].map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[70px] ${activeTab===tab.id?"text-[#22c55e]":"text-gray-500"}`}>
            <span className="text-xl">{tab.icon}</span><span className="text-[11px]">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}