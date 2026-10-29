"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Home(){
  const router=useRouter();
  const [copyOk,setCopyOk]=useState(false);
  const [playId,setPlayId]=useState<string|null>(null);
  const audios=useRef<any>({});
  const demoKey="mnpp_live_a1b2c3d4e5f6_demo_for_display";

  const copy=async()=>{ await navigator.clipboard.writeText(demoKey); setCopyOk(true); setTimeout(()=>setCopyOk(false),2000); };

  const voices=[
    {id:"lagos", name:"Lagos Male", sub:"Lagos Accent", flag:"🇳🇬", t:"0:12", url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"},
    {id:"abuja", name:"Abuja Female", sub:"Calm & Clear", flag:"🇳🇬", t:"0:11", url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"},
    {id:"pidgin", name:"Pidgin Narrator", sub:"Natural Pidgin", flag:"🇳🇬", t:"0:14", url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"},
    {id:"delta", name:"Delta", sub:"Warri Accent", flag:"🇳🇬", t:"0:13", url:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"},
  ];

  const togglePlay=(v:any)=>{
    Object.values(audios.current).forEach((a:any)=>{ if(a){ a.pause(); a.currentTime=0; }});
    if(playId===v.id){ setPlayId(null); return; }
    const a=new Audio(v.url); audios.current[v.id]=a; a.play(); setPlayId(v.id); a.onended=()=>setPlayId(null);
  };

  const payPro=()=>{
    // @ts-ignore
    if(typeof window!=="undefined" && window.PaystackPop){
      const key=process.env.NEXT_PUBLIC_PAYSTACK_KEY||"";
      if(!key){ alert("Add NEXT_PUBLIC_PAYSTACK_KEY in Render Env"); return; }
      // @ts-ignore
      window.PaystackPop.setup({key,email:"customer@mainnaijapidgin.com",amount:500000,currency:"NGN",ref:"MNPP_"+Date.now(),callback:(r:any)=>alert("Success "+r.reference)}).openIframe();
    } else { alert("Paystack loading... try again"); }
  };

  return (
  <div className="min-h-screen bg-[#060A06] flex justify-center">
   <div className="w-full max-w-[400px] px-4 py-6">
    {/* HEADER EXACT */}
    <div className="flex gap-3 mb-4">
      <div className="text-[#00C853] text-[32px] leading-none">🔌</div>
      <div><h1 className="text-[22px] font-black text-white leading-none">API <span className="text-[#00C853]">Marketplace</span></h1><p className="text-[11px] text-[#6B7280] mt-1">Authentic Naija Pidgin Voices & Datasets</p></div>
    </div>

    {/* LIVE API KEY - EXACT LIKE SCREENSHOT BUT NO sk_live */}
    <div className="bg-[#111811] border border-[#1F2F1F] rounded-2xl p-4 mb-3">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2 text-[12px] text-gray-300"><span className="w-5 h-5 rounded-full bg-[#1A1A1A] flex items-center justify-center text-[10px]">🔒</span> Live API Key</div>
        <div className="flex gap-2 items-center"><span className="text-[8px] font-bold px-2.5 py-1 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400">FREE PLAN</span><span className="text-[10px] text-[#00C853] font-bold flex items-center gap-1"><span className="w-2 h-2 bg-[#00C853] rounded-full animate-pulse inline-block"></span> LIVE</span></div>
      </div>
      <div onClick={copy} className="cursor-pointer bg-[#080C08] border border-[#1A2A1A] rounded-xl px-4 py-3 font-mono text-[12px] text-gray-500 blur-[3px] hover:blur-0 transition">{demoKey}</div>
      <div className="text-[9px] text-center text-gray-600 mt-2">{copyOk?"✅ Copied!":"Tap to copy"}</div>
    </div>

    {/* STATS - EXACT */}
    <div className="bg-[#111811] border border-[#1F2F1F] rounded-2xl p-3 mb-4 grid grid-cols-3 divide-x divide-[#1F2F1F]">
      <div className="flex items-center gap-2 px-2"><span className="text-[#00C853]">〰️</span><div><div className="font-black text-white">100</div><div className="text-[8px] text-gray-500 font-bold">FREE VOICES</div></div></div>
      <div className="flex items-center gap-2 px-3"><span className="text-[#00C853]">🗄️</span><div><div className="font-black text-white">3</div><div className="text-[8px] text-gray-500 font-bold">DATASETS</div></div></div>
      <div className="flex items-center gap-2 px-3"><span className="text-[#00C853]">〰️</span><div><div className="font-black text-white">99.9%</div><div className="text-[8px] text-gray-500 font-bold">UPTIME</div></div></div>
    </div>

    {/* PRICING - EXACT */}
    <div className="mb-4">
      <h2 className="text-[15px] font-black text-white">Pricing Plans</h2>
      <p className="text-[11px] text-gray-500 mb-3">Simple. Transparent. Powerful.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#111811] border border-[#1F2F1F] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2"><span className="w-7 h-7 rounded-lg bg-[#1A2A1A] flex items-center justify-center">🎁</span><span className="text-[#00C853] font-black">Starter</span></div>
          <div className="text-[12px] font-bold text-white">100 Voices Free</div>
          <div className="text-[10px] text-gray-500 mt-1">API Key included</div>
          <button onClick={copy} className="w-full mt-4 border border-[#00C853]/30 text-[#00C853] text-[11px] font-bold py-2.5 rounded-xl flex justify-center gap-2">Get Free Key <span>→</span></button>
        </div>
        <div className="relative bg-[#102214] border-2 border-[#00C853] rounded-2xl p-4 shadow-[0_0_20px_rgba(0,200,83,0.3)]">
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#00C853] text-black text-[7px] font-black px-2.5 py-1 rounded-full flex items-center gap-1"><span>★</span> MOST POPULAR</div>
          <div className="flex items-center gap-2 mb-1 mt-2"><span className="w-7 h-7 rounded-lg bg-[#00C853]/20 flex items-center justify-center">👑</span><span className="font-black text-white">Pro</span></div>
          <div className="text-[11px] text-gray-400">1,000 Voices</div>
          <div className="text-[22px] font-black text-[#00C853] mt-1">₦5,000</div>
          <div className="text-[10px] text-gray-500">Full API access</div>
          <button onClick={payPro} className="w-full mt-3 bg-[#00C853] text-black text-[11px] font-black py-2.5 rounded-xl flex justify-center gap-1">Buy with Paystack <span>🔒</span></button>
        </div>
      </div>
    </div>

    {/* PREVIEW VOICES - EXACT */}
    <div className="mb-4">
      <h2 className="text-[14px] font-black text-white flex items-center gap-2">Preview Voices</h2>
      <p className="text-[11px] text-gray-500 mb-3 flex items-center gap-1">🎧 Listen before you buy</p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {voices.map(v=>(
          <div key={v.id} className="min-w-[135px] bg-[#111811] border border-[#1F2F1F] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2"><span className="text-[14px]">{v.flag}</span><div><div className="text-[10px] font-bold text-white leading-none">{v.name}</div><div className="text-[8px] text-gray-500">{v.sub}</div></div></div>
            <div className="h-7 flex items-center gap-[2px] mb-2">{[5,8,4,9,6,7,4,8,6,5].map((h,i)=>(<div key={i} className={`w-[3px] rounded-full ${playId===v.id?"bg-[#00C853]":"bg-[#00C853]/60"}`} style={{height:h*2.2}}/>))}</div>
            <div className="flex justify-between items-center"><button onClick={()=>togglePlay(v)} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${playId===v.id?"bg-[#00C853] text-black":"bg-[#00C853]/20 text-[#00C853]"}`}>{playId===v.id?"⏸":"▶"}</button><span className="text-[10px] text-gray-500">{v.t}</span></div>
          </div>
        ))}
      </div>
    </div>

    <div className="flex justify-between items-center bg-[#111811] border border-[#1F2F1F] rounded-xl px-3 py-3 mb-4 text-[10px] text-gray-400"><span className="flex items-center gap-2"><span className="w-5 h-5 bg-[#1A1A1A] rounded-full flex items-center justify-center">🔒</span> Pay with Card or Bank Transfer via Paystack</span><span className="text-white font-black flex items-center gap-1"><span className="w-5 h-5 bg-white text-black rounded flex items-center justify-center font-black text-[10px]">P</span> paystack</span></div>

    <div className="grid grid-cols-[1.4fr_1fr] gap-3">
      <button onClick={()=>router.push("/worker")} className="bg-[#00C853] text-black font-black py-3.5 rounded-2xl text-[12px]">Start Building →</button>
      <button onClick={()=>router.push("/chairman")} className="border border-[#2A2A2A] bg-[#111811] text-white font-bold py-3.5 rounded-2xl text-[12px]">View Docs</button>
    </div>
   </div>
  </div>
  );
}