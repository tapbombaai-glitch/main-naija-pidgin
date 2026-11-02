"use client";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabase = createClient(supabaseUrl, supabaseKey);
type AuthMode = "login" | "signup";
// ✅ FINAL CLEAN - 6 VOICES ONLY - NO DUPLICATE - NO BELLA/ELLI - NO ID 6 & 7
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
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [realKey, setRealKey] = useState('');
  const [freeLeft, setFreeLeft] = useState(0);
  const [paidLeft, setPaidLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCart, setShowCart] = useState(false);
  const [realStats, setRealStats] = useState({ totalUsers: 0, totalVoices: 6 });
  const [voices, setVoices] = useState(DEFAULT_VOICES);
  const [playingId, setPlayingId] = useState(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const [announces, setAnnounces] = useState<any[]>([]);
  const [myLocalVoices, setMyLocalVoices] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
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
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser || null);
    try {
      const { count: usersCount } = await supabase.from("api_keys").select("*", { count: "exact", head: true });
      const { data: keysData } = await supabase.from("api_keys").select("paid_requests_remaining");
      const totalPaidUsed = keysData?.reduce((acc, k: any) => acc + (1000 - (k.paid_requests_remaining || 0)), 0) || 0;
      setRealStats({ totalUsers: usersCount || 0, totalSales: totalPaidUsed, totalVoices: 7 + myLocalVoices.length });
    } catch {}
    const { data: dbVoices } = await supabase.from("voices").select("*").eq("active", true).limit(20);
    if (dbVoices && dbVoices.length >= 7) setVoices(dbVoices); else setVoices(DEFAULT_VOICES);
    let guestId = localStorage.getItem("guest_id");
    if (!guestId) { guestId = `guest_${Date.now()}`; localStorage.setItem("guest_id", guestId); }
    const uid = currentUser?.id || guestId;
    const { data: keys } = await supabase.from("api_keys").select("*").eq("user_id", uid).eq("is_active", true).order("created_at", { ascending: false }).limit(1);
    if (keys?.[0]) { setApiKey(keys[0].key_prefix || ""); setRealKey(keys[0].key || ""); setFreeLeft(keys[0].free_requests_remaining || 0); setPaidLeft(keys[0].paid_requests_remaining || 0); }
    try { const { data: ann } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(3); if (ann) setAnnounces(ann); } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
      setMyLocalVoices(saved.filter((f: any) => f.audioData));
      setCart(JSON.parse(localStorage.getItem("gin_cart") || "[]"));
    } catch {}
  }

  const filteredVoices = voices.filter((v) => {
    const matchSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.accent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = selectedCategory === "All" || v.category === selectedCategory || (selectedCategory === "Chairman" && myLocalVoices.length > 0);
    return matchSearch && matchCategory;
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => { setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3000); };
  const addToCart = (voice: any) => {
    if (cart.find((c) => c.id === voice.id)) { showToast("Already for cart!", "error"); return; }
    const newCart = [...cart, voice]; setCart(newCart); localStorage.setItem("gin_cart", JSON.stringify(newCart)); showToast(`🛒 ${voice.name} added!`);
  };
  const removeFromCart = (id: string) => { const newCart = cart.filter((c) => c.id !== id); setCart(newCart); localStorage.setItem("gin_cart", JSON.stringify(newCart)); };
  const requireAccount = (pkg: string) => { if (user) { continuePurchase(pkg); return; } setPendingAction(pkg); setAuthMode("login"); setShowAuth(true); };
  const submitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = authEmail.trim().toLowerCase();
    if (!email || !authPassword) { showToast("Enter email and password", "error"); return; }
    if (authMode === "signup") { if (authPassword.length < 8) { showToast("Password 8+ chars", "error"); return; } if (authPassword !== confirmPassword) { showToast("Passwords no match", "error"); return; } }
    setLoading(true);
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password: authPassword }); if (error) throw error;
        if (!data.session) { showToast("Check email to confirm", "success"); setAuthMode("login"); return; }
        setUser(data.user); setShowAuth(false); showToast("Account created!");
        if (pendingAction) await continuePurchase(pendingAction);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: authPassword }); if (error) throw error;
        setUser(data.user); setShowAuth(false); showToast("Login successful!"); if (pendingAction) await continuePurchase(pendingAction); else await loadData();
      }
    } catch (err: any) { showToast(err.message || "Auth failed", "error"); } finally { setLoading(false); setAuthPassword(""); setConfirmPassword(""); }
  };

  // ✅ FIXED - MUST LOGIN BEFORE TAP TO LISTEN - NO FREE COLLECT!
  const playSample = async (voice: any) => {
    // 🔒 LOGIN CHECK - MUST LOGIN FIRST!
    if (!user) {
      showToast("🔒 Oga login first before you fit listen! No free collect!", "error");
      setAuthMode("login");
      setShowAuth(true);
      return;
    }
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      window.speechSynthesis?.cancel();
      if (playingId === voice.id) { setPlayingId(null); return; }
      setPlayingId(voice.id); setTestVoice(voice.name);
      const idx = DEFAULT_VOICES.findIndex((v) => v.name === voice.name);
      const localVoice = myLocalVoices[idx];
      if (localVoice?.audioData) { const a = new Audio(localVoice.audioData); audioRef.current = a; a.onended = () => setPlayingId(null); a.onerror = () => setPlayingId(null); await a.play(); return; }
      // No mp3 file - Zero space - Use browser speech as preview, real TTS na for API tab with credits
      if (voice.sample_url) { const a = new Audio(voice.sample_url); audioRef.current = a; a.onended = () => setPlayingId(null); a.onerror = () => setPlayingId(null); await a.play(); return; }
      const utter = new SpeechSynthesisUtterance(voice.sample_text); utter.onend = () => setPlayingId(null); speechSynthesis.speak(utter);
      showToast(`🔊 Preview: ${voice.name} - Real voice dey for Test API tab with credits!`);
    } catch { setPlayingId(null); }
  };

  const claimFree = async () => {
    if (!user) { requireAccount("free_100"); return; }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch("/api/keys/create-free", { method: "POST", headers: { "Content-Type": "application/json", ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}) }, body: JSON.stringify({ userId: user.id }) });
      const data = await res.json();
      if (data.api_key) { setRealKey(data.api_key); setApiKey(data.key_prefix || ""); setFreeLeft(100); showToast("✅ 100 FREE claimed!"); try { await navigator.clipboard.writeText(data.api_key); } catch {} await loadData(); } else showToast(data.error || "Already claimed", "error");
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
      if (data.authorization_url) window.location.href = data.authorization_url; else showToast(data.error || "Paystack failed", "error");
    } catch { showToast("Connection failed", "error"); } finally { setLoading(false); }
  };
  const continuePurchase = async (pkg: string) => { setPendingAction(null); setShowAuth(false); if (pkg === "free_100") await claimFree(); else await buy(pkg); };
  const testMyApi = async () => {
    if (!user) { setShowAuth(true); showToast("Login first", "error"); return; }
    if (!realKey) { showToast("Collect free key first", "error"); return; }
    if (!testText.trim()) { showToast("Enter text", "error"); return; }
    setTestingApi(true); setTestAudio(""); setTestStatus("Generating..."); setTestTime(null); const started = Date.now();
    try {
      const { data: sessionData } = await supabase.auth.getSession(); const token = sessionData.session?.access_token; if (!token) throw new Error("Session expired");
      const response = await fetch("/api/tts/generate", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: testText.trim(), voice: testVoice }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result?.error || `Failed ${response.status}`);
      const audioUrl = result.audio_url || result.audioUrl; if (!audioUrl) throw new Error("No audio"); setTestAudio(audioUrl); setTestTime(Date.now() - started); setTestCredits(result.remaining_credits ?? null); setTestStatus(`Success! ${result.voice_style || ''}`); showToast("API test successful!"); await loadData();
    } catch (err: any) { setTestStatus(err.message); showToast(err.message, "error"); } finally { setTestingApi(false); }
  };
  const logout = async () => { await supabase.auth.signOut(); setUser(null); setApiKey(""); setRealKey(""); setFreeLeft(0); setPaidLeft(0); showToast("Logged out"); };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", width: "100%", paddingBottom: 80 }}>
      <style>{`
        * { box-sizing: border-box; } body { margin: 0; }
        button:active { transform: scale(0.97); }
        .market-modal { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.85); display: flex; align-items: flex-end; justify-content: center; padding: 0; }
        .market-modal-card { width: 100%; max-width: 420px; max-height: 88vh; overflow-y: auto; background: #0D170D; border-top: 2px solid #00E676; border-radius: 20px 20px 0 0; padding: 18px 14px 30px; }
        .market-input { width: 100%; background: #071007; color: white; border: 1px solid #1E4D2B; border-radius: 10px; padding: 14px; outline: none; font-size: 14px; margin-top: 6px; }
        .market-label { display: block; color: #A5D6A7; font-size: 11px; font-weight: 800; margin-top: 14px; letter-spacing: .5px; }
        .cat-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 10px 0 6px; scrollbar-width: none; }
        .cat-scroll::-webkit-scrollbar { display: none; }
        .voice-card { background: #121C12; border: 1px solid #1E2F1E; border-radius: 16px; padding: 14px; margin-top: 10px; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #0A150A; border-top: 1px solid #1E2F1E; display: flex; justify-content: space-around; padding: 8px 0 12px; z-index: 100; max-width: 420px; margin: 0 auto; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; color: #666; font-size: 9px; font-weight: 800; }
        .nav-item.active { color: #00E676; }
        .nav-icon { font-size: 20px; }
      `}</style>

      {toast && <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: toastType === "error" ? "#FF5252" : "#00E676", color: toastType === "error" ? "white" : "black", padding: "10px 18px", borderRadius: 20, fontSize: 11, fontWeight: 900, zIndex: 300, maxWidth: "90%", textAlign: "center" }}>{toast}</div>}

      {showCart && (
        <div className="market-modal" onClick={() => setShowCart(false)}>
          <div className="market-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "white", fontWeight: 900, fontSize: 16 }}>🛒 Cart ({cart.length})</div>
              <button onClick={() => setShowCart(false)} style={{ background: "#263326", border: "none", color: "white", borderRadius: "50%", width: 34, height: 34, fontSize: 18 }}>×</button>
            </div>
            {cart.length === 0 ? <div style={{ textAlign: "center", padding: 30, color: "#777", fontSize: 12 }}>Cart empty - Add voices!</div> : (
              <>
                {cart.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#121C12", padding: 12, borderRadius: 10, marginTop: 10 }}>
                    <div><div style={{ color: "white", fontSize: 13, fontWeight: 800 }}>{item.name}</div><div style={{ color: "#FFD600", fontSize: 11, fontWeight: 900 }}>₦5,000 • 1,000 Voices • {item.tag}</div></div>
                    <button onClick={() => removeFromCart(item.id)} style={{ background: "#FF5252", color: "white", border: "none", padding: "8px 12px", borderRadius: 8, fontSize: 10 }}>Remove</button>
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #1E2F1E", marginTop: 14, paddingTop: 12, display: "flex", justifyContent: "space-between", color: "white", fontWeight: 900, fontSize: 14 }}><span>Total:</span><span style={{ color: "#FFD600" }}>₦{cart.length * 5000}</span></div>
                <button onClick={() => buy("pro")} disabled={loading} style={{ width: "100%", marginTop: 12, background: "#FFD600", color: "black", border: "none", padding: 16, borderRadius: 12, fontWeight: 900, fontSize: 14 }}>💳 BUY NOW - ₦{cart.length * 5000}</button>
              </>
            )}
          </div>
        </div>
      )}

      {selectedAnnouncement && (
        <div className="market-modal" onClick={() => setSelectedAnnouncement(null)}>
          <div className="market-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ color: "#FFB300", fontWeight: 900, fontSize: 13 }}>📢 Chairman</div><button onClick={() => setSelectedAnnouncement(null)} style={{ background: "#263326", border: "none", color: "white", borderRadius: "50%", width: 32, height: 32, fontSize: 18 }}>×</button></div>
            <h2 style={{ color: "white", fontSize: 18, marginTop: 16 }}>{selectedAnnouncement.title}</h2><p style={{ color: "#D0D0D0", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{selectedAnnouncement.message}</p>
            <button onClick={() => setSelectedAnnouncement(null)} style={{ width: "100%", marginTop: 18, padding: 14, background: "#00E676", color: "black", border: "none", borderRadius: 10, fontWeight: 900 }}>Close</button>
          </div>
        </div>
      )}

      {showAuth && (
        <div className="market-modal" onClick={() => !loading && setShowAuth(false)}>
          <div className="market-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ color: "#00E676", fontWeight: 900, fontSize: 11 }}>MAIN NAIJA PIDGIN</div><h2 style={{ color: "white", fontSize: 20, margin: "6px 0 0" }}>{authMode === "signup" ? "Create Account" : "Welcome Back"}</h2><div style={{ color: "#FF5252", fontSize: 10, marginTop: 4 }}>🔒 Login required to listen & buy</div></div><button onClick={() => setShowAuth(false)} disabled={loading} style={{ background: "#263326", border: "none", color: "white", borderRadius: "50%", width: 34, height: 34, fontSize: 18 }}>×</button></div>
            <form onSubmit={submitAuth}><label className="market-label">EMAIL</label><input className="market-input" type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required /><label className="market-label">PASSWORD</label><input className="market-input" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />{authMode === "signup" && <><label className="market-label">CONFIRM PASSWORD</label><input className="market-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></>}<button type="submit" disabled={loading} style={{ width: "100%", marginTop: 20, background: "#00E676", color: "black", border: "none", borderRadius: 12, padding: 16, fontSize: 14, fontWeight: 900 }}>{loading ? "..." : authMode === "signup" ? "CREATE ACCOUNT →" : "LOGIN →"}</button></form>
            <div style={{ textAlign: "center", color: "#999", fontSize: 11, marginTop: 18 }}>{authMode === "signup" ? "Already have?" : "No account?"}<button onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthPassword(""); setConfirmPassword(""); }} style={{ background: "none", border: "none", color: "#00E676", fontWeight: 900, marginLeft: 6 }}>{authMode === "signup" ? "Login" : "Register"}</button></div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 420, margin: "0 auto", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "white", borderRadius: 4, width: 26, height: 18, display: "flex", overflow: "hidden" }}><div style={{ flex: 1, background: "#008751" }} /><div style={{ flex: 1, background: "white" }} /><div style={{ flex: 1, background: "#008751" }} /></div>
            <div style={{ fontWeight: 900, color: "white", fontSize: 14, letterSpacing: -.3 }}>MAIN NAIJA PIDGIN</div>
          </div>
          <button onClick={() => setShowCart(true)} style={{ background: "#FFD600", color: "black", border: "none", borderRadius: 20, padding: "7px 14px", fontSize: 11, fontWeight: 900 }}>🛒 {cart.length}</button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10, textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 900, color: "#00E676" }}>{realStats.totalUsers || "—"}</div><div style={{ fontSize: 8, color: "#777", fontWeight: 700, marginTop: 2 }}>USERS</div></div>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10, textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 900, color: "#FFD600" }}>{realStats.totalVoices}</div><div style={{ fontSize: 8, color: "#777", fontWeight: 700, marginTop: 2 }}>VOICES</div></div>
          <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10, textAlign: "center" }}><div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>{realStats.totalSales || "—"}</div><div style={{ fontSize: 8, color: "#777", fontWeight: 700, marginTop: 2 }}>API USED</div></div>
        </div>

        {activeTab === "home" && (
          <>
            {announces.length > 0 && (
              <div style={{ marginTop: 12, background: "#1A150A", border: "1px solid #FFB300", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#FFB300" }}>📢 From Chairman</div>
                {announces.map((a) => (
                  <button key={a.id} onClick={() => setSelectedAnnouncement(a)} style={{ width: "100%", textAlign: "left", marginTop: 8, background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 10, padding: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "white" }}>{a.title}</div><div style={{ fontSize: 10, color: "#999", marginTop: 3 }}>{a.message?.slice(0, 70)}...</div>
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <input placeholder="🔍 Search Lagos, Warri, Female..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: "100%", background: "#121C12", border: "1px solid #00E676", borderRadius: 12, padding: "13px 14px", color: "white", fontSize: 13, outline: "none" }} />
            </div>

            <div className="cat-scroll">
              {CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ background: selectedCategory === cat ? "#00E676" : "#121C12", color: selectedCategory === cat ? "black" : "#AAA", border: selectedCategory === cat ? "none" : "1px solid #1E2F1E", padding: "8px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0 }}>{cat === "All" ? "All" : cat === "Chairman" ? "🎙️ Chairman" : cat === "Female" ? "👩 Female" : cat}</button>
              ))}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "white" }}>Pricing - Paystack Secured</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 10, fontWeight: 800, color: "white" }}>🎁 Starter</div><div style={{ fontSize: 16, fontWeight: 900, color: "#00E676", marginTop: 4 }}>100 FREE</div><div style={{ fontSize: 9, color: "#666", marginTop: 2 }}>Login required</div><button onClick={() => requireAccount("free_100")} style={{ width: "100%", marginTop: 8, background: "#00E676", color: "black", border: "none", padding: 10, borderRadius: 8, fontSize: 11, fontWeight: 900 }}>Get Free →</button></div>
                <div style={{ background: "#1A150A", border: "1.5px solid #FFD600", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 10, fontWeight: 800, color: "white" }}>👑 Pro - 1k</div><div style={{ fontSize: 16, fontWeight: 900, color: "white", marginTop: 4 }}>₦5,000</div><div style={{ fontSize: 9, color: "#FFD600", marginTop: 2 }}>Paystack secured</div><button onClick={() => requireAccount("pro")} style={{ width: "100%", marginTop: 8, background: "#FFD600", color: "black", border: "none", padding: 10, borderRadius: 8, fontSize: 11, fontWeight: 900 }}>Buy Now</button></div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 14, fontWeight: 900, color: "white" }}>Voices • 🔒 Login to Listen</div><div style={{ fontSize: 10, color: "#666" }}>{filteredVoices.length}</div></div>

              {filteredVoices.find((v) => v.isFeatured) && (
                <div style={{ marginTop: 10, background: "#1A150A", border: "1.5px solid #FFD600", borderRadius: 16, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 9, color: "#FFD600", fontWeight: 900 }}>🏆 FEATURED • Main Naija Pidgin 3</span><span style={{ fontSize: 8, background: "#FFD600", color: "black", padding: "2px 6px", borderRadius: 8, fontWeight: 900 }}>BEST SELLER</span></div>
                  {(() => { const fv = filteredVoices.find((v) => v.isFeatured); return fv ? (
                    <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center" }}>
                      <button onClick={() => playSample(fv)} style={{ width: 56, height: 56, background: playingId === fv.id ? "#FF5252" : "#FFD600", borderRadius: "50%", border: "none", fontSize: 22, flexShrink: 0 }}>{playingId === fv.id ? "■" : "▶"}</button>
                      <div style={{ flex: 1, minWidth: 0 }}><div style={{ color: "white", fontSize: 14, fontWeight: 900 }}>{fv.name}</div><div style={{ color: "#AAA", fontSize: 11, marginTop: 2 }}>{fv.accent}</div><div style={{ color: "#FFD600", fontSize: 10, marginTop: 3 }}>⭐ {fv.rating} • {fv.sales} sales • 🔒 Login to play</div></div>
                    </div>
                  ) : null; })()}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                    <button onClick={() => { const fv = filteredVoices.find((v) => v.isFeatured); if (fv) addToCart(fv); }} style={{ background: "#1E2F1E", color: "#00E676", border: "1px solid #00E676", padding: 12, borderRadius: 10, fontSize: 12, fontWeight: 900 }}>🛒 Add to Cart</button>
                    <button onClick={() => buy("pro")} style={{ background: "#FFD600", color: "black", border: "none", padding: 12, borderRadius: 10, fontSize: 12, fontWeight: 900 }}>💳 Buy ₦5,000</button>
                  </div>
                </div>
              )}

              {filteredVoices.filter(v => !v.isFeatured).map((v, idx) => {
                const hasMyVoice = !!myLocalVoices[idx];
                const isFemale = v.tag === "FEMALE";
                return (
                  <div key={v.id} className="voice-card" style={{ border: playingId === v.id ? "1.5px solid #00E676" : isFemale ? "1.5px solid #FF1493" : hasMyVoice ? "1px solid #00E676" : v.isBestSeller ? "1px solid #FFD600" : "1px solid #1E2F1E", background: isFemale ? "#1A1218" : "#121C12" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <button onClick={() => playSample(v)} style={{ width: 50, height: 50, background: playingId === v.id ? "#FF5252" : isFemale ? "#FF1493" : hasMyVoice ? "#00E676" : "#1E2F1E", border: playingId === v.id ? "none" : `1px solid ${isFemale ? "#FF1493" : "#00E676"}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: playingId === v.id ? "white" : isFemale ? "white" : "#00E676", flexShrink: 0 }}>{playingId === v.id ? "■" : "▶"}</button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <div style={{ color: "white", fontSize: 13, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                          {isFemale && <span style={{ background: "#FF1493", color: "white", fontSize: 7, fontWeight: 900, padding: "2px 5px", borderRadius: 8, flexShrink: 0 }}>FEMALE</span>}
                          {v.isBestSeller && !isFemale && <span style={{ background: "#FFD600", color: "black", fontSize: 7, fontWeight: 900, padding: "2px 5px", borderRadius: 8, flexShrink: 0 }}>BEST</span>}
                          {hasMyVoice && <span style={{ background: "#00E676", color: "black", fontSize: 7, fontWeight: 900, padding: "2px 5px", borderRadius: 8, flexShrink: 0 }}>YOU</span>}
                        </div>
                        <div style={{ color: isFemale ? "#FF69B4" : "#888", fontSize: 11, marginTop: 2 }}>{v.accent}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center" }}>
                          <span style={{ color: "#FFD600", fontSize: 10, fontWeight: 800 }}>⭐ {v.rating}</span>
                          <span style={{ color: "#555", fontSize: 9 }}>• {v.sales} sales</span>
                          <span style={{ color: "#FF5252", fontSize: 9 }}>• 🔒 Login</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                      <button onClick={() => addToCart(v)} style={{ background: isFemale ? "#2A1528" : "#0A1A0A", color: isFemale ? "#FF69B4" : "#00E676", border: `1px solid ${isFemale ? "#FF1493" : "#1E4D2B"}`, padding: 13, borderRadius: 10, fontSize: 12, fontWeight: 900 }}>🛒 Add to Cart</button>
                      <button onClick={() => buy("pro")} style={{ background: isFemale ? "#FF1493" : "white", color: isFemale ? "white" : "black", border: "none", padding: 13, borderRadius: 10, fontSize: 12, fontWeight: 900 }}>💳 Buy ₦5,000</button>
                    </div>
                  </div>
                );
              })}
              {filteredVoices.length === 0 && <div style={{ textAlign: "center", padding: 24, color: "#666", fontSize: 12, background: "#121C12", borderRadius: 12, marginTop: 10 }}>No voices for "{searchTerm}"</div>}
            </div>
          </>
        )}

        {activeTab === "api" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: 14, padding: 14 }}>
              <div style={{ color: "#00E676", fontSize: 16, fontWeight: 900 }}>🧪 API TESTING - 7 VOICES DIFFERENT SOUND</div>
              <p style={{ color: "#888", fontSize: 11, marginTop: 4 }}>Each voice different style - Zero space - Login secured</p>
              <label className="market-label">YOUR API KEY</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}><div style={{ flex: 1, background: "#071007", border: "1px solid #1E4D2B", borderRadius: 10, padding: 12, color: "#00E676", fontSize: 11, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{apiKey || "No key yet - Login & claim free"}</div><button onClick={async () => { if (realKey) { try { await navigator.clipboard.writeText(realKey); showToast("Copied!"); } catch {} } }} style={{ background: "#00E676", color: "black", border: "none", borderRadius: 10, padding: "0 14px", fontWeight: 900 }}>Copy</button></div>
              <div style={{ display: "flex", gap: 10, marginTop: 10, fontSize: 11, color: "#AAA" }}><span>Free: <b style={{ color: "white" }}>{freeLeft}</b></span><span>Paid: <b style={{ color: "white" }}>{paidLeft}</b></span><span style={{ color: "#FF5252" }}>🔒 Secured</span></div>
              <label className="market-label">TEXT</label><textarea className="market-input" value={testText} onChange={(e) => setTestText(e.target.value)} rows={3} placeholder="Type pidgin..." />
              <label className="market-label">VOICE - 7 DIFFERENT SOUNDS</label><select className="market-input" value={testVoice} onChange={(e) => setTestVoice(e.target.value)}>{DEFAULT_VOICES.map((v) => (<option key={v.name} value={v.name}>{v.name} - {v.tag} - {v.accent}</option>))}</select>
              <button onClick={testMyApi} disabled={testingApi || !testText.trim()} style={{ width: "100%", marginTop: 14, padding: 16, border: "none", borderRadius: 12, background: testingApi ? "#2A4A2A" : "#00E676", color: "black", fontWeight: 900, fontSize: 14 }}>{testingApi ? "Generating different sound..." : "▶ TEST MY API - DIFFERENT SOUND"}</button>
              {testStatus && <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#071007", color: testAudio ? "#00E676" : "#FFB74D", fontSize: 11 }}>{testStatus} {testTime ? `• ${testTime}ms` : ''}</div>}
              {testAudio && <><audio controls src={testAudio} style={{ width: "100%", marginTop: 12 }} /><a href={testAudio} download="test.mp3" style={{ display: "block", textAlign: "center", marginTop: 10, padding: 12, background: "#17351D", color: "#00E676", borderRadius: 10, textDecoration: "none", fontWeight: 800, fontSize: 12 }}>↓ DOWNLOAD - Zero space</a></>}
            </div>
            <Link href="/api-dashboard" style={{ display: "flex", justifyContent: "center", marginTop: 12, background: "white", color: "black", padding: 14, borderRadius: 12, fontWeight: 900, textDecoration: "none", fontSize: 13 }}>Go to API Dashboard →</Link>
          </div>
        )}

        {activeTab === "pricing" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>Choose Plan - Paystack Secured</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 16, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, fontWeight: 900, color: "white" }}>🎁 Starter - 100 FREE</span><span style={{ fontSize: 10, color: "#00E676" }}>FREE • Login required</span></div><div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Perfect to test - No card - Must login</div><button onClick={() => requireAccount("free_100")} style={{ width: "100%", marginTop: 12, background: "#00E676", color: "black", border: "none", padding: 14, borderRadius: 10, fontWeight: 900 }}>Get 100 FREE →</button></div>
              <div style={{ background: "#1A150A", border: "2px solid #FFD600", borderRadius: 16, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 13, fontWeight: 900, color: "white" }}>👑 Pro - 1,000 Voices - 7 different sounds</span><span style={{ fontSize: 9, background: "#FFD600", color: "black", padding: "3px 8px", borderRadius: 10, fontWeight: 900 }}>MOST POPULAR</span></div><div style={{ fontSize: 22, fontWeight: 900, color: "white", marginTop: 8 }}>₦5,000</div><div style={{ fontSize: 11, color: "#AAA", marginTop: 4 }}>1k API calls • Paystack secured • Instant • Zero space</div><button onClick={() => requireAccount("pro")} style={{ width: "100%", marginTop: 12, background: "#FFD600", color: "black", border: "none", padding: 14, borderRadius: 10, fontWeight: 900, fontSize: 13 }}>💳 Buy with Paystack - ₦5,000</button></div>
              <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 16, padding: 16 }}><div style={{ fontSize: 13, fontWeight: 900, color: "white" }}>🚀 Growth - 2,000</div><div style={{ fontSize: 20, fontWeight: 900, color: "white", marginTop: 6 }}>₦10,000</div><button onClick={() => requireAccount("growth")} style={{ width: "100%", marginTop: 12, background: "white", color: "black", border: "none", padding: 14, borderRadius: 10, fontWeight: 900 }}>Buy ₦10,000</button></div>
              <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 16, padding: 16 }}><div style={{ fontSize: 13, fontWeight: 900, color: "white" }}>🏢 Scale - 10,000</div><div style={{ fontSize: 20, fontWeight: 900, color: "white", marginTop: 6 }}>₦50,000</div><button onClick={() => requireAccount("scale")} style={{ width: "100%", marginTop: 12, background: "white", color: "black", border: "none", padding: 14, borderRadius: 10, fontWeight: 900 }}>Buy ₦50,000</button></div>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", fontSize: 8, color: "#444", marginTop: 20, paddingBottom: 10 }}>Paystack Secured • Supabase • 🔒 Login to Listen • Only API deducts • Zero Space • {user ? user.email : "Guest - Login to listen"} • Cart {cart.length} • 7 Voices Different Sound</div>
      </div>

      <div className="bottom-nav">
        <button className={`nav-item ${activeTab === "home" ? "active" : ""}`} onClick={() => setActiveTab("home")}><span className="nav-icon">🏠</span>Home</button>
        <button className={`nav-item ${activeTab === "api" ? "active" : ""}`} onClick={() => setActiveTab("api")}><span className="nav-icon">🧪</span>Test API</button>
        <button className={`nav-item ${activeTab === "pricing" ? "active" : ""}`} onClick={() => setActiveTab("pricing")}><span className="nav-icon">💳</span>Pricing</button>
        <button className="nav-item" onClick={() => setShowCart(true)}><span className="nav-icon">🛒</span>Cart {cart.length > 0 ? `(${cart.length})` : ""}</button>
        <Link href="/clone" className="nav-item" style={{ textDecoration: "none" }}><span className="nav-icon">🎙️</span>Clone</Link>
      </div>
    </div>
  );
} 