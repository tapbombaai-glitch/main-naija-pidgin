"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function WorkerDashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [selectedLang, setSelectedLang] = useState("Pidgin");
  const [showModal, setShowModal] = useState<string | null>(null);

  const [earnings, setEarnings] = useState({
    total: 1250,
    pending: 450,
    approved: 87,
  });

  const [taskProgress, setTaskProgress] = useState({
    total: 45,
    today: 12,
  });

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);
  const [savingRecording, setSavingRecording] = useState(false);

  // Payment / Bank Details
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const allSentences: Record<string, string[]> = {
    Pidgin: [
      "How you dey? I dey come now now.",
      "Abeg come help me for here.",
      "Wetin dey happen for Lagos today?",
      "I no go gree make dem cheat me.",
      "Oga, how much be this?",
      "Make we go market tomorrow morning.",
      "My pikin dey school for Port Harcourt.",
    ],
    Igbo: [
      "Kedu? Ana m abia ugbu a.",
      "Biko nyere m aka.",
      "Kedu ihe na-eme?",
      "Agaghi m ekwe ka ha ghogbuo m.",
      "Oga, ego ole ka nke a bu?",
      "Anyi ga-aga ahia echi.",
    ],
    Hausa: [
      "Yaya kake? Ina zuwa yanzu.",
      "Don Allah ka taimake ni.",
      "Me ke faruwa?",
      "Ba zan yarda su yaudare ni ba.",
      "Oga, nawa ne wannan?",
      "Mu je kasuwa gobe.",
    ],
    Yoruba: [
      "Bawo ni? Mo n bo nisisinyi.",
      "Ejo e ran mi lowo.",
      "Kini n sele?",
      "Mi o ni gba ki won tan mi.",
      "Oga, elo ni eyi?",
      "Jeka lo si oja laaro.",
    ],
  };

  const sentences = allSentences[selectedLang];

  useEffect(() => {
    try {
      const saved = localStorage.getItem("naija_progress");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.progress && typeof p.progress.total === "number") {
          setTaskProgress(p.progress);
        }
        if (p.earnings && typeof p.earnings.total === "number") {
          setEarnings(p.earnings);
        }
        const index = Number(p.index) || 0;
        setCurrentSentenceIndex(
          Math.max(0, Math.min(index, allSentences.Pidgin.length - 1))
        );
      }
    } catch (error) {
      console.error("Progress loading error:", error);
    }
    try {
      const raw = localStorage.getItem("gin_recordings");
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedFiles(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      console.error("Recording loading error:", error);
      setSavedFiles([]);
    }
    try {
      const savedBank = localStorage.getItem("gin_bank_details");
      if (savedBank) {
        const bank = JSON.parse(savedBank);
        setAccountName(bank.accountName || "");
        setBankName(bank.bankName || "");
        setAccountNumber(bank.accountNumber || "");
        setPhoneNumber(bank.phoneNumber || "");
      }
    } catch (error) {
      console.error("Bank details loading error:", error);
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const saveBankDetails = () => {
    if (!accountName.trim()) {
      alert("Please enter your Account Name.");
      return;
    }
    if (!bankName.trim()) {
      alert("Please select your Bank Name.");
      return;
    }
    if (!accountNumber.trim()) {
      alert("Please enter your Account Number.");
      return;
    }
    if (!phoneNumber.trim()) {
      alert("Please enter your Phone Number.");
      return;
    }
    const bankDetails = {
      accountName: accountName.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      phoneNumber: phoneNumber.trim(),
    };
    try {
      localStorage.setItem("gin_bank_details", JSON.stringify(bankDetails));
      setShowModal(null);
      showToast("✅ Bank details saved successfully.");
    } catch (error) {
      console.error("Bank details save error:", error);
      alert("Could not save bank details on this phone.");
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setAudioURL(null);
      setTimer(0);
      timerRef.current = setInterval(() => setTimer((p: number) => p + 1), 1000);
    } catch {
      alert("Abeg allow microphone!");
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const reRecord = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
    setAudioURL(null);
    setTimer(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const saveAndNext = async () => {
    if (!audioURL) {
      alert("🎤 Record first!");
      return;
    }
    if (savingRecording) {
      return;
    }
    const workerId = localStorage.getItem("gin_worker_id");
    if (!workerId) {
      alert("Worker account not found. Please logout and login again.");
      return;
    }
    setSavingRecording(true);
    let uploadedPath: string | null = null;
    try {
      const blob = await fetch(audioURL).then((r) => r.blob());
      const fileName = `GIN-${selectedLang}-${Date.now()}.webm`;
      const storagePath = `${workerId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("voice-clips")
        .upload(storagePath, blob, {
          contentType: "audio/webm",
          upsert: false,
        });
      if (uploadError) {
        console.error("Supabase audio upload error:", uploadError);
        throw new Error("Audio upload failed: " + uploadError.message);
      }
      uploadedPath = storagePath;
      const { data: publicData } = supabase.storage
        .from("voice-clips")
        .getPublicUrl(storagePath);
      const audioUrl = publicData?.publicUrl || "";
      if (!audioUrl) {
        throw new Error("Could not create recording audio URL.");
      }
      const recordingText = sentences[currentSentenceIndex];
      const { data: recordingRow, error: insertError } = await supabase
        .from("recordings")
        .insert({
          worker_id: workerId,
          language: selectedLang.toLowerCase(),
          text: recordingText,
          audio_url: audioUrl,
          file_name: fileName,
          duration: timer,
          earnings: 30,
          status: "pending",
          is_approved: false,
        })
        .select()
        .single();
      if (insertError) {
        console.error("Supabase recording insert error:", insertError);
        try {
          await supabase.storage.from("voice-clips").remove([storagePath]);
        } catch (cleanupError) {
          console.error("Upload cleanup error:", cleanupError);
        }
        uploadedPath = null;
        throw new Error(
          "Recording could not be submitted: " + insertError.message
        );
      }
      console.log("✅ Recording submitted to Chairman:", recordingRow);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 500);
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = {
          id: recordingRow?.id || Date.now(),
          worker_id: workerId,
          lang: selectedLang,
          sentence: recordingText,
          fileName,
          audioData: reader.result,
          audio_url: audioUrl,
          storage_path: storagePath,
          time: new Date().toISOString(),
          earnings: 30,
          status: "pending",
          approved: false,
        };
        let old: any[] = [];
        try {
          const raw = localStorage.getItem("gin_recordings");
          const parsed = raw ? JSON.parse(raw) : [];
          old = Array.isArray(parsed) ? parsed : [];
        } catch {
          old = [];
        }
        old.unshift(data);
        const updated = old.slice(0, 100);
        try {
          localStorage.setItem("gin_recordings", JSON.stringify(updated));
          setSavedFiles(updated);
        } catch (error) {
          console.error("Could not save local recording details:", error);
        }
      };
      reader.readAsDataURL(blob);
      const newEarnings = {
        total: earnings.total + 30,
        pending: earnings.pending + 30,
        approved: earnings.approved,
      };
      const newProgress = {
        total: taskProgress.total + 1,
        today: taskProgress.today + 1,
      };
      const nextIndex = (currentSentenceIndex + 1) % sentences.length;
      setEarnings(newEarnings);
      setTaskProgress(newProgress);
      setCurrentSentenceIndex(nextIndex);
      localStorage.setItem(
        "naija_progress",
        JSON.stringify({
          progress: newProgress,
          earnings: newEarnings,
          index: nextIndex,
        })
      );
      setAudioURL(null);
      setTimer(0);
      showToast(`✅ SUBMITTED TO CHAIRMAN • ${fileName} • ₦30`);
    } catch (error) {
      console.error("Recording submission failed:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Recording submission failed. Please try again."
      );
    } finally {
      setSavingRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    };
  }, []);

  useEffect(() => {
    setCurrentSentenceIndex(0);
    setAudioURL(null);
    setTimer(0);
  }, [selectedLang]);

  return (
    <div
      style={{
        background: "#060A06",
        minHeight: "100vh",
        color: "white",
        fontFamily: "system-ui",
      }}
    >
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#00E676",
            color: "black",
            padding: "10px 18px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "900",
            zIndex: 1000,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}
        >
          {toast}
        </div>
      )}
      <div
        style={{
          maxWidth: "390px",
          margin: "0 auto",
          padding: "10px",
          paddingBottom: "90px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>
              Worker Dashboard 🇳🇬
            </h1>
            <div style={{ fontSize: "11px", color: "#aaa", marginTop: "3px" }}>
              {typeof window !== "undefined"
                ? localStorage.getItem("gin_worker_id") || "WORKER"
                : "WORKER"}{" "}
              ● {savedFiles.length} files saved
            </div>
          </div>
          <div
            style={{
              width: "10px",
              height: "10px",
              background: "#00E676",
              borderRadius: "50%",
              marginTop: "5px",
            }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "6px",
            marginTop: "12px",
          }}
        >
          <div
            style={{
              background: "#111A11",
              border: "1px solid #1E2F1E",
              borderRadius: "12px",
              padding: "10px 6px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "10px", color: "#888" }}>TOTAL</div>
            <div
              style={{
                color: "#00E676",
                fontWeight: "900",
                fontSize: "16px",
                marginTop: "3px",
              }}
            >
              ₦{earnings.total}
            </div>
          </div>
          <div
            style={{
              background: "#111A11",
              border: "1px solid #1E2F1E",
              borderRadius: "12px",
              padding: "10px 6px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "10px", color: "#888" }}>PENDING</div>
            <div
              style={{
                color: "#EAB308",
                fontWeight: "900",
                fontSize: "16px",
                marginTop: "3px",
              }}
            >
              ₦{earnings.pending}
            </div>
          </div>
          <div
            style={{
              background: "#111A11",
              border: "1px solid #1E2F1E",
              borderRadius: "12px",
              padding: "10px 6px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "10px", color: "#888" }}>APPROVED</div>
            <div
              style={{
                color: "#4ADE80",
                fontWeight: "900",
                fontSize: "16px",
                marginTop: "3px",
              }}
            >
              ₦{earnings.approved}
            </div>
          </div>
        </div>
        <div
          style={{
            background: "#111A11",
            border: "1px solid #1E2F1E",
            borderRadius: "12px",
            padding: "12px",
            marginTop: "10px",
          }}
        >
          <div
            style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}
          >
            <span style={{ color: "#aaa" }}>TASK PROGRESS</span>
            <strong style={{ color: "#00E676" }}>{taskProgress.today} today</strong>
          </div>
          <div
            style={{
              height: "7px",
              background: "#1A251A",
              borderRadius: "10px",
              overflow: "hidden",
              marginTop: "8px",
            }}
          >
            <div
              style={{
                width: `${Math.min((taskProgress.today / 50) * 100, 100)}%`,
                height: "100%",
                background: "#00E676",
                borderRadius: "10px",
              }}
            />
          </div>
          <div style={{ marginTop: "6px", fontSize: "10px", color: "#777" }}>
            {taskProgress.total} total recordings
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowModal("bank")}
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "15px",
            borderRadius: "12px",
            border: "1px solid #EAB308",
            background: "linear-gradient(135deg, #3a2d00, #191500)",
            color: "#FACC15",
            fontWeight: "900",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          💳 PAYMENT / BANK DETAILS
        </button>
        <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
          {["Pidgin", "Igbo", "Hausa", "Yoruba"].map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "20px",
                fontSize: "11px",
                fontWeight: "900",
                border:
                  selectedLang === lang ? "1.5px solid #00E676" : "1px solid #2A3A2A",
                background: selectedLang === lang ? "#00E676" : "#222",
                color: selectedLang === lang ? "black" : "#aaa",
              }}
            >
              {lang}
            </button>
          ))}
        </div>
        <a
          href="/worker/dataset"
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            padding: "16px",
            marginTop: "16px",
            background: "#064e3b",
            color: "#ffffff",
            border: "1px solid #00E676",
            borderRadius: "12px",
            textAlign: "center",
            fontWeight: "900",
            fontSize: "13px",
            textDecoration: "none",
          }}
        >
          🎙️ JOIN NIGERIAN VOICE DATASET →
        </a>
        <div
          style={{
            background: "#111A11",
            border: "1px solid #1E2F1E",
            borderRadius: "16px",
            padding: "14px",
            marginTop: "12px",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "800", marginBottom: "10px" }}>
            🎙️ {selectedLang} — {currentSentenceIndex + 1}/{sentences.length}
          </div>
          <div
            style={{
              textAlign: "center",
              minHeight: "48px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "14px",
            }}
          >
            <p style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>
              {sentences[currentSentenceIndex]}
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
            <button
              onClick={toggleRecording}
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: isRecording ? "#CC0000" : "#E53935",
                border: "4px solid #7f1d1d",
              }}
            >
              {isRecording ? (
                <div
                  style={{
                    width: "22px",
                    height: "22px",
                    background: "white",
                    borderRadius: "3px",
                    margin: "auto",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    background: "#7f1d1d",
                    borderRadius: "50%",
                    margin: "auto",
                  }}
                />
              )}
            </button>
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              color: "#ff5252",
              fontFamily: "monospace",
            }}
          >
            REC {formatTime(timer)} / 00:15
          </div>
          {audioURL && (
            <audio
              controls
              src={audioURL}
              style={{ width: "100%", margin: "12px 0", height: "36px" }}
            />
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={reRecord}
              style={{
                flex: 1,
                background: "#1E2F1E",
                color: "#ccc",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #2A4A2A",
              }}
            >
              ↻ Re-record
            </button>
            <button
              onClick={saveAndNext}
              disabled={!audioURL || savingRecording}
              style={{
                flex: 1.6,
                background: audioURL && !savingRecording ? "#00E676" : "#1A3A1A",
                color: audioURL && !savingRecording ? "black" : "#666",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                fontWeight: "900",
              }}
            >
              {savingRecording
                ? "⏳ SUBMITTING..."
                : audioURL
                ? "💾 SUBMIT TO CHAIRMAN →"
                : "Save & Next →"}
            </button>
          </div>
        </div>
        {savedFiles.length > 0 && (
          <div
            style={{
              marginTop: "12px",
              background: "#0A150A",
              border: "1px solid #00E67640",
              borderRadius: "12px",
              padding: "10px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#00E676" }}>
              📁 {savedFiles.length} Files Saved to Phone for Chairman
            </div>
            {savedFiles.slice(0, 3).map((f: any) => (
              <div key={f.id} style={{ fontSize: "10px", color: "#aaa", marginTop: "4px" }}>
                • {f.fileName || "Recording"} —{" "}
                {typeof f.sentence === "string" ? f.sentence.slice(0, 20) : "Saved audio"}...
              </div>
            ))}
          </div>
        )}
      </div>
      {showModal === "bank" && (
        <div
          onClick={() => setShowModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px",
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "390px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#0D130D",
              border: "1px solid #EAB308",
              borderRadius: "20px",
              padding: "20px",
              boxSizing: "border-box",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "900", color: "#FACC15" }}>
                  💳 Payment Details
                </h2>
                <p style={{ margin: "5px 0 0", fontSize: "11px", color: "#888" }}>
                  Add your bank details for payment.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(null)}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "1px solid #333",
                  background: "#171D17",
                  color: "white",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "#ccc",
                fontWeight: "800",
                marginBottom: "7px",
              }}
            >
              ACCOUNT NAME
            </label>
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Enter account name"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #374137",
                background: "#070A07",
                color: "white",
                outline: "none",
                marginBottom: "15px",
                fontSize: "14px",
              }}
            />
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "#ccc",
                fontWeight: "800",
                marginBottom: "7px",
              }}
            >
              BANK NAME
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #374137",
                background: "#070A07",
                color: "white",
                outline: "none",
                marginBottom: "15px",
                fontSize: "14px",
              }}
            >
              <option value="">Select your bank</option>
              <option value="Opay">Opay</option>
              <option value="Moniepoint">Moniepoint</option>
              <option value="PalmPay">PalmPay</option>
              <option value="Kuda">Kuda</option>
              <option value="First Bank">First Bank</option>
              <option value="GTBank">GTBank</option>
              <option value="Access Bank">Access Bank</option>
              <option value="UBA">UBA</option>
              <option value="Zenith Bank">Zenith Bank</option>
            </select>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "#ccc",
                fontWeight: "800",
                marginBottom: "7px",
              }}
            >
              ACCOUNT NUMBER
            </label>
            <input
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              inputMode="numeric"
              placeholder="Enter 10-digit account number"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #374137",
                background: "#070A07",
                color: "white",
                outline: "none",
                marginBottom: "15px",
                fontSize: "14px",
              }}
            />
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "#ccc",
                fontWeight: "800",
                marginBottom: "7px",
              }}
            >
              PHONE NUMBER
            </label>
            <input
              value={phoneNumber}
              onChange={(e) =>
                setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
              }
              inputMode="tel"
              placeholder="Enter phone number"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid #374137",
                background: "#070A07",
                color: "white",
                outline: "none",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            />
            <button
              type="button"
              onClick={saveBankDetails}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "12px",
                border: "none",
                background: "#00E676",
                color: "black",
                fontWeight: "900",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              💾 SAVE BANK DETAILS
            </button>
            <button
              type="button"
              onClick={() => setShowModal(null)}
              style={{
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                borderRadius: "12px",
                border: "1px solid #333",
                background: "transparent",
                color: "#aaa",
                fontWeight: "700",
                fontSize: "13px",
              }}
            >
              Cancel
            </button>
            <div
              style={{
                marginTop: "15px",
                padding: "10px",
                borderRadius: "10px",
                background: "#171D17",
                color: "#777",
                fontSize: "10px",
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Your bank information is used for worker payment processing.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}