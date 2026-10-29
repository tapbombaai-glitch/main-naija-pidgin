"use client";

import { useRef, useState } from "react";
import Link from "next/link";

export default function Marketplace() {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // FIVE DIFFERENT NIGERIAN VOICE RECORDINGS
  const voices = [
    {
      id: "1",
      name: "Lagos Male",
      sub: "Lagos Accent",
      time: "0:12",
      url: "/voices/lagos-male.mp3",
    },
    {
      id: "2",
      name: "Abuja Female",
      sub: "Calm & Clear",
      time: "0:11",
      url: "/voices/abuja-female.mp3",
    },
    {
      id: "3",
      name: "Pidgin Narrator",
      sub: "Natural Pidgin",
      time: "0:14",
      url: "/voices/pidgin-narrator.mp3",
    },
    {
      id: "4",
      name: "Delta",
      sub: "Warri Accent",
      time: "0:10",
      url: "/voices/delta-warri.mp3",
    },
    {
      id: "5",
      name: "Yoruba Mix",
      sub: "Yoruba Pidgin",
      time: "0:13",
      url: "/voices/yoruba-mix.mp3",
    },
  ];

  // PLAY AND PAUSE VOICE RECORDINGS
  function playVoice(voice: typeof voices[number]) {
    // Stop previous recording
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // If same voice is clicked again, stop it
    if (playing === voice.id) {
      audioRef.current = null;
      setPlaying(null);
      return;
    }

    const audio = new Audio(voice.url);

    audioRef.current = audio;

    setPlaying(voice.id);

    audio.onended = () => {
      setPlaying(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setPlaying(null);
      audioRef.current = null;
      alert(
        `Unable to play ${voice.name}. Please check the audio file.`
      );
    };

    audio.play().catch(() => {
      setPlaying(null);
      audioRef.current = null;
      alert("Unable to play this recording.");
    });
  }

  return (
    <div
      style={{
        background: "#050805",
        minHeight: "100vh",
        padding: "12px",
        fontFamily: "Inter, sans-serif",
        color: "white",
      }}
    >
      <div style={{ maxWidth: "420px", margin: "0 auto" }}>

        {/* HEADER */}

        <div style={{ padding: "10px 4px" }}>
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "#0f2814",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              🔌
            </div>

            <div>
              <h1
                style={{
                  fontSize: "22px",
                  fontWeight: "900",
                  margin: 0,
                }}
              >
                API <span style={{ color: "#22c55e" }}>
                  Marketplace
                </span>
              </h1>

              <p
                style={{
                  fontSize: "11px",
                  color: "#888",
                  margin: "2px 0 0 0",
                }}
              >
                Authentic Naija Pidgin Voices & Datasets
              </p>
            </div>
          </div>
        </div>

        {/* LIVE API KEY */}

        <div
          style={{
            marginTop: "12px",
            background: "#0e1410",
            border: "1px solid #1c2e1f",
            borderRadius: "16px",
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span>🔑</span>

            <span style={{ fontSize: "12px", fontWeight: "700" }}>
              Live API Key
            </span>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <span
              style={{
                fontSize: "8px",
                background: "#1a1a1a",
                color: "#888",
                padding: "4px 8px",
                borderRadius: "20px",
              }}
            >
              FREE PLAN
            </span>

            <span
              style={{
                fontSize: "8px",
                background: "#0f2814",
                color: "#22c55e",
                padding: "4px 8px",
                borderRadius: "20px",
              }}
            >
              ● LIVE
            </span>
          </div>
        </div>

        {/* STATS */}

        <div
          style={{
            marginTop: "12px",
            background: "#0e1410",
            border: "1px solid #1c2e1f",
            borderRadius: "16px",
            padding: "14px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: "900" }}>
              100
            </div>
            <div style={{ fontSize: "8px", color: "#666" }}>
              FREE VOICES
            </div>
          </div>

          <div style={{ borderLeft: "1px solid #1c2e1f", borderRight: "1px solid #1c2e1f" }}>
            <div style={{ fontSize: "16px", fontWeight: "900" }}>
              3
            </div>
            <div style={{ fontSize: "8px", color: "#22c55e" }}>
              DATASETS
            </div>
          </div>

          <div>
            <div style={{ fontSize: "16px", fontWeight: "900" }}>
              99.9%
            </div>
            <div style={{ fontSize: "8px", color: "#666" }}>
              UPTIME
            </div>
          </div>
        </div>

        {/* PRICING */}

        <div style={{ marginTop: "18px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "900" }}>
            Pricing Plans
          </h2>

          <p style={{ fontSize: "10px", color: "#666" }}>
            Simple. Transparent. Powerful.
          </p>

          <div
            style={{
              marginTop: "12px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div
              style={{
                background: "#111a12",
                border: "1px solid #1f3a25",
                borderRadius: "16px",
                padding: "14px",
              }}
            >
              <div style={{ color: "#4ade80", fontWeight: "900" }}>
                🎁 Starter
              </div>

              <div style={{ marginTop: "8px", fontSize: "12px" }}>
                100 Voices Free
              </div>

              <div
                style={{
                  marginTop: "10px",
                  border: "1px solid #1f3a25",
                  borderRadius: "20px",
                  padding: "8px",
                  textAlign: "center",
                  fontSize: "10px",
                  fontWeight: "800",
                  color: "#4ade80",
                }}
              >
                Get Free Key →
              </div>
            </div>

            <div
              style={{
                background: "#0f2814",
                border: "1px solid #22c55e",
                borderRadius: "16px",
                padding: "14px",
              }}
            >
              <div style={{ fontSize: "14px", fontWeight: "900" }}>
                👑 Pro
              </div>

              <div style={{ fontSize: "11px", color: "#aaa" }}>
                1,000 Voices
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "900",
                  color: "#22c55e",
                }}
              >
                ₦5,000
              </div>

              <div
                style={{
                  marginTop: "10px",
                  background: "#22c55e",
                  borderRadius: "20px",
                  padding: "9px",
                  textAlign: "center",
                  fontSize: "10px",
                  fontWeight: "900",
                  color: "black",
                }}
              >
                Buy with Paystack 🔒
              </div>
            </div>
          </div>
        </div>

        {/* FIVE PREVIEW VOICES */}

        <div style={{ marginTop: "22px" }}>

          <h2
            style={{
              fontSize: "16px",
              fontWeight: "900",
              color: "white",
              margin: 0,
            }}
          >
            🎧 Preview Voices
          </h2>

          <p
            style={{
              fontSize: "10px",
              color: "#888",
              marginTop: "5px",
            }}
          >
            Listen before you buy — 5 Nigerian Voices
          </p>

          <div
            style={{
              marginTop: "12px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {voices.map((v) => (

              <div
                key={v.id}
                style={{
                  background: "#0e1410",
                  border: playing === v.id
                    ? "1px solid #22c55e"
                    : "1px solid #1c2e1f",
                  borderRadius: "14px",
                  padding: "12px",
                  boxShadow: playing === v.id
                    ? "0 0 12px #22c55e25"
                    : "none",
                }}
              >

                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: "white",
                  }}
                >
                  🇳🇬 {v.name}
                </div>

                <div
                  style={{
                    fontSize: "9px",
                    color: "#888",
                    marginTop: "3px",
                  }}
                >
                  {v.sub}
                </div>

                {/* WAVEFORM */}

                <div
                  style={{
                    marginTop: "12px",
                    height: "25px",
                    display: "flex",
                    gap: "3px",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: "3px",
                        height: `${7 + ((i * 13 + Number(v.id) * 5) % 18)}px`,
                        background: playing === v.id
                          ? "#86efac"
                          : "#22c55e",
                        borderRadius: "3px",
                      }}
                    />
                  ))}
                </div>

                {/* PLAY BUTTON */}

                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >

                  <button
                    onClick={() => playVoice(v)}
                    aria-label={
                      playing === v.id
                        ? `Stop ${v.name}`
                        : `Play ${v.name}`
                    }
                    style={{
                      width: "30px",
                      height: "30px",
                      background: "#22c55e",
                      border: "none",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "black",
                      fontWeight: "900",
                    }}
                  >
                    {playing === v.id ? "Ⅱ" : "▶"}
                  </button>

                  <span
                    style={{
                      fontSize: "10px",
                      color: "#888",
                    }}
                  >
                    {v.time}
                  </span>

                </div>

              </div>

            ))}
          </div>
        </div>

        {/* PAYMENT */}

        <div
          style={{
            marginTop: "15px",
            background: "#0e1410",
            border: "1px solid #1c2e1f",
            borderRadius: "12px",
            padding: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "9px", color: "#888" }}>
            🔒 Pay with Card or Bank Transfer via Paystack
          </span>

          <span
            style={{
              fontSize: "12px",
              fontWeight: "900",
              color: "white",
            }}
          >
            paystack
          </span>
        </div>

        {/* START BUILDING */}

        <Link href="/worker" style={{ textDecoration: "none" }}>
          <div
            style={{
              marginTop: "12px",
              background: "#22c55e",
              color: "black",
              padding: "14px",
              borderRadius: "14px",
              textAlign: "center",
              fontWeight: "900",
            }}
          >
            Start Building →
          </div>
        </Link>

      </div>
    </div>
  );
}