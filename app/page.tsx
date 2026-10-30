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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: u } = await supabase.auth.getUser();
    setUser(u.user);
    const { data: v } = await supabase.from('voices').select('*').eq('active', true).limit(10);
    if (v && v.length > 0) setVoices(v);
    else setVoices([
      { id: "1", name: "Lagos Male", accent: "Natural - Young", sample_text: "How far boss! Lagos male voice dey here, ready to talk." },
      { id: "2", name: "Abuja Female", accent: "Warm - Professional", sample_text: "Good morning, na Abuja female voice, calm and clear." },
      { id: "3", name: "Pidgin Narrator", accent: "Story - Expressive", sample_text: "For inside this life, na story dey sweet pass, make I tell you!" },
      { id: "4", name: "Delta Warri", accent: "Rugged - Local", sample_text: "Warri no dey carry last, you hear? Original Warri voice!" },
      { id: "5", name: "Yoruba Mix", accent: "Hybrid - Bilingual", sample_text: "E kaaro! I fit speak Yoruba and pidgin join together." },
    ]);
    const { data: keys } = await supabase.from('api_keys').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1);
    if (keys && keys[0]) {
      setApiKey(keys[0].key_prefix);
      setFreeLeft(keys[0].free_requests_remaining || 0);
      setPaidLeft(keys[0].paid_requests_remaining || 0);
    }
  }

  const playSample = async (voice: any) => {
    try {
      if (audio) { audio.pause(); setAudio(null); }
      if (playingId === voice.id) { setPlayingId(null); return; }
      setPlayingId(voice.id);
      if (voice.sample_url || voice.preview_url) {
        const a = new Audio(voice.sample_url || voice.preview_url);
        setAudio(a);
        a.onended = () => setPlayingId(null);
        a.onerror = () => { setPlayingId(null); alert(`Sample text: ${voice.sample_text}`); };
        await a.play();
        return;
      }
      // Fallback: try synthesize preview
      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': realKey || 'preview' },
        body: JSON.stringify({ text: voice.sample_text || `How far! Na ${voice.name} be this.`, voice_id: voice.id || voice.name, preview: true })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = new Audio(url);
        setAudio(a);
        a.onended = () => setPlayingId(null);
        await a.play();
      } else {
        alert(`🎤 ${voice.name}: "${voice.sample_text || 'Naija voice ready!'}"\n\nAdd sample_url in Supabase to hear real audio.`);
        setPlayingId(null);
      }
    } catch (e) {
      alert(`🎤 ${voice.name}: "${voice.sample_text || 'Sample playing...'}"`);
      setPlayingId(null);
    }
  };

  const claimFree = async () => {
    setLoading(true);
    const res = await fetch('/api/keys/create-free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id || 'guest_' + Date.now() })
    });
    const data = await res.json();
    setLoading(false);
    if (data.api_key) {
      setRealKey(data.api_key);
      setApiKey(data.key_prefix || data.api_key.slice(0,20)+'...');
      setFreeLeft(100);
      alert(`SUCCESS! 100 Free Voices Claimed!\n\nYour Key: ${data.api_key}\n\nCopy it now - shows once!`);
      await loadData();
    } else {
      alert(data.error || 'You already claimed free 100');
    }
  };

  const buy = async (pkg: string) => {
    if (pkg === 'free_100') { claimFree(); return; }
    setLoading(true);
    const res = await fetch('/api/paystack/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: pkg, email: user?.email || 'customer@mainnaija.com', userId: user?.id || 'guest' })
    });
    const data = await res.json();
    setLoading(false);
    if (data.authorization_url) window.location.href = data.authorization_url;
    else alert(data.error || 'Payment init failed');
  };

  return (
    <div style={{ background: "#050A05", minHeight: "100vh", width: "100%" }}>
      <style>{`*{box-sizing:border-box} body{margin:0} button:active{transform:scale(0.98)}`}</style>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "10px", width: "100%" }}>
        
        {/* HEADER */}
        <div style={{ background: "#1A231A", borderRadius: "12px", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" style={{ textDecoration: "none" }}><div style={{ fontWeight: "900", color: "#00E676", fontSize: "13px" }}>🇳🇬 MAIN NAIJA PIDGIN</div></Link>
          <span style={{ background: "#00E676", color: "#000", fontSize: "9px", fontWeight: "800", padding: "3px 8px", borderRadius: "20px" }}>• LIVE</span>
        </div>

        <div style={{ marginTop: "14px", background: "#121C12", borderRadius: "14px", padding: "14px", border: "1px solid #1E2F1E" }}>
          <div style={{ fontSize: "18px", fontWeight: "900", color: "white" }}>⚡ API Marketplace</div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>Authentic Naija Pidgin Voices & Datasets</div>

          <div style={{ marginTop: "12px", background: "#0A140A", borderRadius: "10px", padding: "10px" }}>
            <div style={{ fontSize: "9px", color: "#888" }}>LIVE API KEY {freeLeft + paidLeft > 0 ? `• ${freeLeft + paidLeft} left` : ''}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", gap: "8px" }}>
              <div style={{ fontSize: "12px", color: "#00E676", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{apiKey || "No key yet - Claim free below"}</div>
              <button onClick={() => { if(realKey) navigator.clipboard.writeText(realKey); else if(apiKey) navigator.clipboard.writeText(apiKey); }} style={{ background: "#1E2F1E", color: "white", border: "none", padding: "6px 10px", borderRadius: "6px", fontSize: "10px", flexShrink: 0 }}>Copy</button>
            </div>
            {realKey && <div style={{ fontSize: "9px", color: "#FFB300", marginTop: "6px", wordBreak: "break-all" }}>⚠️ Copy now! {realKey}</div>}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <div style={{ flex: 1, textAlign: "center", background: "#121C12", borderRadius: "8px", padding: "6px" }}><div style={{ fontSize: "14px", fontWeight: "900", color: "#00E676" }}>{freeLeft}</div><div style={{ fontSize: "8px", color: "#666" }}>Free Left</div></div>
              <div style={{ flex: 1, textAlign: "center", background: "#121C12", borderRadius: "8px", padding: "6px" }}><div style={{ fontSize: "14px", fontWeight: "900", color: "white" }}>{paidLeft}</div><div style={{ fontSize: "8px", color: "#666" }}>Paid Left</div></div>
              <div style={{ flex: 1, textAlign: "center", background: "#121C12", borderRadius: "8px", padding: "6px" }}><div style={{ fontSize: "14px", fontWeight: "900", color: "white" }}>99.9%</div><div style={{ fontSize: "8px", color: "#666" }}>Uptime</div></div>
            </div>
          </div>
        </div>

        {/* PRICING - MOBILE GRID */}
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: "800", color: "white" }}>Pricing Plans</div>
          <div style={{ fontSize: "10px", color: "#888" }}>Simple. Transparent. Powerful.</div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}>
            <div style={{ background: "#121C12", border: "1px solid #00E676", borderRadius: "12px", padding: "10px" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "#00E676" }}>🎁 Starter</div>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "white", marginTop: "4px" }}>100 FREE</div>
              <div style={{ fontSize: "9px", color: "#888" }}>API Key included</div>
              <button onClick={() => buy('free_100')} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "#00E676", color: "#000", border: "none", padding: "8px", borderRadius: "20px", fontSize: "10px", fontWeight: "900" }}>{loading ? "..." : "Get Free Key"}</button>
            </div>
            <div style={{ background: "#1A150A", border: "1px solid #FFB300", borderRadius: "12px", padding: "10px" }}>
              <div style={{ fontSize: "8px", background: "#FFB300", color: "#000", display: "inline-block", padding: "2px 6px", borderRadius: "10px", fontWeight: "800" }}>MOST POPULAR</div>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "white", marginTop: "4px" }}>🔥 Pro</div>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>1,000 Voices</div>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#FFB300" }}>₦5,000</div>
              <button onClick={() => buy('starter')} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "white", color: "#000", border: "none", padding: "8px", borderRadius: "20px", fontSize: "10px", fontWeight: "900" }}>Buy with Paystack</button>
            </div>
            <div style={{ background: "#121C12", borderRadius: "12px", padding: "10px", border: "1px solid #1E2F1E" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "white" }}>🚀 Growth</div>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "white", marginTop: "4px" }}>2,000 Voices</div>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "white" }}>₦10,000</div>
              <button onClick={() => buy('growth')} style={{ width: "100%", marginTop: "8px", background: "#1E2F1E", color: "white", border: "none", padding: "8px", borderRadius: "20px", fontSize: "10px", fontWeight: "800" }}>Buy with Paystack</button>
            </div>
            <div style={{ background: "#121C12", borderRadius: "12px", padding: "10px", border: "1px solid #1E2F1E" }}>
              <div style={{ fontSize: "10px", fontWeight: "800", color: "white" }}>🏢 Scale</div>
              <div style={{ fontSize: "14px", fontWeight: "900", color: "white", marginTop: "4px" }}>10,000 Voices</div>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "white" }}>₦50,000</div>
              <button onClick={() => buy('scale')} style={{ width: "100%", marginTop: "8px", background: "#1E2F1E", color: "white", border: "none", padding: "8px", borderRadius: "20px", fontSize: "10px", fontWeight: "800" }}>Buy with Paystack</button>
            </div>
          </div>
        </div>

        {/* VOICES WITH REAL SAMPLE PLAY - WORKING BUTTONS - NOT REMOVED, UPGRADED */}
        <div style={{ marginTop: "14px", background: "#121C12", borderRadius: "12px", padding: "12px", border: "1px solid #1E2F1E" }}>
          <div style={{ fontSize: "12px", fontWeight: "800", color: "white" }}>● Preview Voices - Tap to Listen</div>
          <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>Sample before you buy • 100% Naija accent</div>
          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {voices.map((v: any) => (
              <div key={v.id || v.name} style={{ display: "flex", justifyContent: "space-between", background: playingId === (v.id || v.name) ? "#1A2F1A" : "#0A140A", padding: "10px 12px", borderRadius: "10px", alignItems: "center", border: playingId === (v.id || v.name) ? "1px solid #00E676" : "1px solid transparent" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>{v.name} {playingId === (v.id || v.name) && <span style={{ color: "#00E676", fontSize: "9px" }}>● PLAYING</span>}</div>
                  <div style={{ fontSize: "9px", color: "#666" }}>{v.accent || v.accent_type}</div>
                  <div style={{ fontSize: "8px", color: "#555", marginTop: "2px", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{v.sample_text || 'Tap play to hear sample'}..."</div>
                </div>
                <button onClick={() => { const id = v.id || v.name; if(playingId===id){ setPlayingId(null); if(audio){audio.pause();} } else playSample({...v, id}); }} style={{ width: "32px", height: "32px", background: playingId === (v.id || v.name) ? "#FF5252" : "#00E676", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#000", border: "none", cursor: "pointer", flexShrink: 0, marginLeft: "8px" }}>
                  {playingId === (v.id || v.name) ? "■" : "▶"}
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
            <button onClick={() => buy('free_100')} style={{ flex: 1, background: "#00E676", color: "#000", border: "none", padding: "10px", borderRadius: "20px", fontSize: "11px", fontWeight: "900" }}>Claim 100 Free & Test Voice</button>
          </div>
          <div style={{ marginTop: "8px", fontSize: "9px", color: "#555", textAlign: "center" }}>🔊 Preview no dey deduct your free requests • Only real API call dey deduct when voice succeed</div>
          <Link href="/api-dashboard" style={{ display: "block", marginTop: "10px", background: "white", color: "#000", textAlign: "center", padding: "10px", borderRadius: "20px", fontSize: "11px", fontWeight: "900", textDecoration: "none" }}>Go to Dashboard →</Link>
        </div>

        <div style={{ textAlign: "center", fontSize: "8px", color: "#333", marginTop: "14px", paddingBottom: "20px" }}>Free: 100 voices per account • Paystack secured • Powered by Naija Cloud • Preview free, no deduction</div>
      </div>
    </div>
  );
}