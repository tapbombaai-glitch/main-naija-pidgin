"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_RECORDING_SECONDS = 30;

type Voice = {
  id: string;
  name: string;
  voice_id: string;
  elevenlabs_voice_id: string;
  category: string;
  accent: string;
  is_active: boolean;
  is_published: boolean;
  requires_verification: boolean;
  gender: string;
};

const EXISTING_VOICES: Voice[] = [
  {
    id: "main-naija", name: "Main Naija Pidgin - Male",
    voice_id: "BXStbbwwT5cKeWf2Ik8O", elevenlabs_voice_id: "BXStbbwwT5cKeWf2Ik8O",
    category: "male", accent: "Naija Pidgin", is_active: true, is_published: true, requires_verification: false, gender: "male",
  },
  {
    id: "warri-babe", name: "Warri Babe - Female",
    voice_id: "w5p3k3PueAgQOT4lq0SF", elevenlabs_voice_id: "w5p3k3PueAgQOT4lq0SF",
    category: "female", accent: "Naija Pidgin", is_active: true, is_published: true, requires_verification: false, gender: "female",
  },
];

export default function ChairmanStudioReal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [voices, setVoices] = useState<Voice[]>(EXISTING_VOICES);
  const [selectedVoiceId, setSelectedVoiceId] = useState(EXISTING_VOICES[0].voice_id);
  const [text, setText] = useState("How far my people, na Chairman dey here! Main Naija Pidgin don land gbam!");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cloneError, setCloneError] = useState("");
  const [cloneMessage, setCloneMessage] = useState("");
  const [loading, setLoading] = useState<"none" | "cloning" | "generating" | "loadingVoices">("none");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const verifyChairman = (user: any): boolean => { return Boolean(user) && user.email?.toLowerCase() === CHAIRMAN_EMAIL; };
  const getAccessToken = async (): Promise<string> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) throw new Error("Your session has expired. Please log in again.");
    if (!verifyChairman(session.user)) throw new Error("Chairman authorisation failed.");
    return session.access_token;
  };

  const loadVoices = async () => {
    setLoading("loadingVoices");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/chairman/studio/voices", { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || "Could not load Chairman voices.");
      const rawVoices = Array.isArray(result) ? result : Array.isArray(result.voices) ? result.voices : Array.isArray(result.data) ? result.data : [];
      const databaseVoices: Voice[] = rawVoices.map((voice: any) => {
        const voiceId = voice.elevenlabs_voice_id || voice.voice_id || "";
        return { id: String(voice.id || voiceId), name: voice.name || "Unnamed Voice", voice_id: voiceId, elevenlabs_voice_id: voiceId, category: voice.category || "custom", accent: voice.accent || "Naija Pidgin", is_active: voice.is_active ?? true, is_published: voice.is_published ?? false, requires_verification: voice.requires_verification ?? false, gender: voice.gender || (voice.category === "female" ? "female" : "male") };
      }).filter((voice: Voice) => Boolean(voice.voice_id));
      const merged = new Map<string, Voice>();
      EXISTING_VOICES.forEach((voice) => { merged.set(voice.voice_id, voice); });
      databaseVoices.forEach((voice) => { merged.set(voice.voice_id, voice); });
      const finalVoices = Array.from(merged.values());
      setVoices(finalVoices);
      setSelectedVoiceId((current) => { if (finalVoices.some((v) => v.voice_id === current)) return current; return finalVoices[0]?.voice_id || ""; });
    } catch (error: any) { setVoices(EXISTING_VOICES); setCloneError(error.message || "Could not load saved voices."); } finally { setLoading("none"); }
  };

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsLoggedIn(false); return; }
      if (!verifyChairman(session.user)) { await supabase.auth.signOut(); setIsLoggedIn(false); setAuthError("This account is not authorised for Chairman access."); return; }
      setIsLoggedIn(true); await loadVoices();
    } catch { setIsLoggedIn(false); } finally { setAuthLoading(false); }
  };

  useEffect(() => {
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(async () => { if (!session) { setIsLoggedIn(false); return; } if (!verifyChairman(session.user)) { setIsLoggedIn(false); await supabase.auth.signOut(); return; } setIsLoggedIn(true); await loadVoices(); }, 0);
    });
    return () => { subscription.unsubscribe(); if (timerRef.current) clearInterval(timerRef.current); streamRef.current?.getTracks().forEach((t) => t.stop()); if (recordedUrl) URL.revokeObjectURL(recordedUrl); if (generatedUrl) URL.revokeObjectURL(generatedUrl); };
  }, []);

  const handleLogin = async () => {
    if (!password.trim()) { setAuthError("Enter your Chairman password."); return; }
    setLoginLoading(true); setAuthError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: CHAIRMAN_EMAIL, password });
      if (error) throw error;
      if (!verifyChairman(data.user)) { await supabase.auth.signOut(); throw new Error("Chairman account verification failed."); }
      setIsLoggedIn(true); setPassword(""); await loadVoices();
    } catch (error: any) { setAuthError(error.message || "Login failed."); } finally { setLoginLoading(false); }
  };

  const handleLogout = async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null; setRecording(false);
    await supabase.auth.signOut(); setIsLoggedIn(false); setPassword(""); setGeneratedUrl(""); setGenerateError(""); setAuthError("");
  };

  const startRecording = async () => {
    setCloneError(""); setCloneMessage(""); setRecordingSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      let mimeType = ""; if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mimeType = "audio/webm;codecs=opus"; else if (MediaRecorder.isTypeSupported("audio/webm")) mimeType = "audio/webm";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder; chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => { const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }); setRecordedBlob(blob); setRecordedUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); }); stream.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
      recorder.start(1000); setRecording(true);
      timerRef.current = setInterval(() => { setRecordingSeconds((s) => { const n = s + 1; if (n >= MAX_RECORDING_SECONDS) { if (recorder.state === "recording") recorder.stop(); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } setRecording(false); } return n; }); }, 1000);
    } catch (error: any) { setCloneError(error.message || "Could not start microphone."); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop(); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; setRecording(false); };
  const clearRecording = () => { setRecordedBlob(null); setRecordedUrl((old) => { if (old) URL.revokeObjectURL(old); return ""; }); setUploadFile(null); setRecordingSeconds(0); };

  const handleCreateClone = async () => {
    setCloneError(""); setCloneMessage("");
    if (!voiceName.trim()) { setCloneError("Enter a name for this voice."); return; }
    const fileToSend = uploadFile || (recordedBlob ? new File([recordedBlob], "chairman-voice-sample.webm", { type: recordedBlob.type || "audio/webm" }) : null);
    if (!fileToSend) { setCloneError("Record or upload an audio sample first."); return; }
    setLoading("cloning");
    try {
      const token = await getAccessToken();
      const form = new FormData(); form.append("audio", fileToSend); form.append("name", voiceName.trim()); form.append("gender", gender); form.append("category", gender);
      const response = await fetch("/api/voice-clone", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || result.message || "Voice cloning failed.");
      setCloneMessage(result.requiresVerification ? "Voice submitted. Verification may be required before use." : "Voice clone created successfully.");
      setVoiceName(""); setUploadFile(null); setRecordedBlob(null); setRecordedUrl((old) => { if (old) URL.revokeObjectURL(old); return ""; }); await loadVoices(); if (result.voice_id) setSelectedVoiceId(result.voice_id);
    } catch (error: any) { setCloneError(error.message || "Could not create voice clone."); } finally { setLoading("none"); }
  };

  const handleGenerate = async () => {
    setGenerateError(""); if (!selectedVoiceId) { setGenerateError("Select a voice first."); return; } if (!text.trim()) { setGenerateError("Enter some text to generate."); return; }
    const selected = voices.find((v) => v.voice_id === selectedVoiceId);
    if (selected?.requires_verification || selected?.is_active === false) { setGenerateError("This voice is awaiting verification or activation."); return; }
    setLoading("generating"); setGeneratedUrl((old) => { if (old) URL.revokeObjectURL(old); return ""; });
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/voice-clone/test", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ text: text.trim(), voice_id: selectedVoiceId }) });
      if (!response.ok) { const result = await response.json().catch(() => ({})); throw new Error(result.error || result.message || `Speech generation failed: ${response.status}`); }
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("audio/") || contentType.includes("octet-stream")) { const blob = await response.blob(); if (blob.size === 0) throw new Error("The server returned empty audio."); setGeneratedUrl(URL.createObjectURL(blob)); }
      else { const result = await response.json(); const audioUrl = result.audioUrl || result.audio_url || result.url; if (audioUrl) setGeneratedUrl(audioUrl); else if (result.audioBase64) setGeneratedUrl(`data:audio/mpeg;base64,${result.audioBase64}`); else throw new Error("The server did not return playable audio."); }
    } catch (error: any) { setGenerateError(error.message || "Speech generation failed."); } finally { setLoading("none"); }
  };

  const selectedVoice = voices.find((v) => v.voice_id === selectedVoiceId);
  if (authLoading) return <div style={{ minHeight: "100vh", background: "#050807", color: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }}>Checking Chairman access...</div>;
  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "#050807", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 400, background: "#0a100d", border: "1px solid #1a2e22", borderRadius: 16, padding: 24 }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}><div style={{ fontSize: 32 }}>👑</div><h1 style={{ color: "#22c55e", margin: "8px 0 0", fontSize: 22 }}>Main Naija Pidgin</h1><p style={{ color: "#6b7280", fontSize: 12 }}>Chairman Voice Studio</p></div>
          <input value={CHAIRMAN_EMAIL} readOnly style={{ width: "100%", height: 54, background: "#050807", border: "1px solid #1f3a26", borderRadius: 10, color: "#fff", padding: "0 14px", marginBottom: 12 }} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }} placeholder="Enter Chairman password" style={{ width: "100%", height: 54, background: "#050807", border: "1px solid #1f3a26", borderRadius: 10, color: "#fff", padding: "0 14px", marginBottom: 12 }} />
          {authError && <div style={{ background: "#2a0f0f", color: "#fca5a5", padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 10 }}>{authError}</div>}
          <button onClick={handleLogin} disabled={loginLoading} style={{ width: "100%", height: 52, background: "#22c55e", color: "#000", border: "none", borderRadius: 10, fontWeight: "bold" }}>{loginLoading ? "Checking..." : "Enter Voice Studio"}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#020403", color: "#fff", padding: 16 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", marginBottom: 12 }}>
          <div><h2 style={{ margin: 0, fontSize: 19 }}>👑 Chairman Studio</h2><p style={{ color: "#22c55e", fontSize: 11, margin: "5px 0 0" }}>MAIN NAIJA PIDGIN • VOICE MANAGEMENT</p></div>
          <button onClick={handleLogout} style={{ background: "#1a2e22", color: "#22c55e", border: "1px solid #22c55e", padding: "9px 13px", borderRadius: 8 }}>Logout</button>
        </header>

        <section style={{ background: "#0a100d", border: "1px solid #1a2e22", borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <h3 style={{ color: "#22c55e", margin: "0 0 12px", fontSize: 17 }}>🎚️ Select Voice ({voices.length})</h3>
          <select value={selectedVoiceId} onChange={(e) => setSelectedVoiceId(e.target.value)} style={{ width: "100%", minHeight: 48, background: "#050807", color: "#fff", border: "1px solid #1f3a26", borderRadius: 10, padding: "0 12px" }}>
            {voices.map((voice) => (<option key={voice.voice_id} value={voice.voice_id}>{voice.name} • {voice.gender}{voice.requires_verification ? " • Pending" : ""}</option>))}
          </select>
          {selectedVoice?.requires_verification && <p style={{ color: "#fbbf24", fontSize: 12 }}>This voice is awaiting verification.</p>}
          <button onClick={loadVoices} disabled={loading === "loadingVoices"} style={{ background: "transparent", color: "#22c55e", border: "none", padding: "10px 0", fontSize: 12 }}>↻ {loading === "loadingVoices" ? "Loading..." : "Reload voices"}</button>
        </section>

        <section style={{ background: "#0a100d", border: "1px solid #1a2e22", borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <h3 style={{ color: "#22c55e", margin: "0 0 12px", fontSize: 17 }}>🗣️ Generate Pidgin Speech</h3>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your Naija Pidgin text..." style={{ width: "100%", minHeight: 48, height: 120, background: "#050807", color: "#fff", border: "1px solid #1f3a26", borderRadius: 10, padding: 12, resize: "vertical" }} />
          <button onClick={handleGenerate} disabled={loading === "generating"} style={{ width: "100%", minHeight: 50, marginTop: 12, background: "#22c55e", color: "#000", border: "none", borderRadius: 10, fontWeight: "bold" }}>{loading === "generating" ? "⏳ Generating real voice..." : `🔊 Generate with ${selectedVoice?.name || "Selected Voice"}`}</button>
          {generateError && <p style={{ background: "#2a0f0f", color: "#fca5a5", padding: 10, borderRadius: 8, fontSize: 12 }}>{generateError}</p>}
          {generatedUrl && <div style={{ marginTop: 14, background: "#050807", border: "1px solid #22c55e", borderRadius: 10, padding: 12 }}><p style={{ color: "#86efac", fontSize: 13 }}>✅ Generated audio</p><audio controls src={generatedUrl} style={{ width: "100%" }} /><a href={generatedUrl} download="Main-Naija-Pidgin-Voice.mp3" style={{ display: "inline-block", marginTop: 12, color: "#22c55e", fontSize: 13 }}>⬇️ Download audio</a></div>}
        </section>

        <section style={{ background: "#0a100d", border: "1px solid #1a2e22", borderRadius: 16, padding: 18, marginBottom: 16 }}>
          <h3 style={{ color: "#22c55e", margin: "0 0 12px", fontSize: 17 }}>🎙️ Create a New Voice Clone</h3>
          <input value={voiceName} onChange={(e) => setVoiceName(e.target.value)} placeholder="Enter voice name" style={{ width: "100%", minHeight: 48, background: "#050807", color: "#fff", border: "1px solid #1f3a26", borderRadius: 10, padding: "0 12px", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}><button onClick={() => setGender("male")} style={{ flex: 1, minHeight: 44, border: "1px solid #1f3a26", borderRadius: 9, fontWeight: "bold", background: gender === "male" ? "#22c55e" : "#1a2e22", color: gender === "male" ? "#000" : "#fff" }}>👨 Male</button><button onClick={() => setGender("female")} style={{ flex: 1, minHeight: 44, border: "1px solid #1f3a26", borderRadius: 9, fontWeight: "bold", background: gender === "female" ? "#ec4899" : "#1a2e22", color: "#fff" }}>👩 Female</button></div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}><button onClick={recording ? stopRecording : startRecording} style={{ flex: 1, minHeight: 44, border: "1px solid #1f3a26", borderRadius: 9, fontWeight: "bold", background: recording ? "#dc2626" : "#1a2e22", color: "#fff" }}>{recording ? "⏹ Stop" : "🎙️ Record"}</button><label style={{ flex: 1, minHeight: 44, border: "1px solid #1f3a26", borderRadius: 9, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a2e22", color: "#fff" }}>🎧 Upload audio<input type="file" accept="audio/*" hidden onChange={(e) => { setUploadFile(e.target.files?.[0] || null); setCloneError(""); setCloneMessage(""); setRecordedBlob(null); setRecordedUrl((old) => { if (old) URL.revokeObjectURL(old); return ""; }); }} /></label></div>
          {recording && <p style={{ color: "#fbbf24", fontSize: 12 }}>🔴 Recording: {recordingSeconds}s / {MAX_RECORDING_SECONDS}s</p>}
          {recordedUrl && <div style={{ marginTop: 14, background: "#050807", border: "1px solid #22c55e", borderRadius: 10, padding: 12 }}><p style={{ color: "#86efac", fontSize: 13 }}>🎧 Listen to your recording</p><audio controls src={recordedUrl} style={{ width: "100%" }} /><button onClick={clearRecording} style={{ background: "transparent", color: "#22c55e", border: "none", padding: "10px 0", fontSize: 12 }}>Clear recording</button></div>}
          {uploadFile && <p style={{ color: "#86efac", fontSize: 13 }}>✅ Uploaded: {uploadFile.name}</p>}
          {cloneError && <p style={{ background: "#2a0f0f", color: "#fca5a5", padding: 10, borderRadius: 8, fontSize: 12 }}>{cloneError}</p>}
          {cloneMessage && <p style={{ color: "#86efac", fontSize: 13 }}>{cloneMessage}</p>}
          <button onClick={handleCreateClone} disabled={loading === "cloning" || recording} style={{ width: "100%", minHeight: 50, marginTop: 12, background: "#fff", color: "#000", border: "none", borderRadius: 10, fontWeight: "bold" }}>{loading === "cloning" ? "⏳ Creating voice clone..." : `Create ${gender} Voice Clone`}</button>
        </section>
        <p style={{ textAlign: "center", color: "#4b5563", fontSize: 11, padding: "12px 0 24px" }}>MAIN NAIJA PIDGIN • CHAIRMAN VOICE STUDIO</p>
      </div>
    </div>
  );
}