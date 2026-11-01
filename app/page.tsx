"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// === CHAIRMAN 5 GREATEST ORIGINAL VOICES ===
const CHAIRMAN_FIVE_VOICES = [
  { id: "1", name: "Main Naija Pidgin 1", accent: "Original - Warri", sample_url: "/voices/main-naija-1.mp3", sample_text: "How far boss! Original Main Naija Pidgin voice dey here!" },
  { id: "2", name: "Main Naija Pidgin 2", accent: "Small - Fast", sample_url: "/voices/main-naija-2.mp3", sample_text: "Na small but mighty voice be this!" },
  { id: "3", name: "Main Naija Pidgin 3", accent: "GREATEST - 827KB", sample_url: "/voices/main-naija-3.mp3", sample_text: "This na the greatest Main Naija Pidgin wey set die die!" },
  { id: "4", name: "Main Naija Pidgin 4", accent: "Mid - Clear", sample_url: "/voices/main-naija-4.mp3", sample_text: "Warri no dey carry last, you hear?" },
  { id: "5", name: "Main Naija Pidgin 5", accent: "Latest - Sharp", sample_url: "/voices/main-naija-5.mp3", sample_text: "Latest sharp Main Naija Pidgin voice!" },
];

export default function Page() {
  const [user, setUser] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [realKey, setRealKey] = useState("");
  const [freeLeft, setFreeLeft] = useState(0);
  const [paidLeft, setPaidLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [voices] = useState<any[]>(CHAIRMAN_FIVE_VOICES);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [testText, setTestText] = useState("How far boss! Welcome to Main Naija Pidgin.");
  const [testVoice, setTestVoice] = useState("Main Naija Pidgin 3");
  const [testingApi, setTestingApi] = useState(false);
  const [testAudio, setTestAudio] = useState("");
  const [testStatus, setTestStatus] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: u } = await supabase.auth.getUser();
    setUser(u?.user || null);
    const guestId = localStorage.getItem("guest_id") || `guest_${Date.now()}`;
    localStorage.setItem("guest_id", guestId);
    const uid = u?.user?.id || guestId;
    const { data: keys } = await supabase.from("api_keys").select("*").eq("user_id", uid).eq("is_active", true).order("created_at", { ascending: false }).limit(1);
    if (keys && keys[0]) {
      setApiKey(keys[0].key_prefix || "");
      setRealKey(keys[0].key || "");
      setFreeLeft(keys[0].free_requests_remaining || 0);
      setPaidLeft(keys[0].paid_requests_remaining || 0);
    }
  }

  const showToast = (m: string, type: "success" | "error" = "success") => {
    setToast(m); setToastType(type); setTimeout(() => setToast(""), 3500);
  };

  // ✅ FIXED: ADDED async HERE - THIS WAS YOUR ERROR LINE 140-163
  const playSample = async (voice: any) => {
    try {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        setAudio(null);
      }
      if (playingId === voice.id) {
        setPlayingId(null);
        return;
      }
      setPlayingId(voice.id);
      const a = new Audio(voice.sample_url);
      setAudio(a);
      a.onended = () => {
        setPlayingId(null);
      };
      a.onerror = () => {
        setPlayingId(null);
        showToast(`🎧 ${voice.name} - Use API TEST below!`, "success");
      };
      await a.play();
      showToast(`🎧 ${voice.name} - ORIGINAL`, "success");
    } catch {
      setPlayingId(null);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setApiKey("");
    setRealKey("");
    setFreeLeft(0);
    setPaidLeft(0);
    showToast("Logged out", "success");
  };

  const testMyApi = async () => {
    if (!user) {
      setShowAuth(true);
      showToast("Please login before testing", "error");
      return;
    }
    if (!realKey) {
      showToast("Please collect API key first", "error");
      return;
    }
    if (!testText.trim()) {
      showToast("Enter text to generate", "error");
      return;
    }
    setTestingApi(true);
    setTestAudio("");
    setTestStatus("Generating Warri voice...");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Session expired, login again");
      const response = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: testText.trim(), voice: testVoice }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || "Failed");
      if (!result?.success) throw new Error(result?.error || "Failed");
      setTestAudio(result.audio_url);
      setTestStatus("Voice generated successfully!");
      showToast("API test successful!");
      await loadData();
    } catch (error: any) {
      setTestStatus(error.message || "API test failed");
      showToast(error.message || "Failed", "error");
    } finally {
      setTestingApi(false);
    }
  };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", width: "100%", padding: "8px" }}>
      <style>{`
        *{box-sizing:border-box}
        .voice-grid-fixed { display:grid; grid-template-columns:1fr; gap:10px; }
        .market-input { width:100%; background:#071007; color:white; border:1px solid #315A35; border-radius:9px; padding:13px; outline:none; font-size:13px; margin-top:6px; }
        .market-label { display:block; color:#A5D6A7; font-size:11px; font-weight:800; margin-top:13px; }
      `}</style>

      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: toastType === "error" ? "#FF5252" : "#00E676", color: toastType === "error" ? "white" : "black", padding: "10px 18px", borderRadius: "20px", fontSize: "11px", fontWeight: "900", zIndex: 300 }}>{toast}</div>}

      <div style={{ maxWidth: "420px", margin: "0 auto", border: "2px solid #1A231A", borderRadius: "28px", background: "#050A05", padding: "12px" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px" }}>
          <div style={{ fontWeight: "900", color: "white", fontSize: "15px" }}>MAIN NAIJA PIDGIN</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {user ? (<button onClick={logout} style={{ background: "#1A231A", border: "1px solid #1E4D2B", color: "#A5D6A7", fontSize: "8px", padding: "4px 8px", borderRadius: "20px" }}>Logout</button>) : (<button onClick={() => setShowAuth(true)} style={{ background: "#00E676", color: "black", fontSize: "9px", fontWeight: "900", padding: "6px 10px", borderRadius: "20px", border: "none" }}>Login</button>)}
            <div style={{ background: "#14301A", border: "1px solid #1E4D2B", color: "#A5D6A7", fontSize: "9px", fontWeight: "800", padding: "6px 10px", borderRadius: "20px" }}>LIVE</div>
          </div>
        </div>

        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "14px", fontWeight: "900", color: "white" }}>Preview Your 5 Original Voices</div>
          <div className="voice-grid-fixed" style={{ marginTop: "10px" }}>
            {voices.map((v: any) => (
              <div key={v.id} style={{ background: "#121C12", border: playingId === v.id ? "1.5px solid #00E676" : "1px solid #1E2F1E", borderRadius: "12px", padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "900", color: "white" }}>{v.name}</div>
                    <div style={{ fontSize: "10px", color: "#00E676" }}>{v.accent}</div>
                  </div>
                  {v.id === "3" && <div style={{ background: "#FFB300", color: "black", fontSize: "8px", fontWeight: 900, padding: "3px 6px", borderRadius: "10px" }}>GREATEST</div>}
                </div>
                <button onClick={() => playSample(v)} style={{ width: "100%", marginTop: "10px", background: playingId === v.id ? "#FF5252" : "black", color: "white", border: "1px solid #333", padding: "14px", borderRadius: "8px", fontSize: "13px", fontWeight: "900" }}>
                  {playingId === v.id ? "■ STOP" : "▶ TAP TO LISTEN"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "16px", background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: "14px", padding: "13px" }}>
          <div style={{ color: "#00E676", fontSize: "15px", fontWeight: 900 }}>🧪 API TESTING CONSOLE</div>
          <label className="market-label">TEXT TO GENERATE</label>
          <textarea className="market-input" value={testText} onChange={(e) => setTestText(e.target.value)} rows={3} />
          <label className="market-label">SELECT VOICE</label>
          <select className="market-input" value={testVoice} onChange={(e) => setTestVoice(e.target.value)}>
            {CHAIRMAN_FIVE_VOICES.map((voice) => (<option key={voice.id} value={voice.name}>{voice.name}</option>))}
          </select>
          <button onClick={testMyApi} disabled={testingApi} style={{ width: "100%", marginTop: "14px", padding: "14px", border: "none", borderRadius: "9px", background: testingApi ? "#42634B" : "#00E676", color: "#000", fontWeight: 900, fontSize: "13px" }}>{testingApi ? "GENERATING..." : "▶ TEST MY API"}</button>
          {testStatus && <div style={{ marginTop: "12px", padding: "10px", borderRadius: "8px", background: "#071007", color: testAudio ? "#00E676" : "#FFB74D", fontSize: "11px" }}>{testStatus}</div>}
          {testAudio && <div style={{ marginTop: "12px" }}><audio controls src={testAudio} style={{ width: "100%" }} /></div>}
        </div>

        <Link href="/api-dashboard" style={{ display: "flex", justifyContent: "center", marginTop: "14px", background: "white", color: "#000", padding: "13px", borderRadius: "12px", fontSize: "13px", fontWeight: "900", textDecoration: "none" }}>Go to API Dashboard →</Link>
      </div>
    </div>
  );
}