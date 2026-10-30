"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function ApiMarketplace() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("sk_live_••••••••••••••••••••");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load Paystack script correctly for Next.js
  useEffect(() => {
    if (!document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) {
      const script = document.createElement('script');
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      document.body.appendChild(script);
    }
    const saved = localStorage.getItem("mp_api_key");
    if (saved) setApiKey(saved);
  }, []);

  const voices = [
    { id: "owner", name: "My Voice - Founder", accent: "Owner's Original", duration: "0:08", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", badge: "YOU" },
    { id: "lagos", name: "Lagos Male", accent: "Lagos Accent", duration: "0:12", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: "abuja", name: "Abuja Female", accent: "Calm & Clear", duration: "0:11", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: "pidgin", name: "Pidgin Narrator", accent: "Natural Pidgin", duration: "0:14", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { id: "warri", name: "Delta Warri", accent: "Warri Accent", duration: "0:13", audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  ];

  const togglePlay = (id: string, url: string) => {
    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (playingId === id) {
      setPlayingId(null);
      return;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play().catch(() => alert("Tap again to play — browser block am"));
    setPlayingId(id);
    audio.onended = () => setPlayingId(null);
  };

  // FIXED PAYSTACK - WORKING FOR CHAIRMAN & WORK
  const payWithPaystack = (amount: number, plan: string) => {
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "pk_test_xxxxxxxxxxxxxxxxxxxxxxxx";
    if (publicKey.includes("xxxx")) {
      alert("⚠️ Add your real Paystack Public Key in .env.local:\nNEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxx\n\nThen it will charge ₦" + amount);
      return;
    }
    // @ts-ignore
    const handler = window.PaystackPop.setup({
      key: publicKey,
      email: localStorage.getItem("mp_email") || "customer@mainnaija.com",
      amount: amount * 100, // Paystack uses kobo
      currency: "NGN",
      ref: "NP_" + plan + "_" + Math.floor(Math.random() * 1000000000),
      metadata: { plan, custom_fields: [{ display_name: "Plan", variable_name: "plan", value: plan }] },
      callback: function (response: any) {
        alert("✅ Payment successful! Ref: " + response.reference + " — Chairman go see am for dashboard");
        // Give Pro key
        const newKey = `mp_live_${plan}_${Date.now()}_naija`;
        localStorage.setItem("mp_api_key", newKey);
        localStorage.setItem("mp_free_left", plan === "pro" ? "1000" : plan === "growth" ? "2000" : "10000");
        setApiKey(newKey);
        window.location.href = "/chairman?paid=" + plan;
      },
      onClose: function () {
        console.log("Paystack closed");
      },
    });
    handler.openIframe();
  };

  const claimFree = () => {
    const newKey = `mp_live_100_free_${Date.now().toString().slice(-6)}_naija`;
    localStorage.setItem("mp_api_key", newKey);
    localStorage.setItem("mp_free_left", "100");
    setApiKey(newKey);
    alert("🎉 100 Free Voices Claimed!\nKey: " + newKey);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f0a] to-[#0d1a0d] text-white font-sans antialiased">
      <div className="px-5 pt-3 pb-1 flex justify-between text-xs text-gray-400">
        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="flex gap-1 items-center"><span>LTE</span><span>•••</span><span>37%</span></div>
      </div>

      <div className="px-5 pb-8 max-w-md mx-auto">
        {/* Header with Home link */}
        <div className="flex items-center justify-between mb-6 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00C853]/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-[#00C853]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">API <span className="text-[#00C853]">Marketplace</span></h1>
              <p className="text-xs text-gray-400">Authentic Naija Pidgin Voices & Datasets</p>
            </div>
          </div>
          <Link href="/" className="text-xs text-[#00C853]">Home</Link>
        </div>

        {/* Live API Key Card */}
        <div className="bg-[rgba(17,24,17,0.8)] backdrop-blur-md border border-[rgba(0,200,83,0.15)] rounded-2xl p-4 mb-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-300">🔒 Live API Key</div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#00C853]/20 text-[#00C853] px-2 py-0.5 rounded-full font-medium">FREE PLAN</span>
              <span className="flex items-center gap-1 text-xs text-[#00C853]"><span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse"></span> LIVE</span>
            </div>
          </div>
          <div className="bg-black/40 rounded-xl px-4 py-3 font-mono text-sm text-gray-400 tracking-wider flex justify-between items-center">
            <span className="truncate">{apiKey}</span>
            <button onClick={() => { navigator.clipboard.writeText(apiKey); alert("Copied!"); }} className="ml-2 text-[#00C853] text-xs">Copy</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[rgba(17,24,17,0.8)] border border-[rgba(0,200,83,0.15)] rounded-xl p-3 text-center"><div className="text-[#00C853] text-lg font-bold">100</div><div className="text-[10px] text-gray-400 uppercase">Free Voices</div></div>
          <div className="bg-[rgba(17,24,17,0.8)] border border-[rgba(0,200,83,0.15)] rounded-xl p-3 text-center"><div className="text-[#00C853] text-lg font-bold">5</div><div className="text-[10px] text-gray-400 uppercase">Voices</div></div>
          <div className="bg-[rgba(17,24,17,0.8)] border border-[rgba(0,200,83,0.15)] rounded-xl p-3 text-center"><div className="text-[#00C853] text-lg font-bold">99.9%</div><div className="text-[10px] text-gray-400 uppercase">Uptime</div></div>
        </div>

        {/* Pricing Plans */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-1">Pricing Plans</h2>
          <p className="text-xs text-gray-400 mb-4">Simple. Transparent. Powerful.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[rgba(17,24,17,0.8)] border border-[rgba(0,200,83,0.15)] rounded-2xl p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2"><span className="text-xl">🎁</span><span className="font-semibold text-[#00C853]">Starter</span></div>
              <div className="text-lg font-bold mb-1">100 Voices Free</div>
              <div className="text-xs text-gray-400 mb-4">API Key included</div>
              <button onClick={claimFree} className="mt-auto w-full border border-[#00C853]/50 text-[#00C853] text-sm font-medium py-2.5 rounded-xl hover:bg-[#00C853]/10 transition">Get Free Key →</button>
            </div>
            <div className="relative rounded-2xl p-4 flex flex-col bg-gradient-to-b from-[#00C853]/20 to-[#00C853]/5 border-2 border-[#00C853]">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#00C853] text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full">★ MOST POPULAR</div>
              <div className="flex items-center gap-2 mb-2 mt-1"><span className="text-xl">👑</span><span className="font-semibold text-[#00C853]">Pro</span></div>
              <div className="text-lg font-bold">1,000 Voices</div>
              <div className="text-2xl font-bold text-[#00C853] mb-1">₦5,000</div>
              <div className="text-xs text-gray-400 mb-4">Full API access</div>
              <button onClick={() => payWithPaystack(5000, 'pro')} className="mt-auto w-full bg-[#00C853] text-black text-sm font-bold py-2.5 rounded-xl hover:bg-[#00C853]/90 transition">Buy with Paystack 🔒</button>
            </div>
            <div className="bg-[rgba(17,24,17,0.8)] border border-white/10 rounded-2xl p-4 flex flex-col">
              <div className="text-sm font-semibold">Growth</div>
              <div className="text-lg font-bold">2,000 Voices</div>
              <div className="text-xl font-bold text-white mb-3">₦10,000</div>
              <button onClick={() => payWithPaystack(10000, 'growth')} className="mt-auto w-full border border-white/20 text-sm py-2.5 rounded-xl hover:bg-white/10">Buy with Paystack</button>
            </div>
            <div className="bg-[rgba(17,24,17,0.8)] border border-white/10 rounded-2xl p-4 flex flex-col">
              <div className="text-sm font-semibold">Scale</div>
              <div className="text-lg font-bold">10,000 Voices</div>
              <div className="text-xl font-bold text-white mb-3">₦50,000</div>
              <button onClick={() => payWithPaystack(50000, 'scale')} className="mt-auto w-full border border-white/20 text-sm py-2.5 rounded-xl hover:bg-white/10">Buy with Paystack</button>
            </div>
          </div>
        </div>

        {/* Preview Voices - YOUR DESIGN STILL, BUT PLAY NOW WORKS */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3"><span className="text-lg">🎧</span><div><h2 className="text-sm font-semibold">Preview Voices - Tap ▶</h2><p className="text-xs text-gray-400">Listen before you buy — 100% Naija accent</p></div></div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {voices.map((voice) => (
              <div key={voice.id} className={`min-w-[145px] backdrop-blur-md border rounded-xl p-3 flex-shrink-0 ${voice.id==='owner' ? 'bg-[#00C853]/10 border-[#00C853]' : 'bg-[rgba(17,24,17,0.8)] border-[rgba(0,200,83,0.15)]'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🇳🇬</span>
                  <div><div className="text-xs font-medium flex gap-1">{voice.name} {voice.id==='owner' && <span className="text-[7px] bg-[#00C853] text-black px-1 rounded">YOU</span>}</div><div className="text-[10px] text-gray-400">{voice.accent}</div></div>
                </div>
                <div className="h-6 flex items-center gap-0.5 mb-2">{[3,5,2,4,3,5].map((h,i)=>(<div key={i} className={`w-1 rounded-full ${playingId===voice.id ? 'bg-[#00C853] animate-pulse' : 'bg-[#00C853]/60'}`} style={{height: `${h*4}px`}}/>))}</div>
                <div className="flex items-center justify-between">
                  <button onClick={() => togglePlay(voice.id, voice.audio)} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${playingId===voice.id ? "bg-[#FF5252] text-white" : "bg-[#00C853]/20 text-[#00C853]"}`}>{playingId===voice.id ? "■" : "▶"}</button>
                  <span className="text-[10px] text-gray-400">{voice.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 mb-6 px-1">
          <div className="flex items-center gap-1.5">🔒 Pay with Card or Bank Transfer via Paystack</div><span className="font-semibold text-[#00C853]">paystack</span>
        </div>

        <div className="flex gap-3">
          <Link href="/chairman" className="flex-1 bg-[#00C853] text-black font-bold py-3.5 rounded-2xl text-sm hover:bg-[#00C853]/90 transition text-center">Chairman Dashboard →</Link>
          <Link href="/workspace" className="px-5 border border-gray-600 text-gray-300 font-medium py-3.5 rounded-2xl text-sm hover:bg-white/5 transition text-center">Worker Panel</Link>
        </div>
      </div>
    </div>
  );
}