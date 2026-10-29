"use client";

import { useState, useRef } from "react";

export default function ApiMarketplace() {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});

  // Sample free audio (you can replace with your own later)
  const voices = [
    {
      id: "lagos",
      name: "Lagos Male",
      accent: "Lagos Accent",
      duration: "0:12",
      audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // replace later
    },
    {
      id: "abuja",
      name: "Abuja Female",
      accent: "Calm & Clear",
      duration: "0:11",
      audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    },
    {
      id: "pidgin",
      name: "Pidgin Narrator",
      accent: "Natural Pidgin",
      duration: "0:14",
      audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    },
    {
      id: "warri",
      name: "Delta Warri",
      accent: "Warri Accent",
      duration: "0:13",
      audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    },
  ];

  const togglePlay = (id: string, url: string) => {
    // Stop any currently playing audio
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    if (playingId === id) {
      setPlayingId(null);
      return;
    }

    const audio = new Audio(url);
    audioRefs.current[id] = audio;
    audio.play();
    setPlayingId(id);

    audio.onended = () => setPlayingId(null);
  };

  // Paystack Payment Function
  const payWithPaystack = () => {
    const handler = (window as any).PaystackPop.setup({
      key: "pk_test_xxxxxxxxxxxxxxxxxxxxxxxx", // ← Replace with your real Paystack Public Key
      email: "customer@email.com", // you can make this dynamic later
      amount: 500000, // ₦5,000 in kobo
      currency: "NGN",
      ref: "NP_" + Math.floor(Math.random() * 1000000000 + 1),
      callback: function (response: any) {
        alert("Payment successful! Reference: " + response.reference);
        // Here you can call your backend to give the user the Pro API key
      },
      onClose: function () {
        alert("Payment window closed.");
      },
    });
    handler.openIframe();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f0a] to-[#0d1a0d] text-white font-sans antialiased">
      {/* Load Paystack Script */}
      <script src="https://js.paystack.co/v1/inline.js" async></script>

      {/* Status bar */}
      <div className="px-5 pt-3 pb-1 flex justify-between text-xs text-gray-400">
        <span>8:45 AM</span>
        <div className="flex gap-1 items-center">
          <span>LTE</span>
          <span>•••</span>
          <span>37%</span>
        </div>
      </div>

      <div className="px-5 pb-8 max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 mt-2">
          <div className="w-10 h-10 rounded-xl bg-[#00C853]/20 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-[#00C853]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              API <span className="text-[#00C853]">Marketplace</span>
            </h1>
            <p className="text-xs text-gray-400">
              Authentic Naija Pidgin Voices & Datasets
            </p>
          </div>
        </div>

        {/* Live API Key Card */}
        <div className="bg-[rgba(17,24,17,0.8)] backdrop-blur-md border border-[rgba(0,200,83,0.15)] rounded-2xl p-4 mb-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <svg className="w-4 h-4 text-[#00C853]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              Live API Key
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#00C853]/20 text-[#00C853] px-2 py-0.5 rounded-full font-medium">
                FREE PLAN
              </span>
              <span className="flex items-center gap-1 text-xs text-[#00C853]">
                <span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse"></span> LIVE
              </span>
            </div>
          </div>
          <div className="bg-black/40 rounded-xl px-4 py-3 font-mono text-sm text-gray-400 tracking-wider">
            sk_live_••••••••••••••••••••
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[rgba(17,24,17,0.8)] backdrop-blur-md border border-[rgba(0,200,83,0.15)] rounded-xl p-3 text-center">
            <div className="text-[#00C853] text-lg font-bold">100</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Free Voices</div>
          </div>
          <div className="bg-[rgba(17,24,17,0.8)] backdrop-blur-md border border-[rgba(0,200,83,0.15)] rounded-xl p-3 text-center">
            <div className="text-[#00C853] text-lg font-bold">3</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Datasets</div>
          </div>
          <div className="bg-[rgba(17,24,17,0.8)] backdrop-blur-md border border-[rgba(0,200,83,0.15)] rounded-xl p-3 text-center">
            <div className="text-[#00C853] text-lg font-bold">99.9%</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Uptime</div>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-1">Pricing Plans</h2>
          <p className="text-xs text-gray-400 mb-4">Simple. Transparent. Powerful.</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Starter */}
            <div className="bg-[rgba(17,24,17,0.8)] backdrop-blur-md border border-[rgba(0,200,83,0.15)] rounded-2xl p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎁</span>
                <span className="font-semibold text-[#00C853]">Starter</span>
              </div>
              <div className="text-lg font-bold mb-1">100 Voices Free</div>
              <div className="text-xs text-gray-400 mb-4">API Key included</div>
              <button className="mt-auto w-full border border-[#00C853]/50 text-[#00C853] text-sm font-medium py-2.5 rounded-xl hover:bg-[#00C853]/10 transition">
                Get Free Key →
              </button>
            </div>

            {/* Pro */}
            <div className="relative rounded-2xl p-4 flex flex-col bg-gradient-to-b from-[#00C853]/20 to-[#00C853]/5 border-2 border-[#00C853]">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#00C853] text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                ★ MOST POPULAR
              </div>
              <div className="flex items-center gap-2 mb-2 mt-1">
                <span className="text-xl">👑</span>
                <span className="font-semibold text-[#00C853]">Pro</span>
              </div>
              <div className="text-lg font-bold mb-1">1,000 Voices</div>
              <div className="text-2xl font-bold text-[#00C853] mb-1">₦5,000</div>
              <div className="text-xs text-gray-400 mb-4">Full API access</div>
              <button
                onClick={payWithPaystack}
                className="mt-auto w-full bg-[#00C853] text-black text-sm font-bold py-2.5 rounded-xl hover:bg-[#00C853]/90 transition flex items-center justify-center gap-1"
              >
                Buy with Paystack 🔒
              </button>
            </div>
          </div>
        </div>

        {/* Preview Voices */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎧</span>
            <div>
              <h2 className="text-sm font-semibold">Preview Voices</h2>
              <p className="text-xs text-gray-400">Listen before you buy</p>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {voices.map((voice) => (
              <div
                key={voice.id}
                className="min-w-[140px] bg-[rgba(17,24,17,0.8)] backdrop-blur-md border border-[rgba(0,200,83,0.15)] rounded-xl p-3 flex-shrink-0"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🇳🇬</span>
                  <div>
                    <div className="text-xs font-medium">{voice.name}</div>
                    <div className="text-[10px] text-gray-400">{voice.accent}</div>
                  </div>
                </div>
                <div className="h-6 flex items-center gap-0.5 mb-2">
                  {[3, 5, 2, 4, 3, 5].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#00C853] rounded-full"
                      style={{ height: `${h * 4}px`, opacity: 0.5 + (i % 2) * 0.3 }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => togglePlay(voice.id, voice.audio)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      playingId === voice.id
                        ? "bg-[#00C853] text-black"
                        : "bg-[#00C853]/20 text-[#00C853]"
                    }`}
                  >
                    {playingId === voice.id ? "⏸" : "▶"}
                  </button>
                  <span className="text-[10px] text-gray-400">{voice.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment note */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-6 px-1">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            Pay with Card or Bank Transfer via Paystack
          </div>
          <span className="font-semibold text-[#00C853]">paystack</span>
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-3">
          <button className="flex-1 bg-[#00C853] text-black font-bold py-3.5 rounded-2xl text-sm hover:bg-[#00C853]/90 transition">
            Start Building →
          </button>
          <button className="px-5 border border-gray-600 text-gray-300 font-medium py-3.5 rounded-2xl text-sm hover:bg-white/5 transition flex items-center gap-2">
            View Docs
          </button>
        </div>
      </div>
    </div>
  );
}
