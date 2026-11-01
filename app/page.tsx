"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PackageAction = string | null;
type AuthMode = "login" | "signup";

export default function Marketplace() {
  const [user, setUser] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [realKey, setRealKey] = useState("");
  const [freeLeft, setFreeLeft] = useState(0);
  const [paidLeft, setPaidLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  const [voices, setVoices] = useState<any[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [announces, setAnnounces] = useState<any[]>([]);
  const [myLocalVoices, setMyLocalVoices] = useState<any[]>([]);

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<PackageAction>(null);
  // API TESTING CONSOLE
  const [testText, setTestText] = useState(
    "How far boss! Welcome to Main Naija Pidgin."
  );
  const [testVoice, setTestVoice] = useState("Lagos Male");
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
    const { data: v } = await supabase.from("voices").select("*").eq("active", true).limit(10);
    if (v && v.length > 0) { setVoices(v); } else {
      setVoices([
        { id: "1", name: "Lagos Male", accent: "Natural - Young", sample_text: "How far boss! Lagos male voice dey here, ready to talk." },
        { id: "2", name: "Abuja Female", accent: "Warm - Professional", sample_text: "Good morning, na Abuja female voice, calm and clear." },
        { id: "3", name: "Pidgin Narrator", accent: "Story - Expressive", sample_text: "For inside this life, na story dey sweet pass, make I tell you!" },
        { id: "4", name: "Delta Warri", accent: "Rugged - Local", sample_text: "Warri no dey carry last, you hear? Original Warri voice!" },
        { id: "5", name: "Yoruba Mix", accent: "Hybrid - Bilingual", sample_text: "E kaaro! I fit speak Yoruba and pidgin join together." },
      ]);
    }
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
    try {
      const saved = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
      let myVoices = saved.filter((f: any) => f.audioData);
      myVoices.sort((a: any, b: any) => (a.id || 0) - (b.id || 0));
      if (myVoices.length > 0) setMyLocalVoices(myVoices);
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

  const playSample = async (voice: any) => {
    try {
      if (audio) { audio.pause(); audio.currentTime = 0; setAudio(null); }
      window.speechSynthesis?.cancel();
      if (playingId === voice.id) { setPlayingId(null); return; }
      setPlayingId(voice.id);
      const chairmanMap: any = { "Lagos Male": 0, "Abuja Female": 1, "Pidgin Narrator": 2, "Delta Warri": 3, "Yoruba Mix": 4 };
      const idx = chairmanMap[voice.name] ?? voices.findIndex((v: any) => v.id === voice.id);
      const chairmanVoice = myLocalVoices[idx];
      if (chairmanVoice && chairmanVoice.audioData) {
        const a = new Audio(chairmanVoice.audioData);
        setAudio(a); a.onended = () => setPlayingId(null); a.onerror = () => setPlayingId(null);
        await a.play(); showToast(`🎧 Chairman #${idx + 1} ${voice.name} - YOUR VOICE`, "success"); return;
      }
      if (voice.sample_url) {
        const a = new Audio(voice.sample_url); setAudio(a); a.onended = () => setPlayingId(null); await a.play(); return;
      }
      const utter = new SpeechSynthesisUtterance(voice.sample_text);
      utter.onend = () => setPlayingId(null); speechSynthesis.speak(utter);
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

  // TEST CUSTOMER'S OWN API
  const testMyApi = async () => {
    if (!user) {
      setPendingAction(null);
      setAuthMode("login");
      setShowAuth(true);
      showToast("Please login before testing your API.", "error");
      return;
    }

    if (!realKey) {
      showToast("Please collect your API key first.", "error");
      return;
    }

    if (!testText.trim()) {
      showToast("Enter text to generate.", "error");
      return;
    }

    setTestingApi(true);
    setTestAudio("");
    setTestStatus("Connecting to voice engine...");
    setTestTime(null);
    setTestCredits(null);

    const started = Date.now();

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Your session has expired. Please login again.");
      }

      const response = await fetch("/api/tts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: testText.trim(),
          voice: testVoice,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || `Voice generation failed (${response.status}).`
        );
      }

      if (!result?.success) {
        throw new Error(result?.error || "Voice generation failed.");
      }

      const audioUrl = result.audio_url || result.audioUrl;

      if (!audioUrl) {
        throw new Error("The voice engine did not return an audio URL.");
      }

      setTestAudio(audioUrl);
      setTestTime(Date.now() - started);

      if (typeof result.remaining_credits === "number") {
        setTestCredits(result.remaining_credits);
      }

      setTestStatus("Voice generated successfully!");
      showToast("API test successful!");

      await loadData();
    } catch (error: any) {
      setTestStatus(error.message || "API test failed.");
      showToast(error.message || "API test failed.", "error");
    } finally {
      setTestingApi(false);
    }
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
        .voice-grid-fixed { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:6px; }
        .market-modal { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,.82); display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto; }
        .market-modal-card { width:100%; max-width:390px; max-height:90vh; overflow-y:auto; background:#0D170D; border:1px solid #00E676; border-radius:18px; padding:18px; box-shadow:0 15px 60px rgba(0,0,0,.6); }
        .market-input { width:100%; background:#071007; color:white; border:1px solid #315A35; border-radius:9px; padding:13px; outline:none; font-size:13px; margin-top:6px; }
        .market-label { display:block; color:#A5D6A7; font-size:11px; font-weight:800; margin-top:13px; }
        @media(max-width:360px){ .voice-grid-fixed{gap:3px} }
      `}</style>

      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: toastType === "error" ? "#FF5252" : "#00E676", color: toastType === "error" ? "white" : "black", padding: "10px 18px", borderRadius: "20px", fontSize: "11px", fontWeight: "900", zIndex: 300, maxWidth: "90%", textAlign: "center" }}>{toast}</div>}

      {selectedAnnouncement && (
        <div className="market-modal" onClick={() => setSelectedAnnouncement(null)}>
          <div className="market-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
              <div style={{ color: "#FFB300", fontWeight: 900, fontSize: 13 }}>📢 CHAIRMAN ANNOUNCEMENT</div>
              <button onClick={() => setSelectedAnnouncement(null)} style={{ background: "#263326", border: "none", color: "white", borderRadius: "50%", width: 30, height: 30, fontSize: 18 }}>×</button>
            </div>
            <h2 style={{ color: "white", fontSize: 19, marginTop: 18 }}>{selectedAnnouncement.title}</h2>
            <p style={{ color: "#D0D0D0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{selectedAnnouncement.message}</p>
            <div style={{ color: "#777", fontSize: 10, marginTop: 18 }}>{selectedAnnouncement.created_at ? new Date(selectedAnnouncement.created_at).toLocaleString() : ""} • Chairman</div>
            <button onClick={() => setSelectedAnnouncement(null)} style={{ width: "100%", marginTop: 18, padding: 12, background: "#00E676", color: "black", border: "none", borderRadius: 9, fontWeight: 900 }}>Close Announcement</button>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="market-modal" onClick={() => { if (!loading) setShowAuth(false); }}>
          <div className="market-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ color: "#00E676", fontWeight: 900, fontSize: 11 }}>MAIN NAIJA PIDGIN</div><h2 style={{ color: "white", fontSize: 20, margin: "7px 0 0" }}>{authMode === "signup" ? "Create Your Account" : "Welcome Back"}</h2></div>
              <button onClick={() => setShowAuth(false)} disabled={loading} style={{ background: "#263326", border: "none", color: "white", borderRadius: "50%", width: 32, height: 32, fontSize: 18 }}>×</button>
            </div>
            <p style={{ color: "#999", fontSize: 11, lineHeight: 1.5 }}>{authMode === "signup" ? "Register to collect your free API key or purchase an API package." : "Login to continue collecting your API key or purchasing your selected package."}</p>
            <form onSubmit={submitAuth}>
              <label className="market-label">EMAIL ADDRESS</label><input className="market-input" type="email" placeholder="Enter your email address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} autoComplete="email" required />
              <label className="market-label">PASSWORD</label><input className="market-input" type="password" placeholder="Enter your password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} autoComplete={authMode === "signup" ? "new-password" : "current-password"} required />
              {authMode === "signup" && (<><label className="market-label">CONFIRM PASSWORD</label><input className="market-input" type="password" placeholder="Enter your password again" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required /></>)}
              <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 20, background: "#00E676", color: "black", border: "none", borderRadius: 10, padding: 14, fontSize: 13, fontWeight: 900 }}>{loading ? "PLEASE WAIT..." : authMode === "signup" ? "CREATE ACCOUNT →" : "LOGIN AND CONTINUE →"}</button>
            </form>
            <div style={{ textAlign: "center", color: "#999", fontSize: 11, marginTop: 18 }}>{authMode === "signup" ? "Already have an account?" : "Don't have an account yet?"}<button onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthPassword(""); setConfirmPassword(""); }} style={{ background: "none", border: "none", color: "#00E676", fontWeight: 900, marginLeft: 5 }}>{authMode === "signup" ? "Login" : "Register"}</button></div>
            <div style={{ color: "#666", textAlign: "center", fontSize: 9, marginTop: 12 }}>🔒 Your account is protected by Supabase authentication.</div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "420px", margin: "0 auto", border: "2px solid #1A231A", borderRadius: "28px", background: "#050A05", padding: "12px" }}>
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

        {announces.length > 0 && (
          <div style={{ marginTop: "10px", background: "#1A150A", border: "1.5px solid #FFB300", borderRadius: "12px", padding: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "800", color: "#FFB300" }}>📢 Announcement Board — From Chairman</div>
            {announces.map((a: any) => (
              <button key={a.id} onClick={() => setSelectedAnnouncement(a)} style={{ width: "100%", textAlign: "left", marginTop: "8px", background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "8px", padding: "10px", cursor: "pointer" }}>
                <div style={{ fontSize: "12px", fontWeight: "900", color: "white" }}>{a.title}</div>
                <div style={{ fontSize: "11px", color: "#BDBDBD", marginTop: "4px", lineHeight: "1.4" }}>{a.message?.length > 85 ? `${a.message.slice(0, 85)}...` : a.message}</div>
                <div style={{ fontSize: "9px", color: "#FFB300", marginTop: "7px" }}>Tap to read full announcement →</div>
              </button>
            ))}
          </div>
        )}

        <div style={{ marginTop: "12px", background: "#121C12", borderRadius: "14px", padding: "14px", border: "1px solid #1E2F1E" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "white" }}>API Marketplace</div>
          <div style={{ fontSize: "11px", color: "#9E9E9E", marginTop: "2px" }}>Authentic Naija Pidgin Voices • Paystack + Supabase {user && <span style={{ color: "#00E676" }}>• {user.email}</span>}</div>
        </div>

        <div style={{ marginTop: "10px", background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: "12px", padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "700", color: "#A5D6A7" }}>🔑 Your Live API Key</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", gap: "8px" }}>
            <div style={{ fontSize: "15px", fontWeight: "900", color: "#00E676", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{apiKey ? apiKey : "sk_live_ •••••••••••"}</div>
            <button onClick={async () => { if (realKey) { try { await navigator.clipboard.writeText(realKey); showToast("Key copied!"); } catch { showToast("Could not copy key. Try again.", "error"); } } else { showToast("Collect an API key first.", "error"); } }} style={{ background: "#00C853", color: "white", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "800", flexShrink: 0 }}>⧉ Copy</button>
          </div>
          <div style={{ marginTop: "10px", borderTop: "1px solid #1E2F1E", paddingTop: "8px", display: "flex", gap: "12px", fontSize: "11px", color: "#BDBDBD" }}>
            <span><b style={{ color: "white" }}>{freeLeft}</b> Free Left</span><span><b style={{ color: "white" }}>{paidLeft}</b> Paid Left</span><span style={{ color: "#333" }}>|</span><span><b style={{ color: "#00E676" }}>99.9%</b> Uptime</span>
          </div>
        </div>

        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>Pricing Plans</div>
          <div style={{ fontSize: "11px", color: "#888", display: "flex", gap: "6px", marginTop: "2px" }}>🛡️ Paystack Secured • Instant activation</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
            <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>🎁 Starter</div><div style={{ fontSize: "20px", fontWeight: "900", color: "#00E676", marginTop: "4px" }}>100 FREE</div><div style={{ fontSize: "10px", color: "#9E9E9E" }}>No card needed</div>
              <button onClick={() => requireAccount("free_100")} disabled={loading} style={{ width: "100%", marginTop: "10px", background: "#00C853", color: "white", border: "none", padding: "10px", borderRadius: "8px", fontSize: "11px", fontWeight: "800" }}>{loading ? "..." : "Get Free Key →"}</button>
            </div>
            <div style={{ background: "#1A150A", border: "1px solid #FFB300", borderRadius: "12px", padding: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>👑 Pro</div><div style={{ fontSize: "7px", background: "#3E3200", border: "1px solid #FFB300", color: "#FFB300", padding: "2px 6px", borderRadius: "20px", fontWeight: "800" }}>MOST POPULAR</div></div>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "white", marginTop: "4px" }}>🔥 1,000 Voices</div><div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>₦5,000</div>
              <button onClick={() => requireAccount("pro")} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #FFB300", color: "white", padding: "9px", borderRadius: "8px", fontSize: "10px", fontWeight: "800" }}>☰ Buy with Paystack</button>
            </div>
            <div style={{ background: "#121C12", borderRadius: "12px", padding: "10px", border: "1px solid #1E2F1E" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>🚀 Growth</div><div style={{ fontSize: "15px", fontWeight: "900", color: "white", marginTop: "4px" }}>2,000 Voices</div><div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>₦10,000</div>
              <button onClick={() => requireAccount("growth")} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #FFB300", color: "white", padding: "9px", borderRadius: "8px", fontSize: "10px", fontWeight: "800" }}>Buy with Paystack</button>
            </div>
            <div style={{ background: "#121C12", borderRadius: "12px", padding: "10px", border: "1px solid #1E2F1E" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>🏢 Scale</div><div style={{ fontSize: "14px", fontWeight: "900", color: "white", marginTop: "4px" }}>10,000 Voices</div><div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>₦50,000</div>
              <button onClick={() => requireAccount("scale")} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #FFB300", color: "white", padding: "9px", borderRadius: "8px", fontSize: "10px", fontWeight: "800" }}>☰ Buy with Paystack</button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: "800", color: "white" }}>Preview Voices – Tap to Listen {myLocalVoices.length > 0 && <span style={{ color: "#00E676", fontSize: "10px" }}>• {myLocalVoices.length} YOUR VOICE READY</span>}</div>
          <div style={{ fontSize: "10px", color: "#00E676", marginTop: "2px" }}>100% Naija accent • Preview no dey deduct {myLocalVoices.length > 0 ? "• CHAIRMAN VOICE ACTIVE" : ""}</div>
          <div className="voice-grid-fixed" style={{ marginTop: "10px" }}>
            {voices.slice(0, 5).map((v: any, idx: number) => {
              const hasMyVoice = !!myLocalVoices[idx];
              return (
                <div key={v.id} onClick={() => { setTestVoice(v.name); playSample(v); }} style={{ background: playingId === v.id ? "#1A2F1A" : "#121C12", border: playingId === v.id ? "1.5px solid #00E676" : hasMyVoice ? "1px solid #00E676" : "1px solid #1E2F1E", borderRadius: "12px", padding: "8px 4px", textAlign: "center", cursor: "pointer", position: "relative", minWidth: 0 }}>
                  {hasMyVoice && <div style={{ position: "absolute", top: "3px", right: "3px", background: "#00E676", color: "black", fontSize: "5px", fontWeight: 900, padding: "1px 3px", borderRadius: "8px" }}>YOU</div>}
                  <div style={{ width: "36px", height: "36px", background: playingId === v.id ? "#FF5252" : "#00E676", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: "12px", color: "#000", fontWeight: "900" }}>{playingId === v.id ? "■" : "▶"}</div>
                  <div style={{ fontSize: "9px", fontWeight: "800", color: "white", marginTop: "6px", lineHeight: "1.1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                  <div style={{ fontSize: "7px", color: hasMyVoice ? "#00E676" : "#999", marginTop: "2px", fontWeight: hasMyVoice ? 800 : 400 }}>{hasMyVoice ? "Chairman" : (v.accent || "").split("-")[0].trim()}</div>
                  <div style={{ marginTop: "6px", display: "flex", justifyContent: "center", gap: "2px", height: "12px", alignItems: "center" }}>{[...Array(6)].map((_, i) => (<div key={i} style={{ width: "2px", height: `${3 + (i % 3) * 2}px`, background: "#00E676", borderRadius: "2px", opacity: playingId === v.id ? 1 : 0.6 }}></div>))}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* API TESTING CONSOLE */}
        <div style={{ marginTop: "16px", background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: "14px", padding: "13px" }}>
          <div style={{ color: "#00E676", fontSize: "17px", fontWeight: 900 }}>🧪 API TESTING CONSOLE</div>
          <p style={{ color: "#999", fontSize: "11px", lineHeight: 1.6 }}>Test your Main Naija Pidgin API using your own account and credits.</p>
          <label className="market-label">TEXT TO GENERATE</label>
          <textarea className="market-input" value={testText} onChange={(e) => setTestText(e.target.value)} rows={4} maxLength={2000} placeholder="Type your Pidgin text here..." />
          <label className="market-label">SELECT VOICE</label>
          <select className="market-input" value={testVoice} onChange={(e) => setTestVoice(e.target.value)}>
            {["Lagos Male", "Abuja Female", "Pidgin Narrator", "Delta Warri", "Yoruba Mix"].map((voice) => (<option key={voice} value={voice}>{voice}</option>))}
          </select>
          <button onClick={testMyApi} disabled={testingApi || !testText.trim()} style={{ width: "100%", marginTop: "14px", padding: "14px", border: "none", borderRadius: "9px", background: testingApi ? "#42634B" : "#00E676", color: "#000", fontWeight: 900, fontSize: "13px", cursor: "pointer" }}>{testingApi ? "GENERATING VOICE..." : "▶ TEST MY API"}</button>
          {testStatus && <div style={{ marginTop: "12px", padding: "10px", borderRadius: "8px", background: "#071007", color: testAudio ? "#00E676" : "#FFB74D", fontSize: "11px" }}>{testStatus}</div>}
          {testAudio && (
            <div style={{ marginTop: "12px" }}>
              <audio controls src={testAudio} style={{ width: "100%" }} />
              <a href={testAudio} download="main-naija-pidgin-test.mp3" style={{ display: "block", textAlign: "center", marginTop: "10px", padding: "11px", background: "#17351D", color: "#00E676", borderRadius: "8px", textDecoration: "none", fontWeight: 800, fontSize: "11px" }}>↓ DOWNLOAD GENERATED VOICE</a>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "13px", borderTop: "1px solid #263326", paddingTop: "10px", color: "#A5D6A7", fontSize: "10px" }}>
            <span>Response: {testTime !== null ? `${testTime} ms` : "--"}</span>
            <span>Credits: {testCredits !== null ? testCredits : freeLeft + paidLeft}</span>
          </div>
          {!user && <p style={{ color: "#FFB74D", fontSize: "10px" }}>Login required before testing your API.</p>}
          {user && !realKey && <p style={{ color: "#FFB74D", fontSize: "10px" }}>Collect your own API key before testing.</p>}
        </div>

        {/* API DASHBOARD */}
        <Link href="/api-dashboard" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "14px", background: "white", color: "#000", padding: "13px", borderRadius: "12px", fontSize: "13px", fontWeight: "900", textDecoration: "none" }}>Go to API Dashboard <span>→</span></Link>
        <div style={{ textAlign: "center", fontSize: "8px", color: "#555", marginTop: "10px" }}>Paystack Secured • Supabase Powered • Preview free • Only real API deducts {user ? `• ${user.email}` : "• Guest"} • Open browsing • Login on tap {myLocalVoices.length > 0 ? `• ${myLocalVoices.length} Chairman Voice Active` : ""}</div>
      </div>
    </div>
  );
}