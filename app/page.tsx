"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// === CHAIRMAN FINAL 5 GREATEST VOICES - ORIGINAL ===
const CHAIRMAN_FIVE_VOICES = [
  { id: "1", name: "Main Naija Pidgin 1", accent: "Original - Warri", sample_url: "/voices/main-naija-1.mp3", sample_text: "How far boss! Original Main Naija Pidgin voice dey here!" },
  { id: "2", name: "Main Naija Pidgin 2", accent: "Small - Fast", sample_url: "/voices/main-naija-2.mp3", sample_text: "Na small but mighty voice be this!" },
  { id: "3", name: "Main Naija Pidgin 3", accent: "GREATEST - 827KB", sample_url: "/voices/main-naija-3.mp3", sample_text: "This na the greatest Main Naija Pidgin wey set die die!" },
  { id: "4", name: "Main Naija Pidgin 4", accent: "Mid - Clear", sample_url: "/voices/main-naija-4.mp3", sample_text: "Warri no dey carry last, you hear?" },
  { id: "5", name: "Main Naija Pidgin 5", accent: "Latest - Sharp", sample_url: "/voices/main-naija-5.mp3", sample_text: "Latest sharp Main Naija Pidgin voice!" },
];

type PackageAction = string | null;
type AuthMode = "login" | "signup";

export default function Marketplace() {
  const [user, setUser] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [realKey, setRealKey] = useState("");
  const [freeLeft, setFreeLeft] = useState(0);
  const [paidLeft, setPaidLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState<any[]>(CHAIRMAN_FIVE_VOICES); // USE YOUR 5 DIRECT
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [announces, setAnnounces] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<PackageAction>(null);
  const [testText, setTestText] = useState("How far boss! Welcome to Main Naija Pidgin.");
  const [testVoice, setTestVoice] = useState("Main Naija Pidgin 3");
  const [testingApi, setTestingApi] = useState(false);
  const [testAudio, setTestAudio] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const [testTime, setTestTime] = useState<number | null>(null);
  const [testCredits, setTestCredits] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => { listener.subscription.unsubscribe(); };
  }, []);

  async function loadData() {
    const { data: u } = await supabase.auth.getUser();
    setUser(u?.user || null);
    // FORCE YOUR 5 VOICES - NO MORE SUPABASE VOICES
    setVoices(CHAIRMAN_FIVE_VOICES);
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
    try {
      const { data: ann } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(3);
      if (ann) setAnnounces(ann);
    } catch {}
  }

  const showToast = (m: string, type: "success" | "error" = "success") => {
    setToast(m); setToastType(type); setTimeout(() => setToast(""), 3500);
  };

  const requireAccount = (pkg: string) => {
    if (user) { continuePurchase(pkg); return; }
    setPendingAction(pkg); setAuthMode("login"); setShowAuth(true);
  };

  const submitAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = authEmail.trim().toLowerCase();
    if (!email || !authPassword) { showToast("Enter your email and password.", "error"); return; }
    if (authMode === "signup") {
      if (authPassword.length < 8) { showToast("Password must be at least 8 characters.", "error"); return; }
      if (authPassword !== confirmPassword) { showToast("Your passwords do not match.", "error"); return; }
    }
    setLoading(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password: authPassword });
        if (error) throw error;
        if (!data.session) {
          showToast("Registration successful. Check your email to confirm your account.", "success");
          setAuthMode("login"); setAuthPassword(""); setConfirmPassword(""); setLoading(false); return;
        }
        setUser(data.user); setShowAuth(false); setAuthPassword(""); setConfirmPassword("");
        showToast("Account created successfully!");
        if (pendingAction) await continuePurchase(pendingAction);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: authPassword });
        if (error) throw error;
        setUser(data.user); setShowAuth(false); setAuthPassword(""); setConfirmPassword("");
        showToast("Login successful!");
        if (pendingAction) await continuePurchase(pendingAction); else await loadData();
      }
    } catch (error: any) { showToast(error.message || "Account authentication failed.", "error"); } finally { setLoading(false); }
  };

  // === FIXED PLAY - PLAY YOUR ORIGINAL MP3 ===
  const playSample = async (voice: any) => {
    try {
      if (audio) { audio.pause(); audio.currentTime = 0; setAudio(null); }
      if (playingId === voice.id) { setPlayingId(null); return; }
      setPlayingId(voice.id);
      const a = new Audio(voice.sample_url);
      setAudio(a);
      a.onended = () => setPlayingId(null);
      a.onerror = () => { setPlayingId(null); showToast("File no dey public/voices/ folder!", "error"); };
      await a.play();
      showToast(`🎧 ${voice.name} - ORIGINAL`, "success");
    } catch { setPlayingId(null); }
  };

  const claimFree = async () => {
    if (!user) { requireAccount("free_100"); return; }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/keys/create-free", {
        method: "POST", headers: { "Content-Type": "application/json", ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}) },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.api_key) {
        setRealKey(data.api_key); setApiKey(data.key_prefix); setFreeLeft(100);
        showToast("✅ 100 FREE claimed! Your key is ready.");
        try { await navigator.clipboard.writeText(data.api_key); } catch {}
        await loadData();
      } else { showToast(data.error || "Already claimed", "error"); }
    } catch { showToast("Unable to collect free key. Please try again.", "error"); }
    setLoading(false);
  };

  const buy = async (pkg: string) => {
    if (!user) { requireAccount(pkg); return; }
    if (pkg === "free_100") { await claimFree(); return; }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/paystack/initialize", {
        method: "POST", headers: { "Content-Type": "application/json", ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}) },
        body: JSON.stringify({ packageId: pkg, email: user.email, userId: user.id }),
      });
      const data = await res.json();
      if (data.authorization_url) { window.location.href = data.authorization_url; } else { showToast(data.error || "Paystack initialization failed", "error"); }
    } catch { showToast("Connection failed. Please try again.", "error"); }
    setLoading(false);
  };

  const continuePurchase = async (pkg: string) => {
    setPendingAction(null); setShowAuth(false);
    if (pkg === "free_100") { await claimFree(); } else { await buy(pkg); }
  };

  const testMyApi = async () => {
    if (!user) { setPendingAction(null); setAuthMode("login"); setShowAuth(true); showToast("Please login before testing your API.", "error"); return; }
    if (!realKey) { showToast("Please collect your API key first.", "error"); return; }
    if (!testText.trim()) { showToast("Enter text to generate.", "error"); return; }
    setTestingApi(true); setTestAudio(""); setTestStatus("Connecting to voice engine..."); setTestTime(null); setTestCredits(null);
    const started = Date.now();
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Your session has expired. Please login again.");
      const response = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: testText.trim(), voice: testVoice }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || `Voice generation failed (${response.status}).`);
      if (!result?.success) throw new Error(result?.error || "Voice generation failed.");
      const audioUrl = result.audio_url || result.audioUrl;
      if (!audioUrl) throw new Error("The voice engine did not return an audio URL.");
      setTestAudio(audioUrl); setTestTime(Date.now() - started);
      if (typeof result.remaining_credits === "number") setTestCredits(result.remaining_credits);
      setTestStatus("Voice generated successfully!"); showToast("API test successful!"); await loadData();
    } catch (error: any) {
      setTestStatus(error.message || "API test failed."); showToast(error.message || "API test failed.", "error");
    } finally { setTestingApi(false); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null); setApiKey(""); setRealKey(""); setFreeLeft(0); setPaidLeft(0);
    showToast("Logged out", "success");
  };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", width: "100%", padding: "8px" }}>
      <style>{`
        *{box-sizing:border-box} body{margin:0} button:active{transform:scale(0.97)}
        .voice-grid-fixed { display:grid; grid-template-columns:1fr; gap:10px; }
        .market-modal { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,.82); display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto; }
        .market-modal-card { width:100%; max-width:390px; max-height:90vh; overflow-y:auto; background:#0D170D; border:1px solid #00E676; border-radius:18px; padding:18px; box-shadow:0 15px 60px rgba(0,0,0,.6); }
        .market-input { width:100%; background:#071007; color:white; border:1px solid #315A35; border-radius:9px; padding:13px; outline:none; font-size:13px; margin-top:6px; }
        .market-label { display:block; color:#A5D6A7; font-size:11px; font-weight:800; margin-top:13px; }
      `}</style>

      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: toastType === "error" ? "#FF5252" : "#00E676", color: toastType === "error" ? "white" : "black", padding: "10px 18px", borderRadius: "20px", fontSize: "11px", fontWeight: "900", zIndex: 300, maxWidth: "90%", textAlign: "center" }}>{toast}</div>}

      <div style={{ maxWidth: "420px", margin: "0 auto", border: "2px solid #1A231A", borderRadius: "28px", background: "#050A05", padding: "12px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "white", borderRadius: "4px", width: "28px", height: "20px", display: "flex", overflow: "hidden" }}><div style={{ flex: 1, background: "#008751" }}></div><div style={{ flex: 1, background: "white" }}></div><div style={{ flex: 1, background: "#008751" }}></div></div>
            <div style={{ fontWeight: "900", color: "white", fontSize: "15px" }}>MAIN NAIJA PIDGIN</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {user ? (<div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ fontSize: "9px", color: "#00E676", maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div><button onClick={logout} style={{ background: "#1A231A", border: "1px solid #1E4D2B", color: "#A5D6A7", fontSize: "8px", padding: "4px 8px", borderRadius: "20px" }}>⎋ Logout</button></div>) : (<button onClick={() => { setPendingAction(null); setAuthMode("login"); setShowAuth(true); }} style={{ background: "#00E676", color: "black", fontSize: "9px", fontWeight: "900", padding: "6px 10px", borderRadius: "20px", border: "none" }}>Login</button>)}
            <div style={{ background: "#14301A", border: "1px solid #1E4D2B", color: "#A5D6A7", fontSize: "9px", fontWeight: "800", padding: "6px 10px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", background: "#00E676", borderRadius: "50%" }}></span>LIVE</div>
          </div>
        </div>

        <div style={{ marginTop: "12px", background: "#121C12", borderRadius: "14px", padding: "14px", border: "1px solid #1E2F1E" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "white" }}>API Marketplace</div>
          <div style={{ fontSize: "11px", color: "#9E9E9E", marginTop: "2px" }}>Original Naija Voices • Your 5 Greatest</div>
        </div>

        {/* === NORMAL BUTTON VOICES - FIXED === */}
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "14px", fontWeight: "900", color: "white" }}>Preview Your 5 Original Voices - Tap NORMAL BUTTON to Listen</div>
          <div style={{ fontSize: "10px", color: "#00E676", marginTop: "2px" }}>100% Your Original Warri Accent</div>
          <div className="voice-grid-fixed" style={{ marginTop: "10px" }}>
            {voices.map((v: any) => (
              <div key={v.id} style={{ background: "#121C12", border: playingId === v.id ? "1.5px solid #00E676" : "1px solid #1E2F1E", borderRadius: "12px", padding: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "900", color: "white" }}>{v.name}</div>
                    <div style={{ fontSize: "10px", color: "#00E676" }}>{v.accent}</div>
                  </div>
                  {v.id === "3" && <div style={{ background: "#FFB300", color: "black", fontSize: "8px", fontWeight: 900, padding: "3px 6px", borderRadius: "10px" }}>GREATEST</div>}
                </div>
                {/* NORMAL BUTTON HERE */}
                <button onClick={() => playSample(v)} style={{ width: "100%", marginTop: "10px", background: playingId === v.id ? "#FF5252" : "black", color: "white", border: "1px solid #333", padding: "14px", borderRadius: "8px", fontSize: "13px", fontWeight: "900", cursor: "pointer" }}>
                  {playingId === v.id ? "■ STOP" : "▶ TAP TO LISTEN - NORMAL BUTTON"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* API TESTING CONSOLE - keep as is */}
        <div style={{ marginTop: "16px", background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: "14px", padding: "13px" }}>
          <div style={{ color: "#00E676", fontSize: "15px", fontWeight: 900 }}>🧪 API TESTING CONSOLE</div>
          <label className="market-label">TEXT TO GENERATE</label>
          <textarea className="market-input" value={testText} onChange={(e) => setTestText(e.target.value)} rows={3} placeholder="Type your Pidgin text here..." />
          <label className="market-label">SELECT VOICE</label>
          <select className="market-input" value={testVoice} onChange={(e) => setTestVoice(e.target.value)}>
            {CHAIRMAN_FIVE_VOICES.map((voice) => (<option key={voice.id} value={voice.name}>{voice.name}</option>))}
          </select>
          <button onClick={testMyApi} disabled={testingApi || !testText.trim()} style={{ width: "100%", marginTop: "14px", padding: "14px", border: "none", borderRadius: "9px", background: testingApi ? "#42634B" : "#00E676", color: "#000", fontWeight: 900, fontSize: "13px" }}>{testingApi ? "GENERATING..." : "▶ TEST MY API"}</button>
          {testStatus && <div style={{ marginTop: "12px", padding: "10px", borderRadius: "8px", background: "#071007", color: testAudio ? "#00E676" : "#FFB74D", fontSize: "11px" }}>{testStatus}</div>}
          {testAudio && <div style={{ marginTop: "12px" }}><audio controls src={testAudio} style={{ width: "100%" }} /><a href={testAudio} download="main-naija-pidgin-test.mp3" style={{ display: "block", textAlign: "center", marginTop: "10px", padding: "11px", background: "#17351D", color: "#00E676", borderRadius: "8px", textDecoration: "none", fontWeight: 800, fontSize: "11px" }}>↓ DOWNLOAD GENERATED VOICE</a></div>}
        </div>

        <Link href="/api-dashboard" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "14px", background: "white", color: "#000", padding: "13px", borderRadius: "12px", fontSize: "13px", fontWeight: "900", textDecoration: "none" }}>Go to API Dashboard <span>→</span></Link>
      </div>
    </div>
  );
}