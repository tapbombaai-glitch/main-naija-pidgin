"use client";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);

type AuthMode = "login" | "signup";

// ✅ FINAL CLEAN - 6 VOICES ONLY - WARRI BABE IS BEST SELLER
const DEFAULT_VOICES = [
  { id: "w5p3k3PueAgQOT4lq0SF", name: "Warri Babe", accent: "Sweet - Expressive - Professional - BEST SELLER", category: "Female", sample_text: "How far my people! Na Warri Babe dey here - Sweet professional voice wey go entice all your customers, come buy me now!", sample_url: "/samples/ElevenLabs_2026-11-02T13_24_07_Warri babe ivc_sp100_s50_sb75_v4.mp3", rating: 5.0, sales: 1200, isBestSeller: true, isFeatured: true, tag: "FEMALE" },
  { id: "1", name: "Main Naija Pidgin 1", accent: "Natural - Young - Fast", category: "Lagos", sample_text: "How far boss! Main Naija Pidgin 1 dey here - Fast young vibe!", sample_url: "", rating: 4.8, sales: 312, isBestSeller: false, isFeatured: false, tag: "MALE" },
  { id: "2", name: "Main Naija Pidgin 2", accent: "Warm - Professional - Calm", category: "PH", sample_text: "Good morning, na Main Naija Pidgin 2 - Warm professional.", sample_url: "", rating: 4.9, sales: 456, isBestSeller: true, isFeatured: false, tag: "MALE" },
  { id: "3", name: "Main Naija Pidgin 3", accent: "Story - Expressive - BESTSELLER", category: "Warri", sample_text: "For inside this life, na story dey sweet pass!", sample_url: "", rating: 5.0, sales: 892, isBestSeller: true, isFeatured: false, tag: "MALE" },
  { id: "4", name: "Main Naija Pidgin 4", accent: "Rugged - Local - Street", category: "Warri", sample_text: "Warri no dey carry last! Rugged local vibe!", sample_url: "", rating: 4.7, sales: 234, isBestSeller: false, isFeatured: false, tag: "MALE" },
  { id: "5", name: "Main Naija Pidgin 5", accent: "Hybrid - Bilingual - Balanced", category: "Lagos", sample_text: "E kaaro! I fit speak Yoruba and pidgin join - Hybrid!", sample_url: "", rating: 4.8, sales: 189, isBestSeller: false, isFeatured: false, tag: "MALE" },
];

const CATEGORIES = ["All", "Lagos", "Warri", "PH", "Female", "Chairman"];

export default function Marketplace() {
  const [user, setUser] = useState<any>(null);
  const [apiKey, setApiKey] = useState('');
  const [realKey, setRealKey] = useState('');
  const [freeLeft, setFreeLeft] = useState(0);
  const [paidLeft, setPaidLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCart, setShowCart] = useState(false);
  const [realStats, setRealStats] = useState({ totalUsers: 0, totalVoices: 6, totalSales: 0 });
  const [voices, setVoices] = useState<any[]>(DEFAULT_VOICES);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const [announces, setAnnounces] = useState<any[]>([]);
  const [myLocalVoices, setMyLocalVoices] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [testText, setTestText] = useState('');
  const [testVoice, setTestVoice] = useState('Warri Babe');
  const [testingApi, setTestingApi] = useState(false);
  const [testAudio, setTestAudio] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [testTime, setTestTime] = useState<number | null>(null);
  const [testCredits, setTestCredits] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadData();
    });
    return () => {
      listener.subscription.unsubscribe();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  async function loadData() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser || null);
      
      try {
        const { count: usersCount } = await supabase.from("api_keys").select("*", { count: "exact", head: true });
        const { data: keysData } = await supabase.from("api_keys").select("paid_requests_remaining");
        const totalPaidUsed = keysData?.reduce((acc, k: any) => acc + (1000 - (k.paid_requests_remaining || 0)), 0) || 0;
        setRealStats({ totalUsers: usersCount || 0, totalSales: totalPaidUsed, totalVoices: 6 });
      } catch {}

      if (typeof window !== 'undefined') {
        let guestId = localStorage.getItem("guest_id");
        if (!guestId) { guestId = `guest_${Date.now()}`; localStorage.setItem("guest_id", guestId); }
        const uid = currentUser?.id || guestId;
        const { data: keys } = await supabase.from("api_keys").select("*").eq("user_id", uid).eq("is_active", true).order("created_at", { ascending: false }).limit(1);
        if (keys?.[0]) { setApiKey(keys[0].key_prefix || ""); setRealKey(keys[0].key || ""); setFreeLeft(keys[0].free_requests_remaining || 0); setPaidLeft(keys[0].paid_requests_remaining || 0); }
        try { const saved = JSON.parse(localStorage.getItem("gin_recordings") || "[]"); setMyLocalVoices(saved.filter((f: any) => f.audioData)); setCart(JSON.parse(localStorage.getItem("gin_cart") || "[]")); } catch {}
      }
      try { const { data: ann } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(3); if (ann) setAnnounces(ann); } catch {}
    } catch {}
  }

  const filteredVoices = voices.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.accent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === "All" || v.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => { setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3000); };
  const addToCart = (voice: any) => {
    if (cart.find((c) => c.id === voice.id)) { showToast("Already for cart!", "error"); return; }
    const newCart = [...cart, voice]; setCart(newCart); if(typeof window !== 'undefined') localStorage.setItem("gin_cart", JSON.stringify(newCart)); showToast(`🛒 ${voice.name} added!`);
  };
  const removeFromCart = (id: string) => { const newCart = cart.filter((c) => c.id !== id); setCart(newCart); if(typeof window !== 'undefined') localStorage.setItem("gin_cart", JSON.stringify(newCart)); };
  const requireAccount = (pkg: string) => { if (user) { continuePurchase(pkg); return; } setPendingAction(pkg); setAuthMode("login"); setShowAuth(true); };
  
  const playSample = async (voice: any) => {
    if (!user) { showToast("🔒 Oga login first before you fit listen!", "error"); setAuthMode("login"); setShowAuth(true); return; }
    if (typeof window === 'undefined') return;
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      window.speechSynthesis?.cancel();
      if (playingId === voice.id) { setPlayingId(null); return; }
      setPlayingId(voice.id);
      if (voice.sample_url) { const a = new window.Audio(voice.sample_url); audioRef.current = a; a.onended = () => setPlayingId(null); a.onerror = () => { setPlayingId(null); const utter = new SpeechSynthesisUtterance(voice.sample_text); utter.onend = () => setPlayingId(null); window.speechSynthesis.speak(utter); }; await a.play(); return; }
      const utter = new SpeechSynthesisUtterance(voice.sample_text); utter.onend = () => setPlayingId(null); window.speechSynthesis.speak(utter);
    } catch { setPlayingId(null); }
  };

  const claimFree = async () => {
    if (!user) { requireAccount("free_100"); return; }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/keys/create-free", { method: "POST", headers: { "Content-Type": "application/json", ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}) }, body: JSON.stringify({ userId: user.id }) });
      const data = await res.json();
      if (data.api_key) { setRealKey(data.api_key); setApiKey(data.key_prefix || ""); setFreeLeft(100); showToast("✅ 100 FREE claimed!"); await loadData(); } else showToast(data.error || "Already claimed", "error");
    } catch { showToast("Failed to claim", "error"); } finally { setLoading(false); }
  };
  const buy = async (pkg: string) => {
    if (!user) { requireAccount(pkg); return; }
    if (pkg === "free_100") { await claimFree(); return; }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/paystack/initialize", { method: "POST", headers: { "Content-Type": "application/json", ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}) }, body: JSON.stringify({ packageId: pkg, email: user.email, userId: user.id }) });
      const data = await res.json();
      if (data.authorization_url && typeof window !== 'undefined') window.location.href = data.authorization_url; else showToast(data.error || "Paystack failed", "error");
    } catch { showToast("Connection failed", "error"); } finally { setLoading(false); }
  };
  const continuePurchase = async (pkg: string) => { setPendingAction(null); setShowAuth(false); if (pkg === "free_100") await claimFree(); else await buy(pkg); };
  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = authEmail.trim().toLowerCase();
    if (!email || !authPassword) { showToast("Enter email and password", "error"); return; }
    setLoading(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password: authPassword }); if (error) throw error;
        if (!data.session) { showToast("Check email to confirm", "success"); setAuthMode("login"); return; }
        setUser(data.user); setShowAuth(false); showToast("Account created!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: authPassword }); if (error) throw error;
        setUser(data.user); setShowAuth(false); showToast("Login successful!"); 
      }
      if (pendingAction) await continuePurchase(pendingAction);
      else await loadData();
    } catch (err: any) { showToast(err.message || "Auth failed", "error"); } finally { setLoading(false); setAuthPassword(""); setConfirmPassword(""); }
  };
  const testMyApi = async () => {
    if (!user) { setShowAuth(true); showToast("Login first", "error"); return; }
    if (!realKey) { showToast("Collect free key first", "error"); return; }
    if (!testText.trim()) { showToast("Enter text", "error"); return; }
    setTestingApi(true); setTestAudio(""); setTestStatus("Generating..."); setTestTime(null); const started = Date.now();
    try {
      const { data: sessionData } = await supabase.auth.getSession(); const token = sessionData.session?.access_token; if (!token) throw new Error("Session expired");
      const response = await fetch("/api/tts/generate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: testText.trim(), voice: testVoice }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result?.error || `Failed ${response.status}`);
      const audioUrl = result.audio_url || result.audioUrl; if (!audioUrl) throw new Error("No audio"); setTestAudio(audioUrl); setTestTime(Date.now() - started); setTestCredits(result.remaining_credits ?? null); setTestStatus(`Success!`); showToast("API test successful!"); await loadData();
    } catch (err: any) { setTestStatus(err.message); showToast(err.message, "error"); } finally { setTestingApi(false); }
  };
  const logout = async () => { await supabase.auth.signOut(); setUser(null); setApiKey(""); setRealKey(""); setFreeLeft(0); setPaidLeft(0); showToast("Logged out"); };

  if (!mounted) { return <div style={{padding: '50px', textAlign: 'center', background: '#080C08', color: 'white', minHeight: '100vh'}}>Loading GIN Marketplace... 6 Voices...</div>; }

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", width: "100%", paddingBottom: 80 }}>
      <style>{` * { box-sizing: border-box; } button:active { transform: scale(0.97); } .market-modal { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.85); display: flex; align-items: flex-end; justify-content: center; } .market-modal-card { width: 100%; max-width: 420px; max-height: 88vh; overflow-y: auto; background: #0D170D; border-top: 2px solid #00E676; border-radius: 20px 20px 0 0; padding: 18px 14px 30px; } .market-input { width: 100%; background: #071007; color: white; border: 1px solid #1E4D2B; border-radius: 10px; padding: 14px; outline: none; font-size: 14px; margin-top: 6px; } .market-label { display: block; color: #A5D6A7; font-size: 11px; font-weight: 800; margin-top: 14px; } .cat-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 10px 0 6px; scrollbar-width: none; } .cat-scroll::-webkit-scrollbar { display: none; } .voice-card { background: #121C12; border: 1px solid #1E2F1E; border-radius: 16px; padding: 14px; margin-top: 10px; } .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #0A150A; border-top: 1px solid #1E2F1E; display: flex; justify-content: space-around; padding: 8px 0 12px; z-index: 100; max-width: 420px; margin: 0 auto; } .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; color: #666; font-size: 9px; font-weight: 800; } .nav-item.active { color: #00E676; } .nav-icon { font-size: 20px; } `}</style>

      {toast && <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: toastType === "error" ? "#FF5252" : "#00E676", color: toastType === "error" ? "white" : "black", padding: "10px 18px", borderRadius: 20, fontSize: 11, fontWeight: 900, zIndex: 300 }}>{toast}</div>}

      {showCart && (
        <div className="market-modal" onClick={() => setShowCart(false)}>
          <div className="market-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ color: "white", fontWeight: 900 }}>🛒 Cart ({cart.length})</div><button onClick={() => setShowCart(false)} style={{ background: "#263326", border: "none", color: "white", borderRadius: "50%", width: 34, height: 34 }}>×</button></div>
            {cart.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "#777" }}>Cart empty</div> : cart.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", background: "#121C12", padding: 12, borderRadius: 10, marginTop: 10 }}>
                <div><div style={{ color: "white", fontWeight: 800 }}>{item.name}</div><div style={{ color: "#FFD600", fontSize: 11 }}>₦5,000</div></div>
                <button onClick={() => removeFromCart(item.id)} style={{ background: "#FF5252", color: "white", border: "none", padding: "8px 12px", borderRadius: 8 }}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAuth && (
        <div className="market-modal" onClick={() => !loading && setShowAuth(false)}>
          <div className="market-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><h2 style={{ color: "white" }}>{authMode === "signup" ? "Create Account" : "Welcome Back"}</h2><button onClick={() => setShowAuth(false)} style={{ background: "#263326", border: "none", color: "white", borderRadius: "50%", width: 34, height: 34 }}>×</button></div>
            <form onSubmit={submitAuth}><label className="market-label">EMAIL</label><input className="market-input" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required /><label className="market-label">PASSWORD</label><input className="market-input" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required /><button type="submit" disabled={loading} style={{ width: "100%", marginTop: 20, background: "#00E676", color: "black", border: "none", borderRadius: 12, padding: 16, fontWeight: 900 }}>{loading ? "..." : authMode === "signup" ? "CREATE ACCOUNT →" : "LOGIN →"}</button></form>
            <div style={{ textAlign: "center", color: "#999", fontSize: 11, marginTop: 18 }}>{authMode === "signup" ? "Already have?" : "No account?"}<button onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")} style={{ background: "none", border: "none", color: "#00E676", fontWeight: 900, marginLeft: 6 }}>{authMode === "signup" ? "Login" : "Register"}</button></div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 420, margin: "0 auto", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900, color: "white" }}>MAIN NAIJA PIDGIN</div>
          <button onClick={() => setShowCart(true)} style={{ background: "#FFD600", border: "none", borderRadius: 20, padding: "7px 14px", fontWeight: 900 }}>🛒 {cart.length}</button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div style={{ background: "#121C12", borderRadius: 12, padding: 10, textAlign: "center" }}><div style={{ fontWeight: 900, color: "#00E676" }}>{realStats.totalUsers || "—"}</div><div style={{ fontSize: 8, color: "#777" }}>USERS</div></div>
          <div style={{ background: "#121C12", borderRadius: 12, padding: 10, textAlign: "center" }}><div style={{ fontWeight: 900, color: "#FFD600" }}>{realStats.totalVoices}</div><div style={{ fontSize: 8, color: "#777" }}>VOICES</div></div>
          <div style={{ background: "#121C12", borderRadius: 12, padding: 10, textAlign: "center" }}><div style={{ fontWeight: 900, color: "white" }}>{realStats.totalSales || "—"}</div><div style={{ fontSize: 8, color: "#777" }}>API USED</div></div>
        </div>

        {activeTab === "home" && (
          <>
            <div style={{ marginTop: 12 }}><input placeholder="🔍 Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", background: "#121C12", border: "1px solid #00E676", borderRadius: 12, padding: "13px 14px", color: "white", outline: "none" }} /></div>
            <div className="cat-scroll">{CATEGORIES.map((cat) => (<button key={cat} onClick={() => setSelectedCategory(cat)} style={{ background: selectedCategory === cat ? "#00E676" : "#121C12", color: selectedCategory === cat ? "black" : "#AAA", border: "1px solid #1E2F1E", padding: "8px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800 }}>{cat}</button>))}</div>
            <div style={{ marginTop: 14, fontWeight: 900, color: "white" }}>Voices • 🔒 Login to Listen • {filteredVoices.length} found</div>
            {filteredVoices.map((v) => (
              <div key={v.id} className="voice-card" style={{ border: v.isFeatured ? "1.5px solid #FFD600" : "1px solid #1E2F1E", background: v.tag === "FEMALE" ? "#1A1218" : "#121C12" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button onClick={() => playSample(v)} style={{ width: 50, height: 50, background: playingId === v.id ? "#FF5252" : "#1E2F1E", borderRadius: "50%", border: "none", color: "#00E676" }}>{playingId === v.id ? "■" : "▶"}</button>
                  <div style={{ flex: 1 }}><div style={{ color: "white", fontWeight: 900, fontSize: 13 }}>{v.name} {v.isFeatured && "🏆"} {v.tag === "FEMALE" && "👩"}</div><div style={{ color: "#888", fontSize: 11 }}>{v.accent}</div><div style={{ color: "#FFD600", fontSize: 10 }}>⭐ {v.rating} • {v.sales} sales</div></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  <button onClick={() => addToCart(v)} style={{ background: "#0A1A0A", color: "#00E676", border: "1px solid #1E4D2B", padding: 12, borderRadius: 10, fontWeight: 900 }}>🛒 Add to Cart</button>
                  <button onClick={() => buy("pro")} style={{ background: v.tag === "FEMALE" ? "#FF1493" : "white", color: v.tag === "FEMALE" ? "white" : "black", border: "none", padding: 12, borderRadius: 10, fontWeight: 900 }}>💳 Buy ₦5,000</button>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "api" && (
          <div style={{ marginTop: 12, background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: 14, padding: 14 }}>
            <div style={{ color: "#00E676", fontWeight: 900 }}>🧪 API TESTING - 6 VOICES</div>
            <label className="market-label">TEXT</label><textarea className="market-input" value={testText} onChange={(e) => setTestText(e.target.value)} rows={3} placeholder="Type pidgin..." />
            <label className="market-label">VOICE</label><select className="market-input" value={testVoice} onChange={(e) => setTestVoice(e.target.value)}>{DEFAULT_VOICES.map((v) => (<option key={v.name} value={v.name}>{v.name} - {v.tag}</option>))}</select>
            <button onClick={testMyApi} disabled={testingApi} style={{ width: "100%", marginTop: 14, padding: 16, border: "none", borderRadius: 12, background: "#00E676", color: "black", fontWeight: 900 }}>{testingApi ? "Generating..." : "▶ TEST MY API"}</button>
            {testStatus && <div style={{ marginTop: 12, padding: 10, background: "#071007", color: "#00E676", fontSize: 11 }}>{testStatus}</div>}
            {testAudio && <audio controls src={testAudio} style={{ width: "100%", marginTop: 12 }} />}
          </div>
        )}

        {activeTab === "pricing" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900, color: "white" }}>Choose Plan</div>
            <div style={{ background: "#1A150A", border: "2px solid #FFD600", borderRadius: 16, padding: 16, marginTop: 10 }}><div style={{ fontWeight: 900, color: "white" }}>👑 Pro - 1,000 Voices</div><div style={{ fontSize: 22, fontWeight: 900, color: "white", marginTop: 8 }}>₦5,000</div><button onClick={() => requireAccount("pro")} style={{ width: "100%", marginTop: 12, background: "#FFD600", color: "black", border: "none", padding: 14, borderRadius: 10, fontWeight: 900 }}>Buy with Paystack</button></div>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 8, color: "#444", marginTop: 20 }}>{user ? user.email : "Guest - Login to listen"} • 6 Voices • Warri Babe Featured</div>
      </div>

      <div className="bottom-nav">
        <button className={`nav-item ${activeTab === "home" ? "active" : ""}`} onClick={() => setActiveTab("home")}><span className="nav-icon">🏠</span>Home</button>
        <button className={`nav-item ${activeTab === "api" ? "active" : ""}`} onClick={() => setActiveTab("api")}><span className="nav-icon">🧪</span>Test API</button>
        <button className={`nav-item ${activeTab === "pricing" ? "active" : ""}`} onClick={() => setActiveTab("pricing")}><span className="nav-icon">💳</span>Pricing</button>
        <button className="nav-item" onClick={() => setShowCart(true)}><span className="nav-icon">🛒</span>Cart</button>
        <Link href="/clone" className="nav-item" style={{ textDecoration: "none" }}><span className="nav-icon">🎙️</span>Clone</Link>
      </div>
    </div>
  );
}