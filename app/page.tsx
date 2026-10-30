"use client";
import { useState, useEffect, useRef } from "react";

export default function ChairmanEmpire() {
  const [tab, setTab] = useState("overview");
  const [selectedLang, setSelectedLang] = useState("Pidgin");
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);
  const [earnings] = useState({ total: 45000, pending: 450, approved: 87 });
  const [toast, setToast] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);

  const allSentences: Record<string, string[]> = {
    Pidgin: [
      "Earn 1500 naira daily! Your voice na money! Record Pidgin for MayNaija!",
      "Omo no dull! Earn 1500 naira daily! Your accent na asset!",
      "Chairman dey find voices! Earn 1500 naira daily! Record once, collect daily!",
      "Naija talk, world listen! Join 500 workers wey dey earn 1500 daily!",
      "No laptop needed! Just your phone, your voice, earn 1500 daily!",
    ],
    Igbo: ["Kedu? Ana m abia ugbu a", "Biko nyere m aka"],
    Hausa: ["Yaya kake? Ina zuwa yanzu", "Don Allah ka taimake ni"],
    Yoruba: ["Bawo ni? Mo n bo nisisinyi", "Ejo e ran mi lowo"],
  };
  const sentences = allSentences[selectedLang];
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const files = JSON.parse(localStorage.getItem("gin_recordings") || "[]");
    setSavedFiles(files);
  }, [tab]);

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(null), 2500); }

  const toggleRecording = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); if(timerRef.current) clearInterval(timerRef.current); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      const chunks: Blob[] = [];
      mr.ondataavailable = e => chunks.push(e.data);
      mr.onstop = () => { setAudioURL(URL.createObjectURL(new Blob(chunks))); stream.getTracks().forEach(t=>t.stop()); };
      mr.start(); setIsRecording(true); setTimer(0);
      timerRef.current = setInterval(()=>setTimer(p=>p+1),1000);
    } catch { alert("Allow microphone!"); }
  };

  const saveAndNext = async () => {
    if (!audioURL) return;
    const blob = await fetch(audioURL).then(r=>r.blob());
    const reader = new FileReader();
    reader.onload = () => {
      const file = { id: Date.now(), lang: selectedLang, sentence: sentences[currentIdx], fileName: `recording-${selectedLang}-${Date.now()}.webm`, audioData: reader.result, time: new Date().toISOString() };
      const existing = JSON.parse(localStorage.getItem("gin_recordings")||"[]");
      existing.unshift(file);
      localStorage.setItem("gin_recordings", JSON.stringify(existing.slice(0,100)));
      setSavedFiles(existing.slice(0,100));
      setCurrentIdx((currentIdx+1)%sentences.length);
      setAudioURL(null); setTimer(0);
      showToast("SAVED - 30 naira earned!");
    };
    reader.readAsDataURL(blob);
  };

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      {toast && <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"#00E676", color:"black", padding:"10px 18px", borderRadius:20, fontSize:12, fontWeight:900, zIndex:100 }}>{toast}</div>}
      
      <div style={{ background:"black", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #1A2A1A" }}>
        <div><div style={{ fontWeight:900, fontSize:16 }}>MAIN NAIJA 👑</div><div style={{ fontSize:10, color:"#00E676" }}>CHAIRMAN EMPIRE • {savedFiles.length} FILES • ₦{earnings.total.toLocaleString()}</div></div>
        <div style={{ background:"#00E676", color:"black", fontSize:10, fontWeight:900, padding:"6px 10px", borderRadius:20 }}>LIVE</div>
      </div>

      <div style={{ display:"flex", gap:6, padding:10, background:"#0A0F0A", overflowX:"auto", position:"sticky", top:0, zIndex:10, borderBottom:"1px solid #1A2A1A" }}>
        {[
          { id:"overview", label:"📊 Overview" },
          { id:"workers", label:"👷 Workers" },
          { id:"market", label:"🛒 Market" },
          { id:"review", label:"🎙️ Review" },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"8px 14px", borderRadius:20, border:0, fontSize:11, fontWeight:800, whiteSpace:"nowrap", background: tab===t.id?"#00E676":"#1A2A1A", color: tab===t.id?"black":"#aaa" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ maxWidth:390, margin:"0 auto", padding:12, paddingBottom:80 }}>
        
        {tab==="overview" && (
          <>
            <div style={{ fontWeight:900, fontSize:18, marginBottom:2 }}>Good Morning, Chairman 👑</div>
            <div style={{ fontSize:11, color:"#888", marginBottom:14 }}>All-in-one empire • Workers + Market + Approval</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div style={{ background:"#121C12", padding:14, borderRadius:14, border:"1px solid #1E2F1E" }}><div style={{ fontSize:10, color:"#888" }}>Total Workers</div><div style={{ fontSize:22, fontWeight:900, color:"#00E676" }}>{savedFiles.length || 24}</div></div>
              <div style={{ background:"#121C12", padding:14, borderRadius:14, border:"1px solid #1E2F1E" }}><div style={{ fontSize:10, color:"#888" }}>Revenue</div><div style={{ fontSize:18, fontWeight:900 }}>₦{earnings.total.toLocaleString()}</div></div>
              <div style={{ background:"#121C12", padding:14, borderRadius:14, border:"1px solid #1E2F1E" }}><div style={{ fontSize:10, color:"#888" }}>Pending Review</div><div style={{ fontSize:22, fontWeight:900 }}>{savedFiles.length}</div></div>
              <div style={{ background:"#1A150A", padding:14, borderRadius:14, border:"1px solid #FFB300" }}><div style={{ fontSize:10, color:"#FFB300" }}>Files Saved</div><div style={{ fontSize:22, fontWeight:900 }}>{savedFiles.length}</div></div>
            </div>
            <div style={{ background:"#121C12", borderRadius:14, padding:14, marginTop:12, border:"1px solid #1E2F1E" }}>
              <div style={{ fontWeight:800, fontSize:12, marginBottom:10 }}>Recent Submissions</div>
              {savedFiles.slice(0,5).map((f:any)=>(
                <div key={f.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #1A2A1A" }}>
                  <div><div style={{ fontSize:12, fontWeight:700 }}>{f.fileName}</div><div style={{ fontSize:10, color:"#888" }}>{f.lang} • {f.sentence?.slice(0,30)}...</div></div>
                  <span style={{ fontSize:9, background:"#00E676", color:"black", padding:"4px 8px", borderRadius:10, height:18, fontWeight:800 }}>NEW</span>
                </div>
              ))}
              {savedFiles.length===0 && <div style={{ fontSize:11, color:"#666", textAlign:"center", padding:20 }}>No files yet - Start recording in Workers tab</div>}
            </div>
          </>
        )}

        {tab==="workers" && (
          <>
            <div style={{ display:"flex", gap:6, marginBottom:12 }}>
              {["Pidgin","Igbo","Hausa","Yoruba"].map(lang=>(
                <button key={lang} onClick={()=>setSelectedLang(lang)} style={{ flex:1, padding:"10px 0", borderRadius:20, fontSize:11, fontWeight:900, border: selectedLang===lang?"1.5px solid #00E676":"1px solid #2A3A2A", background: selectedLang===lang?"#00E676":"#222", color: selectedLang===lang?"black":"#aaa" }}>{lang}</button>
              ))}
            </div>

            <div style={{ background:"#111A11", border:"1px solid #1E2F1E", borderRadius:16, padding:14 }}>
              <div style={{ fontSize:11, fontWeight:800 }}>🎙️ Recording Studio - {selectedLang} - {currentIdx+1}/{sentences.length}</div>
              <div style={{ textAlign:"center", minHeight:48, display:"flex", alignItems:"center", justifyContent:"center", margin:"14px 0" }}><p style={{ fontSize:16, fontWeight:900, margin:0 }}>{sentences[currentIdx]}</p></div>
              
              <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
                <button onClick={toggleRecording} style={{ width:68, height:68, borderRadius:"50%", background: isRecording?"#CC0000":"#E53935", border:"4px solid #7f1d1d" }}>
                  {isRecording ? <div style={{ width:22, height:22, background:"white", borderRadius:3, margin:"auto" }}></div> : <div style={{ width:24, height:24, background:"#7f1d1d", borderRadius:"50%", margin:"auto" }}></div>}
                </button>
              </div>
              <div style={{ textAlign:"center", fontSize:11, color:"#ff5252", fontFamily:"monospace", fontWeight:700 }}>REC {String(Math.floor(timer/60)).padStart(2,"0")}:{String(timer%60).padStart(2,"0")} / 00:15</div>
              
              {audioURL && <audio controls src={audioURL} style={{ width:"100%", marginTop:12, height:32 }} />}
              
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <button onClick={()=>{setAudioURL(null); setTimer(0);}} style={{ flex:1, background:"#1E2F1E", border:"1px solid #2A4A2A", color:"#ccc", padding:13, borderRadius:12, fontSize:12, fontWeight:800 }}>↻ Re-record</button>
                <button onClick={saveAndNext} style={{ flex:1.5, background:"#00E676", color:"black", border:"none", padding:13, borderRadius:12, fontSize:12, fontWeight:900 }}>Save & Next →</button>
              </div>
            </div>

            <div style={{ background:"#121C12", border:"1px solid #1E2F1E", borderRadius:12, padding:10, marginTop:10 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"#00E676" }}>📂 {savedFiles.length} Files Saved for Chairman</div>
              {savedFiles.slice(0,10).map((f:any)=>(
                <div key={f.id} style={{ fontSize:9, color:"#aaa", padding:"6px 0", borderBottom:"1px solid #1A2A1A" }}>- {f.fileName} - {f.lang}</div>
              ))}
            </div>
          </>
        )}

        {tab==="market" && (
          <>
            <div style={{ background:"#121C12", borderRadius:14, padding:14, border:"1px solid #1E2F1E", marginBottom:12 }}>
              <div style={{ fontSize:20, fontWeight:900 }}>API Marketplace</div><div style={{ fontSize:11, color:"#888" }}>Paystack + Supabase • Auto credit active</div>
              <div style={{ marginTop:12, background:"#0F1A0F", border:"1.5px solid #00E676", borderRadius:12, padding:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#A5D6A7" }}>🔑 Your Live API Key</div>
                <div style={{ fontSize:13, fontWeight:900, color:"#00E676", fontFamily:"monospace", marginTop:6 }}>sk_live_•••••••••••</div>
                <div style={{ display:"flex", gap:12, fontSize:11, color:"#888", marginTop:8, borderTop:"1px solid #1E2F1E", paddingTop:8 }}><span><b style={{color:"white"}}>{100 - savedFiles.length}</b> Free Left</span><span><b style={{color:"white"}}>{earnings.approved}</b> Paid</span></div>
              </div>
            </div>

            <div style={{ fontSize:14, fontWeight:900, marginBottom:8 }}>Pricing Plans 🛡️ Paystack Secured</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div style={{ background:"#121C12", border:"1px solid #1E2F1E", borderRadius:12, padding:10 }}><div style={{ fontSize:11, fontWeight:800 }}>🎁 Starter</div><div style={{ fontSize:18, fontWeight:900, color:"#00E676" }}>100 FREE</div><div style={{ fontSize:10, color:"#888" }}>No card needed</div><button style={{ width:"100%", marginTop:10, background:"#00C853", color:"white", border:"none", padding:10, borderRadius:8, fontSize:11, fontWeight:800 }}>Get Free Key →</button></div>
              <div style={{ background:"#1A150A", border:"1px solid #FFB300", borderRadius:12, padding:10 }}><div style={{ display:"flex", justifyContent:"space-between" }}><div style={{ fontSize:11, fontWeight:800 }}>👑 Pro</div><div style={{ fontSize:7, background:"#3E3200", border:"1px solid #FFB300", color:"#FFB300", padding:"2px 6px", borderRadius:20, fontWeight:800 }}>MOST POPULAR</div></div><div style={{ fontSize:14, fontWeight:900, marginTop:4 }}>1,000 Voices</div><div style={{ fontSize:16, fontWeight:900 }}>₦5,000</div><button style={{ width:"100%", marginTop:8, background:"transparent", border:"1px solid #FFB300", color:"white", padding:9, borderRadius:8, fontSize:10, fontWeight:800 }}>Buy with Paystack</button></div>
              <div style={{ background:"#121C12", borderRadius:12, padding:10, border:"1px solid #1E2F1E" }}><div style={{ fontSize:11, fontWeight:800 }}>🚀 Growth</div><div style={{ fontSize:14, fontWeight:900, marginTop:4 }}>2,000 Voices</div><div style={{ fontSize:16, fontWeight:900 }}>₦10,000</div><button style={{ width:"100%", marginTop:8, background:"transparent", border:"1px solid #FFB300", color:"white", padding:9, borderRadius:8, fontSize:10, fontWeight:800 }}>Buy with Paystack</button></div>
              <div style={{ background:"#121C12", borderRadius:12, padding:10, border:"1px solid #1E2F1E" }}><div style={{ fontSize:11, fontWeight:800 }}>🏢 Scale</div><div style={{ fontSize:14, fontWeight:900, marginTop:4 }}>10,000 Voices</div><div style={{ fontSize:16, fontWeight:900 }}>₦50,000</div><button style={{ width:"100%", marginTop:8, background:"transparent", border:"1px solid #FFB300", color:"white", padding:9, borderRadius:8, fontSize:10, fontWeight:800 }}>Buy with Paystack</button></div>
            </div>
          </>
        )}

        {tab==="review" && (
          <>
            <div style={{ fontWeight:800, fontSize:16, marginBottom:12 }}>🎙️ Chairman Review - {savedFiles.length} recordings</div>
            {savedFiles.map((f:any)=>(
              <div key={f.id} style={{ background:"white", color:"black", borderRadius:14, padding:14, marginBottom:10 }}>
                <div style={{ fontWeight:800, fontSize:13 }}>{f.fileName}</div>
                <div style={{ fontSize:11, color:"#666", marginBottom:6 }}>{f.lang} • {f.sentence}</div>
                {f.audioData && <audio controls src={f.audioData} style={{ width:"100%", height:32 }} />}
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button onClick={()=>{ setSavedFiles(savedFiles.filter((x:any)=>x.id!==f.id)); localStorage.setItem("gin_recordings", JSON.stringify(savedFiles.filter((x:any)=>x.id!==f.id))); showToast("Approved!"); }} style={{ flex:1, padding:10, borderRadius:10, border:0, background:"black", color:"white", fontWeight:800, fontSize:12 }}>✅ Approve</button>
                  <button onClick={()=>{ setSavedFiles(savedFiles.filter((x:any)=>x.id!==f.id)); localStorage.setItem("gin_recordings", JSON.stringify(savedFiles.filter((x:any)=>x.id!==f.id))); showToast("Rejected"); }} style={{ flex:1, padding:10, borderRadius:10, border:0, background:"#fee2e2", color:"#991b1b", fontWeight:800, fontSize:12 }}>❌ Reject</button>
                </div>
              </div>
            ))}
            {savedFiles.length===0 && <div style={{ textAlign:"center", padding:40, background:"#121C12", borderRadius:14, color:"#666" }}>No recordings yet 🎉</div>}
          </>
        )}
      </div>
    </div>
  );
}