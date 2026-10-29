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
    const loggedIn = localStorage.getItem("worker_logged_in");
    if (!loggedIn) {
      router.push("/worker/login");
      return;
    }
    if (email) setWorkerEmail(email);
  }, [router]);

  const startRecording = async () => {
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
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setHasRecording(false);
      setSeconds(0);
      setAudioUrl("");

      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Please allow microphone access");
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
    return `\( {m.toString().padStart(2, "0")}: \){sec.toString().padStart(2, "0")}`;
  };

  const logout = () => {
    localStorage.removeItem("worker_logged_in");
    localStorage.removeItem("worker_email");
    router.push("/worker/login");
  };

  // Demo data
  const stats = {
    total: 12,
    pending: 4,
    approved: 7,
    rejected: 1,
  };

  const recent = [
    { id: "REC-024", lang: "Pidgin", status: "Pending", date: "Today" },
    { id: "REC-023", lang: "Hausa", status: "Approved", date: "Yesterday" },
    { id: "REC-022", lang: "Igbo", status: "Approved", date: "2 days ago" },
    { id: "REC-021", lang: "Yoruba", status: "Pending", date: "3 days ago" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#0B0D12]/95 backdrop-blur border-b border-[#1F232B] px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-[#D9AE52] font-medium tracking-wide">WORKER WORKSPACE</p>
          <h1 className="text-base font-bold">Main Naija Pidgin</h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#D9AE52] flex items-center justify-center text-black font-bold text-sm">
          {workerEmail[0].toUpperCase()}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {activeTab === "home" && (
          <div className="space-y-5">
            {/* Welcome */}
            <div>
              <h2 className="text-xl font-bold">How far, Worker 👋</h2>
              <p className="text-sm text-gray-400 mt-1">Your voice dey help build Naija AI</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#151820] rounded-2xl p-4 border border-[#252A35]">
                <p className="text-xs text-gray-400">Total Recordings</p>
                <p className="text-2xl font-bold text-[#22c55e] mt-1">{stats.total}</p>
              </div>
              <div className="bg-[#151820] rounded-2xl p-4 border border-[#252A35]">
                <p className="text-xs text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">{stats.pending}</p>
              </div>
              <div className="bg-[#151820] rounded-2xl p-4 border border-[#252A35]">
                <p className="text-xs text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-purple-400 mt-1">{stats.approved}</p>
              </div>
              <div className="bg-[#151820] rounded-2xl p-4 border border-[#252A35]">
                <p className="text-xs text-gray-400">Rejected</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{stats.rejected}</p>
              </div>
            </div>

            {/* Quick Record Button */}
            <button
              onClick={() => setActiveTab("record")}
              className="w-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-black font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              🎙️ Start New Recording
            </button>

            {/* Announcement */}
            <div className="bg-[#1A160F] border border-[#3A3020] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📢</span>
                <p className="text-sm font-semibold text-[#D9AE52]">Announcement</p>
              </div>
              <p className="text-sm font-medium">Welcome Workers!</p>
              <p className="text-xs text-gray-400 mt-1">
                Start recording Pidgin, Hausa, Igbo, Yoruba. Max 60 seconds.
              </p>
            </div>

            {/* Recent */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Recent Submissions</h3>
                <button onClick={() => setActiveTab("mywork")} className="text-xs text-[#D9AE52]">
                  See all →
                </button>
              </div>
              <div className="space-y-2">
                {recent.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#151820] border border-[#252A35] rounded-xl px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.id}</p>
                      <p className="text-xs text-gray-400">{item.lang} • {item.date}</p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        item.status === "Approved"
                          ? "bg-green-900/40 text-green-400"
                          : item.status === "Pending"
                          ? "bg-orange-900/40 text-orange-400"
                          : "bg-red-900/40 text-red-400"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "record" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">Record Voice</h2>
              <p className="text-sm text-gray-400 mt-1">Choose language & speak clearly</p>
            </div>

            {/* Language Select */}
            <div className="grid grid-cols-2 gap-2">
              {["Pidgin", "Hausa", "Igbo", "Yoruba"].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className={`py-3 rounded-xl text-sm font-medium border transition ${
                    selectedLang === lang
                      ? "bg-[#22c55e] text-black border-[#22c55e]"
                      : "bg-[#151820] border-[#252A35] text-gray-300"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            {/* Recorder Card */}
            <div className="bg-[#151820] border border-[#252A35] rounded-3xl p-6 text-center">
              <div
                className={`text-4xl font-mono font-bold mb-2 ${
                  isRecording ? "text-red-500" : "text-white"
                }`}
              >
                {formatTime(seconds)}
              </div>
              <p className="text-xs text-gray-500 mb-6">
                {isRecording ? "● Recording..." : hasRecording ? "Recording ready" : "Ready to record"}
              </p>

              <div
                className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl mb-6 ${
                  isRecording ? "bg-red-500 animate-pulse" : "bg-[#22c55e]"
                }`}
              >
                🎤
              </div>

              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-full bg-[#22c55e] text-black font-bold py-4 rounded-2xl text-base"
                >
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl text-base"
                >
                  Stop Recording
                </button>
              )}

              {hasRecording && audioUrl && (
                <div className="mt-5 text-left space-y-3">
                  <audio controls src={audioUrl} className="w-full" />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setHasRecording(false);
                        setAudioUrl("");
                        setSeconds(0);
                      }}
                      className="flex-1 py-3 rounded-xl border border-[#333] text-sm"
                    >
                      Record Again
                    </button>
                    <button className="flex-1 py-3 rounded-xl bg-[#22c55e] text-black font-bold text-sm">
                      Submit →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-center text-xs text-gray-500">
              Max 60 seconds • Speak clearly in {selectedLang}
            </p>
          </div>
        )}

        {activeTab === "mywork" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">My Recordings</h2>
            <div className="space-y-3">
              {recent.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#151820] border border-[#252A35] rounded-2xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{item.id}</p>
                      <p className="text-sm text-gray-400 mt-0.5">{item.lang}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.date}</p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        item.status === "Approved"
                          ? "bg-green-900/40 text-green-400"
                          : "bg-orange-900/40 text-orange-400"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-5">
            <div className="text-center pt-4">
              <div className="w-20 h-20 rounded-full bg-[#D9AE52] mx-auto flex items-center justify-center text-3xl font-bold text-black">
                {workerEmail[0].toUpperCase()}
              </div>
              <h2 className="text-lg font-bold mt-3">{workerEmail}</h2>
              <p className="text-sm text-gray-400">Worker Account</p>
            </div>

            <div className="bg-[#151820] border border-[#252A35] rounded-2xl divide-y divide-[#252A35]">
              <div className="px-4 py-4 flex justify-between">
                <span className="text-sm">Total Contributions</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="px-4 py-4 flex justify-between">
                <span className="text-sm">Approved</span>
                <span className="font-medium text-green-400">{stats.approved}</span>
              </div>
              <div className="px-4 py-4 flex justify-between">
                <span className="text-sm">Pending Review</span>
                <span className="font-medium text-orange-400">{stats.pending}</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full py-3.5 rounded-2xl border border-red-900/50 text-red-400 font-medium"
            >
              Logout
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation - Phone friendly */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0F1218] border-t border-[#1F232B] px-2 py-2 flex justify-around safe-area-bottom">
        {[
          { id: "home", label: "Home", icon: "🏠" },
          { id: "record", label: "Record", icon: "🎙️" },
          { id: "mywork", label: "My Work", icon: "📁" },
          { id: "profile", label: "Profile", icon: "👤" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[70px] ${
              activeTab === tab.id ? "text-[#22c55e]" : "text-gray-500"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[11px] font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}