"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./home.css";
import { supabase } from "../lib/supabase";

type Voice = {
  id: string;
  name: string;
  sub: string;
  flag: string;
  duration: string;
  url: string;
};

const PACKAGES = [
  {
    id: "free",
    name: "Starter",
    credits: 100,
    price: 0,
    description: "100 Voices Free",
    popular: false,
  },
  {
    id: "1k",
    name: "Pro",
    credits: 1000,
    price: 5000,
    description: "Full API Access",
    popular: true,
  },
  {
    id: "2k",
    name: "Business",
    credits: 2000,
    price: 10000,
    description: "For Growing Businesses",
    popular: false,
  },
  {
    id: "5k",
    name: "Enterprise",
    credits: 5000,
    price: 25000,
    description: "Professional API Access",
    popular: false,
  },
  {
    id: "10k",
    name: "Unlimited",
    credits: 10000,
    price: 50000,
    description: "High Volume API Access",
    popular: false,
  },
];

const VOICES: Voice[] = [
  {
    id: "v1",
    name: "Lagos Male",
    sub: "Lagos Accent",
    flag: "🇳🇬",
    duration: "0:05",
    url: "/omo.ogg",
  },
  {
    id: "v2",
    name: "Abuja Female",
    sub: "Calm & Clear",
    flag: "🇳🇬",
    duration: "0:11",
    url: "/omo.ogg",
  },
  {
    id: "v3",
    name: "Pidgin Narrator",
    sub: "Natural Pidgin",
    flag: "🇳🇬",
    duration: "0:14",
    url: "/omo.ogg",
  },
  {
    id: "v4",
    name: "Delta Voice",
    sub: "Warri Accent",
    flag: "🇳🇬",
    duration: "0:10",
    url: "/omo.ogg",
  },
];

function ApiMarketplace() {
  const [apiKey, setApiKey] = useState("");
  const [credits, setCredits] = useState(0);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [processing, setProcessing] = useState("");
  const [playing, setPlaying] = useState("");
  const [message, setMessage] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function loadAccount() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setAuthenticated(false);
          return;
        }

        setAuthenticated(true);
        setEmail(session.user.email || "");

        const savedKey = localStorage.getItem("api_key");

        if (savedKey) {
          setApiKey(savedKey);
        }

        // Do not invent a credit balance.
        // Load the actual balance from your API dashboard.

      } catch (error) {
        console.error("Marketplace loading error:", error);
      }
    }

    loadAccount();

    return () => {
      audioRef.current?.pause();
    };
  }, []);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error("Please login to your API account first.");
    }

    return session.access_token;
  }

  async function getFreeKey() {
    try {
      if (!authenticated) {
        setMessage("Please login to get your free API key.");
        window.location.href = "/api/login";
        return;
      }

      setProcessing("free");
      setMessage("");

      const token = await getToken();

      const response = await fetch("/api/free/collect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to create your free API key."
        );
      }

      if (result.api_key) {
        setApiKey(result.api_key);

        localStorage.setItem("api_key", result.api_key);
      }

      if (typeof result.credits_remaining === "number") {
        setCredits(result.credits_remaining);
      }

      setMessage("Your free API key has been created successfully!");

    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setProcessing("");
    }
  }

  async function buyPackage(packageId: string) {
    try {
      if (!authenticated) {
        setMessage("Please login before purchasing API credits.");
        window.location.href = "/api/login";
        return;
      }

      setProcessing(packageId);
      setMessage("");

      const token = await getToken();

      const response = await fetch("/api/paystack", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          packageId,
          email,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.authorization_url) {
        throw new Error(
          result.error || "Unable to initialize Paystack payment."
        );
      }

      window.location.href = result.authorization_url;

    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Payment failed."
      );

      setProcessing("");
    }
  }

  async function copyApiKey() {
    try {
      if (!apiKey) {
        setMessage("You do not have an API key yet.");
        return;
      }

      await navigator.clipboard.writeText(apiKey);

      setCopied(true);

      setTimeout(() => setCopied(false), 2000);

    } catch {
      setMessage("Unable to copy API key.");
    }
  }

  async function playVoice(voice: Voice) {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (playing === voice.id) {
        setPlaying("");
        return;
      }

      const audio = new Audio(voice.url);

      audioRef.current = audio;

      setPlaying(voice.id);

      audio.onended = () => setPlaying("");

      audio.onerror = () => {
        setPlaying("");
        setMessage("Unable to load voice preview.");
      };

      await audio.play();

    } catch {
      setPlaying("");
      setMessage("Unable to play this voice.");
    }
  }

  return (
    <div style={{ marginTop: "14px" }}>

      {/* MARKETPLACE MAIN CARD */}

      <div
        style={{
          background: "linear-gradient(180deg,#111a12 0%,#080e0a 100%)",
          border: "1px solid #1f5030",
          borderRadius: "20px",
          padding: "20px",
          boxShadow: "0 0 25px #16a34a12",
        }}
      >

        {/* HEADER */}

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              background: "#163521",
              borderRadius: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "23px",
            }}
          >
            🔌
          </div>

          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "900",
                color: "white",
                margin: 0,
              }}
            >
              API <span style={{ color: "#22e66b" }}>Marketplace</span>
            </h2>

            <p
              style={{
                fontSize: "11px",
                color: "#929e95",
                marginTop: "5px",
              }}
            >
              Authentic Naija Pidgin Voices & Datasets
            </p>
          </div>
        </div>

        {/* NOTIFICATION */}

        {message && (
          <div
            style={{
              marginTop: "15px",
              padding: "12px",
              background: "#102719",
              border: "1px solid #276b3b",
              color: "#54ed8a",
              borderRadius: "10px",
              fontSize: "12px",
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            {message}

            <button
              onClick={() => setMessage("")}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* LIVE API KEY */}

        <div
          style={{
            marginTop: "20px",
            background: "#0a100c",
            border: "1px solid #294b32",
            borderRadius: "16px",
            padding: "16px",
          }}
        >

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "9px",
                color: "white",
                fontSize: "13px",
                fontWeight: "800",
              }}
            >
              🛡️ Live API Key
            </div>

            <span
              style={{
                color: "#4ade80",
                background: "#102719",
                padding: "5px 10px",
                borderRadius: "20px",
                fontSize: "10px",
                fontWeight: "900",
              }}
            >
              ● LIVE
            </span>
          </div>

          <div
            style={{
              marginTop: "15px",
              background: "black",
              padding: "13px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              border: "1px solid #1c3322",
            }}
          >
            <code
              style={{
                color: "#4ade80",
                fontSize: "11px",
                wordBreak: "break-all",
                flex: 1,
              }}
            >
              {apiKey
                ? showKey
                  ? apiKey
                  : `${apiKey.slice(0, 12)}••••••••••••`
                : "No API key generated yet"}
            </code>

            {apiKey && (
              <button
                onClick={() => setShowKey(!showKey)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#4ade80",
                  cursor: "pointer",
                }}
              >
                {showKey ? "🙈" : "👁️"}
              </button>
            )}
          </div>

          {apiKey && (
            <button
              onClick={copyApiKey}
              style={{
                width: "100%",
                marginTop: "10px",
                background: copied ? "#22c55e" : "#173321",
                border: "1px solid #28613a",
                color: copied ? "black" : "#4ade80",
                padding: "11px",
                borderRadius: "10px",
                fontWeight: "900",
                cursor: "pointer",
              }}
            >
              {copied ? "✓ Copied Successfully" : "Copy API Key"}
            </button>
          )}

          <p
            style={{
              color: "#77867b",
              fontSize: "10px",
              marginTop: "10px",
            }}
          >
            {email || "Login to access your API account"}
          </p>

        </div>

        {/* STATISTICS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: "8px",
            marginTop: "14px",
          }}
        >

          {[
            {
              icon: "〽️",
              value: credits.toLocaleString(),
              label: "YOUR CREDITS",
            },
            {
              icon: "▤",
              value: "3",
              label: "DATASETS",
            },
            {
              icon: "〽️",
              value: "99.9%",
              label: "UPTIME TARGET",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "#0f1511",
                border: "1px solid #26382b",
                borderRadius: "13px",
                padding: "14px 5px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#35e777",
                  fontSize: "19px",
                }}
              >
                {item.icon}
              </div>

              <strong
                style={{
                  display: "block",
                  color: "white",
                  fontSize: "20px",
                  marginTop: "5px",
                }}
              >
                {item.value}
              </strong>

              <small
                style={{
                  display: "block",
                  color: "#859288",
                  fontSize: "8px",
                  fontWeight: "900",
                  marginTop: "5px",
                }}
              >
                {item.label}
              </small>
            </div>
          ))}

        </div>

        {/* PRICING PLANS */}

        <div style={{ marginTop: "25px" }}>

          <h3
            style={{
              fontSize: "19px",
              fontWeight: "900",
              color: "white",
              margin: 0,
            }}
          >
            Pricing Plans
          </h3>

          <p
            style={{
              fontSize: "11px",
              color: "#89958b",
              marginTop: "5px",
            }}
          >
            Simple. Transparent. Powerful.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: "12px",
              marginTop: "15px",
            }}
          >

            {PACKAGES.map((item) => (

              <div
                key={item.id}
                style={{
                  position: "relative",
                  background: item.popular
                    ? "linear-gradient(160deg,#142e1b,#08130c)"
                    : "#101711",
                  border: item.popular
                    ? "2px solid #24d963"
                    : "1px solid #294832",
                  borderRadius: "16px",
                  padding: "15px 12px",
                  boxShadow: item.popular
                    ? "0 0 20px #22c55e25"
                    : "none",
                }}
              >

                {item.popular && (
                  <div
                    style={{
                      color: "#4ade80",
                      fontSize: "9px",
                      fontWeight: "900",
                      marginBottom: "10px",
                    }}
                  >
                    ★ MOST POPULAR
                  </div>
                )}

                <div
                  style={{
                    fontSize: "24px",
                    marginBottom: "8px",
                  }}
                >
                  {item.id === "free"
                    ? "🎁"
                    : item.id === "1k"
                    ? "👑"
                    : "🚀"}
                </div>

                <h3
                  style={{
                    fontSize: "18px",
                    color: "#4ade80",
                    margin: 0,
                    fontWeight: "900",
                  }}
                >
                  {item.name}
                </h3>

                <p
                  style={{
                    color: "white",
                    fontSize: "13px",
                    marginTop: "8px",
                    fontWeight: "800",
                  }}
                >
                  {item.credits.toLocaleString()} Voices
                </p>

                <p
                  style={{
                    color: "#87968b",
                    fontSize: "10px",
                    marginTop: "5px",
                  }}
                >
                  {item.description}
                </p>

                <div
                  style={{
                    color: "#4ade80",
                    fontSize: "22px",
                    fontWeight: "900",
                    margin: "14px 0",
                  }}
                >
                  {item.price === 0
                    ? "FREE"
                    : `₦${item.price.toLocaleString()}`}
                </div>

                {item.id === "free" ? (

                  <button
                    disabled={processing !== ""}
                    onClick={getFreeKey}
                    style={{
                      width: "100%",
                      background: "#173c23",
                      border: "1px solid #32c968",
                      color: "#4ade80",
                      padding: "11px 5px",
                      borderRadius: "10px",
                      fontSize: "11px",
                      fontWeight: "900",
                      cursor: "pointer",
                    }}
                  >
                    {processing === "free"
                      ? "Creating..."
                      : "Get Free Key →"}
                  </button>

                ) : (

                  <button
                    disabled={processing !== ""}
                    onClick={() => buyPackage(item.id)}
                    style={{
                      width: "100%",
                      background: "#22c55e",
                      border: "none",
                      color: "#031208",
                      padding: "11px 5px",
                      borderRadius: "10px",
                      fontSize: "11px",
                      fontWeight: "900",
                      cursor: "pointer",
                    }}
                  >
                    {processing === item.id
                      ? "Processing..."
                      : "Buy with Paystack 🔒"}
                  </button>

                )}

              </div>

            ))}

          </div>

        </div>

        {/* PREVIEW VOICES */}

        <div
          style={{
            marginTop: "25px",
            background: "#0f1511",
            border: "1px solid #263b2b",
            borderRadius: "16px",
            padding: "16px",
          }}
        >

          <h3
            style={{
              fontSize: "16px",
              fontWeight: "900",
              color: "white",
              margin: 0,
            }}
          >
            🎧 Preview Voices
          </h3>

          <p
            style={{
              fontSize: "10px",
              color: "#89958b",
              marginTop: "5px",
            }}
          >
            Listen before you buy.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: "10px",
              marginTop: "15px",
            }}
          >

            {VOICES.map((voice) => (

              <div
                key={voice.id}
                style={{
                  background: "black",
                  border: "1px solid #263a2b",
                  borderRadius: "13px",
                  padding: "11px",
                }}
              >

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                  }}
                >

                  <span style={{ fontSize: "17px" }}>
                    {voice.flag}
                  </span>

                  <div>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "11px",
                        color: "white",
                      }}
                    >
                      {voice.name}
                    </strong>

                    <small
                      style={{
                        color: "#849188",
                        fontSize: "9px",
                      }}
                    >
                      {voice.sub}
                    </small>
                  </div>

                </div>

                <div
                  style={{
                    marginTop: "12px",
                    height: "25px",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                >
                  {Array.from({ length: 22 }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        flex: 1,
                        height: `${7 + ((i * 13) % 19)}px`,
                        background: "#22c55e",
                        borderRadius: "4px",
                        opacity: 0.8,
                      }}
                    />
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "10px",
                  }}
                >

                  <button
                    onClick={() => playVoice(voice)}
                    style={{
                      width: "30px",
                      height: "30px",
                      background: "#22c55e",
                      border: "none",
                      borderRadius: "50%",
                      color: "black",
                      cursor: "pointer",
                      fontWeight: "900",
                    }}
                  >
                    {playing === voice.id ? "Ⅱ" : "▶"}
                  </button>

                  <span
                    style={{
                      color: "#87958a",
                      fontSize: "10px",
                    }}
                  >
                    {voice.duration}
                  </span>

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* PAYSTACK PAYMENT */}

        <div
          style={{
            marginTop: "15px",
            background: "#0b130e",
            border: "1px solid #243d2b",
            borderRadius: "13px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >

          <span
            style={{
              color: "#4ade80",
              fontSize: "22px",
            }}
          >
            🔒
          </span>

          <div style={{ flex: 1 }}>
            <strong
              style={{
                color: "white",
                fontSize: "11px",
              }}
            >
              Secure Payments
            </strong>

            <p
              style={{
                color: "#89958b",
                fontSize: "9px",
                marginTop: "4px",
              }}
            >
              Pay with Card or Bank Transfer via Paystack
            </p>
          </div>

          <strong
            style={{
              color: "#4ade80",
              fontSize: "16px",
            }}
          >
            ◈ Paystack
          </strong>

        </div>

      </div>

      {/* MARKETPLACE FOOTER */}

      <div
        style={{
          marginTop: "15px",
          background: "#101510",
          border: "1px solid #26382a",
          borderRadius: "15px",
          padding: "17px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
        }}
      >

        <div>
          <strong
            style={{
              color: "white",
              fontSize: "13px",
            }}
          >
            Start Building with Our API
          </strong>

          <p
            style={{
              color: "#87958a",
              fontSize: "10px",
              marginTop: "5px",
            }}
          >
            Authentic Nigerian voices for your applications.
          </p>
        </div>

        <Link
          href="/api/dashboard"
          style={{
            textDecoration: "none",
            background: "#22c55e",
            color: "black",
            padding: "11px",
            borderRadius: "9px",
            fontWeight: "900",
            fontSize: "10px",
            whiteSpace: "nowrap",
          }}
        >
          API Dashboard →
        </Link>

      </div>

    </div>
  );
}


// =====================================================
// MAIN HOMEPAGE
// OLD WORKER AND CHAIRMAN SECTIONS PRESERVED
// =====================================================

export default function Home() {

  return (
    <div className="home">

      <div
        className="content"
        style={{
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >

        {/* HEADER - PRESERVED */}

        <div
          style={{
            textAlign: "center",
            padding: "20px 0 10px 0",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontWeight: "900",
              fontSize: "14px",
              letterSpacing: "1px",
            }}
          >
            <span>🇳🇬</span> MAIN NAIJA PIDGIN
          </div>

          <div
            style={{
              marginTop: "10px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#0f2b16",
              border: "1px solid #1f5a2a",
              color: "#4ade80",
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "10px",
              fontWeight: "800",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                background: "#22c55e",
                borderRadius: "50%",
                display: "inline-block",
              }}
            />

            LIVE - NAIJA VOICES
          </div>

          <h1
            style={{
              marginTop: "14px",
              fontSize: "26px",
              fontWeight: "900",
            }}
          >
            Welcome to{" "}
            <span style={{ color: "#facc15" }}>
              Main Naija Pidgin
            </span>
          </h1>

          <p
            style={{
              color: "#666",
              fontSize: "13px",
              marginTop: "8px",
            }}
          >
            Preserving authentic Nigerian languages — All in one dashboard
          </p>

        </div>


        {/* WORKER + CHAIRMAN - PRESERVED */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginTop: "18px",
          }}
        >

          {/* WORKER */}

          <div
            style={{
              background: "#0f1410",
              border: "1px solid #1f3a25",
              borderRadius: "18px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              minHeight: "200px",
            }}
          >

            <div
              style={{
                width: "36px",
                height: "36px",
                background: "#132a1a",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              🎙️
            </div>

            <h2
              style={{
                fontSize: "16px",
                fontWeight: "900",
                color: "white",
                marginTop: "12px",
              }}
            >
              Worker Panel
            </h2>

            <p
              style={{
                fontSize: "11px",
                color: "#666",
                marginTop: "6px",
                flex: 1,
              }}
            >
              Access your recording workspace directly.
            </p>

            <Link
              href="/worker"
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  marginTop: "12px",
                  background: "#22c55e",
                  color: "black",
                  padding: "11px",
                  borderRadius: "10px",
                  textAlign: "center",
                  fontWeight: "900",
                  fontSize: "12px",
                }}
              >
                Enter Workspace →
              </div>
            </Link>

          </div>


          {/* CHAIRMAN */}

          <div
            style={{
              background: "#101012",
              border: "1px solid #2a2a2a",
              borderRadius: "18px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              minHeight: "200px",
            }}
          >

            <div
              style={{
                width: "36px",
                height: "36px",
                background: "#1f1a00",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              👑
            </div>

            <h2
              style={{
                fontSize: "16px",
                fontWeight: "900",
                color: "white",
                marginTop: "12px",
              }}
            >
              Chairman Dashboard
            </h2>

            <p
              style={{
                fontSize: "11px",
                color: "#666",
                marginTop: "6px",
                flex: 1,
              }}
            >
              Review recordings, manage workers.
            </p>

            <Link
              href="/admin/login"
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  marginTop: "12px",
                  background: "#1f1f1f",
                  border: "1px solid #333",
                  color: "white",
                  padding: "11px",
                  borderRadius: "10px",
                  textAlign: "center",
                  fontWeight: "700",
                  fontSize: "12px",
                }}
              >
                Open Chairman Panel →
              </div>
            </Link>

          </div>

        </div>


        {/* =================================================
            NEW API MARKETPLACE
            OLD MARKETPLACE COMPLETELY REPLACED
        ================================================= */}

        <ApiMarketplace />


        {/* MAIN FOOTER */}

        <div
          style={{
            marginTop: "18px",
            textAlign: "center",
            fontSize: "10px",
            color: "#555",
            paddingBottom: "25px",
          }}
        >
          MAIN NAIJA PIDGIN © 2026 — All in one dashboard ✅
        </div>

      </div>

    </div>
  );
}