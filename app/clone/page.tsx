"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_RECORDING_SECONDS = 90;

type Voice = {
  name: string;
  gender: "male" | "female";
  id: string;
  requiresVerification?: boolean;
};

const EXISTING_VOICES: Voice[] = [
  {
    name: "Main Naija Pidgin",
    gender: "male",
    id: "BXStbbwwT5cKeWf2Ik8O",
  },
  {
    name: "Warri Babe",
    gender: "female",
    id: "w5p3k3PueAgQOT4lq0SF",
  },
];

export default function ClonePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [email, setEmail] = useState(CHAIRMAN_EMAIL);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [voiceName, setVoiceName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");

  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState("");

  const [voices, setVoices] = useState<Voice[]>(EXISTING_VOICES);
  const [selectedVoiceId, setSelectedVoiceId] = useState(
    EXISTING_VOICES[0].id
  );

  const [cloneLoading, setCloneLoading] = useState(false);
  const [cloneMessage, setCloneMessage] = useState("");

  const [testText, setTestText] = useState(
    "How far my people? Welcome to Main Naija Pidgin."
  );

  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [generatedAudioURL, setGeneratedAudioURL] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --------------------------------------------------
  // VERIFY CHAIRMAN ACCOUNT
  // --------------------------------------------------

  async function verifyChairman(currentSession: Session) {
    try {
      const user = currentSession.user;

      if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
        setAuthorized(false);
        setSession(null);
        await supabase.auth.signOut();
        setLoginError("Access denied. Chairman account only.");
        return false;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("email,is_chairman")
        .eq("id", user.id)
        .maybeSingle();

      if (
        error ||
        !profile ||
        profile.email?.toLowerCase() !== CHAIRMAN_EMAIL ||
        profile.is_chairman !== true
      ) {
        setAuthorized(false);
        setSession(null);
        await supabase.auth.signOut();
        setLoginError("Chairman profile could not be verified.");
        return false;
      }

      setSession(currentSession);
      setAuthorized(true);
      setLoginError("");

      return true;
    } catch {
      setAuthorized(false);
      setLoginError("Unable to verify Chairman account.");
      return false;
    }
  }

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (data.session) {
        await verifyChairman(data.session);
      }

      if (mounted) setAuthLoading(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      if (!newSession) {
        setSession(null);
        setAuthorized(false);
      } else {
        setSession(newSession);
        setTimeout(() => {
          if (mounted) void verifyChairman(newSession);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // --------------------------------------------------
  // CHAIRMAN LOGIN
  // --------------------------------------------------

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoginLoading(true);
    setLoginError("");

    try {
      if (email.trim().toLowerCase() !== CHAIRMAN_EMAIL) {
        setLoginError("Only the Chairman account can access this page.");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: CHAIRMAN_EMAIL,
        password,
      });

      if (error || !data.session) {
        setLoginError(error?.message || "Login failed.");
        return;
      }

      await verifyChairman(data.session);
    } catch {
      setLoginError("Something went wrong during login.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await stopRecording();

    await supabase.auth.signOut();

    setSession(null);
    setAuthorized(false);
    setPassword("");
  }

  // --------------------------------------------------
  // RECORD VOICE SAMPLE
  // --------------------------------------------------

  async function startRecording() {
    try {
      setCloneMessage("");
      setAudioBlob(null);
      setAudioURL("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported(
        "audio/webm;codecs=opus"
      )
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

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
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      recorder.start();

      setRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((previous) => {
          if (previous + 1 >= MAX_RECORDING_SECONDS) {
            void stopRecording();
            return MAX_RECORDING_SECONDS;
          }

          return previous + 1;
        });
      }, 1000);
    } catch (error) {
      console.error(error);
      setCloneMessage(
        "Microphone access failed. Please allow microphone permission."
      );
    }
  }

  async function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    setRecording(false);
  }

  function clearRecording() {
    if (recording) {
      void stopRecording();
    }

    if (audioURL) URL.revokeObjectURL(audioURL);

    setAudioURL("");
    setAudioBlob(null);
    setRecordingSeconds(0);
    setCloneMessage("");
  }

  // --------------------------------------------------
  // CREATE REAL ELEVENLABS VOICE CLONE
  // --------------------------------------------------

  async function createVoiceClone() {
    if (!session?.access_token) {
      setCloneMessage("Please log in again.");
      return;
    }

    if (!voiceName.trim()) {
      setCloneMessage("Please enter a name for your voice.");
      return;
    }

    if (!audioBlob) {
      setCloneMessage("Please record a voice sample first.");
      return;
    }

    setCloneLoading(true);
    setCloneMessage("");

    try {
      const formData = new FormData();

      const extension = audioBlob.type.includes("mp4")
        ? "m4a"
        : audioBlob.type.includes("wav")
        ? "wav"
        : "webm";

      formData.append("name", voiceName.trim());
      formData.append("gender", gender);
      formData.append(
        "audio",
        audioBlob,
        `chairman-voice.${extension}`
      );

      const response = await fetch("/api/voice-clone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || "Voice creation failed.");
      }

      // The backend returns the voice inside result.voice.
      const newVoice = result.voice;

      if (!newVoice?.voice_id) {
        throw new Error("Voice was created but no Voice ID was returned.");
      }

      const createdVoice: Voice = {
        name: newVoice.name || voiceName.trim(),
        gender,
        id: newVoice.voice_id,
        requiresVerification: Boolean(newVoice.requires_verification),
      };

      setVoices((previous) => [
        ...previous.filter((voice) => voice.id !== createdVoice.id),
        createdVoice,
      ]);

      if (!createdVoice.requiresVerification) {
        setSelectedVoiceId(createdVoice.id);
      }

      setCloneMessage(
        createdVoice.requiresVerification
          ? "Voice created. ElevenLabs verification is required before testing this clone."
          : "Your voice clone was created successfully. You can now test it below."
      );

      setVoiceName("");
      clearRecording();
    } catch (error) {
      setCloneMessage(
        error instanceof Error ? error.message : "Voice creation failed."
      );
    } finally {
      setCloneLoading(false);
    }
  }

  // --------------------------------------------------
  // TEST VOICE WITHOUT MARKETPLACE CREDITS
  // --------------------------------------------------

  async function generateSpeech() {
    if (!session?.access_token) {
      setTestMessage("Please log in again.");
      return;
    }

    if (!testText.trim()) {
      setTestMessage("Enter a message to generate speech.");
      return;
    }

    const selectedVoice = voices.find(
      (voice) => voice.id === selectedVoiceId
    );

    if (selectedVoice?.requiresVerification) {
      setTestMessage(
        "This cloned voice needs ElevenLabs verification before testing."
      );
      return;
    }

    setTestLoading(true);
    setTestMessage("");

    try {
      const response = await fetch("/api/voice-clone/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text: testText.trim(),
          voiceId: selectedVoiceId,
        }),
      });

      if (!response.ok) {
        let message = "Speech generation failed.";

        try {
          const result = await response.json();
          message = result.error || result.message || message;
        } catch {
          // Keep fallback message.
        }

        throw new Error(message);
      }

      const audio = await response.blob();

      if (!audio.size) {
        throw new Error("The voice returned an empty audio file.");
      }

      if (generatedAudioURL) {
        URL.revokeObjectURL(generatedAudioURL);
      }

      const newURL = URL.createObjectURL(audio);

      setGeneratedAudioURL(newURL);
      setTestMessage(
        "Speech generated successfully. Your Marketplace credits were not used."
      );
    } catch (error) {
      setTestMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate speech."
      );
    } finally {
      setTestLoading(false);
    }
  }

  // --------------------------------------------------
  // CLEANUP AUDIO URLS
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (generatedAudioURL) URL.revokeObjectURL(generatedAudioURL);
    };
  }, [audioURL, generatedAudioURL]);

  // --------------------------------------------------
  // LOGIN SCREEN
  // --------------------------------------------------

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#050807] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-3xl mb-3">🎙️</div>
          <p className="text-green-400 font-semibold">
            Checking Chairman access...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#050807] text-white flex items-center justify-center p-5">
        <div className="w-full max-w-md bg-[#101915] border border-green-900 rounded-3xl p-6 shadow-2xl">
          <div className="text-center mb-7">
            <div className="text-5xl mb-3">👑</div>

            <h1 className="text-2xl font-black text-green-400">
              Main Naija Pidgin
            </h1>

            <p className="text-gray-400 text-sm mt-2">
              Chairman Voice Studio
            </p>

            <div className="inline-block mt-4 text-xs px-3 py-2 rounded-full bg-green-950 text-green-300 border border-green-800">
              CHAIRMAN ACCESS ONLY
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 block mb-2">
                Chairman Email
              </label>

              <input
                type="email"
                value={email}
                readOnly
                className="w-full rounded-xl bg-black border border-gray-700 p-4 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Chairman password"
                required
                className="w-full rounded-xl bg-black border border-gray-700 p-4 text-white outline-none focus:border-green-500"
              />
            </div>

            {loginError && (
              <div className="bg-red-950 border border-red-800 text-red-300 rounded-xl p-3 text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-green-500 hover:bg-green-400 text-black font-bold p-4 disabled:opacity-50"
            >
              {loginLoading ? "Checking access..." : "Enter Voice Studio"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Protected Chairman workspace.
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // MAIN VOICE STUDIO
  // --------------------------------------------------

  return (
    <main className="min-h-screen bg-[#050807] text-white pb-12">
      <header className="sticky top-0 z-20 bg-[#080e0b]/95 backdrop-blur border-b border-green-950 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-green-400 text-xs font-bold tracking-widest">
              MAIN NAIJA PIDGIN
            </p>

            <h1 className="text-xl font-black">
              Chairman Voice Studio
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs border border-red-900 text-red-300 rounded-lg px-3 py-2"
          >
            Logout