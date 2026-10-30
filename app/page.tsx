"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [toastType, setToastType] = useState<"success"|"error">("success");

  useEffect(() => { loadData(); }, []);
  async function loadData() {
    const { data: u } = await supabase.auth.getUser();
    setUser(u?.user || null);
    const { data: v } = await supabase.from('voices').select('*').eq('active', true).limit(10);
    if (v && v.length > 0) setVoices(v);
    else setVoices([
      { id: "1", name: "Lagos Male", accent: "Natural - Young", sample_text: "How far boss! Lagos male voice dey here, ready to talk." },
      { id: "2", name: "Abuja Female", accent: "Warm - Professional", sample_text: "Good morning, na Abuja female voice, calm and clear." },
      { id: "3", name: "Pidgin Narrator", accent: "Story - Expressive", sample_text: "For inside this life, na story dey sweet pass, make I tell you!" },
      { id: "4", name: "Delta Warri", accent: "Rugged - Local", sample_text: "Warri no dey carry last, you hear? Original Warri voice!" },
      { id: "5", name: "Yoruba Mix", accent: "Hybrid - Bilingual", sample_text: "E kaaro! I fit speak Yoruba and pidgin join together." },
    ]);
    const guestId = localStorage.getItem('guest_id') || `guest_${Date.now()}`;
    localStorage.setItem('guest_id', guestId);
    const uid = u?.user?.id || guestId;
    const { data: keys } = await supabase.from('api_keys').select('*').eq('user_id', uid).eq('is_active', true).order('created_at', { ascending: false }).limit(1);
    if (keys && keys[0]) {
      setApiKey(keys[0].key_prefix); setRealKey(keys[0].key);
      setFreeLeft(keys[0].free_requests_remaining || 0); setPaidLeft(keys[0].paid_requests_remaining || 0);
    }
  }
  const showToast = (m: string, type: "success"|"error" = "success") => { setToast(m); setToastType(type); setTimeout(()=>setToast(""), 3500); };
  const playSample = async (voice: any) => {
    try {
      if (audio) { audio.pause(); }
      if (playingId === voice.id) { setPlayingId(null); return; }
      setPlayingId(voice.id);
      if (voice.sample_url) { const a = new Audio(voice.sample_url); setAudio(a); a.onended = () => setPlayingId(null); await a.play(); return; }
      const utter = new SpeechSynthesisUtterance(voice.sample_text); utter.onend = () => setPlayingId(null); speechSynthesis.speak(utter);
    } catch { setPlayingId(null); }
  };
  const claimFree = async () => {
    setLoading(true);
    try {
      const guestId = localStorage.getItem('guest_id') || `guest_${Date.now()}`;
      localStorage.setItem('guest_id', guestId);
      const res = await fetch('/api/keys/create-free', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id || guestId }) });
      const data = await res.json();
      if (data.api_key) { setRealKey(data.api_key); setApiKey(data.key_prefix); setFreeLeft(100); showToast("✅ 100 FREE claimed! Key copied!", "success"); navigator.clipboard.writeText(data.api_key); await loadData(); }
      else showToast(data.error || 'Already claimed', "error");
    } catch { showToast("Network error - add SUPABASE_SERVICE_KEY for Render", "error"); }
    setLoading(false);
  };
  const buy = async (pkg: string) => {
    if (pkg === 'free_100') { claimFree(); return; }
    setLoading(true);
    try {
      const guestId = localStorage.getItem('guest_id') || `guest_${Date.now()}`;
      const res = await fetch('/api/paystack/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId: pkg, email: user?.email || 'customer@mainnaija.com', userId: user?.id || guestId }) });
      const data = await res.json();
      if (data.authorization_url) window.location.href = data.authorization_url;
      else showToast(data.error || 'Paystack init failed', "error");
    } catch { showToast("Connection failed", "error"); }
    setLoading(false);
  };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", width: "100%", padding: "8px" }}>
      <style>{`
        *{box-sizing:border-box} body{margin:0} button:active{transform:scale(0.97)}
        .voice-scroll { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
        @media (max-width: 380px) {
          .voice-scroll { display: flex; overflow-x: auto; gap: 8px; padding-bottom: 6px; scrollbar-width: none; }
          .voice-scroll::-webkit-scrollbar { display: none; }
          .voice-card { min-width: 88px; flex-shrink: 0; }
        }
      `}</style>
      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: toastType==="error" ? "#FF5252" : "#00E676", color: toastType==="error" ? "white" : "black", padding: "10px 18px", borderRadius: "20px", fontSize: "11px", fontWeight: "900", zIndex: 100, maxWidth: "90%", textAlign: "center" }}>{toast}</div>}
      
      <div style={{ maxWidth: "420px", margin: "0 auto", border: "2px solid #1A231A", borderRadius: "28px", background: "#050A05", padding: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "white", borderRadius: "4px", width: "28px", height: "20px", display: "flex", overflow: "hidden" }}><div style={{ flex: 1, background: "#008751" }}></div><div style={{ flex: 1, background: "white" }}></div><div style={{ flex: 1, background: "#008751" }}></div></div>
            <div style={{ fontWeight: "900", color: "white", fontSize: "15px" }}>MAIN NAIJA PIDGIN</div>
          </div>
          <div style={{ background: "#14301A", border: "1px solid #1E4D2B", color: "#A5D6A7", fontSize: "9px", fontWeight: "800", padding: "6px 10px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", background: "#00E676", borderRadius: "50%" }}></span>LIVE MARKETPLACE</div>
        </div>

        <div style={{ marginTop: "12px", background: "#121C12", borderRadius: "14px", padding: "14px", border: "1px solid #1E2F1E" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "white" }}>API Marketplace</div>
          <div style={{ fontSize: "11px", color: "#9E9E9E", marginTop: "2px" }}>Authentic Naija Pidgin Voices • Paystack + Supabase</div>
        </div>

        <div style={{ marginTop: "10px", background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: "12px", padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "700", color: "#A5D6A7" }}>🔑 Your Live API Key</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", gap: "8px" }}>
            <div style={{ fontSize: "15px", fontWeight: "900", color: "#00E676", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{apiKey ? apiKey : "sk_live_ •••••••••••"}</div>
            <button onClick={() => { if(realKey){ navigator.clipboard.writeText(realKey); showToast("Key copied!"); } }} style={{ background: "#00C853", color: "white", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "800", flexShrink: 0 }}>⧉ Copy</button>
          </div>
          <div style={{ marginTop: "10px", borderTop: "1px solid #1E2F1E", paddingTop: "8px", display: "flex", gap: "12px", fontSize: "11px", color: "#BDBDBD" }}>
            <span><b style={{ color: "white" }}>{freeLeft}</b> Free Left</span>
            <span><b style={{ color: "white" }}>{paidLeft}</b> Paid Left</span>
            <span style={{ color: "#333" }}>|</span>
            <span><b style={{ color: "#00E676" }}>99.9%</b> Uptime</span>
          </div>
        </div>

        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>Pricing Plans</div>
          <div style={{ fontSize: "11px", color: "#888", display: "flex", gap: "6px", marginTop: "2px" }}>🛡️ Paystack Secured • Instant activation</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
            <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>🎁 Starter</div>
              <div style={{ fontSize: "20px", fontWeight: "900", color: "#00E676", marginTop: "4px" }}>100 FREE</div>
              <div style={{ fontSize: "10px", color: "#9E9E9E" }}>No card needed</div>
              <button onClick={() => buy('free_100')} disabled={loading} style={{ width: "100%", marginTop: "10px", background: "#00C853", color: "white", border: "none", padding: "10px", borderRadius: "8px", fontSize: "11px", fontWeight: "800" }}>{loading ? "..." : "Get Free Key →"}</button>
            </div>
            <div style={{ background: "#1A150A", border: "1px solid #FFB300", borderRadius: "12px", padding: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>👑 Pro</div>
                <div style={{ fontSize: "7px", background: "#3E3200", border: "1px solid #FFB300", color: "#FFB300", padding: "2px 6px", borderRadius: "20px", fontWeight: "800" }}>MOST POPULAR</div>
              </div>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "white", marginTop: "4px" }}>🔥 1,000 Voices</div>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>₦5,000</div>
              <button onClick={() => buy('pro')} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #FFB300", color: "white", padding: "9px", borderRadius: "8px", fontSize: "10px", fontWeight: "800" }}>☰ Buy with Paystack</button>
            </div>
            <div style={{ background: "#121C12", borderRadius: "12px", padding: "10px", border: "1px solid #1E2F1E" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>🚀 Growth</div>
              <div style={{ fontSize: "15px", fontWeight: "900", color: "white", marginTop: "4px" }}>2,000 Voices</div>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>₦10,000</div>
              <button onClick={() => buy('growth')} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #FFB300", color: "white", padding: "9px", borderRadius: "8px", fontSize: "10px", fontWeight: "800" }}>Buy with Paystack</button>
            </div>
            <div style={{ background: "#121C12", borderRadius: "12px", padding: "10px", border: "1px solid #1E2F1E" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>🏢 Scale</div>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "white", marginTop: "4px" }}>10,000 Voices</div>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>₦50,000</div>
              <button onClick={() => buy('scale')} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #FFB300", color: "white", padding: "9px", borderRadius: "8px", fontSize: "10px", fontWeight: "800" }}>☰ Buy with Paystack</button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: "800", color: "white" }}>Preview Voices – Tap to Listen</div>
          <div style={{ fontSize: "10px", color: "#00E676", marginTop: "2px" }}>100% Naija accent • Preview no dey deduct</div>
          {/* FIXED FOR SMALL PHONE: flex scroll on <380px */}
          <div className="voice-scroll" style={{ marginTop: "10px" }}>
            {voices.slice(0,5).map((v: any) => (
              <div key={v.id} onClick={() => playSample(v)} className="voice-card" style={{ background: playingId === v.id ? "#1A2F1A" : "#121C12", border: playingId === v.id ? "1px solid #00E676" : "1px solid #1E2F1E", borderRadius: "12px", padding: "10px 6px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ width: "38px", height: "38px", background: playingId === v.id ? "#FF5252" : "#00E676", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: "14px", color: "#000", fontWeight: "900" }}>{playingId === v.id ? "■" : "▶"}</div>
                <div style={{ fontSize: "10px", fontWeight: "800", color: "white", marginTop: "7px", lineHeight: "1.1" }}>{v.name}</div>
                <div style={{ fontSize: "8px", color: "#999", marginTop: "3px" }}>{v.accent.split("-")[0].trim()}</div>
                <div style={{ marginTop: "8px", display: "flex", justifyContent: "center", gap: "2px", height: "14px", alignItems: "center" }}>
                  {[...Array(8)].map((_, i) => <div key={i} style={{ width: "2.5px", height: `${4 + (i % 4) * 3}px`, background: "#00E676", borderRadius: "2px", opacity: playingId === v.id ? 1 : 0.6 }}></div>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link href="/api-dashboard" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "14px", background: "white", color: "#000", padding: "13px", borderRadius: "12px", fontSize: "13px", fontWeight: "900", textDecoration: "none" }}>Go to API Dashboard <span>→</span></Link>
        <div style={{ textAlign: "center", fontSize: "8px", color: "#555", marginTop: "10px" }}>Paystack Secured • Supabase Powered • Preview free • Only real API deducts</div>
      </div>
    </div>
  );
}