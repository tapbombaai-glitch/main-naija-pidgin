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
  // CHAIRMAN VERIFICATION
  // --------------------------------------------------

  async function verifyChairman(currentSession: Session) {
    const user = currentSession.user;

    if (user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      setSession(currentSession);
      setAuthorized(false);
      setLoginError(
        `The currently signed-in account is ${user.email || "unknown"}. Sign out of it and enter the Chairman account.`
      );
      return false;
    }

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("email,is_chairman")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setSession(currentSession);
        setAuthorized(false);
        setLoginError(
          `Could not check Chairman profile: ${error.message}`
        );
        return false;
      }

      if (
        !profile ||
        profile.email?.toLowerCase() !== CHAIRMAN_EMAIL ||
        profile.is_chairman !== true
      ) {
        setSession(currentSession);
        setAuthorized(false);
        setLoginError(
          "Your email is correct, but the profiles table does not confirm is_chairman = true. Chairman access must be enabled for this account."
        );
        return false;
      }

      setSession(currentSession);
      setAuthorized(true);
      setLoginError("");

      return true;
    } catch {
      setAuthorized(false);
      setLoginError("Unable to verify your Chairman profile.");
      return false;
    }
  }

  // --------------------------------------------------
  // CHECK EXISTING LOGIN
  // --------------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          setLoginError(error.message);
        } else if (data.session) {
          await verifyChairman(data.session);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || !newSession) {
        setSession(null);
        setAuthorized(false);
      } else {
        setSession(newSession);
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
      // Clear any previous worker or non-Chairman session.
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: CHAIRMAN_EMAIL,
        password,
      });

      if (error || !data.session) {
        setLoginError(error?.message || "Chairman login failed.");
        return;
      }

      await verifyChairman(data.session);
    } catch {
      setLoginError("Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function clearPreviousLogin() {
    setLoginLoading(true);

    try {
      await supabase.auth.signOut();
      setSession(null);
      setAuthorized(false);
      setPassword("");
      setLoginError("Previous login cleared. Enter your Chairman password.");
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

      if (audioURL) URL.revokeObjectURL(audioURL);

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
        "Microphone access failed. Allow microphone permission in your browser."
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
    if (recording) void stopRecording();

    if (audioURL) URL.revokeObjectURL(audioURL);

    setAudioURL("");
    setAudioBlob(null);
    setRecordingSeconds(0);
    setCloneMessage("");
  }

  // --------------------------------------------------
  // CREATE ELEVENLABS VOICE CLONE
  // --------------------------------------------------

  async function createVoiceClone() {
    if (!session?.access_token) {
      setCloneMessage("Please log in again.");
      return;
    }

    if (!voiceName.trim()) {
      setCloneMessage("Enter a name for your new voice.");
      return;
    }

    if (!audioBlob) {
      setCloneMessage("Record a voice sample first.");
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
        throw new Error(
          result.error || result.message || "Voice creation failed."
        );
      }

      const newVoice = result.voice;

      if (!newVoice?.voice_id) {
        throw new Error("No Voice ID was returned.");
      }

      const createdVoice: Voice = {
        name: newVoice.name || voiceName.trim(),
        gender,
        id: newVoice.voice_id,
        requiresVerification: Boolean(
          newVoice.requires_verification
        ),
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
          ? "Voice created. ElevenLabs verification is required before testing."
          : "Voice clone created successfully. You can test it below."
      );

      setVoiceName("");
      clearRecording();
    } catch (error) {
      setCloneMessage(
        error instanceof Error
          ? error.message
          : "Voice creation failed."
      );
    } finally {
      setCloneLoading(false);
    }
  }

  // --------------------------------------------------
  // GENERATE SPEECH WITHOUT MARKETPLACE CREDITS
  // --------------------------------------------------

  async function generateSpeech() {
    if (!session?.access_token) {
      setTestMessage("Please log in again.");
      return;
    }

    if (!testText.trim()) {
      setTestMessage("Enter a message first.");
      return;
    }

    const selectedVoice = voices.find(
      (voice) => voice.id === selectedVoiceId
    );

    if (selectedVoice?.requiresVerification) {
      setTestMessage(
        "This voice needs ElevenLabs verification before testing."
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
          // Use the fallback message.
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
        "Speech generated successfully. Marketplace credits were not used."
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
  // AUDIO CLEANUP
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL);
      if (generatedAudioURL) URL.revokeObjectURL(generatedAudioURL);
    };
  }, [audioURL, generatedAudioURL]);

  // --------------------------------------------------
  // SMALL PHONE LOADING SCREEN
  // --------------------------------------------------

  if (authLoading) {
    return (
      <main className="min-h-[100svh] bg-[#050807] flex items-center justify-center text-white px-4">
        <div className="text-center">
          <div className="text-3xl mb-2">🎙️</div>
          <p className="text-green-400 text-sm font-semibold">
            Checking Chairman access...
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // COMPACT CHAIRMAN LOGIN
  // --------------------------------------------------

  if (!authorized) {
    return (
      <main className="min-h-[100svh] bg-[#050807] text-white flex items-center justify-center px-3 py-5">
        <div className="w-full max-w-[360px] bg-[#101915] border border-green-900 rounded-2xl p-4 shadow-xl">

          <div className="text-center mb-5">
            <div className="text-3xl mb-1">👑</div>

            <h1 className="text-xl font-black text-green-400">
              Main Naija Pidgin
            </h1>

            <p className="text-gray-400 text-xs mt-1">
              Chairman Voice Studio
            </p>

            <span className="inline-block mt-3 text-[10px] px-3 py-1.5 rounded-full bg-green-950 text-green-300 border border-green-800">
              CHAIRMAN ACCESS ONLY
            </span>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">

            <div>
              <label className="text-xs text-gray-300 block mb-1">
                Chairman Email
              </label>

              <input
                type="email"
                value={CHAIRMAN_EMAIL}
                readOnly
                className="w-full rounded-lg bg-black border border-gray-700 p-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="text-xs text-gray-300 block mb-1">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Chairman password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg bg-black border border-gray-700 p-3 text-sm text-white outline-none focus:border-green-500"
              />
            </div>

            {loginError && (
              <div className="bg-red-950 border border-red-800 text-red-300 rounded-lg p-3 text-xs leading-5 break-words">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-lg bg-green-500 text-black font-bold p-3 text-sm disabled:opacity-50"
            >
              {loginLoading ? "Checking..." : "Enter Voice Studio"}
            </button>
          </form>

          <button
            type="button"
            onClick={clearPreviousLogin}
            disabled={loginLoading}
            className="w-full mt-3 rounded-lg border border-gray-700 text-gray-300 p-2.5 text-xs disabled:opacity-50"
          >
            Clear Previous Login
          </button>

          <p className="text-center text-[10px] text-gray-500 mt-4">
            Secure Chairman Workspace
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------------------------
  // COMPACT MOBILE VOICE STUDIO
  // --------------------------------------------------

  return (
    <main className="min-h-[100svh] bg-[#050807] text-white pb-8">

      <header className="sticky top-0 z-20 bg-[#080e0b]/95 backdrop-blur border-b border-green-950 px-3 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          <div>
            <p className="text-green-400 text-[10px] font-bold tracking-widest">
              MAIN NAIJA PIDGIN
            </p>

            <h1 className="text-base font-black">
              Chairman Voice Studio
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="text-[11px] border border-red-900 text-red-300 rounded-lg px-3 py-2"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-3 py-4 space-y-4">

        <section className="rounded-xl border border-green-900 bg-gradient-to-br from-[#10251a] to-[#080e0b] p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🎙️</div>

            <div>
              <h2 className="text-base font-black text-green-400">
                Create Your Own Voice
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Record, clone and test your Nigerian voices.
              </p>
            </div>
          </div>
        </section>

        {/* VOICE INFORMATION */}

        <section className="rounded-xl border border-gray-800 bg-[#101713] p-4 space-y-3">
          <h2 className="font-bold text-sm">
            1. Voice Information
          </h2>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Voice Name
            </label>

            <input
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              placeholder="Enter voice name"
              className="w-full bg-black border border-gray-700 rounded-lg p-3 text-sm outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Select Gender
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`rounded-lg p-3 text-sm border font-bold ${
                  gender === "male"
                    ? "bg-green-950 border-green-500 text-green-300"
                    : "bg-black border-gray-700 text-gray-400"
                }`}
              >
                👨 Male
              </button>

              <button
                type="button"
                onClick={() => setGender("female")}
                className={`rounded-lg p-3 text-sm border font-bold ${
                  gender === "female"
                    ? "bg-green-950 border-green-500 text-green-300"
                    : "bg-black border-gray-700 text-gray-400"
                }`}
              >
                👩 Female
              </button>
            </div>
          </div>
        </section>

        {/* RECORDING */}

        <section className="rounded-xl border border-gray-800 bg-[#101713] p-4 space-y-3">
          <h2 className="font-bold text-sm">
            2. Record Voice Sample
          </h2>

          <p className="text-xs text-gray-400 leading-5">
            Record in a quiet place. Speak clearly and naturally.
            Maximum recording time is 90 seconds.
          </p>

          <div className="rounded-lg bg-black border border-gray-800 p-4 text-center">
            <div className="text-3xl mb-1">
              {recording ? "🔴" : "🎤"}
            </div>

            <p className="text-xl font-black text-green-400">
              {recordingSeconds}s
            </p>

            <p className="text-[10px] text-gray-500">
              {recording ? "Recording..." : "Recording timer"}
            </p>

            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                className="mt-3 w-full bg-green-500 text-black font-bold rounded-lg p-3 text-sm"
              >
                ● Start Recording
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="mt-3 w-full bg-red-600 text-white font-bold rounded-lg p-3 text-sm"
              >
                ■ Stop Recording
              </button>
            )}
          </div>

          {audioURL && (
            <div className="space-y-2">
              <p className="text-xs text-green-400 font-semibold">
                Voice sample ready
              </p>

              <audio controls src={audioURL} className="w-full" />

              <button
                type="button"
                onClick={clearRecording}
                className="text-xs text-red-400 underline"
              >
                Delete sample and record again
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={createVoiceClone}
            disabled={cloneLoading || recording || !audioBlob}
            className="w-full rounded-lg bg-green-500 text-black font-black p-3 text-sm disabled:opacity-40"
          >
            {cloneLoading ? "Creating Voice..." : "Create Voice Clone"}
          </button>

          {cloneMessage && (
            <div className="rounded-lg bg-black border border-green-900 p-3 text-xs text-green-300 leading-5 break-words">
              {cloneMessage}
            </div>
          )}
        </section>

        {/* SELECT VOICE */}

        <section className="rounded-xl border border-gray-800 bg-[#101713] p-4 space-y-3">
          <h2 className="font-bold text-sm">
            3. Select a Voice
          </h2>

          <div className="space-y-2">
            {voices.map((voice) => (
              <button
                key={voice.id}
                type="button"
                onClick={() => setSelectedVoiceId(voice.id)}
                className={`w-full text-left rounded-lg border p-3 ${
                  selectedVoiceId === voice.id
                    ? "border-green-500 bg-green-950/50"
                    : "border-gray-700 bg-black"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">
                      {voice.name}
                    </p>

                    <p className="text-[10px] text-gray-500 mt-1">
                      {voice.gender.toUpperCase()} VOICE
                    </p>
                  </div>

                  <span className="text-[10px] text-green-400 shrink-0">
                    {voice.requiresVerification
                      ? "Verification needed"
                      : selectedVoiceId === voice.id
                      ? "Selected ✓"
                      : "Select"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* SPEECH TEST */}

        <section className="rounded-xl border border-green-900 bg-[#101713] p-4 space-y-3">
          <div>
            <p className="text-[10px] tracking-widest text-green-400 font-bold">
              CHAIRMAN TEST LAB
            </p>

            <h2 className="text-base font-black mt-1">
              4. Generate Speech
            </h2>
          </div>

          <p className="text-xs text-gray-400 leading-5">
            Type a message and hear your selected voice.
            This private test does not deduct Marketplace credits.
          </p>

          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            rows={4}
            maxLength={5000}
            placeholder="Type your message..."
            className="w-full bg-black border border-gray-700 rounded-lg p-3 text-sm outline-none focus:border-green-500 resize-y"
          />

          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Maximum 5,000 characters</span>
            <span>{testText.length}/5000</span>
          </div>

          <button
            type="button"
            onClick={generateSpeech}
            disabled={testLoading || !selectedVoiceId}
            className="w-full rounded-lg bg-green-500 text-black font-black p-3 text-sm disabled:opacity-40"
          >
            {testLoading ? "Generating Speech..." : "▶ Generate Speech"}
          </button>

          {testMessage && (
            <div className="rounded-lg bg-black border border-green-900 p-3 text-xs text-green-300 leading-5 break-words">
              {testMessage}
            </div>
          )}

          {generatedAudioURL && (
            <div className="rounded-lg bg-black border border-green-900 p-3 space-y-2">
              <p className="text-green-400 font-bold text-xs">
                Generated Voice Audio
              </p>

              <audio
                controls
                autoPlay
                src={generatedAudioURL}
                className="w-full"
              />
            </div>
          )}
        </section>

        <footer className="text-center text-[10px] text-gray-600 py-2">
          Main Naija Pidgin • Chairman Voice Studio
        </footer>
      </div>
    </main>
  );
}