"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [apiKeyDisplay, setApiKeyDisplay] = useState("mk_live_••••••••••••_naija");
  const [realKey, setRealKey] = useState<string | null>(null);
  const [voices, setVoices] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [freeRequests, setFreeRequests] = useState(100);
  const [paidRequests, setPaidRequests] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function loadLiveData() {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      const { data: voicesData } = await supabase.from('voices').select('*').eq('active', true);
      if (voicesData && voicesData.length > 0) setVoices(voicesData);
      const { data: datasetsData } = await supabase.from('datasets').select('*').eq('live', true);
      if (datasetsData) setDatasets(datasetsData);
      const uid = userData.user?.id;
      let query = supabase.from('api_keys').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1);
      if (uid) query = query.eq('user_id', uid);
      const { data: keysData } = await query;
      if (keysData && keysData[0]) {
        const k = keysData[0];
        setApiKeyDisplay(k.key_prefix || k.key?.slice(0,20) + '...');
        setFreeRequests(k.free_requests_remaining ?? 0);
        setPaidRequests(k.paid_requests_remaining ?? 0);
      }
    }
    loadLiveData();
  }, []);

  const playSample = async (voice: any) => {
    try {
      if (audio) { audio.pause(); setAudio(null); }
      if (playingId === (voice.id || voice.name)) { setPlayingId(null); return; }
      setPlayingId(voice.id || voice.name);
      if (voice.sample_url || voice.preview_url) {
        const a = new Audio(voice.sample_url || voice.preview_url);
        setAudio(a);
        a.onended = () => setPlayingId(null);
        await a.play();
        return;
      }
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
        alert(`🎤 ${voice.name}: "${voice.sample_text || 'Naija voice ready!'}"`);
        setPlayingId(null);
      }
    } catch (e) {
      alert(`🎤 ${voice.name} - sample`);
      setPlayingId(null);
    }
  };

  const handleCopy = async () => {
    if (realKey) await navigator.clipboard.writeText(realKey);
    else await navigator.clipboard.writeText(apiKeyDisplay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const claimFreeKey = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/keys/create-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 'demo-user-' + Date.now() })
      });
      const data = await res.json();
      if (data.api_key) {
        setRealKey(data.api_key);
        setApiKeyDisplay(data.key_prefix || data.api_key.slice(0, 20) + '...');
        setFreeRequests(100);
        alert(`Free Key Created: ${data.api_key}\n\n100 voice requests - Copy now, it shows once!`);
      } else {
        alert(data.error || 'Already claimed free key. Please purchase a package at /marketplace');
      }
    } catch (e) { alert('Network error, try again'); }
    setLoading(false);
  };

  const buyPackage = async (packageId: string) => {
    if (packageId === 'free_100') { claimFreeKey(); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, email: user?.email || 'customer@mainnaija.com', userId: user?.id || 'demo-user' })
      });
      const data = await res.json();
      if (data.authorization_url) window.location.href = data.authorization_url;
      else alert(data.error || 'Payment init failed');
    } catch (e) { alert('Payment error'); }
    setLoading(false);
  };

  const totalRemaining = freeRequests + paidRequests;

  return (
    <div style={{ background: "#050A05", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <style>{`*{box-sizing:border-box} body{margin:0} button:active{transform:scale(0.98)}`}</style>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "12px", width: "100%" }}>
        
        {/* HEADER - UNTOUCHED */}
        <div style={{ background: "#1A231A", borderRadius: "14px", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: "900", color: "#00E676", fontSize: "14px", letterSpacing: "0.5px" }}>🇳🇬 MAIN NAIJA PIDGIN</div>
          <span style={{ background: "#00E676", color: "#000", fontSize: "10px", fontWeight: "800", padding: "4px 8px", borderRadius: "20px" }}>• LIVE</span>
        </div>

        <div style={{ marginTop: "16px" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "white", lineHeight: "1.1" }}>Welcome to Main Naija Pidgin</div>
          <div style={{ color: "#888", fontSize: "12px", marginTop: "4px" }}>Build with pidgin. Deploy fast. Run Naija.</div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          <div style={{ flex: 1, background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "14px", padding: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>Worker Panel</div>
            <div style={{ fontSize: "10px", color: "#666" }}>Manage ops & tasks</div>
            <div style={{ fontSize: "10px", color: "#666", marginTop: "6px" }}>45 Tasks • Online</div>
            <Link href="/workspace"><div style={{ background: "#00E676", color: "#000", textAlign: "center", padding: "8px", borderRadius: "20px", fontSize: "11px", fontWeight: "800", marginTop: "10px" }}>Enter Workspace →</div></Link>
          </div>
          <div style={{ flex: 1, background: "#1A150A", border: "1px solid #3A2F1A", borderRadius: "14px", padding: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>Chairman Dashboard</div>
            <div style={{ fontSize: "10px", color: "#666" }}>Lead & Analytics</div>
            <div style={{ fontSize: "10px", color: "#666", marginTop: "6px" }}>12 Workers • Admin</div>
            <Link href="/chairman"><div style={{ background: "transparent", border: "1px solid #FFB300", color: "#FFB300", textAlign: "center", padding: "8px", borderRadius: "20px", fontSize: "11px", fontWeight: "800", marginTop: "10px" }}>Open Dashboard →</div></Link>
          </div>
        </div>

        {/* API MARKETPLACE - UNTOUCHED DESIGN */}
        <div style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: "14px", padding: "12px", marginTop: "14px" }}>
          <div style={{ fontSize: "12px", fontWeight: "800", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚡ API Marketplace</span>
            <Link href="/marketplace" style={{ fontSize: "10px", color: "#00E676", textDecoration: "none" }}>Marketplace →</Link>
          </div>
          <div style={{ fontSize: "10px", color: "#888", marginTop: "10px" }}>API KEY</div>
          <div style={{ background: "#0A140A", borderRadius: "8px", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px", gap: "8px" }}>
            <div style={{ fontSize: "11px", color: "#00E676", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{apiKeyDisplay}</div>
            <button onClick={handleCopy} style={{ background: "#1E2F1E", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "11px", cursor: "pointer", flexShrink: 0 }}>{copied ? "Copied!" : "Copy"}</button>
          </div>
          {realKey && <div style={{ fontSize: "9px", color: "#FFB300", marginTop: "6px", wordBreak: "break-all" }}>⚠️ {realKey}</div>}
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <div style={{ flex: 1, background: "#0A140A", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#00E676" }}>{totalRemaining}</div>
              <div style={{ fontSize: "8px", color: "#666" }}>FREE REQUESTS</div>
              <div style={{ fontSize: "7px", color: "#555" }}>{freeRequests} free + {paidRequests} paid</div>
            </div>
            <div style={{ flex: 1, background: "#0A140A", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>{datasets.length || 12}</div>
              <div style={{ fontSize: "8px", color: "#666" }}>DATASETS LIVE</div>
            </div>
            <div style={{ flex: 1, background: "#0A140A", borderRadius: "8px", padding: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>99.9%</div>
              <div style={{ fontSize: "8px", color: "#666" }}>UPTIME</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            <button onClick={() => buyPackage('free_100')} disabled={loading} style={{ flex: 1, background: "#00E676", color: "#000", border: "none", padding: "10px", borderRadius: "20px", fontSize: "10px", fontWeight: "900", cursor: "pointer" }}>{loading ? "..." : "Claim 100 Free"}</button>
            <Link href="/marketplace" style={{ flex: 1, textDecoration: "none" }}><div style={{ background: "white", color: "#000", textAlign: "center", padding: "10px", borderRadius: "20px", fontSize: "10px", fontWeight: "900" }}>Buy Requests</div></Link>
          </div>
        </div>

        {/* PREVIEW VOICES - UNTOUCHED BUT NOW WITH WORKING PLAY BUTTON FOR YOUR VOICE */}
        <div style={{ marginTop: "14px" }}>
          <div style={{ fontSize: "12px", fontWeight: "800", color: "white" }}>● Preview Voices - Tap ▶ to hear</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
            {(voices.length > 0 ? voices : [
              { id: "owner", name: "My Voice - Founder", accent: "Owner's Original", sample_text: "How far! Na me be owner of Main Naija Pidgin!" },
              { name: "Lagos Male", accent: "Natural - Young" },
              { name: "Abuja Female", accent: "Warm - Professional" },
              { name: "Pidgin Narrator", accent: "Story - Expressive" },
              { name: "Delta", accent: "Rugged - Local" },
              { name: "Yoruba Mix", accent: "Hybrid - Bilingual" },
            ]).map((v: any, i: number) => (
              <div key={i} style={{ background: v.id === "owner" ? "#1A2F1A" : "#121C12", borderRadius: "10px", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", border: v.id === "owner" ? "1px solid #00E676" : "none" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>{v.name} {v.id==="owner" && <span style={{ fontSize: "7px", background: "#00E676", color: "#000", padding: "1px 4px", borderRadius: "4px" }}>YOU</span>}</div>
                  <div style={{ fontSize: "9px", color: "#666" }}>{v.accent || v.accent_type}</div>
                </div>
                <button onClick={() => playSample(v)} style={{ width: "26px", height: "26px", background: playingId === (v.id || v.name) ? "#FF5252" : "#00E676", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#000", border: "none", cursor: "pointer", marginLeft: "6px" }}>{playingId === (v.id || v.name) ? "■" : "▶"}</button>
              </div>
            ))}
            <div style={{ background: "#121C12", borderRadius: "10px", padding: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>GET /api/datasets</div>
              <div style={{ fontSize: "9px", color: "#666" }}>Fetch live local datasets</div>
            </div>
          </div>
        </div>

        {/* AVAILABLE ENDPOINTS - UNTOUCHED */}
        <div style={{ marginTop: "14px", background: "#121C12", borderRadius: "14px", padding: "12px" }}>
          <div style={{ fontSize: "11px", fontWeight: "800", color: "white" }}>-- Available Endpoints</div>
          <div style={{ marginTop: "10px" }}>
            <div style={{ fontSize: "11px", color: "#00E676", fontWeight: "700" }}>GET /api/voices</div>
            <div style={{ fontSize: "10px", color: "#666" }}>List all available voices</div>
          </div>
          <div style={{ marginTop: "8px" }}>
            <div style={{ fontSize: "11px", color: "#00E676", fontWeight: "700" }}>POST /api/synthesize</div>
            <div style={{ fontSize: "10px", color: "#666" }}>Create speech from text (pidgin supported)</div>
            <div style={{ fontSize: "9px", color: "#555" }}>Deducts ONLY when voice succeeds. Failed = no deduction.</div>
          </div>
          <div style={{ marginTop: "8px" }}>
            <div style={{ fontSize: "11px", color: "#00E676", fontWeight: "700" }}>POST /api/feedback</div>
            <div style={{ fontSize: "10px", color: "#666" }}>Submit feedback & improve model</div>
          </div>
        </div>

        <div style={{ textAlign: "center", color: "#333", fontSize: "9px", marginTop: "16px", paddingBottom: "20px" }}>
          Secured • Powered by Naija Cloud • v1.2.0<br/>
          <span style={{ color: "#00E676" }}>{freeRequests} free voice requests • {paidRequests} paid • One free per account</span>
        </div>
      </div>
    </div>
  );
}