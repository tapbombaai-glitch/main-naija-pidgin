"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AuthMode = "login" | "signup";

const DEFAULT_VOICES = [
  {
    id: "1",
    name: "Main Naija Pidgin 1",
    accent: "Natural - Young",
    sample_text: "How far boss! Main Naija Pidgin 1 dey here, ready to talk.",
    sample_url: "/voices/main-naija-pidgin-1.mp3",
  },
  {
    id: "2",
    name: "Main Naija Pidgin 2",
    accent: "Warm - Professional",
    sample_text: "Good morning, na Main Naija Pidgin 2, calm and clear.",
    sample_url: "/voices/main-naija-pidgin-2.mp3",
  },
  {
    id: "3",
    name: "Main Naija Pidgin 3",
    accent: "Story - Expressive",
    sample_text: "For inside this life, na story dey sweet pass, make I tell you!",
    sample_url: "/voices/main-naija-pidgin-3.mp3",
  },
  {
    id: "4",
    name: "Main Naija Pidgin 4",
    accent: "Rugged - Local",
    sample_text: "Warri no dey carry last, you hear? Original Main Naija Pidgin 4!",
    sample_url: "/voices/main-naija-pidgin-4.mp3",
  },
  {
    id: "5",
    name: "Main Naija Pidgin 5",
    accent: "Hybrid - Bilingual",
    sample_text: "E kaaro! I fit speak Yoruba and pidgin join together.",
    sample_url: "/voices/main-naija-pidgin-5.mp3",
  },
];

export default function Marketplace() {
  const [user, setUser] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [realKey, setRealKey] = useState("");
  const [freeLeft, setFreeLeft] = useState(0);
  const [paidLeft, setPaidLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  const [voices, setVoices] = useState<any[]>(DEFAULT_VOICES);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // API Testing
  const [testText, setTestText] = useState("How far boss! Welcome to Main Naija Pidgin.");
  const [testVoice, setTestVoice] = useState("Main Naija Pidgin 1");
  const [testingApi, setTestingApi] = useState(false);
  const [testAudio, setTestAudio] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const [testTime, setTestTime] = useState<number | null>(null);
  const [testCredits, setTestCredits] = useState<number | null>(null);

  useEffect(() => {
    loadData();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadData();
    });

    return () => {
      listener.subscription.unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function loadData() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser || null);

    // Voices from DB (fallback to default)
    const { data: dbVoices } = await supabase
      .from("voices")
      .select("*")
      .eq("active", true)
      .limit(10);

    if (dbVoices && dbVoices.length > 0) {
      setVoices(dbVoices);
    } else {
      setVoices(DEFAULT_VOICES);
    }

    // Guest ID
    let guestId = localStorage.getItem("guest_id");
    if (!guestId) {
      guestId = `guest_${Date.now()}`;
      localStorage.setItem("guest_id", guestId);
    }

    const uid = currentUser?.id || guestId;

    // API Key
    const { data: keys } = await supabase
      .from("api_keys")
      .select("*")
      .eq("user_id", uid)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (keys?.[0]) {
      setApiKey(keys[0].key_prefix || "");
      setRealKey(keys[0].key || "");
      setFreeLeft(keys[0].free_requests_remaining || 0);
      setPaidLeft(keys[0].paid_requests_remaining || 0);
    } else {
      setApiKey("");
      setRealKey("");
      setFreeLeft(0);
      setPaidLeft(0);
    }

    // Announcements
    try {
      const { data: ann } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3);
      if (ann) setAnnounces(ann);
    } catch {}

    // Local recordings (Chairman voice)
    try {
      const saved = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
      const myVoices = saved
        .filter((f: any) => f.audioData)
        .sort((a: any, b: any) => (a.id || 0) - (b.id || 0));
      setMyLocalVoices(myVoices);
    } catch {
      setMyLocalVoices([]);
    }
  }

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 3500);
  };

  const requireAccount = (pkg: string) => {
    if (user) {
      continuePurchase(pkg);
      return;
    }
    setPendingAction(pkg);
    setAuthMode("login");
    setShowAuth(true);
  };

  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = authEmail.trim().toLowerCase();

    if (!email || !authPassword) {
      showToast("Enter email and password", "error");
      return;
    }

    if (authMode === "signup") {
      if (authPassword.length < 8) {
        showToast("Password must be at least 8 characters", "error");
        return;
      }
      if (authPassword !== confirmPassword) {
        showToast("Passwords do not match", "error");
        return;
      }
    }

    setLoading(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password: authPassword });
        if (error) throw error;

        if (!data.session) {
          showToast("Check your email to confirm account", "success");
          setAuthMode("login");
          setAuthPassword("");
          setConfirmPassword("");
          return;
        }

        setUser(data.user);
        setShowAuth(false);
        showToast("Account created!");
        if (pendingAction) await continuePurchase(pendingAction);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: authPassword,
        });
        if (error) throw error;

        setUser(data.user);
        setShowAuth(false);
        showToast("Login successful!");
        if (pendingAction) await continuePurchase(pendingAction);
        else await loadData();
      }
    } catch (err: any) {
      showToast(err.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
      setAuthPassword("");
      setConfirmPassword("");
    }
  };

  const playSample = async (voice: any) => {
    try {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis?.cancel();

      if (playingId === voice.id) {
        setPlayingId(null);
        return;
      }

      setPlayingId(voice.id);
      setTestVoice(voice.name); // also select it in the test console

      // Try local Chairman recordings first
      const idx = DEFAULT_VOICES.findIndex((v) => v.name === voice.name);
      const localVoice = myLocalVoices[idx];

      if (localVoice?.audioData) {
        const a = new Audio(localVoice.audioData);
        audioRef.current = a;
        a.onended = () => setPlayingId(null);
        a.onerror = () => setPlayingId(null);
        await a.play();
        showToast(`🎧 Chairman Voice: ${voice.name}`, "success");
        return;
      }

      // Fallback to sample_url
      if (voice.sample_url) {
        const a = new Audio(voice.sample_url);
        audioRef.current = a;
        a.onended = () => setPlayingId(null);
        a.onerror = () => setPlayingId(null);
        await a.play();
        return;
      }

      // Last fallback - browser TTS
      const utter = new SpeechSynthesisUtterance(voice.sample_text);
      utter.onend = () => setPlayingId(null);
      speechSynthesis.speak(utter);
    } catch {
      setPlayingId(null);
    }
  };

  const claimFree = async () => {
    if (!user) {
      requireAccount("free_100");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/keys/create-free", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionData.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();

      if (data.api_key) {
        setRealKey(data.api_key);
        setApiKey(data.key_prefix || "");
        setFreeLeft(100);
        showToast("✅ 100 FREE credits claimed!");
        try {
          await navigator.clipboard.writeText(data.api_key);
        } catch {}
        await loadData();
      } else {
        showToast(data.error || "Already claimed", "error");
      }
    } catch {
      showToast("Failed to claim free key", "error");
    } finally {
      setLoading(false);
    }
  };

  const buy = async (pkg: string) => {
    if (!user) {
      requireAccount(pkg);
      return;
    }

    if (pkg === "free_100") {
      await claimFree();
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionData.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          packageId: pkg,
          email: user.email,
          userId: user.id,
        }),
      });

      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        showToast(data.error || "Payment initialization failed", "error");
      }
    } catch {
      showToast("Connection failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const continuePurchase = async (pkg: string) => {
    setPendingAction(null);
    setShowAuth(false);
    if (pkg === "free_100") {
      await claimFree();
    } else {
      await buy(pkg);
    }
  };

  const testMyApi = async () => {
    if (!user) {
      setPendingAction(null);
      setAuthMode("login");
      setShowAuth(true);
      showToast("Please login first", "error");
      return;
    }

    if (!realKey) {
      showToast("Collect your free API key first", "error");
      return;
    }

    if (!testText.trim()) {
      showToast("Enter some text", "error");
      return;
    }

    setTestingApi(true);
    setTestAudio("");
    setTestStatus("Generating voice...");
    setTestTime(null);
    setTestCredits(null);

    const started = Date.now();

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) throw new Error("Session expired. Please login again.");

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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.error || `Failed (${response.status})`);
      }

      const audioUrl = result.audio_url || result.audioUrl;
      if (!audioUrl) throw new Error("No audio returned");

      setTestAudio(audioUrl);
      setTestTime(Date.now() - started);
      setTestCredits(result.remaining_credits ?? null);
      setTestStatus("Voice generated successfully!");
      showToast("API test successful!");

      // Refresh credits
      await loadData();
    } catch (err: any) {
      setTestStatus(err.message || "Test failed");
      showToast(err.message || "Test failed", "error");
    } finally {
      setTestingApi(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setApiKey("");
    setRealKey("");
    setFreeLeft(0);
    setPaidLeft(0);
    showToast("Logged out");
  };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", width: "100%", padding: "8px" }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        button:active { transform: scale(0.97); }
        .voice-grid-fixed {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 6px;
        }
        .market-modal {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0,0,0,.82);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow-y: auto;
        }
        .market-modal-card {
          width: 100%;
          max-width: 390px;
          max-height: 90vh;
          overflow-y: auto;
          background: #0D170D;
          border: 1px solid #00E676;
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 15px 60px rgba(0,0,0,.6);
        }
        .market-input {
          width: 100%;
          background: #071007;
          color: white;
          border: 1px solid #315A35;
          border-radius: 9px;
          padding: 13px;
          outline: none;
          font-size: 13px;
          margin-top: 6px;
        }
        .market-label {
          display: block;
          color: #A5D6A7;
          font-size: 11px;
          font-weight: 800;
          margin-top: 13px;
        }
        @media (max-width: 360px) {
          .voice-grid-fixed { gap: 3px; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: toastType === "error" ? "#FF5252" : "#00E676",
            color: toastType === "error" ? "white" : "black",
            padding: "10px 18px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 900,
            zIndex: 300,
            maxWidth: "90%",
            textAlign: "center",
          }}
        >
          {toast}
        </div>
      )}

      {/* Announcement Modal */}
      {selectedAnnouncement && (
        <div className="market-modal" onClick={() => setSelectedAnnouncement(null)}>
          <div className="market-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#FFB300", fontWeight: 900, fontSize: 13 }}>
                📢 CHAIRMAN ANNOUNCEMENT
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                style={{
                  background: "#263326",
                  border: "none",
                  color: "white",
                  borderRadius: "50%",
                  width: 30,
                  height: 30,
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>
            <h2 style={{ color: "white", fontSize: 19, marginTop: 18 }}>
              {selectedAnnouncement.title}
            </h2>
            <p style={{ color: "#D0D0D0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {selectedAnnouncement.message}
            </p>
            <div style={{ color: "#777", fontSize: 10, marginTop: 18 }}>
              {selectedAnnouncement.created_at
                ? new Date(selectedAnnouncement.created_at).toLocaleString()
                : ""}{" "}
              • Chairman
            </div>
            <button
              onClick={() => setSelectedAnnouncement(null)}
              style={{
                width: "100%",
                marginTop: 18,
                padding: 12,
                background: "#00E676",
                color: "black",
                border: "none",
                borderRadius: 9,
                fontWeight: 900,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div
          className="market-modal"
          onClick={() => !loading && setShowAuth(false)}
        >
          <div className="market-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: "#00E676", fontWeight: 900, fontSize: 11 }}>
                  MAIN NAIJA PIDGIN
                </div>
                <h2 style={{ color: "white", fontSize: 20, margin: "7px 0 0" }}>
                  {authMode === "signup" ? "Create Account" : "Welcome Back"}
                </h2>
              </div>
              <button
                onClick={() => setShowAuth(false)}
                disabled={loading}
                style={{
                  background: "#263326",
                  border: "none",
                  color: "white",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            <p style={{ color: "#999", fontSize: 11, lineHeight: 1.5 }}>
              {authMode === "signup"
                ? "Register to get free API key or buy packages."
                : "Login to continue."}
            </p>

            <form onSubmit={submitAuth}>
              <label className="market-label">EMAIL</label>
              <input
                className="market-input"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />

              <label className="market-label">PASSWORD</label>
              <input
                className="market-input"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />

              {authMode === "signup" && (
                <>
                  <label className="market-label">CONFIRM PASSWORD</label>
                  <input
                    className="market-input"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 20,
                  background: "#00E676",
                  color: "black",
                  border: "none",
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 13,
                  fontWeight: 900,
                }}
              >
                {loading
                  ? "PLEASE WAIT..."
                  : authMode === "signup"
                  ? "CREATE ACCOUNT →"
                  : "LOGIN →"}
              </button>
            </form>

            <div style={{ textAlign: "center", color: "#999", fontSize: 11, marginTop: 18 }}>
              {authMode === "signup" ? "Already have account?" : "No account yet?"}
              <button
                onClick={() => {
                  setAuthMode(authMode === "signup" ? "login" : "signup");
                  setAuthPassword("");
                  setConfirmPassword("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#00E676",
                  fontWeight: 900,
                  marginLeft: 5,
                }}
              >
                {authMode === "signup" ? "Login" : "Register"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          border: "2px solid #1A231A",
          borderRadius: 28,
          background: "#050A05",
          padding: 12,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "white", borderRadius: 4, width: 28, height: 20, display: "flex", overflow: "hidden" }}>
              <div style={{ flex: 1, background: "#008751" }} />
              <div style={{ flex: 1, background: "white" }} />
              <div style={{ flex: 1, background: "#008751" }} />
            </div>
            <div style={{ fontWeight: 900, color: "white", fontSize: 15 }}>MAIN NAIJA PIDGIN</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 9, color: "#00E676", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.email}
                </div>
                <button
                  onClick={logout}
                  style={{
                    background: "#1A231A",
                    border: "1px solid #1E4D2B",
                    color: "#A5D6A7",
                    fontSize: 8,
                    padding: "4px 8px",
                    borderRadius: 20,
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setPendingAction(null);
                  setAuthMode("login");
                  setShowAuth(true);
                }}
                style={{
                  background: "#00E676",
                  color: "black",
                  fontSize: 9,
                  fontWeight: 900,
                  padding: "6px 10px",
                  borderRadius: 20,
                  border: "none",
                }}
              >
                Login
              </button>
            )}
            <div
              style={{
                background: "#14301A",
                border: "1px solid #1E4D2B",
                color: "#A5D6A7",
                fontSize: 9,
                fontWeight: 800,
                padding: "6px 10px",
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, background: "#00E676", borderRadius: "50%" }} />
              LIVE
            </div>
          </div>
        </div>

        {/* Announcements */}
        {announces.length > 0 && (
          <div style={{ marginTop: 10, background: "#1A150A", border: "1.5px solid #FFB300", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#FFB300" }}>
              📢 Announcement Board — From Chairman
            </div>
            {announces.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAnnouncement(a)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  marginTop: 8,
                  background: "#121C12",
                  border: "1px solid #1E2F1E",
                  borderRadius: 8,
                  padding: 10,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 900, color: "white" }}>{a.title}</div>
                <div style={{ fontSize: 11, color: "#BDBDBD", marginTop: 4, lineHeight: 1.4 }}>
                  {a.message?.length > 85 ? `${a.message.slice(0, 85)}...` : a.message}
                </div>
                <div style={{ fontSize: 9, color: "#FFB300", marginTop: 7 }}>
                  Tap to read full →
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Title */}
        <div style={{ marginTop: 12, background: "#121C12", borderRadius: 14, padding: 14, border: "1px solid #1E2F1E" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "white" }}>API Marketplace</div>
          <div style={{ fontSize: 11, color: "#9E9E9E", marginTop: 2 }}>
            Authentic Naija Pidgin Voices • Paystack + Supabase
            {user && <span style={{ color: "#00E676" }}> • {user.email}</span>}
          </div>
        </div>

        {/* API Key Card */}
        <div style={{ marginTop: 10, background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#A5D6A7" }}>
            🔑 Your Live API Key
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#00E676", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
              {apiKey || "sk_live_ •••••••••••"}
            </div>
            <button
              onClick={async () => {
                if (realKey) {
                  try {
                    await navigator.clipboard.writeText(realKey);
                    showToast("Key copied!");
                  } catch {
                    showToast("Copy failed", "error");
                  }
                } else {
                  showToast("Collect key first", "error");
                }
              }}
              style={{
                background: "#00C853",
                color: "white",
                border: "none",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              ⧉ Copy
            </button>
          </div>
          <div style={{ marginTop: 10, borderTop: "1px solid #1E2F1E", paddingTop: 8, display: "flex", gap: 12, fontSize: 11, color: "#BDBDBD" }}>
            <span><b style={{ color: "white" }}>{freeLeft}</b> Free</span>
            <span><b style={{ color: "white" }}>{paidLeft}</b> Paid</span>
            <span style={{ color: "#333" }}>|</span>
            <span><b style={{ color: "#00E676" }}>99.9%</b> Uptime</span>
          </div>
        </div>

        {/* Pricing */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>Pricing Plans</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>🛡️ Paystack Secured • Instant activation</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
            {/* Free */}
            <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "white" }}>🎁 Starter</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#00E676", marginTop: 4 }}>100 FREE</div>
              <div style={{ fontSize: 10, color: "#9E9E9E" }}>No card needed</div>
              <button
                onClick={() => requireAccount("free_100")}
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 10,
                  background: "#00C853",
                  color: "white",
                  border: "none",
                  padding: 10,
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {loading ? "..." : "Get Free Key →"}
              </button>
            </div>

            {/* Pro */}
            <div style={{ background: "#1A150A", border: "1px solid #FFB300", borderRadius: 12, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "white" }}>👑 Pro</div>
                <div style={{ fontSize: 7, background: "#3E3200", border: "1px solid #FFB300", color: "#FFB300", padding: "2px 6px", borderRadius: 20, fontWeight: 800 }}>
                  MOST POPULAR
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white", marginTop: 4 }}>🔥 1,000 Voices</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>₦5,000</div>
              <button
                onClick={() => requireAccount("pro")}
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 8,
                  background: "transparent",
                  border: "1px solid #FFB300",
                  color: "white",
                  padding: 9,
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                Buy with Paystack
              </button>
            </div>

            {/* Growth */}
            <div style={{ background: "#121C12", borderRadius: 12, padding: 10, border: "1px solid #1E2F1E" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "white" }}>🚀 Growth</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "white", marginTop: 4 }}>2,000 Voices</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>₦10,000</div>
              <button
                onClick={() => requireAccount("growth")}
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 8,
                  background: "transparent",
                  border: "1px solid #FFB300",
                  color: "white",
                  padding: 9,
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                Buy with Paystack
              </button>
            </div>

            {/* Scale */}
            <div style={{ background: "#121C12", borderRadius: 12, padding: 10, border: "1px solid #1E2F1E" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "white" }}>🏢 Scale</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white", marginTop: 4 }}>10,000 Voices</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>₦50,000</div>
              <button
                onClick={() => requireAccount("scale")}
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 8,
                  background: "transparent",
                  border: "1px solid #FFB300",
                  color: "white",
                  padding: 9,
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                Buy with Paystack
              </button>
            </div>
          </div>
        </div>

        {/* Voice Preview */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>
            Preview Voices – Tap to Listen
            {myLocalVoices.length > 0 && (
              <span style={{ color: "#00E676", fontSize: 10 }}> • {myLocalVoices.length} YOUR VOICE READY</span>
            )}
          </div>
          <div style={{ fontSize: 10, color: "#00E676", marginTop: 2 }}>
            100% Naija accent • Preview free
            {myLocalVoices.length > 0 ? " • CHAIRMAN VOICE ACTIVE" : ""}
          </div>

          <div className="voice-grid-fixed" style={{ marginTop: 10 }}>
            {voices.slice(0, 5).map((v, idx) => {
              const hasMyVoice = !!myLocalVoices[idx];
              return (
                <div
                  key={v.id}
                  onClick={() => playSample(v)}
                  style={{
                    background: playingId === v.id ? "#1A2F1A" : "#121C12",
                    border: playingId === v.id
                      ? "1.5px solid #00E676"
                      : hasMyVoice
                      ? "1px solid #00E676"
                      : "1px solid #1E2F1E",
                    borderRadius: 12,
                    padding: "8px 4px",
                    textAlign: "center",
                    cursor: "pointer",
                    position: "relative",
                    minWidth: 0,
                  }}
                >
                  {hasMyVoice && (
                    <div
                      style={{
                        position: "absolute",
                        top: 3,
                        right: 3,
                        background: "#00E676",
                        color: "black",
                        fontSize: 5,
                        fontWeight: 900,
                        padding: "1px 3px",
                        borderRadius: 8,
                      }}
                    >
                      YOU
                    </div>
                  )}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: playingId === v.id ? "#FF5252" : "#00E676",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      fontSize: 12,
                      color: "#000",
                      fontWeight: 900,
                    }}
                  >
                    {playingId === v.id ? "■" : "▶"}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: "white",
                      marginTop: 6,
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {v.name}
                  </div>
                  <div
                    style={{
                      fontSize: 7,
                      color: hasMyVoice ? "#00E676" : "#999",
                      marginTop: 2,
                      fontWeight: hasMyVoice ? 800 : 400,
                    }}
                  >
                    {hasMyVoice ? "Chairman" : (v.accent || "").split("-")[0].trim()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* API Testing Console */}
        <div style={{ marginTop: 16, background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: 14, padding: 13 }}>
          <div style={{ color: "#00E676", fontSize: 17, fontWeight: 900 }}>🧪 API TESTING CONSOLE</div>
          <p style={{ color: "#999", fontSize: 11, lineHeight: 1.6 }}>
            Test your Main Naija Pidgin API with your own credits.
          </p>

          <label className="market-label">TEXT TO GENERATE</label>
          <textarea
            className="market-input"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Type your Pidgin text here..."
          />

          <label className="market-label">SELECT VOICE</label>
          <select
            className="market-input"
            value={testVoice}
            onChange={(e) => setTestVoice(e.target.value)}
          >
            {DEFAULT_VOICES.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>

          <button
            onClick={testMyApi}
            disabled={testingApi || !testText.trim()}
            style={{
              width: "100%",
              marginTop: 14,
              padding: 14,
              border: "none",
              borderRadius: 9,
              background: testingApi ? "#42634B" : "#00E676",
              color: "#000",
              fontWeight: 900,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {testingApi ? "GENERATING VOICE..." : "▶ TEST MY API"}
          </button>

          {testStatus && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 8,
                background: "#071007",
                color: testAudio ? "#00E676" : "#FFB74D",
                fontSize: 11,
              }}
            >
              {testStatus}
            </div>
          )}

          {testAudio && (
            <div style={{ marginTop: 12 }}>
              <audio controls src={testAudio} style={{ width: "100%" }} />
              <a
                href={testAudio}
                download="main-naija-pidgin-test.mp3"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: 10,
                  padding: 11,
                  background: "#17351D",
                  color: "#00E676",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 11,
                }}
              >
                ↓ DOWNLOAD GENERATED VOICE
              </a>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              marginTop: 13,
              borderTop: "1px solid #263326",
              paddingTop: 10,
              color: "#A5D6A7",
              fontSize: 10,
            }}
          >
            <span>Response: {testTime !== null ? `${testTime} ms` : "--"}</span>
            <span>Credits left: {testCredits !== null ? testCredits : freeLeft + paidLeft}</span>
          </div>

          {!user && (
            <p style={{ color: "#FFB74D", fontSize: 10, marginTop: 8 }}>
              Login required to test API
            </p>
          )}
          {user && !realKey && (
            <p style={{ color: "#FFB74D", fontSize: 10, marginTop: 8 }}>
              Collect your free API key first
            </p>
          )}
        </div>

        {/* Dashboard Link */}
        <Link
          href="/api-dashboard"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            marginTop: 14,
            background: "white",
            color: "#000",
            padding: 13,
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          Go to API Dashboard →
        </Link>

        <div style={{ textAlign: "center", fontSize: 8, color: "#555", marginTop: 10 }}>
          Paystack Secured • Supabase Powered • Preview free • Only real API deducts
          {user ? ` • ${user.email}` : " • Guest"}
          {myLocalVoices.length > 0 ? ` • ${myLocalVoices.length} Chairman Voice Active` : ""}
        </div>
      </div>
    </div>
  );
}