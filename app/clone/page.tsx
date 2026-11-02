"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_RECORDING_SECONDS = 30;

type Voice = {
  id: string;
  name: string;
  voice_id: string;
  gender: string;
  category?: string;
  requiresVerification?: boolean;
};

const EXISTING_VOICES: Voice[] = [
  {
    id: "main-naija",
    name: "Main Naija Pidgin - Male",
    voice_id: "BXStbbwwT5cKeWf2Ik8O",
    gender: "male",
    category: "main",
  },
  {
    id: "warri-babe",
    name: "Warri Babe - Female",
    voice_id: "w5p3k3PueAgQOT4lq0SF",
    gender: "female",
    category: "main",
  },
];

export default function ChairmanStudioReal() {
  // Chairman authentication
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Voices
  const [voices, setVoices] = useState<Voice[]>(EXISTING_VOICES);
  const [selectedVoiceId, setSelectedVoiceId] = useState(
    EXISTING_VOICES[0].voice_id
  );

  // Speech generation
  const [text, setText] = useState(
    "How far my people, na Chairman dey here! Main Naija Pidgin don land gbam!"
  );
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [generateError, setGenerateError] = useState("");

  // Clone creation
  const [voiceName, setVoiceName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cloneError, setCloneError] = useState("");
  const [cloneMessage, setCloneMessage] = useState("");

  // General loading
  const [loading, setLoading] = useState<
    "none" | "cloning" | "generating" | "loadingVoices"
  >("none");

  // Recording references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ------------------------------------------------
  // AUTHENTICATION
  // ------------------------------------------------

  const verifyChairman = async (user: any): Promise<boolean> => {
    if (!user || user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      return false;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("email,is_chairman")
      .eq("id", user.id)
      .single();

    if (error || !data) return false;

    return (
      data.email?.toLowerCase() === CHAIRMAN_EMAIL &&
      data.is_chairman === true
    );
  };

  const checkSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setIsLoggedIn(false);
        return;
      }

      const allowed = await verifyChairman(session.user);

      if (allowed) {
        setIsLoggedIn(true);
        await loadVoices();
      } else {
        setIsLoggedIn(false);
        await supabase.auth.signOut();
        setAuthError("This account is not authorised for Chairman access.");
      }
    } catch {
      setIsLoggedIn(false);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Run outside the auth callback to avoid Supabase callback deadlocks.
      setTimeout(async () => {
        if (!session) {
          setIsLoggedIn(false);
          return;
        }

        const allowed = await verifyChairman(session.user);

        if (allowed) {
          setIsLoggedIn(true);
          await loadVoices();
        } else {
          setIsLoggedIn(false);
          await supabase.auth.signOut();
        }
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
      stopRecordingCleanup();

      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      if (generatedUrl) URL.revokeObjectURL(generatedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    if (!password.trim()) {
      setAuthError("Enter your Chairman password.");
      return;
    }

    setLoginLoading(true);
    setAuthError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: CHAIRMAN_EMAIL,
        password,
      });

      if (error) throw error;

      const allowed = await verifyChairman(data.user);

      if (!allowed) {
        await supabase.auth.signOut();
        throw new Error("Chairman account verification failed.");
      }

      setIsLoggedIn(true);
      setPassword("");
      await loadVoices();
    } catch (error: any) {
      setAuthError(error.message || "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    stopRecordingCleanup();

    await supabase.auth.signOut();

    setIsLoggedIn(false);
    setPassword("");
    setGeneratedUrl("");
    setAuthError("");
  };

  // ------------------------------------------------
  // ACCESS TOKEN
  // ------------------------------------------------

  const getAccessToken = async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("Your session has expired. Please log in again.");
    }

    const allowed = await verifyChairman(session.user);

    if (!allowed) {
      throw new Error("Chairman authorisation failed.");
    }

    return session.access_token;
  };

  // ------------------------------------------------
  // LOAD VOICES
  // ------------------------------------------------

  const loadVoices = async () => {
    setLoading("loadingVoices");

    try {
      const { data, error } = await supabase
        .from("cloned_voices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Voice loading error:", error.message);
      }

      const databaseVoices: Voice[] = (data || [])
        .map((voice: any) => ({
          id: String(voice.id),
          name: voice.name || "Unnamed Voice",
          voice_id:
            voice.elevenlabs_voice_id || voice.voice_id || "",
          gender: voice.gender || "male",
          category: voice.category || "cloned",
          requiresVerification: voice.is_active === false,
        }))
        .filter((voice) => Boolean(voice.voice_id));

      const merged = new Map<string, Voice>();

      // Keep the two existing voices.
      EXISTING_VOICES.forEach((voice) => {
        merged.set(voice.voice_id, voice);
      });

      // Add database voices without removing existing ones.
      databaseVoices.forEach((voice) => {
        merged.set(voice.voice_id, voice);
      });

      const finalVoices = Array.from(merged.values());

      setVoices(finalVoices);

      setSelectedVoiceId((current) => {
        if (finalVoices.some((voice) => voice.voice_id === current)) {
          return current;
        }

        return finalVoices[0]?.voice_id || "";
      });
    } catch (error: any) {
      console.error("Could not load voices:", error.message);
      setVoices(EXISTING_VOICES);
    } finally {
      setLoading("none");
    }
  };

  // ------------------------------------------------
  // RECORDING CLEANUP
  // ------------------------------------------------

  const stopRecordingCleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());

    streamRef.current = null;
    setRecording(false);
  };

  // ------------------------------------------------
  // START RECORDING
  // ------------------------------------------------

  const startRecording = async () => {
    setCloneError("");
    setCloneMessage("");
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone recording is unavailable. Use HTTPS and allow microphone access."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      let mimeType = "";

      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const actualType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, {
          type: actualType,
        });

        setRecordedBlob(blob);

        setRecordedUrl((oldUrl) => {
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          return URL.createObjectURL(blob);
        });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start(1000);
      setRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((seconds) => {
          const next = seconds + 1;

          if (next >= MAX_RECORDING_SECONDS) {
            if (recorder.state === "recording") {
              recorder.stop();
            }

            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }

            setRecording(false);
          }

          return next;
        });
      }, 1000);
    } catch (error: any) {
      setCloneError(error.message || "Could not start microphone.");
      stopRecordingCleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    setRecording(false);
  };

  const clearRecording = () => {
    setRecordedBlob(null);

    setRecordedUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return "";
    });

    setUploadFile(null);
    setRecordingSeconds(0);
  };

  // ------------------------------------------------
  // CREATE REAL VOICE CLONE
  // ------------------------------------------------

  const handleCreateClone = async () => {
    setCloneError("");
    setCloneMessage("");

    if (!voiceName.trim()) {
      setCloneError("Enter a name for this voice.");
      return;
    }

    const fileToSend =
      uploadFile ||
      (recordedBlob
        ? new File(
            [recordedBlob],
            "chairman-voice-sample.webm",
            { type: recordedBlob.type || "audio/webm" }
          )
        : null);

    if (!fileToSend) {
      setCloneError("Record or upload an audio sample first.");
      return;
    }

    if (fileToSend.size === 0) {
      setCloneError("The selected audio file is empty.");
      return;
    }

    setLoading("cloning");

    try {
      const token = await getAccessToken();

      const form = new FormData();

      // This field must match the existing API route.
      form.append("audio", fileToSend);
      form.append("name", voiceName.trim());
      form.append("gender", gender);

      const response = await fetch("/api/voice-clone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Voice cloning failed."
        );
      }

      const createdVoiceId =
        result.voice_id || result.elevenlabs_voice_id;

      setCloneMessage(
        result.requiresVerification
          ? "Voice submitted. It may require verification before use."
          : "Voice clone created successfully."
      );

      setVoiceName("");
      setUploadFile(null);
      setRecordedBlob(null);

      setRecordedUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return "";
      });

      await loadVoices();

      if (createdVoiceId) {
        setSelectedVoiceId(createdVoiceId);
      }
    } catch (error: any) {
      setCloneError(error.message || "Could not create voice clone.");
    } finally {
      setLoading("none");
    }
  };

  // ------------------------------------------------
  // GENERATE REAL SPEECH
  // ------------------------------------------------

  const handleGenerate = async () => {
    setGenerateError("");

    if (!selectedVoiceId) {
      setGenerateError("Select a voice first.");
      return;
    }

    if (!text.trim()) {
      setGenerateError("Enter some text to generate.");
      return;
    }

    const selected = voices.find(
      (voice) => voice.voice_id === selectedVoiceId
    );

    if (selected?.requiresVerification) {
      setGenerateError(
        "This cloned voice is awaiting verification and cannot be used yet."
      );
      return;
    }

    setLoading("generating");

    setGeneratedUrl((oldUrl) => {
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      return "";
    });

    try {
      const token = await getAccessToken();

      const response = await fetch("/api/voice-clone/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: text.trim(),
          voice_id: selectedVoiceId,
        }),
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));

        throw new Error(
          errorResult.error ||
            errorResult.message ||
            `Speech generation failed: ${response.status}`
        );
      }

      const contentType =
        response.headers.get("content-type") || "";

      if (
        contentType.includes("audio/") ||
        contentType.includes("octet-stream")
      ) {
        const audioBlob = await response.blob();

        if (audioBlob.size === 0) {
          throw new Error("The server returned an empty audio file.");
        }

        setGeneratedUrl(URL.createObjectURL(audioBlob));
      } else {
        const result = await response.json();

        const audioUrl =
          result.audioUrl ||
          result.audio_url ||
          result.url;

        if (audioUrl) {
          setGeneratedUrl(audioUrl);
        } else if (result.audioBase64) {
          setGeneratedUrl(
            `data:audio/mpeg;base64,${result.audioBase64}`
          );
        } else {
          throw new Error("The server did not return playable audio.");
        }
      }
    } catch (error: any) {
      setGenerateError(error.message || "Speech generation failed.");
    } finally {
      setLoading("none");
    }
  };

  const selectedVoice = voices.find(
    (voice) => voice.voice_id === selectedVoiceId
  );

  // ------------------------------------------------
  // AUTH LOADING
  // ------------------------------------------------

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050807",
          color: "#22c55e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
        }}
      >
        Checking Chairman access...
      </div>
    );
  }

  // ------------------------------------------------
  // LOGIN SCREEN
  // ------------------------------------------------

  if (!isLoggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#050807",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            background: "#0a100d",
            border: "1px solid #1a2e22",
            borderRadius: "16px",
            padding: "24px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{ fontSize: "32px" }}>👑</div>

            <h1
              style={{
                color: "#22c55e",
                margin: "8px 0 0",
                fontSize: "22px",
              }}
            >
              Main Naija Pidgin
            </h1>

            <p style={{ color: "#6b7280", fontSize: "12px" }}>
              Chairman Voice Studio
            </p>
          </div>

          <input
            value={CHAIRMAN_EMAIL}
            readOnly
            style={{
              width: "100%",
              height: "54px",
              boxSizing: "border-box",
              background: "#050807",
              border: "1px solid #1f3a26",
              borderRadius: "10px",
              color: "#fff",
              WebkitTextFillColor: "#fff",
              padding: "0 14px",
              marginBottom: "12px",
            }}
          />

          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleLogin();
            }}
            placeholder="Enter Chairman password"
            style={{
              width: "100%",
              height: "54px",
              boxSizing: "border-box",
              background: "#050807",
              border: "1px solid #1f3a26",
              borderRadius: "10px",
              color: "#fff",
              WebkitTextFillColor: "#fff",
              padding: "0 14px",
              marginBottom: "16px",
            }}
          />

          {authError && (
            <div
              style={{
                background: "#2a0f0f",
                color: "#fca5a5",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "12px",
                fontSize: "13px",
              }}
            >
              {authError}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loginLoading}
            style={{
              width: "100%",
              height: "52px",
              background: "#22c55e",
              color: "#000",
              border: "none",
              borderRadius: "10px",
              fontWeight: "bold",
              opacity: loginLoading ? 0.7 : 1,
            }}
          >
            {loginLoading ? "Checking..." : "Enter Voice Studio"}
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------
  // CHAIRMAN STUDIO
  // ------------------------------------------------

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020403",
        color: "#fff",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* HEADER */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            padding: "12px 0",
            marginBottom: "12px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "19px" }}>
              👑 Chairman Studio
            </h2>

            <p
              style={{
                color: "#22c55e",
                fontSize: "11px",
                margin: "5px 0 0",
              }}
            >
              MAIN NAIJA PIDGIN • VOICE MANAGEMENT
            </p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: "#1a2e22",
              color: "#22c55e",
              border: "1px solid #22c55e",
              padding: "9px 13px",
              borderRadius: "8px",
            }}
          >
            Logout
          </button>
        </div>

        {/* VOICE SELECTOR */}

        <div style={cardStyle}>
          <h3 style={headingStyle}>
            🎚️ Select Voice ({voices.length})
          </h3>

          <select
            value={selectedVoiceId}
            onChange={(event) =>
              setSelectedVoiceId(event.target.value)
            }
            style={inputStyle}
          >
            {voices.map((voice) => (
              <option
                key={voice.voice_id}
                value={voice.voice_id}
              >
                {voice.name} • {voice.gender}
                {voice.requiresVerification ? " • Pending" : ""}
              </option>
            ))}
          </select>

          {selectedVoice?.requiresVerification && (
            <p style={warningStyle}>
              This voice is awaiting verification.
            </p>
          )}

          <button
            onClick={loadVoices}
            disabled={loading === "loadingVoices"}
            style={smallButtonStyle}
          >
            ↻ {loading === "loadingVoices" ? "Loading..." : "Reload voices"}
          </button>
        </div>

        {/* SPEECH GENERATION */}

        <div style={cardStyle}>
          <h3 style={headingStyle}>🗣️ Generate Pidgin Speech</h3>

          <p style={descriptionStyle}>
            Generate speech using your selected ElevenLabs voice.
            Chairman testing does not use Marketplace credits.
          </p>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Type your Naija Pidgin text..."
            style={{
              ...inputStyle,
              height: "120px",
              padding: "12px",
              resize: "vertical",
            }}
          />

          <button
            onClick={handleGenerate}
            disabled={loading === "generating"}
            style={primaryButtonStyle}
          >
            {loading === "generating"
              ? "⏳ Generating real voice..."
              : `🔊 Generate with ${selectedVoice?.name || "Selected Voice"}`}
          </button>

          {generateError && (
            <p style={errorStyle}>{generateError}</p>
          )}

          {generatedUrl && (
            <div style={audioBoxStyle}>
              <p style={successStyle}>✅ Generated audio</p>

              <audio
                controls
                src={generatedUrl}
                style={{ width: "100%" }}
              />

              <a
                href={generatedUrl}
                download="Main-Naija-Pidgin-Voice.mp3"
                style={{
                  display: "inline-block",
                  marginTop: "12px",
                  color: "#22c55e",
                  fontSize: "13px",
                }}
              >
                ⬇️ Download audio
              </a>
            </div>
          )}
        </div>

        {/* CLONE CREATION */}

        <div style={cardStyle}>
          <h3 style={headingStyle}>🎙️ Create a New Voice Clone</h3>

          <p style={descriptionStyle}>
            Record a voice sample or upload an existing audio file.
            Listen to the recording before submitting it.
          </p>

          <input
            value={voiceName}
            onChange={(event) => setVoiceName(event.target.value)}
            placeholder="Enter voice name"
            style={{ ...inputStyle, marginBottom: "12px" }}
          />

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setGender("male")}
              style={{
                ...genderButtonStyle,
                background: gender === "male" ? "#22c55e" : "#1a2e22",
                color: gender === "male" ? "#000" : "#fff",
              }}
            >
              👨 Male
            </button>

            <button
              onClick={() => setGender("female")}
              style={{
                ...genderButtonStyle,
                background: gender === "female" ? "#ec4899" : "#1a2e22",
                color: "#fff",
              }}
            >
              👩 Female
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "14px",
            }}
          >
            <button
              onClick={recording ? stopRecording : startRecording}
              style={{
                ...genderButtonStyle,
                background: recording ? "#dc2626" : "#1a2e22",
                color: "#fff",
              }}
            >
              {recording ? "⏹ Stop" : "🎙️ Record"}
            </button>

            <label
              style={{
                ...genderButtonStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              🎧 Upload audio

              <input
                type="file"
                accept="audio/*"
                hidden
                onChange={(event) => {
                  setUploadFile(event.target.files?.[0] || null);
                  setCloneError("");
                  setCloneMessage("");
                }}
              />
            </label>
          </div>

          {recording && (
            <p style={warningStyle}>
              🔴 Recording: {recordingSeconds}s /{" "}
              {MAX_RECORDING_SECONDS}s
            </p>
          )}

          {recordedUrl && (
            <div style={audioBoxStyle}>
              <p style={successStyle}>🎧 Listen to your recording</p>

              <audio
                controls
                src={recordedUrl}
                style={{ width: "100%" }}
              />

              <button
                onClick={clearRecording}
                style={smallButtonStyle}
              >
                Clear recording
              </button>
            </div>
          )}

          {uploadFile && (
            <p style={successStyle}>
              ✅ Uploaded: {uploadFile.name}
            </p>
          )}

          {cloneError && (
            <p style={errorStyle}>{cloneError}</p>
          )}

          {cloneMessage && (
            <p style={successStyle}>{cloneMessage}</p>
          )}

          <button
            onClick={handleCreateClone}
            disabled={loading === "cloning" || recording}
            style={{
              ...primaryButtonStyle,
              background: "#fff",
              color: "#000",
            }}
          >
            {loading === "cloning"
              ? "⏳ Creating voice clone..."
              : `Create ${gender} Voice Clone`}
          </button>

          <p style={descriptionStyle}>
            Existing voice records are not intentionally deleted by
            this page. New clones are submitted through your existing
            backend.
          </p>
        </div>

        <p
          style={{
            textAlign: "center",
            color: "#4b5563",
            fontSize: "11px",
            padding: "12px 0 24px",
          }}
        >
          MAIN NAIJA PIDGIN • CHAIRMAN VOICE STUDIO
        </p>
      </div>
    </div>
  );
}

// ------------------------------------------------
// SHARED MOBILE-FIRST STYLES
// ------------------------------------------------

const cardStyle: React.CSSProperties = {
  background: "#0a100d",
  border: "1px solid #1a2e22",
  borderRadius: "16px",
  padding: "18px",
  marginBottom: "16px",
};

const headingStyle: React.CSSProperties = {
  color: "#22c55e",
  margin: "0 0 12px",
  fontSize: "17px",
};

const descriptionStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: 1.6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "48px",
  boxSizing: "border-box",
  background: "#050807",
  color: "#fff",
  border: "1px solid #1f3a26",
  borderRadius: "10px",
  padding: "0 12px",
  outline: "none",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "50px",
  marginTop: "12px",
  background: "#22c55e",
  color: "#000",
  border: "none",
  borderRadius: "10px",
  fontWeight: "bold",
  cursor: "pointer",
};

const genderButtonStyle: React.CSSProperties = {
  flex: 1,
  minHeight: "44px",
  border: "1px solid #1f3a26",
  borderRadius: "9px",
  fontWeight: "bold",
};

const smallButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#22c55e",
  border: "none",
  padding: "10px 0",
  fontSize: "12px",
  cursor: "pointer",
};

const audioBoxStyle: React.CSSProperties = {
  marginTop: "14px",
  background: "#050807",
  border: "1px solid #22c55e",
  borderRadius: "10px",
  padding: "12px",
};

const successStyle: React.CSSProperties = {
  color: "#86efac",
  fontSize: "13px",
  overflowWrap: "anywhere",
};

const warningStyle: React.CSSProperties = {
  color: "#fbbf24",
  fontSize: "12px",
};

const errorStyle: React.CSSProperties = {
  background: "#2a0f0f",
  color: "#fca5a5",
  padding: "10px",
  borderRadius: "8px",
  fontSize: "12px",
  overflowWrap: "anywhere",
};