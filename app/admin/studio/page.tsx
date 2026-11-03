"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

type Voice = {
  id: string;
  name: string;
  description: string | null;
  elevenlabs_voice_id: string;
  accent: string;
  is_active: boolean;
  is_published: boolean;
  requires_verification: boolean;
  created_at: string;
};

export default function ChairmanStudio() {
  const [user, setUser] = useState<any>(null);
  const [authorized, setAuthorized] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("studio");
  const [playingId, setPlayingId] = useState("");

  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();

    if (!data.session?.access_token) {
      throw new Error("Please log in again.");
    }

    return data.session.access_token;
  };

  const api = async (method = "GET", body?: any) => {
    const token = await getToken();

    const response = await fetch("/api/chairman/studio/voices", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Studio request failed.");
    }

    return result;
  };

  const loadVoices = useCallback(async () => {
    try {
      const result = await api();

      setVoices(result.voices || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    const checkAccess = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!alive) return;

        if (
          !currentUser ||
          currentUser.email?.toLowerCase() !== CHAIRMAN_EMAIL
        ) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        setUser(currentUser);
        setAuthorized(true);

        const result = await api();

        if (alive) {
          setVoices(result.voices || []);
          setLoading(false);
        }
      } catch (err: any) {
        if (alive) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    checkAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
      stopStream();
      audioRef.current?.pause();
    };
  }, []);

  const chooseFile = (selected: File | null) => {
    if (!selected) return;

    if (!selected.type.startsWith("audio/")) {
      setError("Choose an audio file.");
      return;
    }

    if (selected.size > 20 * 1024 * 1024) {
      setError("Audio must be 20 MB or smaller.");
      return;
    }

    setError("");
    setFile(selected);
    setRecorded(false);

    if (preview) URL.revokeObjectURL(preview);

    setPreview(URL.createObjectURL(selected));
  };

  const startRecording = async () => {
    try {
      setError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const options = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? { mimeType: "audio/webm;codecs=opus" }
        : undefined;

      const recorder = new MediaRecorder(stream, options);

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const recordedFile = new File(
          [blob],
          `chairman-voice-${Date.now()}.webm`,
          { type: blob.type }
        );

        chooseFile(recordedFile);
        setRecorded(true);
        stopStream();
      };

      recorder.start();
      setRecording(true);
    } catch (err: any) {
      setError(err.message || "Microphone permission failed.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }

    setRecording(false);
  };

  const createClone = async () => {
    if (!name.trim()) {
      setError("Enter a name for your new voice.");
      return;
    }

    if (!file) {
      setError("Record or upload an audio sample first.");
      return;
    }

    setCreating(true);
    setError("");
    setMessage("");

    try {
      const token = await getToken();

      const form = new FormData();

      form.append("name", name.trim());
      form.append("description", description.trim());
      form.append("audio", file);

      const response = await fetch(
        "/api/chairman/studio/voices",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Voice cloning failed.");
      }

      setMessage("🎉 Your voice clone has been created!");
      setName("");
      setDescription("");
      setFile(null);
      setRecorded(false);

      if (preview) URL.revokeObjectURL(preview);

      setPreview("");

      await loadVoices();
      setActiveTab("voices");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteVoice = async (voice: Voice) => {
    const confirmed = window.confirm(
      `Delete "${voice.name}" from ElevenLabs and Chairman Studio?`
    );

    if (!confirmed) return;

    try {
      await api("DELETE", { id: voice.id });

      setVoices((previous) =>
        previous.filter((item) => item.id !== voice.id)
      );

      setMessage("Voice deleted successfully.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const previewVoice = async (voice: Voice) => {
    try {
      setError("");
      setMessage("");

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      if (playingId === voice.id) {
        setPlayingId("");
        return;
      }

      const token = await getToken();

      const response = await fetch(
        "/api/chairman/studio/preview",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voiceId: voice.elevenlabs_voice_id,
            text: "How far my people! Welcome to Main Naija Pidgin. We dey build something special.",
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Voice preview failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingId("");
        URL.revokeObjectURL(url);
      };

      setPlayingId(voice.id);
      await audio.play();
    } catch (err: any) {
      setPlayingId("");
      setError(err.message);
    }
  };

  const logout = async () => {
    stopStream();
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  if (loading) {
    return (
      <main className="screen center">
        <div className="loader">👑</div>
        <h2>CHAIRMAN STUDIO</h2>
        <p>Loading your private studio...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="screen center">
        <div className="crown">👑</div>
        <h2>CHAIRMAN ACCESS ONLY</h2>
        <p>This Studio is restricted to the Chairman.</p>
        <Link className="mainButton" href="/admin/login">
          GO TO CHAIRMAN LOGIN
        </Link>
      </main>
    );
  }

  return (
    <main className="screen">
      <header className="header">
        <div>
          <small>MAIN NAIJA PIDGIN</small>
          <h1>👑 CHAIRMAN STUDIO</h1>
          <p>Private Voice Management Centre</p>
        </div>

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </header>

      <section className="welcome">
        <span>CHAIRMAN ACCOUNT</span>
        <h2>Welcome back, Chairman.</h2>
        <p>{user?.email}</p>
      </section>

      <section className="stats">
        <div>
          <strong>{voices.length}</strong>
          <span>MY VOICES</span>
        </div>

        <div>
          <strong>
            {voices.filter((voice) => voice.is_active).length}
          </strong>
          <span>ACTIVE</span>
        </div>

        <div>
          <strong>
            {voices.filter((voice) => voice.is_published).length}
          </strong>
          <span>PUBLISHED</span>
        </div>
      </section>

      <nav className="tabs">
        <button
          className={activeTab === "studio" ? "selected" : ""}
          onClick={() => setActiveTab("studio")}
        >
          🎙️ CREATE VOICE
        </button>

        <button
          className={activeTab === "voices" ? "selected" : ""}
          onClick={() => setActiveTab("voices")}
        >
          🎧 MY VOICES
        </button>

        <button
          className={activeTab === "management" ? "selected" : ""}
          onClick={() => setActiveTab("management")}
        >
          ⚙️ MANAGEMENT
        </button>
      </nav>

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      {activeTab === "studio" && (
        <section className="panel">
          <div className="sectionTitle">
            <span>01</span>
            <div>
              <h2>CREATE YOUR VOICE</h2>
              <p>Build a new voice with ElevenLabs.</p>
            </div>
          </div>

          <label>VOICE NAME</label>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: Chairman Naija Male"
            maxLength={60}
          />

          <label>VOICE DESCRIPTION</label>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the voice, accent and style..."
            rows={3}
          />

          <div className="recordBox">
            <div className="microphone">🎙️</div>
            <h3>RECORD YOUR VOICE</h3>
            <p>
              Use a quiet environment and speak naturally.
              Only clone voices you own or have permission to use.
            </p>

            {!recording ? (
              <button
                className="recordButton"
                onClick={startRecording}
              >
                ● START RECORDING
              </button>
            ) : (
              <button
                className="stopButton"
                onClick={stopRecording}
              >
                ■ STOP RECORDING
              </button>
            )}
          </div>

          <div className="divider">OR UPLOAD AUDIO</div>

          <input
            type="file"
            accept="audio/*"
            onChange={(event) =>
              chooseFile(event.target.files?.[0] || null)
            }
          />

          {file && (
            <div className="fileBox">
              <strong>✓ AUDIO SAMPLE READY</strong>
              <p>{file.name}</p>
              <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>

              {preview && (
                <audio
                  controls
                  src={preview}
                  style={{ width: "100%" }}
                />
              )}
            </div>
          )}

          <button
            className="mainButton full"
            disabled={creating || recording || !file}
            onClick={createClone}
          >
            {creating
              ? "CREATING YOUR VOICE..."
              : "👑 CREATE ELEVENLABS VOICE"}
          </button>

          <p className="note">
            Your sample will be sent securely to ElevenLabs
            through the protected server.
          </p>
        </section>
      )}

      {activeTab === "voices" && (
        <section className="panel">
          <div className="sectionTitle">
            <span>02</span>
            <div>
              <h2>MY VOICES</h2>
              <p>Your saved Chairman voice clones.</p>
            </div>
          </div>

          {voices.length === 0 ? (
            <div className="empty">
              <div>🎧</div>
              <h3>No cloned voices yet.</h3>
              <p>Create your first voice to see it here.</p>

              <button
                className="mainButton"
                onClick={() => setActiveTab("studio")}
              >
                CREATE FIRST VOICE
              </button>
            </div>
          ) : (
            voices.map((voice) => (
              <article className="voiceCard" key={voice.id}>
                <div className="voiceTop">
                  <div className="voiceIcon">🎙️</div>

                  <div className="voiceInfo">
                    <h3>{voice.name}</h3>
                    <p>{voice.description || voice.accent}</p>
                    <small>
                      {voice.is_active ? "● ACTIVE" : "○ INACTIVE"}
                    </small>
                  </div>
                </div>

                <div className="voiceId">
                  ElevenLabs ID: {voice.elevenlabs_voice_id}
                </div>

                {voice.requires_verification && (
                  <div className="warning">
                    ElevenLabs requires verification for this voice.
                  </div>
                )}

                <button
                  className="mainButton full"
                  onClick={() => previewVoice(voice)}
                >
                  {playingId === voice.id
                    ? "PLAYING..."
                    : "▶ PREVIEW VOICE"}
                </button>

                <button
                  className="deleteButton"
                  onClick={() => deleteVoice(voice)}
                >
                  DELETE VOICE
                </button>
              </article>
            ))
          )}
        </section>
      )}

      {activeTab === "management" && (
        <section className="panel">
          <div className="sectionTitle">
            <span>03</span>
            <div>
              <h2>VOICE MANAGEMENT</h2>
              <p>Chairman control centre.</p>
            </div>
          </div>

          <div className="managementItem">
            <span>🎙️</span>
            <div>
              <strong>ElevenLabs Integration</strong>
              <p>Voice creation and speech generation.</p>
            </div>
            <b>CONNECTED VIA SERVER</b>
          </div>

          <div className="managementItem">
            <span>🗄️</span>
            <div>
              <strong>Supabase Database</strong>
              <p>Saved voice information.</p>
            </div>
            <b>CONNECTED</b>
          </div>

          <div className="managementItem">
            <span>🔐</span>
            <div>
              <strong>Chairman Security</strong>
              <p>Only your authorized account can use Studio APIs.</p>
            </div>
            <b>RESTRICTED</b>
          </div>

          <div className="managementItem">
            <span>🛍️</span>
            <div>
              <strong>Marketplace</strong>
              <p>Voice publishing connection is not enabled yet.</p>
            </div>
            <Link href="/marketplace">OPEN</Link>
          </div>

          <button className="refreshButton" onClick={loadVoices}>
            ↻ REFRESH MY VOICES
          </button>
        </section>
      )}

      <footer>
        <p>MAIN NAIJA PIDGIN</p>
        <small>CHAIRMAN STUDIO • PRIVATE ADMINISTRATION</small>
      </footer>

      <style jsx>{`
        * { box-sizing: border-box; }

        .screen {
          min-height: 100vh;
          background: #070b08;
          color: white;
          padding: 18px 14px 35px;
          max-width: 600px;
          margin: auto;
          font-family: Arial, sans-serif;
        }

        .center {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          gap: 12px;
        }

        .loader, .crown { font-size: 55px; }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid #193c27;
          padding-bottom: 16px;
        }

        .header small {
          color: #00e676;
          font-weight: 900;
          letter-spacing: 2px;
        }

        h1 {
          font-size: 19px;
          margin: 8px 0;
        }

        .header p, .welcome p {
          color: #8eaa95;
          font-size: 11px;
          margin: 0;
        }

        .logout {
          background: #1b2a20;
          border: 1px solid #315d3c;
          color: white;
          border-radius: 9px;
          padding: 9px;
          font-size: 11px;
        }

        .welcome {
          margin-top: 18px;
          padding: 18px;
          border-radius: 16px;
          background: linear-gradient(135deg,#123b22,#102016);
          border: 1px solid #23683c;
        }

        .welcome span {
          font-size: 9px;
          color: #00e676;
          font-weight: 900;
        }

        .welcome h2 { font-size: 19px; }

        .stats {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 8px;
          margin: 14px 0;
        }

        .stats div {
          padding: 14px 5px;
          text-align: center;
          border: 1px solid #1c3424;
          border-radius: 12px;
          background: #101a13;
        }

        .stats strong {
          display: block;
          color: #00e676;
          font-size: 23px;
        }

        .stats span {
          font-size: 8px;
          color: #8da494;
          font-weight: 900;
        }

        .tabs {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 6px;
          margin: 15px 0;
        }

        .tabs button {
          background: #111c14;
          color: #a8b8ac;
          border: 1px solid #213c29;
          border-radius: 10px;
          padding: 12px 3px;
          font-size: 9px;
          font-weight: 900;
        }

        .tabs button.selected {
          background: #00e676;
          color: #031006;
          border-color: #00e676;
        }

        .panel {
          background: #101811;
          border: 1px solid #25452d;
          border-radius: 16px;
          padding: 15px;
        }

        .sectionTitle {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }

        .sectionTitle > span {
          color: #00e676;
          font-size: 22px;
          font-weight: 900;
        }

        .sectionTitle h2 {
          font-size: 15px;
          margin: 2px 0 5px;
        }

        .sectionTitle p {
          color: #829688;
          font-size: 10px;
          margin: 0;
        }

        label {
          display: block;
          color: #00e676;
          font-size: 10px;
          font-weight: 900;
          margin: 15px 0 6px;
        }

        input, textarea {
          width: 100%;
          background: #071009;
          color: white;
          border: 1px solid #294a32;
          border-radius: 10px;
          padding: 13px;
          font-size: 13px;
          outline: none;
        }

        input[type=file] {
          font-size: 10px;
        }

        .recordBox {
          margin-top: 18px;
          padding: 20px 12px;
          text-align: center;
          background: #0a160e;
          border: 1px dashed #367b49;
          border-radius: 14px;
        }

        .microphone { font-size: 37px; }

        .recordBox h3 { font-size: 13px; }

        .recordBox p, .note {
          color: #91a497;
          font-size: 10px;
          line-height: 1.6;
        }

        .recordButton, .stopButton {
          border: none;
          border-radius: 10px;
          padding: 14px;
          width: 100%;
          background: #00e676;
          color: black;
          font-weight: 900;
          font-size: 11px;
        }

        .stopButton { background: #ff5252; color: white; }

        .divider {
          text-align: center;
          color: #6d8573;
          font-size: 9px;
          font-weight: 900;
          margin: 20px 0;
        }

        .fileBox {
          background: #102518;
          padding: 12px;
          border-radius: 10px;
          margin-top: 12px;
          font-size: 11px;
          overflow-wrap: anywhere;
        }

        .fileBox strong { color: #00e676; }

        .mainButton {
          display: inline-block;
          background: #00e676;
          color: #041007;
          border: none;
          border-radius: 10px;
          padding: 14px;
          font-weight: 900;
          font-size: 11px;
          text-decoration: none;
          text-align: center;
          margin-top: 12px;
        }

        .full { width: 100%; }

        .mainButton:disabled {
          opacity: .45;
        }

        .success, .error, .warning {
          padding: 12px;
          border-radius: 10px;
          font-size: 11px;
          margin-bottom: 12px;
          overflow-wrap: anywhere;
        }

        .success {
          background: #10361d;
          color: #00e676;
        }

        .error, .warning {
          background: #381b1b;
          color: #ff8b8b;
        }

        .voiceCard {
          padding: 13px;
          border: 1px solid #25452d;
          border-radius: 13px;
          background: #0b140e;
          margin-top: 12px;
        }

        .voiceTop {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .voiceIcon { font-size: 30px; }

        .voiceInfo { min-width: 0; }

        .voiceInfo h3 {
          margin: 0 0 5px;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .voiceInfo p {
          color: #8ba092;
          font-size: 10px;
          margin: 0 0 6px;
        }

        .voiceInfo small {
          color: #00e676;
          font-size: 9px;
        }

        .voiceId {
          color: #829688;
          font-size: 9px;
          margin-top: 12px;
          overflow-wrap: anywhere;
        }

        .deleteButton {
          width: 100%;
          background: #381919;
          border: 1px solid #793333;
          color: #ff7777;
          border-radius: 9px;
          padding: 11px;
          margin-top: 8px;
          font-size: 10px;
          font-weight: 900;
        }

        .empty {
          text-align: center;
          padding: 25px 8px;
        }

        .empty div { font-size: 40px; }

        .empty p {
          color: #84978a;
          font-size: 11px;
        }

        .managementItem {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #0b140e;
          border: 1px solid #223c29;
          border-radius: 10px;
          padding: 12px;
          margin-top: 10px;
        }

        .managementItem > span { font-size: 22px; }

        .managementItem div { flex: 1; min-width: 0; }

        .managementItem strong { font-size: 11px; }

        .managementItem p {
          color: #8da194;
          font-size: 9px;
          margin: 5px 0 0;
        }

        .managementItem b {
          color: #00e676;
          font-size: 8px;
          text-align: right;
        }

        .managementItem a {
          color: #00e676;
          font-size: 10px;
        }

        .refreshButton {
          width: 100%;
          background: #1a2b1e;
          border: 1px solid #345e3e;
          color: white;
          padding: 13px;
          border-radius: 10px;
          margin-top: 15px;
          font-weight: 900;
        }

        footer {
          text-align: center;
          margin-top: 30px;
          color: #00e676;
          font-weight: 900;
          font-size: 10px;
        }

        footer small {
          display: block;
          color: #64766a;
          font-size: 8px;
          margin-top: 5px;
        }
      `}</style>
    </main>
  );
}