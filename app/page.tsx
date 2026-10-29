"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const apiKey = "mnpp_demo_key_REPLACE_WITH_ENV";
  const refs = useRef<any>({});

  useEffect(()=>{
    if(typeof window!=="undefined" && !document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')){
      const s=document.createElement("script"); s.src="https://js.paystack.co/v1/inline.js"; s.async=true; document.body.appendChild(s);
    }
  },[]);

  const copy = async ()=>{ await navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(()=>setCopied(false),2000); }

  const voices = [
    {id:"lagos", name:"Lagos Male", sub:"Lagos Accent", flag:"🇳🇬", t:"0:12", a:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"},
    {id:"abuja", name:"Abuja Female", sub:"Calm & Clear", flag:"🇳🇬", t:"0:11", a:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"},
    {id:"pidgin", name:"Pidgin Narrator", sub:"Natural Pidgin", flag:"🇳🇬", t:"0:14", a:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"},
    {id:"delta", name:"Delta", sub:"Warri Accent", flag:"🇳🇬", t:"0:13", a:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"},
  ];

  const play = (id:string, url:string)=>{
    Object.values(refs.current).forEach((x:any)=>{ if(x){ x.pause(); x.currentTime=0; }});
    if(playing===id){ setPlaying(null); return; }
    const au=new Audio(url); refs.current[id]=au; au.play(); setPlaying(id); au.onended=()=>setPlaying(null);
  };

  const pay = ()=>{
    const key = process.env.NEXT_PUBLIC_PAYSTACK_KEY || "";
    // @ts-ignore
    if(!window.PaystackPop){ alert("Paystack loading..."); return; }
    if(!key){ alert("Add NEXT_PUBLIC_PAYSTACK_KEY for Render env"); return; }
    // @ts-ignore
    window.PaystackPop.setup({
      key: key,
      email: "customer@mainnaijapidgin.com",
      amount: 500000,
      currency: "NGN",
      ref: "MNPP_"+Date.now(),
      callback: (r:any)=>alert("Success Ref: "+r.reference),
      onClose: ()=>{},
    }).openIframe();
  };

  return (
    <div className="min-h-screen bg-[#060A06] flex justify-center">
      <div className="w-full max-w-[400px] px-4 py-5">
        <div className="flex gap-3 items-start mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#00C853]/20 flex items-center justify-center text-[#00C853] text-xl">🔌</div>
          <div><h1 className="text-[21px] font-black leading-none">API <span className="text-[#00C853]">Marketplace</span></h1><p className="text-[11px] text-[#6B7280] mt-1">Authentic Naija Pidgin Voices & Datasets</p></div>
        </div>

        <div className="bg-[#111811] border border-[#1F2F1F] rounded-2xl p-4 mb-3">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-[11px] text-gray-300"><span className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[10px]">🔒</span> Live API Key</div>
            <div className="flex gap-2 items-center"><span className="text-[8px] font-bold px-2 py-1 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400">FREE PLAN</span><span className="text-[9px] text-[#00C853] flex items-center gap-1"><span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse"></span> LIVE</span></div>
          </div>
          <div onClick={copy} className="cursor-pointer bg-[#080C08] border border-[#1A2A1A] rounded-xl px-4 py-3 font-mono text-[12px] text-gray-600">mnpp_demo_key_••••••••••</div>
          <div className="text-[9px] text-center text-gray-600 mt-2">{copied ? "✅ Copied!" : "Tap to copy"}</div>
        </div>

        <div className="bg-[#111811] border border-[#1F2F1F] rounded-2xl p-3 mb-4 grid grid-cols-3 divide-x divide-[#1F2F1F]">
          <div className="flex items-center gap-2 px-2"><span className="text-[#00C853] text-xl">〰️</span><div><div className="font-black text-white leading-none">100</div><div className="text-[8px] text-gray-500 font-bold mt-1">FREE VOICES</div></div></div>
          <div className="flex items-center gap-2 px-3"><span className="text-[#00C853] text-xl">🗄️</span><div><div className="font-black text-white leading-none">3</div><div className="text-[8px] text-gray-500 font-bold mt-1">DATASETS</div></div></div>
          <div className="flex items-center gap-2 px-3"><span className="text-[#00C853] text-xl">〰️</span><div><div className="font-black text-white leading-none">99.9%</div><div className="text-[8px] text-gray-500 font-bold mt-1">UPTIME</div></div></div>
        </div>

        <div className="mb-4">
          <h2 className="text-[14px] font-black text-white">Pricing Plans</h2>
          <p className="text-[11px] text-gray-500 mb-3">Simple. Transparent. Powerful.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#111811] border border-[#1F2F1F] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-lg bg-[#1A2A1A] flex items-center justify-center">🎁</span><span className="text-[#00C853] font-black text-[13px]">Starter</span></div>
              <div className="text-[12px] font-bold text-white">100 Voices Free</div>
              <div className="text-[10px] text-gray-500 mt-1">API Key included</div>
              <button onClick={copy} className="w-full mt-4 border border-[#00C853]/30 text-[#00C853] text-[11px] font-bold py-2.5 rounded-xl">Get Free Key →</button>
            </div>
            <div className="relative bg-[#102214] border-2 border-[#00C853] rounded-2xl p-4">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#00C853] text-black text-[7px] font-black px-2 py-1 rounded-full">★ MOST POPULAR</div>
              <div className="flex items-center gap-2 mb-1 mt-1"><span className="w-6 h-6 rounded-lg bg-[#00C853]/20 flex items-center justify-center">👑</span><span className="font-black text-[14px] text-white">Pro</span></div>
              <div className="text-[10px] text-gray-400">1,000 Voices</div>
              <div className="text-[20px] font-black text-[#00C853]">₦5,000</div>
              <div className="text-[10px] text-gray-500">Full API access</div>
              <button onClick={pay} className="w-full mt-3 bg-[#00C853] text-black text-[11px] font-black py-2.5 rounded-xl">Buy with Paystack 🔒</button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-[13px] font-black text-white">Preview Voices</h2>
          <p className="text-[10px] text-gray-500 mb-3">🎧 Listen before you buy</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {voices.map(v=>(
              <div key={v.id} className="min-w-[135px] bg-[#111811] border border-[#1F2F1F] rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2"><span>🇳🇬</span><div><div className="text-[10px] font-bold text-white">{v.name}</div><div className="text-[8px] text-gray-500">{v.sub}</div></div></div>
                <div className="h-6 flex items-center gap-[2px] mb-2">{[5,8,4,9,6,7,4,8].map((h,i)=>(<div key={i} className={`w-[3px] rounded-full ${playing===v.id ? "bg-[#00C853]" : "bg-[#00C853]/50"}`} style={{height:h*2}}/>))}</div>
                <div className="flex justify-between"><button onClick={()=>play(v.id,v.a)} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${playing===v.id ? "bg-[#00C853] text-black" : "bg-[#00C853]/20 text-[#00C853]"}`}>{playing===v.id ? "⏸" : "▶"}</button><span className="text-[10px] text-gray-500">{v.t}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center bg-[#111811] border border-[#1F2F1F] rounded-xl px-3 py-3 mb-4 text-[10px] text-gray-400"><span>🔒 Pay via Paystack</span><span className="text-[#00C853] font-black">paystack</span></div>

        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <button onClick={()=>router.push("/worker")} className="bg-[#00C853] text-black font-black py-3.5 rounded-2xl text-[12px]">Start Building →</button>
          <button onClick={()=>router.push("/chairman")} className="border border-[#2A2A2A] bg-[#111811] text-white font-bold py-3.5 rounded-2xl text-[12px]">View Docs</button>
        </div>
      </div>
    </div>
  );
}