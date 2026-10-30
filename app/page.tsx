"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// PRICE LIMIT - CHAIRMAN SET AM HERE
const MIN_PRICE = 5; // ₦5 per call minimum
const MAX_PRICE = 50; // ₦50 per call maximum

export default function Marketplace() {
  const [user, setUser] = useState<any>(null);
  const [workerId, setWorkerId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [realKey, setRealKey] = useState("");
  const [freeLeft, setFreeLeft] = useState(0);
  const [paidLeft, setPaidLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState<any[]>([]);
  const [voiceOwners, setVoiceOwners] = useState<any>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success"|"error">("success");
  const [announces, setAnnounces] = useState<any[]>([]);
  const [myLocalVoices, setMyLocalVoices] = useState<any[]>([]);

  useEffect(() => { 
    loadData(); 
    // SIMPLE LOGIN CHECK
    const wid = localStorage.getItem('worker_id');
    if (wid) setWorkerId(wid);
    
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => { listener.subscription.unsubscribe(); };
  }, []);

  async function loadData() {
    const { data: u } = await supabase.auth.getUser();
    setUser(u?.user || null);
    
    // Load voices
    const { data: v } = await supabase.from('voices').select('*').eq('active', true).limit(10);
    let voiceList: any[] = [];
    if (v && v.length > 0) voiceList = v;
    else voiceList = [
      { id: "1", name: "Lagos Male", accent: "Natural - Young", sample_text: "How far boss! Lagos male voice dey here, ready to talk." },
      { id: "2", name: "Abuja Female", accent: "Warm - Professional", sample_text: "Good morning, na Abuja female voice, calm and clear." },
      { id: "3", name: "Pidgin Narrator", accent: "Story - Expressive", sample_text: "For inside this life, na story dey sweet pass, make I tell you!" },
      { id: "4", name: "Delta Warri", accent: "Rugged - Local", sample_text: "Warri no dey carry last, you hear? Original Warri voice!" },
      { id: "5", name: "Yoruba Mix", accent: "Hybrid - Bilingual", sample_text: "E kaaro! I fit speak Yoruba and pidgin join together." },
    ];
    setVoices(voiceList);

    // ✅ LOAD VOICE OWNERSHIP + PRICE LIMIT
    try {
      const { data: owners } = await supabase.from('voice_ownership').select('*').eq('approved', true);
      if (owners) {
        let map: any = {};
        owners.forEach((o:any) => {
          // PRICE LIMIT ENFORCE
          let price = o.price_per_use || 5;
          if (price < MIN_PRICE) price = MIN_PRICE;
          if (price > MAX_PRICE) price = MAX_PRICE;
          map[o.voice_id] = { ...o, price_per_use: price };
        });
        setVoiceOwners(map);
      }
    } catch {}

    const guestId = localStorage.getItem('guest_id') || `guest_${Date.now()}`;
    localStorage.setItem('guest_id', guestId);
    const uid = u?.user?.id || guestId;
    const { data: keys } = await supabase.from('api_keys').select('*').eq('user_id', uid).eq('is_active', true).order('created_at', { ascending: false }).limit(1);
    if (keys && keys[0]) {
      setApiKey(keys[0].key_prefix); setRealKey(keys[0].key);
      setFreeLeft(keys[0].free_requests_remaining || 0); setPaidLeft(keys[0].paid_requests_remaining || 0);
    }
    try {
      const { data: ann } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3);
      if (ann) setAnnounces(ann);
    } catch {}
    try {
      const saved = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
      let myVoices = saved.filter((f:any) => f.audioData);
      myVoices.sort((a:any,b:any) => (a.id||0) - (b.id||0));
      if (myVoices.length > 0) setMyLocalVoices(myVoices);
    } catch {}
  }

  const showToast = (m: string, type: "success"|"error" = "success") => { setToast(m); setToastType(type); setTimeout(()=>setToast(""), 3500); };
  
  // ✅ SIMPLE LOGIN CHECK FOR ALL BUTTONS
  const checkLogin = () => {
    const wid = localStorage.getItem('worker_id') || workerId;
    const isLogged = localStorage.getItem('isLoggedIn');
    if (!wid || !isLogged) {
      showToast("Please login first - passport + password", "error");
      setTimeout(()=> window.location.href = "/login", 1200);
      return false;
    }
    return true;
  };

  const playSample = async (voice: any) => {
    if (!checkLogin()) return;
    try {
      if (audio) { audio.pause(); audio.currentTime = 0; setAudio(null); }
      window.speechSynthesis?.cancel();
      if (playingId === voice.id) { setPlayingId(null); return; }
      setPlayingId(voice.id);

      const chairmanMap: any = { "Lagos Male": 0, "Abuja Female": 1, "Pidgin Narrator": 2, "Delta Warri": 3, "Yoruba Mix": 4 };
      const idx = chairmanMap[voice.name] ?? voices.findIndex((v:any) => v.id === voice.id);
      const chairmanVoice = myLocalVoices[idx];
      
      if (chairmanVoice && chairmanVoice.audioData) {
        const a = new Audio(chairmanVoice.audioData);
        setAudio(a);
        a.onended = () => setPlayingId(null);
        a.onerror = () => setPlayingId(null);
        await a.play();
        showToast(`🎧 ${voice.name} - ${voiceOwners[voice.name]?.worker_name || 'Chairman'}`, "success");
        return;
      }
      if (voice.sample_url) { const a = new Audio(voice.sample_url); setAudio(a); a.onended = () => setPlayingId(null); await a.play(); return; }
      const utter = new SpeechSynthesisUtterance(voice.sample_text); utter.onend = () => setPlayingId(null); speechSynthesis.speak(utter);
    } catch { setPlayingId(null); }
  };

  // ✅ RECORD SALE WITH 70/30 SPLIT + PRICE LIMIT
  const recordVoiceSale = async (voiceName: string, amount: number) => {
    try {
      let owner = voiceOwners[voiceName];
      if (!owner) return; // Chairman voice - no split
      
      // PRICE LIMIT CHECK AGAIN
      let perCall = owner.price_per_use;
      if (perCall < MIN_PRICE) perCall = MIN_PRICE;
      if (perCall > MAX_PRICE) perCall = MAX_PRICE;
      
      const workerShare = Math.floor(amount * 0.7);
      const chairmanShare = amount - workerShare;
      
      await supabase.from('voice_sales').insert([{
        voice_id: voiceName,
        worker_id: owner.worker_id,
        customer_id: workerId || user?.email || 'guest',
        customer_email: user?.email || workerId,
        amount: amount,
        worker_share: workerShare,
        chairman_share: chairmanShare
      }]);
      
      const { data: worker } = await supabase.from('workers').select('voice_earnings, total_voice_sales').eq('worker_id', owner.worker_id).single();
      if (worker) {
        await supabase.from('workers').update({
          voice_earnings: (worker.voice_earnings || 0) + workerShare,
          total_voice_sales: (worker.total_voice_sales || 0) + 1
        }).eq('worker_id', owner.worker_id);
      }
      
      await supabase.from('voice_ownership').update({
        total_sales: owner.total_sales + 1,
        total_earned: owner.total_earned + amount
      }).eq('voice_id', voiceName);
      
      showToast(`💰 ₦${amount} - Worker ₦${workerShare} (70%) / You ₦${chairmanShare} (30%)`, "success");
    } catch (e) { console.log(e); }
  };

  const claimFree = async () => {
    if (!checkLogin()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/keys/create-free', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user?.id || workerId }) });
      const data = await res.json();
      if (data.api_key) { setRealKey(data.api_key); setApiKey(data.key_prefix); setFreeLeft(100); showToast("✅ 100 FREE claimed!", "success"); navigator.clipboard.writeText(data.api_key); await loadData(); }
      else showToast(data.error || 'Already claimed', "error");
    } catch { showToast("Network error", "error"); }
    setLoading(false);
  };

  const buy = async (pkg: string) => {
    if (pkg === 'free_100') { claimFree(); return; }
    if (!checkLogin()) return;
    
    // FOR DEMO - RECORD SALE FOR FIRST VOICE
    let amount = 5000;
    if (pkg === 'growth') amount = 10000;
    if (pkg === 'scale') amount = 50000;
    if (voices[0]?.name) await recordVoiceSale(voices[0].name, amount);

    setLoading(true);
    try {
      const res = await fetch('/api/paystack/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId: pkg, email: user?.email || `${workerId}@gin.com`, userId: user?.id || workerId }) });
      const data = await res.json();
      if (data.authorization_url) window.location.href = data.authorization_url;
      else showToast(data.error || 'Paystack init failed', "error");
    } catch { showToast("Connection failed", "error"); }
    setLoading(false);
  };

  const logout = async () => { 
    localStorage.removeItem('worker_id'); 
    localStorage.removeItem('isLoggedIn'); 
    await supabase.auth.signOut(); 
    setUser(null); 
    setWorkerId(""); 
    showToast("Logged out", "success"); 
  };

  return (
    <div style={{ background: "#080C08", minHeight: "100vh", width: "100%", padding: "8px" }}>
      <style>{`*{box-sizing:border-box} body{margin:0} button:active{transform:scale(0.97)} .voice-grid-fixed { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }`}</style>
      {toast && <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: toastType==="error" ? "#FF5252" : "#00E676", color: toastType==="error" ? "white" : "black", padding: "10px 18px", borderRadius: "20px", fontSize: "11px", fontWeight: "900", zIndex: 100, maxWidth: "90%", textAlign: "center" }}>{toast}</div>}
      <div style={{ maxWidth: "420px", margin: "0 auto", border: "2px solid #1A231A", borderRadius: "28px", background: "#050A05", padding: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "white", borderRadius: "4px", width: "28px", height: "20px", display: "flex", overflow: "hidden" }}><div style={{ flex: 1, background: "#008751" }}></div><div style={{ flex: 1, background: "white" }}></div><div style={{ flex: 1, background: "#008751" }}></div></div>
            <div style={{ fontWeight: "900", color: "white", fontSize: "15px" }}>MAIN NAIJA PIDGIN</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {workerId ? (<div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ fontSize: "9px", color: "#00E676", maxWidth: "70px", overflow: "hidden", textOverflow: "ellipsis" }}>{workerId}</div><button onClick={logout} style={{ background: "#1A231A", border: "1px solid #1E4D2B", color: "#A5D6A7", fontSize: "8px", padding: "4px 8px", borderRadius: "20px" }}>⎋ Logout</button></div>) : (<Link href="/login" style={{ background: "#00E676", color: "black", fontSize: "9px", fontWeight: "900", padding: "6px 10px", borderRadius: "20px", textDecoration: "none" }}>Login</Link>)}
            <div style={{ background: "#14301A", border: "1px solid #1E4D2B", color: "#A5D6A7", fontSize: "9px", fontWeight: "800", padding: "6px 10px", borderRadius: "20px", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "8px", height: "8px", background: "#00E676", borderRadius: "50%" }}></span>LIVE</div>
          </div>
        </div>
        {announces.length > 0 && (<div style={{ marginTop: "10px", background: "#1A150A", border: "1.5px solid #FFB300", borderRadius: "12px", padding: "12px" }}><div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "800", color: "#FFB300" }}>📢 Announcement Board — From Chairman</div>{announces.map((a: any) => (<div key={a.id} style={{ marginTop: "8px", background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "8px", padding: "10px" }}><div style={{ fontSize: "12px", fontWeight: "900", color: "white" }}>{a.title}</div><div style={{ fontSize: "11px", color: "#BDBDBD", marginTop: "4px", lineHeight: "1.4" }}>{a.message}</div><div style={{ fontSize: "8px", color: "#666", marginTop: "6px" }}>{new Date(a.created_at).toLocaleString()} • Chairman</div></div>))}</div>)}
        <div style={{ marginTop: "12px", background: "#121C12", borderRadius: "14px", padding: "14px", border: "1px solid #1E2F1E" }}><div style={{ fontSize: "22px", fontWeight: "900", color: "white" }}>API Marketplace</div><div style={{ fontSize: "11px", color: "#9E9E9E", marginTop: "2px" }}>Authentic Naija Pidgin Voices • Price Limit ₦{MIN_PRICE}-₦{MAX_PRICE}/call {workerId && <span style={{ color: "#00E676" }}>• {workerId}</span>}</div></div>
        <div style={{ marginTop: "10px", background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: "12px", padding: "12px" }}><div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "700", color: "#A5D6A7" }}>🔑 Your Live API Key</div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", gap: "8px" }}><div style={{ fontSize: "15px", fontWeight: "900", color: "#00E676", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>{apiKey ? apiKey : "sk_live_ •••••••••••"}</div><button onClick={() => { if(!checkLogin()) return; if(realKey){ navigator.clipboard.writeText(realKey); showToast("Key copied!"); } }} style={{ background: "#00C853", color: "white", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "800", flexShrink: 0 }}>⧉ Copy</button></div><div style={{ marginTop: "10px", borderTop: "1px solid #1E2F1E", paddingTop: "8px", display: "flex", gap: "12px", fontSize: "11px", color: "#BDBDBD" }}><span><b style={{ color: "white" }}>{freeLeft}</b> Free Left</span><span><b style={{ color: "white" }}>{paidLeft}</b> Paid Left</span><span style={{ color: "#333" }}>|</span><span><b style={{ color: "#00E676" }}>99.9%</b> Uptime</span></div></div>
        <div style={{ marginTop: "14px" }}><div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>Pricing Plans</div><div style={{ fontSize: "11px", color: "#888", display: "flex", gap: "6px", marginTop: "2px" }}>🛡️ Paystack Secured • Price Limit ₦{MIN_PRICE}-₦{MAX_PRICE}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "10px" }}><div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "12px", padding: "10px" }}><div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>🎁 Starter</div><div style={{ fontSize: "20px", fontWeight: "900", color: "#00E676", marginTop: "4px" }}>100 FREE</div><div style={{ fontSize: "10px", color: "#9E9E9E" }}>No card needed</div><button onClick={() => buy('free_100')} disabled={loading} style={{ width: "100%", marginTop: "10px", background: "#00C853", color: "white", border: "none", padding: "10px", borderRadius: "8px", fontSize: "11px", fontWeight: "800" }}>{loading ? "..." : "Get Free Key →"}</button></div><div style={{ background: "#1A150A", border: "1px solid #FFB300", borderRadius: "12px", padding: "10px" }}><div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>👑 Pro</div><div style={{ fontSize: "7px", background: "#3E3200", border: "1px solid #FFB300", color: "#FFB300", padding: "2px 6px", borderRadius: "20px", fontWeight: "800" }}>MOST POPULAR</div></div><div style={{ fontSize: "14px", fontWeight: "900", color: "white", marginTop: "4px" }}>🔥 1,000 Voices</div><div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>₦5,000</div><button onClick={() => buy('pro')} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #FFB300", color: "white", padding: "9px", borderRadius: "8px", fontSize: "10px", fontWeight: "800" }}>☰ Buy with Paystack</button></div><div style={{ background: "#121C12", borderRadius: "12px", padding: "10px", border: "1px solid #1E2F1E" }}><div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>🚀 Growth</div><div style={{ fontSize: "15px", fontWeight: "900", color: "white", marginTop: "4px" }}>2,000 Voices</div><div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>₦10,000</div><button onClick={() => buy('growth')} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #FFB300", color: "white", padding: "9px", borderRadius: "8px", fontSize: "10px", fontWeight: "800" }}>Buy with Paystack</button></div><div style={{ background: "#121C12", borderRadius: "12px", padding: "10px", border: "1px solid #1E2F1E" }}><div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>🏢 Scale</div><div style={{ fontSize: "14px", fontWeight: "900", color: "white", marginTop: "4px" }}>10,000 Voices</div><div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>₦50,000</div><button onClick={() => buy('scale')} disabled={loading} style={{ width: "100%", marginTop: "8px", background: "transparent", border: "1px solid #FFB300", color: "white", padding: "9px", borderRadius: "8px", fontSize: "10px", fontWeight: "800" }}>☰ Buy with Paystack</button></div></div></div>
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: "800", color: "white" }}>Preview Voices – Tap to Listen {myLocalVoices.length > 0 && <span style={{color:"#00E676", fontSize:"10px"}}>• {myLocalVoices.length} YOUR VOICE READY</span>}</div>
          <div style={{ fontSize: "10px", color: "#00E676", marginTop: "2px" }}>100% Naija accent • Price Limit ₦{MIN_PRICE}-₦{MAX_PRICE} {myLocalVoices.length > 0 ? "• CHAIRMAN VOICE ACTIVE" : ""}</div>
          <div className="voice-grid-fixed" style={{ marginTop: "10px" }}>
            {voices.slice(0,5).map((v: any, idx: number) => {
              const hasMyVoice = !!myLocalVoices[idx];
              const owner = voiceOwners[v.name];
              const displayPrice = owner ? owner.price_per_use : 5;
              return (
              <div key={v.id} onClick={() => playSample(v)} style={{ background: playingId === v.id ? "#1A2F1A" : "#121C12", border: playingId === v.id ? "1.5px solid #00E676" : hasMyVoice ? "1px solid #00E676" : "1px solid #1E2F1E", borderRadius: "12px", padding: "8px 4px", textAlign: "center", cursor: "pointer", position:"relative", minWidth: 0 }}>
                {hasMyVoice && <div style={{position:"absolute", top:"3px", right:"3px", background:"#00E676", color:"black", fontSize:"5px", fontWeight:900, padding:"1px 3px", borderRadius:"8px"}}>YOU</div>}
                <div style={{ width: "36px", height: "36px", background: playingId === v.id ? "#FF5252" : "#00E676", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: "12px", color: "#000", fontWeight: "900" }}>{playingId === v.id ? "■" : "▶"}</div>
                <div style={{ fontSize: "9px", fontWeight: "800", color: "white", marginTop: "6px", lineHeight: "1.1", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{v.name}</div>
                <div style={{ fontSize: "7px", color: owner ? "#FFB300" : hasMyVoice ? "#00E676" : "#999", marginTop: "2px", fontWeight: 800 }}>{owner ? `by ${owner.worker_name?.split(' ')[0]} ₦${displayPrice}` : hasMyVoice ? "Chairman" : v.accent.split("-")[0].trim()}</div>
                <div style={{ marginTop: "6px", display: "flex", justifyContent: "center", gap: "2px", height: "12px", alignItems: "center" }}>
                  {[...Array(6)].map((_, i) => <div key={i} style={{ width: "2px", height: `${3 + (i % 3) * 2}px`, background: "#00E676", borderRadius: "2px", opacity: playingId === v.id ? 1 : 0.6 }}></div>)}
                </div>
              </div>
            )})}
          </div>
        </div>
        <Link href="/api-dashboard" onClick={(e)=> { if(!checkLogin()) e.preventDefault(); }} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "14px", background: "white", color: "#000", padding: "13px", borderRadius: "12px", fontSize: "13px", fontWeight: "900", textDecoration: "none" }}>Go to API Dashboard <span>→</span></Link>
        <div style={{ textAlign: "center", fontSize: "8px", color: "#555", marginTop: "10px" }}>Simple Login: Passport + Confirm Password • Price Limit ₦{MIN_PRICE}-₦{MAX_PRICE} • 70/30 Split • {workerId ? `${workerId} logged in` : "Not logged"} • Open browsing • Login on tap {myLocalVoices.length > 0 ? `• ${myLocalVoices.length} Chairman Voice Active` : ""}</div>
      </div>
    </div>
  );
}