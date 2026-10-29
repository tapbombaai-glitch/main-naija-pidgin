"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Voice = {
  id: string;
  name: string;
  sub: string;
  flag: string;
  duration: string;
  url: string;
};

const PACKAGES = [
  { id: "free", name: "Starter", credits: 100, price: 0, description: "100 Voices Free", popular: false },
  { id: "1k", name: "Pro", credits: 1000, price: 5000, description: "Full API Access", popular: true },
  { id: "2k", name: "Business", credits: 2000, price: 10000, description: "For Growing Businesses", popular: false },
  { id: "5k", name: "Enterprise", credits: 5000, price: 25000, description: "Professional API Access", popular: false },
  { id: "10k", name: "Unlimited", credits: 10000, price: 50000, description: "High Volume API Access", popular: false },
];

const VOICES: Voice[] = [
  { id: "v1", name: "Lagos Male", sub: "Lagos Accent", flag: "🇳🇬", duration: "0:05", url: "/voices/lagos-male.mp3" },
  { id: "v2", name: "Abuja Female", sub: "Calm & Clear", flag: "🇳🇬", duration: "0:11", url: "/voices/abuja-female.mp3" },
  { id: "v3", name: "Pidgin Narrator", sub: "Natural Pidgin", flag: "🇳🇬", duration: "0:14", url: "/voices/pidgin-narrator.mp3" },
  { id: "v4", name: "Delta Voice", sub: "Warri Accent", flag: "🇳🇬", duration: "0:10", url: "/voices/delta-warri.mp3" },
  { id: "v5", name: "Yoruba Mix", sub: "Yoruba Pidgin", flag: "🇳🇬", duration: "0:13", url: "/voices/yoruba-mix.mp3" },
];

function ApiMarketplace() {
  const [apiKey, setApiKey] = useState("");
  const [credits, setCredits] = useState(0);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [processing, setProcessing] = useState("");
  const [playing, setPlaying] = useState("");
  const [message, setMessage] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function loadAccount() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setEmail(session.user.email || "");
      const saved = localStorage.getItem("api_key");
      if (saved) setApiKey(saved);
    }
    loadAccount();
    return () => { audioRef.current?.pause(); };
  }, []);

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Please login");
    return session.access_token;
  }

  async function getFreeKey() {
    try {
      setProcessing("free"); setMessage("");
      const token = await getToken();
      const res = await fetch("/api/free/collect", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      if (result.api_key) { setApiKey(result.api_key); localStorage.setItem("api_key", result.api_key); }
      if (typeof result.credits_remaining === "number") setCredits(result.credits_remaining);
      setMessage("Free API key created!");
    } catch (e:any) { setMessage(e.message); } finally { setProcessing(""); }
  }

  async function buyPackage(packageId: string) {
    try {
      setProcessing(packageId); setMessage("");
      const token = await getToken();
      const res = await fetch("/api/paystack", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ packageId, email }) });
      const result = await res.json();
      if (!result.authorization_url) throw new Error(result.error || "Paystack failed");
      window.location.href = result.authorization_url;
    } catch (e:any) { setMessage(e.message); setProcessing(""); }
  }

  async function copyApiKey() { await navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(()=>setCopied(false),2000); }

  async function playVoice(voice: Voice) {
    if (audioRef.current) audioRef.current.pause();
    if (playing === voice.id) { setPlaying(""); return; }
    const audio = new Audio(voice.url); audioRef.current = audio; setPlaying(voice.id);
    audio.onended = () => setPlaying("");
    audio.onerror = () => { setPlaying(""); setMessage(`Missing audio: ${voice.url} - upload to public/voices/`); };
    await audio.play().catch(()=>setPlaying(""));
  }

  return (
    <div style={{ marginTop: "14px" }}>
      <div style={{ background: "linear-gradient(180deg,#111a12 0%,#080e0a 100%)", border: "1px solid #1f5030", borderRadius: "20px", padding: "20px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "46px", height: "46px", background: "#163521", borderRadius: "13px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "23px" }}>🔌</div>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "900", color: "white", margin: 0 }}>API <span style={{ color: "#22e66b" }}>Marketplace</span></h2>
            <p style={{ fontSize: "11px", color: "#929e95", marginTop: "5px" }}>Authentic Naija Pidgin Voices & Datasets</p>
          </div>
        </div>
        {message && <div style={{ marginTop: "15px", padding: "12px", background: "#102719", border: "1px solid #276b3b", color: "#54ed8a", borderRadius: "10px", fontSize: "12px" }}>{message}</div>}
        <div style={{ marginTop: "20px", background: "#0a100c", border: "1px solid #294b32", borderRadius: "16px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ color: "white", fontSize: "13px", fontWeight: "800" }}>🛡️ Live API Key</div><span style={{ color: "#4ade80", background: "#102719", padding: "5px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "900" }}>● LIVE</span></div>
          <div style={{ marginTop: "15px", background: "black", padding: "13px", borderRadius: "10px", display: "flex", justifyContent: "space-between", border: "1px solid #1c3322" }}><code style={{ color: "#4ade80", fontSize: "11px", wordBreak: "break-all" }}>{apiKey ? (showKey ? apiKey : `${apiKey.slice(0,12)}••••••••••••`) : "No API key yet"}</code>{apiKey && <button onClick={()=>setShowKey(!showKey)} style={{background:"transparent", border:"none", cursor:"pointer"}}>{showKey ? "🙈" : "👁️"}</button>}</div>
          {apiKey && <button onClick={copyApiKey} style={{ width: "100%", marginTop: "10px", background: copied ? "#22c55e" : "#173321", border: "1px solid #28613a", color: copied ? "black" : "#4ade80", padding: "11px", borderRadius: "10px", fontWeight: "900" }}>{copied ? "✓ Copied!" : "Copy API Key"}</button>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px", marginTop: "14px" }}>
          <div style={{ background: "#0f1511", border: "1px solid #26382b", borderRadius: "13px", padding: "14px", textAlign: "center" }}><strong style={{color:"white", fontSize:"20px"}}>{credits}</strong><br/><small style={{color:"#859288", fontSize:"8px"}}>YOUR CREDITS</small></div>
          <div style={{ background: "#0f1511", border: "1px solid #26382b", borderRadius: "13px", padding: "14px", textAlign: "center" }}><strong style={{color:"white", fontSize:"20px"}}>3</strong><br/><small style={{color:"#859288", fontSize:"8px"}}>DATASETS</small></div>
          <div style={{ background: "#0f1511", border: "1px solid #26382b", borderRadius: "13px", padding: "14px", textAlign: "center" }}><strong style={{color:"white", fontSize:"20px"}}>99.9%</strong><br/><small style={{color:"#859288", fontSize:"8px"}}>UPTIME</small></div>
        </div>
        <div style={{ marginTop: "25px" }}>
          <h3 style={{ fontSize: "19px", fontWeight: "900", color: "white", margin: 0 }}>Pricing Plans</h3>
          <p style={{ fontSize: "11px", color: "#89958b" }}>Simple. Transparent. Powerful.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "12px", marginTop: "15px" }}>
            {PACKAGES.map((item) => (
              <div key={item.id} style={{ background: item.popular ? "linear-gradient(160deg,#142e1b,#08130c)" : "#101711", border: item.popular ? "2px solid #24d963" : "1px solid #294832", borderRadius: "16px", padding: "15px 12px" }}>
                {item.popular && <div style={{ color: "#4ade80", fontSize: "9px", fontWeight: "900", marginBottom: "10px" }}>★ MOST POPULAR</div>}
                <div style={{ fontSize: "24px" }}>{item.id === "free" ? "🎁" : item.id === "1k" ? "👑" : "🚀"}</div>
                <h3 style={{ fontSize: "18px", color: "#4ade80", margin: 0, fontWeight: "900" }}>{item.name}</h3>
                <p style={{ color: "white", fontSize: "13px", marginTop: "8px", fontWeight: "800" }}>{item.credits.toLocaleString()} Voices</p>
                <div style={{ color: "#4ade80", fontSize: "22px", fontWeight: "900", margin: "14px 0" }}>{item.price === 0 ? "FREE" : `₦${item.price.toLocaleString()}`}</div>
                {item.id === "free" ? <button onClick={getFreeKey} style={{ width: "100%", background: "#173c23", border: "1px solid #32c968", color: "#4ade80", padding: "11px", borderRadius: "10px", fontSize: "11px", fontWeight: "900" }}>{processing === "free" ? "Creating..." : "Get Free Key →"}</button> : <button onClick={() => buyPackage(item.id)} style={{ width: "100%", background: "#22c55e", border: "none", color: "#031208", padding: "11px", borderRadius: "10px", fontSize: "11px", fontWeight: "900" }}>{processing === item.id ? "Processing..." : "Buy with Paystack 🔒"}</button>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: "25px", background: "#0f1511", border: "1px solid #263b2b", borderRadius: "16px", padding: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "900", color: "white", margin: 0 }}>🎧 Preview Voices — 5 Voices</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "10px", marginTop: "15px" }}>
            {VOICES.map((voice) => (
              <div key={voice.id} style={{ background: "black", border: "1px solid #263a2b", borderRadius: "13px", padding: "11px" }}>
                <div style={{ display: "flex", gap: "7px" }}><span>{voice.flag}</span><div><strong style={{ fontSize: "11px", color: "white" }}>{voice.name}</strong><br/><small style={{ color: "#849188", fontSize: "9px" }}>{voice.sub}</small></div></div>
                <div style={{ marginTop: "12px", height: "25px", display: "flex", gap: "3px" }}>{Array.from({ length: 20 }).map((_, i) => <span key={i} style={{ flex: 1, height: `${7 + ((i * 13) % 19)}px`, background: "#22c55e", borderRadius: "4px" }} />)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}><button onClick={() => playVoice(voice)} style={{ width: "30px", height: "30px", background: "#22c55e", border: "none", borderRadius: "50%", cursor:"pointer" }}>{playing === voice.id ? "Ⅱ" : "▶"}</button><span style={{ color: "#87958a", fontSize: "10px" }}>{voice.duration}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div style={{ background: "#050705", minHeight: "100vh", padding: "12px" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "20px 0 10px 0" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", fontWeight: "900", fontSize: "14px", color: "white" }}>🇳🇬 MAIN NAIJA PIDGIN</div>
          <h1 style={{ marginTop: "14px", fontSize: "26px", fontWeight: "900", color: "white" }}>Welcome to <span style={{ color: "#facc15" }}>Main Naija Pidgin</span></h1>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "18px" }}>
          <div style={{ background: "#0f1410", border: "1px solid #1f3a25", borderRadius: "18px", padding: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>Worker Panel</h2>
            <Link href="/worker" style={{ textDecoration: "none" }}><div style={{ marginTop: "12px", background: "#22c55e", color: "black", padding: "11px", borderRadius: "10px", textAlign: "center", fontWeight: "900", fontSize: "12px" }}>Enter Workspace →</div></Link>
          </div>
          <div style={{ background: "#101012", border: "1px solid #2a2a2a", borderRadius: "18px", padding: "16px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "900", color: "white" }}>Chairman Dashboard</h2>
            <Link href="/admin/login" style={{ textDecoration: "none" }}><div style={{ marginTop: "12px", background: "#1f1f1f", border: "1px solid #333", color: "white", padding: "11px", borderRadius: "10px", textAlign: "center", fontWeight: "700", fontSize: "12px" }}>Open Chairman Panel →</div></Link>
          </div>
        </div>
        <ApiMarketplace />
        <div style={{ marginTop: "18px", textAlign: "center", fontSize: "10px", color: "#555", paddingBottom: "25px" }}>MAIN NAIJA PIDGIN © 2026</div>
      </div>
    </div>
  );
}