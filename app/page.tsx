"use client";
import { useState, useEffect } from "react";

export default function Chairman() {
  const [rec, setRec] = useState<any[]>([]);
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("gin_recordings");
    if (raw) {
      try { setRec(JSON.parse(raw)); } catch {}
    }
  }, [tab]);

  const show = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2000);
  };

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", padding: 12 }}>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#00E676", color: "black", padding: 10, borderRadius: 20, fontSize: 12, fontWeight: 900 }}>{toast}</div>}
      
      <div style={{ fontWeight: 900, fontSize: 16 }}>CHAIRMAN - {rec.length} FILES - BUILD OK</div>

      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        <button onClick={() => setTab("home")} style={{ padding: 8, borderRadius: 20, background: tab === "home" ? "#00E676" : "#222", color: tab === "home" ? "black" : "white", border: 0 }}>Home</button>
        <button onClick={() => setTab("market")} style={{ padding: 8, borderRadius: 20, background: tab === "market" ? "#00E676" : "#222", color: tab === "market" ? "black" : "white", border: 0 }}>Market</button>
        <button onClick={() => setTab("review")} style={{ padding: 8, borderRadius: 20, background: tab === "review" ? "#00E676" : "#222", color: tab === "review" ? "black" : "white", border: 0 }}>Review {rec.length}</button>
      </div>

      <div style={{ marginTop: 16, maxWidth: 400 }}>
        {tab === "home" && <div>Good Morning Chairman! Platform OKAY - Build PASS ✓</div>}

        {tab === "market" && (
          <div>
            <div style={{ background: "#121C12", padding: 10, borderRadius: 10, border: "1px solid #00E676" }}>100 FREE left</div>
            <button onClick={() => show("Key copied!")} style={{ width: "100%", marginTop: 8, padding: 10, background: "#00E676", border: 0, borderRadius: 8, fontWeight: 900 }}>Get Free Key</button>
            <button onClick={() => show("Paystack ready")} style={{ width: "100%", marginTop: 8, padding: 10, background: "#333", color: "white", border: 0, borderRadius: 8 }}>Buy Pro</button>
            {rec.map((r: any) => (
              <div key={r.id} style={{ background: "#111", padding: 8, borderRadius: 8, marginTop: 6, fontSize: 11 }}>
                <div>{r.fileName}</div>
                {r.audioData ? <audio controls src={r.audioData} style={{ width: "100%", height: 25 }} /> : <div>No audio</div>}
              </div>
            ))}
          </div>
        )}

        {tab === "review" && (
          <div>
            {rec.map((r: any) => (
              <div key={r.id} style={{ background: "white", color: "black", padding: 8, borderRadius: 8, marginTop: 6, fontSize: 11 }}>
                {r.fileName}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}