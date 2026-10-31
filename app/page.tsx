"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function WorkerDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState("Pidgin");
  const [showModal, setShowModal] = useState<string | null>(null);
  const [activeBottom, setActiveBottom] = useState("Levels");
  const [earnings, setEarnings] = useState({ total: 1760, pending: 960, approved: 104 });
  const [taskProgress, setTaskProgress] = useState({ total: 63, today: 30 });
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankDetails, setBankDetails] = useState({ fullName: "", phone: "", bankName: "Opay", accountNumber: "", accountName: "" });
  // 📢 FIX - ANNOUNCEMENT BOARD WITH COUNT
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const allSentences: Record<string, string[]> = {
    Pidgin: ["How you dey? I dey come now","Abeg help me, I no sabi road","Wetin dey happen for here?","I wan chop, I dey hungry","Good morning, how your night be?","How far? Make we go together","No vex, traffic hold me for road","Wetin you talk? Repeat am again","My name na Emeka, I dey stay Lagos","I dey go market now, you dey come?","Omo this Naija sun too hot today","Abeg shift small, make I pass","I don tire, work too much today","Shey you don chop? Food don ready","For inside this life, na patience","You sabi this place? I be new here","Come make we gist small","I wan buy fuel, where station dey?","NEPA don take light again","How your family? Dem dey fine?"],
    Igbo: ["Kedu ka i mere?","Ana m abia ugbu a","Biko nyere m aka","Kedu ihe na eme?","Ututu oma"],
    Hausa: ["Yaya kake? Ina kwana?","Ina zuwa yanzu","Don Allah ka taimake ni","Me ke faruwa?","Ina jin yunwa"],
    Yoruba: ["Bawo ni? Mo wa daadaa","Mo n bo nisisinyi","Ejo e ran mi lowo","Kini n sele?","Ebi n pa mi"],
  };

  const sentences = allSentences[selectedLang];

  useEffect(() => {
    const saved = localStorage.getItem("naija_progress");
    if (saved) { try { const p = JSON.parse(saved); setTaskProgress(p.progress); setEarnings(p.earnings); setCurrentSentenceIndex(p.index||0); } catch {} }
    const savedBank = localStorage.getItem("gin_bank");
    if (savedBank) { try { setBankDetails(JSON.parse(savedBank)); } catch {} }
    // Load announcements for count button - 1 msg=1, 2 msgs=2
    const fetchAnn = async () => {
      try {
        const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20);
        if (data) {
          setAnnouncements(data);
          const read = JSON.parse(localStorage.getItem("gin_read_ann") || "[]");
          const unread = data.filter((a:any) => !read.includes(a.id)).length;
          setUnreadCount(unread);
        }
      } catch {}
    };
    fetchAnn();
    const id = setInterval(fetchAnn, 30000);
    return () => clearInterval(id);
  }, []);

  const showToastMsg = (msg: string) => { setToast(msg); setTimeout(()=>setToast(null), 3000); };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      let mime = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mime = "audio/webm;codecs=opus";
      else if (MediaRecorder.isTypeSupported("audio/mp4")) mime = "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        console.log("Recording done, url:", url, "size:", blob.size);
        setAudioURL(url);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setAudioURL(null);
      setTimer(0);
      timerRef.current = setInterval(() => {
        setTimer((p) => {
          if (p >= 14) {
            mr.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
            return 15;
          }
          return p + 1;
        });
      }, 1000);
    } catch (e) { alert("Abeg allow microphone! Go phone settings allow mic for Chrome"); console.log(e); }
  };

  const formatTime = (s: number) => { const m = Math.floor(s/60).toString().padStart(2,"0"); const sec = (s%60).toString().padStart(2,"0"); return `${m}:${sec}`; };
  const reRecord = () => { if (isRecording) { mediaRecorderRef.current?.stop(); setIsRecording(false); } setAudioURL(null); setTimer(0); if (timerRef.current) clearInterval(timerRef.current); };

    const saveAndNext = async () => {
    console.log("Save clicked, audioURL:", audioURL, "timer:", timer);
    if (!audioURL) { showToastMsg("⚠️ Record first! Click red button and talk"); return; }
    if (taskProgress.today >= 50) { showToastMsg("You don finish 50 today!"); return; }
    setIsUploading(true);
    try {
      const blob = await fetch(audioURL).then(r => r.blob());
      const fileName = `WORKER-1234/${selectedLang}_${Date.now()}.webm`;
      if (supabaseUrl && supabaseKey && !supabaseUrl.includes("YOUR_PROJECT") && supabaseUrl.startsWith("https")) {
        showToastMsg("Uploading to Supabase... ⏳");
        const { error: upErr } = await supabase.storage.from("voice-clips").upload(fileName, blob, { contentType: "audio/webm" });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("voice-clips").getPublicUrl(fileName);
        const { error: dbErr } = await supabase.from("recordings").insert([{ language: selectedLang, text: sentences[currentSentenceIndex], audio_url: urlData.publicUrl, file_name: fileName, duration: timer, earnings: 10, worker_id: "WORKER-1234", status: "pending", is_approved: false }]);
        if (dbErr) throw dbErr;
      }
      const newEarnings = { total: earnings.total, pending: earnings.pending, approved: earnings.approved };
      const newProgress = { total: taskProgress.total + 1, today: taskProgress.today + 1 };
      const nextIndex = (currentSentenceIndex + 1) % sentences.length;
      setEarnings(newEarnings); 
      setTaskProgress(newProgress); 
      setCurrentSentenceIndex(nextIndex);
      localStorage.setItem("naija_progress", JSON.stringify({ progress: newProgress, earnings: newEarnings, index: nextIndex }));
      
      // ✅ GREEN GO COMOT HERE!
      setAudioURL(null); 
      setTimer(0);
      setIsPlaying(false);
      setIsRecording(false);
      
      showToastMsg(`✅ SAVED! ${newProgress.today}/50 today - Wait Chairman approve!`);
    } catch (err: any) {
      console.error(err);
      showToastMsg("❌ Save fail: " + err.message);
      setAudioURL(null);
      setTimer(0);
      setIsPlaying(false);
      setIsRecording(false);
    } finally { 
      setIsUploading(false); 
    }
  };

  // FIXED - WITHDRAW NOW CHECK BANK DETAILS FIRST
  const handleBottomClick = (id: string, label: string) => {
    if (id === "withdraw") {
      const savedBank = localStorage.getItem("gin_bank");
      if (!savedBank || JSON.parse(savedBank).accountNumber === "") {
        setShowBankForm(true);
      } else {
        setBankDetails(JSON.parse(savedBank));
        setActiveBottom(label);
        setShowModal(id);
      }
    } else {
      setActiveBottom(label);
      setShowModal(id);
    }
  };

  const saveBankAndContinue = async () => {
    if (!bankDetails.accountNumber || !bankDetails.accountName) { alert("Fill account number and account name"); return; }
    localStorage.setItem("gin_bank", JSON.stringify(bankDetails));
    try { await supabase.from("workers").upsert([{ worker_id: "WORKER-1234", full_name: bankDetails.fullName, phone: bankDetails.phone, bank_name: bankDetails.bankName, account_number: bankDetails.accountNumber, account_name: bankDetails.accountName }], { onConflict: "worker_id" }); } catch {}
    setShowBankForm(false);
    setActiveBottom("Withdraw");
    setShowModal("withdraw");
    showToastMsg("✅ Bank saved!");
  };

  const markAnnRead = () => {
    localStorage.setItem("gin_read_ann", JSON.stringify(announcements.map((a:any)=>a.id)));
    setUnreadCount(0);
    setShowAnnouncement(false);
  };

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#00E676", color: "black", padding: "10px 18px", borderRadius: 20, fontSize: 12, fontWeight: 900, zIndex: 100, maxWidth: 300, textAlign: "center" }}>{toast}</div>}
      <div style={{ maxWidth: 390, margin: "0 auto", padding: 10, paddingBottom: 90 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><div><div style={{ display: "flex", gap: 8 }}><h1 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Worker Dashboard</h1><span>🇳🇬</span></div><div style={{ fontSize: 11, color: "#aaa" }}>Welcome, WORKER-1234 <span style={{ color: "#00E676", fontSize: 10 }}> ● Online</span></div></div><div style={{ width: 10, height: 10, background: "#00E676", borderRadius: 50 }}></div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0B1A0B", border: "1px solid #1E2F1E", borderRadius: 20, padding: "8px 10px", marginBottom: 10 }}><div style={{ width: 36, height: 36, background: "#00E676", color: "#000", borderRadius: 50, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>W</div><div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 800 }}>WORKER-1234</div><div style={{ fontSize: 9, color: "#888" }}>Location: Lagos • Accent: Lagos Pidgin</div></div><div style={{ background: "#1A2F1A", border: "1px solid #00E676", color: "#00E676", fontSize: 9, fontWeight: 800, padding: "4px 8px", borderRadius: 12 }}>★ Pro Level</div></div>

        {/* 📢 FIXED ANNOUNCEMENT BOARD - BUTTON WITH COUNT */}
        <button onClick={() => setShowAnnouncement(true)} style={{ width: "100%", background: "#0F1F0F", border: "1.5px solid #FFC107", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "#FFC107", width: 32, height: 32, borderRadius: 50, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>📢{unreadCount>0 && <div style={{ position: "absolute", top: -6, right: -6, background: "#E53935", color: "white", fontSize: 9, fontWeight: 900, width: 16, height: 16, borderRadius: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>{unreadCount}</div>}</div>
            <div style={{ textAlign: "left" }}><div style={{ fontSize: 12, fontWeight: 900, color: "white" }}>Announcement Board</div><div style={{ fontSize: 9, color: "#aaa" }}>{unreadCount>0 ? `🔴 ${unreadCount} new message${unreadCount>1?'s':''} - Click to read` : announcements.length>0 ? `✅ ${announcements.length} message${announcements.length>1?'s':''} - Check your message` : "✅ Check your message"}</div></div>
          </div>
          <div style={{ background: unreadCount>0 ? "#FFC107" : "#1E2F1E", color: unreadCount>0 ? "black" : "#FFC107", padding: "4px 8px", borderRadius: 10, fontSize: 10, fontWeight: 900 }}>{unreadCount>0 ? `${unreadCount} new` : "Open →"}</div>
        </button>

        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>{["Pidgin","Igbo","Hausa","Yoruba"].map(lang=><button key={lang} onClick={()=>setSelectedLang(lang)} style={{ flex: 1, padding: "10px 0", borderRadius: 20, fontSize: 11, fontWeight: 900, border: selectedLang===lang?"1.5px solid #00E676":"1px solid #2A3A2A", background: selectedLang===lang?"#00E676":"#222", color: selectedLang===lang?"black":"#aaa" }}>{lang}</button>)}</div>
        <div style={{ marginTop: 14 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, fontWeight: 800 }}>Main Task Workspace</span><span style={{ fontSize: 10, color: "#888" }}>{taskProgress.total}/500 Total | Today {taskProgress.today}/50</span></div><div style={{ width: "100%", height: 6, background: "#1A2A1A", borderRadius: 10, marginTop: 4 }}><div style={{ width: `${(taskProgress.total/500)*100}%`, height: "100%", background: "#00E676" }}></div></div><div style={{ textAlign: "right", fontSize: 9, color: "#00E676", marginTop: 2 }}>Today: {taskProgress.today} / 50 ↗</div></div>
        <div style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: 16, padding: 14, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}><span style={{ fontSize: 11, fontWeight: 800 }}>🎙️ Recording Studio</span><span style={{ fontSize: 10, color: "#888" }}> - {selectedLang} - {currentSentenceIndex+1}/{sentences.length}</span></div>
          <div style={{ textAlign: "center", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}><p style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>{sentences[currentSentenceIndex]}</p></div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><button onClick={toggleRecording} disabled={isUploading} style={{ width: 72, height: 72, borderRadius: 50, background: isRecording?"#CC0000":"#E53935", border: "4px solid #7f1d1d", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isRecording ? "0 0 20px #FF0000" : "none" }}>{isRecording ? <div style={{ width: 22, height: 22, background: "white", borderRadius: 3 }}></div> : <div style={{ width: 26, height: 26, background: "#7f1d1d", borderRadius: 50 }}></div>}</button></div>
          <div style={{ textAlign: "center", fontSize: 13, color: "#ff5252", fontFamily: "monospace", fontWeight: 700, marginBottom: 6 }}>{formatTime(timer)} / 00:15</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><div style={{ width: 28, height: 28, borderRadius: 50, background: "#1A2F1A", display: "flex", alignItems: "center", justifyContent: "center" }}>▶</div><div style={{ flex: 1, height: 22, display: "flex", alignItems: "center", gap: 2 }}>{Array.from({ length: 30 }).map((_, i) => (<div key={i} style={{ flex: 1, height: isRecording || audioURL ? `${4 + Math.random()*18}px` : "3px", background: audioURL ? "#00E676" : isRecording ? "#FF5555" : "#1E2F1E", borderRadius: 2 }} />))}</div><div style={{ width: 60, height: 4, background: "#1E2F1E", borderRadius: 10 }}><div style={{ width: `${(timer/15)*100}%`, height: "100%", background: "#00E676", borderRadius: 10 }}></div></div></div>
          {audioURL && <audio controls src={audioURL} style={{ width: "100%", margin: "8px 0", height: 32 }} />}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reRecord} disabled={isUploading} style={{ flex: 1, background: "#1E2F1E", border: "1px solid #2A4A2A", color: "#ccc", padding: 13, borderRadius: 12, fontSize: 12, fontWeight: 800 }}>↻ Re-record</button>
            <button onClick={saveAndNext} disabled={isUploading} style={{ flex: 1.5, background: isUploading ? "#FFC107" : audioURL ? "#00E676" : "#333", color: audioURL ? "black" : "#888", border: "none", padding: 13, borderRadius: 12, fontSize: 12, fontWeight: 900 }}>{isUploading ? "⏳ Uploading..." : audioURL ? "✅ Save & Next →" : "Save & Next"}</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 12 }}>
          <div onClick={()=>setShowModal("earnings")} style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 9, color: "#888" }}>💳 Earnings</div><div style={{ fontSize: 16, fontWeight: 900, color: "#00E676" }}>₦{earnings.total.toLocaleString()}</div></div>
          <div onClick={()=>setShowModal("pending")} style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 9, color: "#FFC107" }}>🕐 Pending</div><div style={{ fontSize: 16, fontWeight: 900, color: "#FFC107" }}>₦{earnings.pending}</div></div>
          <div onClick={()=>setShowModal("approved")} style={{ background: "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: 10 }}><div style={{ fontSize: 9, color: "#888" }}>✅ Approved</div><div style={{ fontSize: 16, fontWeight: 900 }}>{earnings.approved} clips</div></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>{[{ label: "Earnings", icon: "📊", id: "earnings" },{ label: "Levels", icon: "👑", id: "levels", active: true },{ label: "Withdraw", icon: "💳", id: "withdraw" }].map(item=><button key={item.id} onClick={()=>handleBottomClick(item.id, item.label)} style={{ background: item.active || activeBottom===item.label ? "#00E676" : "#121C12", border: "1px solid #1E2F1E", borderRadius: 12, padding: "12px 4px", color: item.active || activeBottom===item.label ? "#000" : "#888", fontWeight: 800, fontSize: 12 }}>{item.icon} {item.label}</button>)}</div>
      </div>

      {/* 📢 ANNOUNCEMENT POPUP - SAME PATTERN LIKE BANK DETAILS */}
      {showAnnouncement && (
        <div style={{ position: "fixed", inset: 0, background: "#000000DD", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 60 }}>
          <div style={{ background: "#0F1F0F", border: "1.5px solid #FFC107", borderRadius: 16, padding: 16, width: "100%", maxWidth: 360, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div style={{ fontSize: 16, fontWeight: 900 }}>📢 Announcements ({announcements.length})</div><button onClick={() => setShowAnnouncement(false)} style={{ background: "#1E2F1E", border: "none", color: "white", width: 28, height: 28, borderRadius: 50 }}>✕</button></div>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 10 }}>Check your message - if 1 message enter show 1, if 2 enter show 2 like button you want</div>
            {announcements.length===0 && <div style={{ textAlign: "center", padding: 20, color: "#888", fontSize: 12 }}>No message yet - Chairman go send here!</div>}
            {announcements.map((a:any) => (<div key={a.id} style={{ background: "#111A11", border: "1px solid #1E2F1E", borderRadius: 10, padding: 10, marginBottom: 8 }}><div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: 12, fontWeight: 800 }}>{a.title}</div><div style={{ fontSize: 8, color: "#888" }}>{new Date(a.created_at).toLocaleDateString()}</div></div><div style={{ fontSize: 11, color: "#ccc", marginTop: 6 }}>{a.message}</div></div>))}
            <button onClick={markAnnRead} style={{ width: "100%", background: "#FFC107", border: "none", borderRadius: 10, padding: 12, fontWeight: 900, fontSize: 13, marginTop: 8, color: "black" }}>👇 Mark as Read - Close (Go Down)</button>
          </div>
        </div>
      )}

      {/* 🏦 FIXED ACCOUNT DETAILS */}
      {showBankForm && (
        <div style={{ position: "fixed", inset: 0, background: "#000000DD", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 70 }}>
          <div style={{ background: "#0F1F0F", border: "1.5px solid #00E676", borderRadius: 16, padding: 16, width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><b>🏦 Add Account Details</b><button onClick={()=>setShowBankForm(false)} style={{ background: "#1E2F1E", border: "none", color: "white", width: 28, height: 28, borderRadius: 50 }}>✕</button></div>
            <div style={{ fontSize: 10, color: "#888", marginBottom: 10 }}>Chairman go see am for Supabase to pay you</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input placeholder="Full Name" value={bankDetails.fullName} onChange={e=>setBankDetails({...bankDetails, fullName: e.target.value})} style={{ background: "#1A2A1A", border: "1px solid #2A4A2A", borderRadius: 10, padding: 12, color: "white" }} />
              <input placeholder="Phone" value={bankDetails.phone} onChange={e=>setBankDetails({...bankDetails, phone: e.target.value})} style={{ background: "#1A2A1A", border: "1px solid #2A4A2A", borderRadius: 10, padding: 12, color: "white" }} />
              <select value={bankDetails.bankName} onChange={e=>setBankDetails({...bankDetails, bankName: e.target.value})} style={{ background: "#1A2A1A", border: "1px solid #2A4A2A", borderRadius: 10, padding: 12, color: "white" }}>
                <option>Opay</option><option>Moniepoint</option><option>PalmPay</option><option>Kuda</option><option>First Bank</option><option>GTB</option><option>Access</option><option>UBA</option><option>Zenith</option>
              </select>
              <input placeholder="Account Number" value={bankDetails.accountNumber} onChange={e=>setBankDetails({...bankDetails, accountNumber: e.target.value})} style={{ background: "#1A2A1A", border: "1px solid #2A4A2A", borderRadius: 10, padding: 12, color: "white" }} />
              <input placeholder="Account Name" value={bankDetails.accountName} onChange={e=>setBankDetails({...bankDetails, accountName: e.target.value})} style={{ background: "#1A2A1A", border: "1px solid #2A4A2A", borderRadius: 10, padding: 12, color: "white" }} />
              <button onClick={saveBankAndContinue} style={{ background: "#00E676", border: "none", borderRadius: 10, padding: 12, fontWeight: 900, marginTop: 4, color: "black" }}>💾 Save & Continue to Withdraw</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div onClick={()=>setShowModal(null)} style={{ position: "fixed", inset: 0, background: "#000000BB", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background: "#0F1F0F", border: "1px solid #1E2F1E", borderRadius: 16, padding: 20, width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><b style={{ textTransform: "capitalize" }}>{showModal}</b><button onClick={()=>setShowModal(null)} style={{ background: "none", border: "none", color: "#888", fontSize: 18 }}>✕</button></div>
            {showModal==="earnings" && <div><div style={{ fontSize: 28, fontWeight: 900, color: "#00E676" }}>₦{earnings.total.toLocaleString()}</div><div style={{ fontSize: 10, color: "#888", marginTop: 8, background: "#1A2A1A", padding: 8, borderRadius: 8 }}>Bank: {bankDetails.bankName} - {bankDetails.accountNumber || "Not set - Click Withdraw to add"}</div></div>}
            {showModal==="pending" && <div><div style={{ fontSize: 28, fontWeight: 900, color: "#FFC107" }}>₦{earnings.pending}</div></div>}
            {showModal==="approved" && <div><div style={{ fontSize: 28, fontWeight: 900 }}>{earnings.approved} clips</div></div>}
            {showModal==="withdraw" && <div><div style={{ fontSize: 12, color: "#888" }}>Available to withdraw</div><div style={{ fontSize: 28, fontWeight: 900 }}>₦{earnings.total}</div><div style={{ fontSize: 10, color: "#aaa", background: "#1A2A1A", padding: 8, borderRadius: 8, marginTop: 8 }}>To: {bankDetails.bankName} - {bankDetails.accountNumber}<br/>{bankDetails.accountName}</div><button style={{ marginTop: 12, background: "#00E676", border: "none", borderRadius: 10, padding: "12px 20px", fontWeight: 900, width: "100%" }}>Withdraw ₦{earnings.total}</button><button onClick={()=>{ setShowModal(null); setShowBankForm(true); }} style={{ marginTop: 8, background: "#1A2A1A", border: "1px solid #2A4A2A", borderRadius: 10, padding: "10px 20px", width: "100%", color: "#aaa", fontSize: 11 }}>✏️ Change Account</button></div>}
            {showModal==="levels" && <div style={{ color: "#888", fontSize: 13 }}>Pro Level - {taskProgress.total}/500 - Today {taskProgress.today}/50<br/>Bank: {bankDetails.accountNumber ? "✅ Saved" : "❌ Not saved - Click Withdraw"}</div>}
          </div>
        </div>
      )}
    </div>
  );
}