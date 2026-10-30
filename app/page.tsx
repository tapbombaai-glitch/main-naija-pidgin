"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const MIN_PRICE = 5;
const MAX_PRICE = 50;

export default function Marketplace() {
  const [workerId, setWorkerId] = useState("");
  const [freeLeft, setFreeLeft] = useState(0);
  const [paidLeft, setPaidLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [voices] = useState([
    { id: "1", name: "Lagos Male", accent: "Natural", sample_text: "How far boss! Lagos male voice dey here, ready to talk." },
    { id: "2", name: "Abuja Female", accent: "Warm", sample_text: "Good morning, na Abuja female voice, calm and clear." },
    { id: "3", name: "Pidgin Narrator", accent: "Story", sample_text: "For inside this life, na story dey sweet pass, make I tell you!" },
    { id: "4", name: "Delta Warri", accent: "Rugged", sample_text: "Warri no dey carry last, you hear? Original Warri voice!" },
    { id: "5", name: "Yoruba Mix", accent: "Hybrid", sample_text: "E kaaro! I fit speak Yoruba and pidgin join together." },
  ]);
  const [voiceOwners, setVoiceOwners] = useState<any>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [toast, setToast] = useState("");
  const [announces, setAnnounces] = useState<any[]>([]);
  const [myLocalVoices, setMyLocalVoices] = useState<any[]>([]);

  useEffect(() => {
    const wid = localStorage.getItem('worker_id') || "";
    if (wid) setWorkerId(wid);
    try {
      const saved = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
      const myVoices = saved.filter((f:any) => f.audioData);
      if (myVoices.length > 0) setMyLocalVoices(myVoices);
    } catch {}
    loadDB();
  }, []);

  async function loadDB() {
    try {
      const { data: ann } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3);
      if (ann) setAnnounces(ann);
    } catch {}
    try {
      const { data: owners } = await supabase.from('voice_ownership').select('*').eq('approved', true);
      if (owners) {
        let map:any = {};
        owners.forEach((o:any) => { map[o.voice_id] = o; });
        setVoiceOwners(map);
      }
    } catch {}
  }

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""), 3000); };

  // LOGIN CHECK - ONLY FOR BUY/COPY, NOT FOR PLAY
  const needLogin = () => {
    const wid = localStorage.getItem('worker_id');
    const isLogged = localStorage.getItem('isLoggedIn');
    if (!wid || !isLogged) {
      showToast("Please login first - go to Login page");
      setTimeout(()=> window.location.href = "/login", 1000);
      return false;
    }
    return true;
  };

  // PLAY - FREE, NO LOGIN NEEDED
  const playSample = async (voice: any) => {
    try {
      if (audio) { audio.pause(); setAudio(null); }
      if (playingId === voice.id) { setPlayingId(null); return; }
      setPlayingId(voice.id);
      const map: any = { "Lagos Male": 0, "Abuja Female": 1, "Pidgin Narrator": 2, "Delta Warri": 3, "Yoruba Mix": 4 };
      const idx = map[voice.name] ?? 0;
      const local = myLocalVoices[idx];
      if (local?.audioData) {
        const a = new Audio(local.audioData);
        setAudio(a);
        a.onended = () => setPlayingId(null);
        await a.play();
        return;
      }
      const utter = new SpeechSynthesisUtterance(voice.sample_text);
      utter.onend = () => setPlayingId(null);
      speechSynthesis.speak(utter);
    } catch { setPlayingId(null); }
  };

  const handleBuy = (pkg: string) => {
    if (!needLogin()) return;
    setLoading(true);
    showToast(`Buy ${pkg} - Paystack go open`);
    setTimeout(()=> setLoading(false), 1000);
  };

  const handleCopy = () => {
    if (!needLogin()) return;
    showToast("Key copied!");
  };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", padding: "8px" }}>
      <style>{`.voice-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;}`}</style>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#00E676", color: "black", padding: "10px 18px", borderRadius: 20, fontSize: 11, fontWeight: 900, zIndex: 100 }}>{toast}</div>}
      <div style={{ maxWidth: 420, margin: "0 auto", border: "2px solid #1A231A", borderRadius: 28, background: "#050A05", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 900, color: "white", fontSize: 15 }}>🇳🇬 MAIN NAIJA PIDGIN</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {workerId ? <span style={{ fontSize: 9, color: "#00E676" }}>{workerId}</span> : null}
            <Link href="/login" style={{ background: workerId ? "#1A231A" : "#00E676", color: workerId ? "#A5D6A7" : "black", fontSize: 9, fontWeight: 900, padding: "6px 10px", borderRadius: 20, textDecoration: "none" }}>{workerId ? "Switch" : "Login"}</Link>
            <div style={{ background: "#14301A", border: "1px solid #1E4D2B", color: "#A5D6A7", fontSize: 8, padding: "4px 8px", borderRadius: 20 }}>LIVE</div>
          </div>
        </div>

        {announces.length > 0 && <div style={{ marginTop: 10, background: "#1A150A", border: "1.5px solid #FFB300", borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11, fontWeight: 800, color: "#FFB300" }}>📢 Announcement Board — From Chairman</div>{announces.map((a:any)=><div key={a.id} style={{ marginTop: 8, background: "#121C12", padding: 10, borderRadius: 8 }}><div style={{ fontSize: 12, fontWeight: 900, color: "white" }}>{a.title}</div><div style={{ fontSize: 11, color: "#BDBDBD", marginTop: 4 }}>{a.message}</div></div>)}</div>}

        <div style={{ marginTop: 12, background: "#121C12", borderRadius: 14, padding: 14, border: "1px solid #1E2F1E" }}><div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>API Marketplace</div><div style={{ fontSize: 11, color: "#9E9E9E" }}>Preview FREE - No login • Price ₦{MIN_PRICE}-₦{MAX_PRICE}/call</div></div>

        <div style={{ marginTop: 10, background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11, color: "#A5D6A7" }}>🔑 Your Live API Key</div><div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}><div style={{ fontSize: 14, fontWeight: 900, color: "#00E676", fontFamily: "monospace" }}>sk_live_••••••••</div><button onClick={handleCopy} style={{ background: "#00C853", color: "white", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 800 }}>Copy</button></div></div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ background: "#121C12", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 11, fontWeight: 800, color: "white" }}>🎁 Starter</div><div style={{ fontSize: 18, fontWeight: 900, color: "#00E676" }}>100 FREE</div><button onClick={()=>handleBuy('free')} style={{ width: "100%", marginTop: 8, background: "#00C853", color: "white", border: "none", padding: 10, borderRadius: 8, fontWeight: 800 }}>Get Free Key →</button></div>
          <div style={{ background: "#1A150A", border: "1px solid #FFB300", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 11, fontWeight: 800, color: "white" }}>👑 Pro - 1,000 Voices</div><div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>₦5,000</div><button onClick={()=>handleBuy('pro')} style={{ width: "100%", marginTop: 8, background: "transparent", border: "1px solid #FFB300", color: "white", padding: 9, borderRadius: 8, fontWeight: 800 }}>Buy with Paystack</button></div>
          <div style={{ background: "#121C12", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 11, fontWeight: 800, color: "white" }}>🚀 Growth - 2,000 Voices</div><div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>₦10,000</div><button onClick={()=>handleBuy('growth')} style={{ width: "100%", marginTop: 8, background: "transparent", border: "1px solid #FFB300", color: "white", padding: 9, borderRadius: 8, fontWeight: 800 }}>Buy with Paystack</button></div>
          <div style={{ background: "#121C12", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 11, fontWeight: 800, color: "white" }}>🏢 Scale - 10,000 Voices</div><div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>₦50,000</div><button onClick={()=>handleBuy('scale')} style={{ width: "100%", marginTop: 8, background: "transparent", border: "1px solid #FFB300", color: "white", padding: 9, borderRadius: 8, fontWeight: 800 }}>Buy with Paystack</button></div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>Preview Voices – Tap to Listen FREE {myLocalVoices.length>0 && <span style={{color:"#00E676", fontSize:10}}>• {myLocalVoices.length} YOUR VOICE</span>}</div>
          <div style={{ fontSize: 10, color: "#00E676" }}>No login needed to preview • Login only for buying</div>
          <div className="voice-grid" style={{ marginTop: 10 }}>
            {voices.map((v:any)=>{const o=voiceOwners[v.name]; return (
              <div key={v.id} onClick={()=>playSample(v)} style={{ background: playingId===v.id ? "#1A2F1A" : "#121C12", border: playingId===v.id ? "1.5px solid #00E676" : "1px solid #1E2F1E", borderRadius: 12, padding: "8px 4px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, background: playingId===v.id ? "#FF5252" : "#00E676", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontWeight: 900 }}>{playingId===v.id ? "■" : "▶"}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "white", marginTop: 6 }}>{v.name}</div>
                <div style={{ fontSize: 7, color: o ? "#FFB300" : "#999", fontWeight: 800 }}>{o ? `by ${o.worker_name?.split(' ')[0]} ₦${o.price_per_use}` : v.accent}</div>
              </div>
            )})}
          </div>
        </div>

        <Link href="/api-dashboard" style={{ display: "flex", justifyContent: "center", marginTop: 14, background: "white", color: "#000", padding: 13, borderRadius: 12, fontWeight: 900, textDecoration: "none" }}>Go to API Dashboard →</Link>
        <div style={{ textAlign: "center", fontSize: 8, color: "#555", marginTop: 10 }}>Preview FREE • Buy needs login • {workerId || "Not logged"} • Price Limit ₦{MIN_PRICE}-₦{MAX_PRICE}</div>
      </div>
    </div>
  );
}