"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EXISTING_VOICES = [
  {
    name: "Main Naija Pidgin",
    gender: "Male",
    id: "BXStbbwwT5cKeWf2Ik8O",
  },
  {
    name: "Warri Babe",
    gender: "Female",
    id: "w5p3k3PueAgQOT4lq0SF",
  },
];

export default function ClonePage() {
  const [voiceName, setVoiceName] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceId, setVoiceId] = useState("");
  const [requiresVerification, setRequiresVerification] =
    useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

  const startRecording = async () => {
    try {
      setStatus("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("❌ Your browser does not support microphone recording.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

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

        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);

        setAudioURL((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return url;
        });

        setStatus(
          "✅ Recording complete! Listen before creating your clone."
        );

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start(1000);
      setRecording(true);
      setStatus("🔴 Recording... Speak clearly and naturally.");

      // Automatically stop after 90 seconds.
      timerRef.current = setTimeout(() => {
        stopRecording();
      }, 90000);
    } catch (error) {
      console.error(error);
      setStatus("❌ Microphone permission denied. Allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const recorder = recorderRef.current;

    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }

    setRecording(false);
  };

  const createVoiceClone = async () => {
    if (!voiceName.trim()) {
      setStatus("❌ Enter a name for your voice.");
      return;
    }

    if (!audioBlob) {
      setStatus("❌ Record your voice first.");
      return;
    }

    if (audioBlob.size < 50000) {
      setStatus("❌ Recording is too short. Record a clearer sample.");
      return;
    }

    try {
      setLoading(true);
      setStatus("⏳ Connecting to ElevenLabs...");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setStatus("❌ Please log in again before creating a clone.");
        return;
      }

      const formData = new FormData();

      formData.append("name", voiceName.trim());

      const file = new File(
        [audioBlob],
        "voice-sample.webm",
        { type: audioBlob.type || "audio/webm" }
      );

      formData.append("audio", file);

      const response = await fetch("/api/voice-clone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Voice cloning failed."
        );
      }

      if (!result.voice_id) {
        throw new Error("ElevenLabs did not return a Voice ID.");
      }

      setVoiceId(result.voice_id);

      setRequiresVerification(
        Boolean(result.requires_verification)
      );

      setStatus(
        result.requires_verification
          ? "⚠️ Voice created. Verification is required before activation."
          : "🎉 Your real ElevenLabs voice clone was created!"
      );
    } catch (error) {
      console.error(error);

      setStatus(
        error instanceof Error
          ? `❌ ${error.message}`
          : "❌ Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioURL("");
    setVoiceId("");
    setRequiresVerification(false);
    setStatus("");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#080C08",
        color: "white",
        padding: "18px 14px 35px",
        maxWidth: 480,
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header style={{ marginBottom: 25 }}>
        <p
          style={{
            color: "#00E676",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          MAIN NAIJA PIDGIN
        </p>

        <h1 style={{ fontSize: 25, fontWeight: 900 }}>
          🎙️ VOICE CLONING
        </h1>

        <p style={{ color: "#999", fontSize: 13, lineHeight: 1.6 }}>
          Create a real AI voice clone with ElevenLabs.
          Use a clear recording of your own voice or a voice
          you have permission to clone.
        </p>
      </header>

      <section
        style={{
          background: "#111A11",
          padding: 16,
          borderRadius: 16,
          border: "1px solid #243824",
          marginBottom: 20,
        }}
      >
        <h3 style={{ color: "#00E676", marginTop: 0 }}>
          Your Existing Marketplace Voices
        </h3>

        {EXISTING_VOICES.map((voice) => (
          <div
            key={voice.id}
            style={{
              padding: 12,
              background: "#080C08",
              borderRadius: 10,
              marginTop: 10,
            }}
          >
            <strong>{voice.name}</strong>

            <div style={{ color: "#999", fontSize: 12 }}>
              {voice.gender} voice
            </div>

            <div
              style={{
                color: "#777",
                fontSize: 10,
                marginTop: 5,
                overflowWrap: "anywhere",
              }}
            >
              Voice ID: {voice.id}
            </div>
          </div>
        ))}
      </section>

      <section
        style={{
          background: "#111A11",
          padding: 16,
          borderRadius: 16,
          border: "1px solid #243824",
        }}
      >
        <h3 style={{ color: "#00E676", marginTop: 0 }}>
          Create a New Voice Clone
        </h3>

        <label style={{ fontSize: 12, color: "#BBB" }}>
          Give your voice a name
        </label>

        <input
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="e.g. Port Harcourt Male Voice"
          disabled={loading}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 14,
            marginTop: 8,
            background: "#080C08",
            color: "white",
            border: "1px solid #304530",
            borderRadius: 10,
            outline: "none",
          }}
        />

        <p style={{ color: "#999", fontSize: 12, lineHeight: 1.6 }}>
          Record a clear, natural voice sample. Aim for
          1–2 minutes where possible. Avoid music and
          background noise.
        </p>

        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={loading}
          style={{
            width: "100%",
            padding: 16,
            marginTop: 10,
            background: recording ? "#FF5252" : "#00E676",
            color: recording ? "white" : "black",
            border: "none",
            borderRadius: 12,
            fontWeight: 900,
            fontSize: 15,
          }}
        >
          {recording
            ? "⏹ STOP RECORDING"
            : "🎙️ START RECORDING"}
        </button>

        {audioURL && (
          <div
            style={{
              marginTop: 18,
              padding: 13,
              background: "#080C08",
              borderRadius: 12,
            }}
          >
            <p style={{ color: "#00E676", fontWeight: 900 }}>
              LISTEN TO YOUR RECORDING
            </p>

            <audio
              controls
              src={audioURL}
              style={{ width: "100%" }}
            />

            <button
              onClick={resetRecording}
              disabled={loading}
              style={{
                width: "100%",
                padding: 12,
                marginTop: 12,
                background: "#263326",
                color: "white",
                border: "none",
                borderRadius: 9,
              }}
            >
              Record Again
            </button>
          </div>
        )}

        <button
          onClick={createVoiceClone}
          disabled={!audioBlob || recording || loading || !!voiceId}
          style={{
            width: "100%",
            padding: 16,
            marginTop: 18,
            background:
              !audioBlob || loading || !!voiceId
                ? "#444"
                : "#FFD600",
            color: "black",
            border: "none",
            borderRadius: 12,
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          {loading
            ? "⏳ CREATING YOUR CLONE..."
            : "🚀 CREATE REAL VOICE CLONE"}
        </button>
      </section>

      {status && (
        <div
          style={{
            marginTop: 16,
            padding: 13,
            background: "#111A11",
            borderRadius: 10,
            color: status.includes("❌")
              ? "#FF5252"
              : "#00E676",
            fontSize: 12,
            lineHeight: 1.6,
            overflowWrap: "anywhere",
          }}
        >
          {status}
        </div>
      )}

      {voiceId && (
        <section
          style={{
            marginTop: 18,
            padding: 16,
            background: "#102010",
            border: "1px solid #00E676",
            borderRadius: 14,
          }}
        >
          <h3 style={{ color: "#00E676" }}>
            ✅ REAL VOICE CLONE CREATED
          </h3>

          <p style={{ fontSize: 12, color: "#CCC" }}>
            Voice name: {voiceName}
          </p>

          <p style={{ fontSize: 12, color: "#CCC" }}>
            ElevenLabs Voice ID:
          </p>

          <code
            style={{
              display: "block",
              padding: 10,
              background: "#080C08",
              borderRadius: 8,
              overflowWrap: "anywhere",
              color: "#FFD600",
              fontSize: 12,
            }}
          >
            {voiceId}
          </code>

          <p style={{ fontSize: 12, color: "#CCC" }}>
            {requiresVerification
              ? "Verification is still required before this voice can be activated."
              : "Your clone has been saved. Marketplace publishing can be managed separately."}
          </p>
        </section>
      )}

      <a
        href="/"
        style={{
          display: "block",
          marginTop: 20,
          padding: 14,
          background: "white",
          color: "black",
          borderRadius: 10,
          textAlign: "center",
          textDecoration: "none",
          fontWeight: 900,
        }}
      >
        GO TO MARKETPLACE →
      </a>
    </main>
  );
}