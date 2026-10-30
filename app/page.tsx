"use client";
import { useState, useEffect, useRef } from "react";

export default function ChairmanPanel() {
  const [tab, setTab] = useState("overview");
  const [lang, setLang] = useState("Pidgin");
  const [recordings, setRecordings] = useState<any[]>([]);
  const [isRec, setIsRec] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [idx, setIdx] = useState(0);
  const [toast, setToast] = useState("");

  const mrRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);

  const sentences: any = {
    Pidgin: [
      "Earn 1500 naira daily! Your voice na money!",
      "Fifteen seconds equals daily cash!",
      "Omo no dull! Earn 1500 daily!",
    ],
    Igbo: ["Kedu? Ana m abia ugbu a", "Biko nyere m aka"],
    Hausa: ["Yaya kake? Ina zuwa yanzu"],
    Yoruba: ["Bawo ni? Mo n bo nisisinyi"],
  };

  // SAFE LOAD - NO CUT
  useEffect(() => {
    try {
      const k = "gin_recordings";
      const raw = localStorage.getItem(k);
      if (raw) {
        const data = JSON.parse(raw);
        setRecordings(data);
      }
    } catch {
      setRecordings([]);
    }
  }, [tab]);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };

  const toggleRec = async () => {
    if (isRec) {
      mrRef.current?.stop();
      setIsRec(false);
      clearInterval(timerRef.current);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mrRef.current = mr;
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks);
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsRec(true);
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((p) => p + 1), 1000);
    } catch {
      alert("Allow mic");
    }
  };

  const saveNext = async () => {
    if (!audioURL) return;
    const blob = await fetch(audioURL).then((r) => r.blob());
    const reader = new FileReader();
    reader.onload = () => {
      const k = "gin_recordings";
      const raw = localStorage.getItem(k);
      const all = raw ? JSON.parse(raw) : [];
      const file = {
        id: Date.now(),
        lang,
        sentence: sentences[lang][idx],
        fileName: "rec-" + lang + "-" + Date.now() + ".webm",
        audioData: reader.result,
        time: new Date().toISOString(),
      };
      all.unshift(file);
      localStorage.setItem(k, JSON.stringify(all.slice(0, 100)));
      setRecordings(all.slice(0, 100));
      setIdx((idx + 1) % sentences[lang].length);
      setAudioURL(null);
      setTimer(0);
      showToast("SAVED - " + file.fileName);
    };
    reader.readAsDataURL(blob);
  };

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#00E676", color: "black", padding: "10px 18px", borderRadius: 20, fontSize: 12, fontWeight: 900, zIndex: 100 }}>{toast}</div>}

      <div style={{ background: "#050A05", borderBottom: "2px solid #1A231A", padding: 12, position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900 }}>MAIN NAIJA - CHAIRMAN - {recordings.length} FILES</div>
          <div style={{ background: "#00E676", color: "black", fontSize: 10, fontWeight: 900, padding: "6px 10px", borderRadius: 20 }}>LIVE</div>
        </div>
      </div>

      <div style={{ background: "#0A0F0A", display: "flex", gap: 6, padding: 10, overflowX: "auto", borderBottom: "1px solid #1A2A1A" }}>
        <button onClick={() => setTab("overview")} style={{ padding: "9px 14px", borderRadius: 20, background: tab === "overview" ? "#00E676" : "#1A2A1A", color: tab === "overview" ? "black" : "#aaa", fontWeight: 900, border: 0 }}>Overview</button>
        <button onClick={() => setTab("workers")} style={{ padding: "9px 14px", borderRadius: 20, background: tab === "workers" ? "#00E676" : "#1A2A1A", color: tab === "workers" ? "black" : "#aaa", fontWeight: 900, border: 0 }}>Workers</button>
        <button onClick={() => setTab("market")} style={{ padding: "9px 14px", borderRadius: 20, background: tab === "market" ? "#00E676" : "#1A2A1A", color: tab === "market" ? "black" : "#aaa", fontWeight: 900, border: 0 }}>Market</button>
        <button onClick={() => setTab("review")} style={{ padding: "9px 14px", borderRadius: 20, background: tab === "review" ? "#00E676" : "#1A2A1A", color: tab === "review" ? "black" : "#aaa", fontWeight: 900, border: 0 }}>Review ({recordings.length})</button>
      </div>

      <div style={{ maxWidth: 400, margin: "0 auto", padding: 12 }}>
        {tab === "overview" && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Good Morning, Chairman 👑</div>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 14 }}>{recordings.length} recordings found</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: "#121C12", padding: 14, borderRadius: 12 }}><div style={{ fontSize: 10, color: "#888" }}>Total Files</div><div style={{ fontSize: 22, fontWeight: 900, color: "#00E676" }}>{recordings.length}</div></div>
              <div style={{ background: "#1A150A", padding: 14, borderRadius: 12 }}><div style={{ fontSize: 10, color: "#FFB300" }}>Revenue</div><div style={{ fontSize: 18, fontWeight: 900 }}>₦45,000</div></div>
            </div>
          </div>
        )}

        {tab === "workers" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {["Pidgin", "Igbo", "Hausa", "Yoruba"].map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{ flex: 1, padding: 10, borderRadius: 20, background: lang === l ? "#00E676" : "#222", color: lang === l ? "black" : "#aaa", fontWeight: 900, border: 0 }}>{l}</button>
              ))}
            </div>
            <div style={{ background: "#111A11", borderRadius: 16, padding: 14, border: "1px solid #1E2F1E" }}>
              <div style={{ fontSize: 18, fontWeight: 900, textAlign: "center", margin: "14px 0" }}>{sentences[lang][idx]}</div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button onClick={toggleRec} style={{ width: 72, height: 72, borderRadius: "50%", background: isRec ? "#CC0000" : "#E53935", border: "4px solid #7f1d1d" }}>{isRec ? "■" : "●"}</button>
              </div>
              <div style={{ textAlign: "center", marginTop: 8 }}>REC {timer}s</div>
              {audioURL && <audio controls src={audioURL} style={{ width: "100%", marginTop: 12 }} />}
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={() => { setAudioURL(null); setTimer(0); }} style={{ flex: 1, padding: 13, borderRadius: 12, background: "#1E2F1E", color: "white", border: 0 }}>Re-record</button>
                <button onClick={saveNext} style={{ flex: 1.5, padding: 13, borderRadius: 12, background: "#00E676", color: "black", fontWeight: 900, border: 0 }}>Save & Next</button>
              </div>
            </div>
          </div>
        )}

        {tab === "market" && (
          <div>
            <div style={{ background: "#121C12", padding: 12, borderRadius: 12, border: "1px solid #00E676" }}>API Key: sk_live_... (100 FREE left)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <div style={{ background: "#121C12", padding: 10, borderRadius: 12 }}><div>Starter</div><div style={{ color: "#00E676", fontWeight: 900 }}>100 FREE</div><button onClick={() => showToast("Key copied!")} style={{ width: "100%", marginTop: 8, background: "#00C853", border: 0, padding: 10, borderRadius: 8, color: "white" }}>Get Key</button></div>
              <div style={{ background: "#1A150A", padding: 10, borderRadius: 12, border: "1px solid #FFB300" }}><div>Pro - ₦5,000</div><button onClick={() => showToast("Paystack")} style={{ width: "100%", marginTop: 8, border: "1px solid #FFB300", background: "transparent", padding: 9, borderRadius: 8, color: "white" }}>Buy</button></div>
            </div>
            <div style={{ marginTop: 14 }}>
              {recordings.map((r: any) => (
                <div key={r.id} style={{ background: "#121C12", padding: 10, borderRadius: 10, marginTop: 6 }}>
                  <div style={{ fontSize: 11 }}>{r.fileName}</div>
                  {r.audioData && <audio controls src={r.audioData} style={{ width: "100%", height: 28 }} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "review" && (
          <div>
            {recordings.map((f: any) => (
              <div key={f.id} style={{ background: "white", color: "black", borderRadius: 14, padding: 14, marginBottom: 10 }}>
                <div style={{ fontWeight: 800, fontSize: 12 }}>{f.fileName}</div>
                {f.audioData && <audio controls src={f.audioData} style={{ width: "100%", height: 30, marginTop: 6 }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}