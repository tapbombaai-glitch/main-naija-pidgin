"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

type LoginMode = "login" | "signup";

type Voice = {
  id: string;
  name: string;
  accent?: string;
  sample_url?: string;
};

const PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 5000,
    price: 1500,
    icon: "🚀",
  },
  {
    id: "basic",
    name: "Basic",
    credits: 10000,
    price: 3000,
    icon: "⚡",
  },
  {
    id: "standard",
    name: "Standard",
    credits: 20000,
    price: 6000,
    icon: "🔥",
  },
  {
    id: "business",
    name: "Business",
    credits: 50000,
    price: 15000,
    icon: "🏢",
  },
  {
    id: "premium",
    name: "Premium",
    credits: 100000,
    price: 30000,
    icon: "👑",
  },
];

export default function Marketplace() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [user, setUser] = useState<any>(null);

  const [apiKey, setApiKey] = useState("");
  const [realKey, setRealKey] = useState("");

  const [freeLeft, setFreeLeft] = useState(0);
  const [paidLeft, setPaidLeft] = useState(0);

  const [loading, setLoading] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // LOGIN POPUP
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    loadData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        loadCustomerKey(currentUser.id);
      } else {
        setApiKey("");
        setRealKey("");
        setFreeLeft(0);
        setPaidLeft(0);
      }
    });

    return () => {
      subscription.unsubscribe();

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast(message);
    setToastType(type);

    window.setTimeout(() => {
      setToast("");
    }, 3500);
  };

  async function loadData() {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser || null);

      // Load voices.
      const { data: voiceData } = await supabase
        .from("voices")
        .select("id,name,accent,sample_url")
        .eq("active", true)
        .limit(10);

      if (voiceData && voiceData.length > 0) {
        setVoices(voiceData as Voice[]);
      } else {
        setVoices([
          {
            id: "warri-babe",
            name: "Warri Babe",
            accent: "Sweet - Warri",
            sample_url: "/samples/warri-babe.mp3",
          },
          {
            id: "2",
            name: "Abuja Female",
            accent: "Warm - Professional",
            sample_url: "/samples/warri-babe.mp3",
          },
          {
            id: "3",
            name: "Pidgin Narrator",
            accent: "Story - Expressive",
            sample_url: "/samples/warri-babe.mp3",
          },
          {
            id: "4",
            name: "Delta Warri",
            accent: "Rugged - Local",
            sample_url: "/samples/warri-babe.mp3",
          },
          {
            id: "5",
            name: "Yoruba Mix",
            accent: "Hybrid - Bilingual",
            sample_url: "/samples/warri-babe.mp3",
          },
        ]);
      }

      // IMPORTANT:
      // No guest account.
      // No API key query when customer is not authenticated.
      if (currentUser) {
        await loadCustomerKey(currentUser.id);
      }
    } catch (error) {
      console.error("Marketplace load error:", error);
    }
  }

  async function loadCustomerKey(userId: string) {
    try {
      const { data: keyData, error } = await supabase
        .from("api_keys")
        .select(
          "id,key_prefix,free_requests_remaining,paid_requests_remaining,is_active,created_at"
        )
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("API key lookup error:", error.message);
        return;
      }

      if (!keyData) {
        setApiKey("");
        setFreeLeft(0);
        setPaidLeft(0);
        return;
      }

      setApiKey(keyData.key_prefix || "");
      setFreeLeft(Number(keyData.free_requests_remaining || 0));
      setPaidLeft(Number(keyData.paid_requests_remaining || 0));

      // IMPORTANT:
      // Never load the real secret key from the database here.
      // The full key is only received immediately after creating it.
    } catch (error) {
      console.error("Customer key error:", error);
    }
  }

  function openLogin(mode: LoginMode = "login") {
    setLoginMode(mode);
    setAuthMessage("");
    setAuthError("");
    setShowLogin(true);
  }

  function closeLogin() {
    if (authLoading) return;

    setShowLogin(false);
    setAuthMessage("");
    setAuthError("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleAuth() {
    setAuthError("");
    setAuthMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setAuthError("Enter your email address.");
      return;
    }

    if (cleanEmail === CHAIRMAN_EMAIL) {
      setAuthError(
        "Chairman email must use the Chairman Login, not customer login."
      );
      return;
    }

    if (!password) {
      setAuthError("Enter your password.");
      return;
    }

    if (password.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }

    if (loginMode === "signup" && password !== confirmPassword) {
      setAuthError("Passwords no match.");
      return;
    }

    setAuthLoading(true);

    try {
      if (loginMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setAuthError(error.message);
          return;
        }

        if (!data.user) {
          setAuthError("Login failed. Please try again.");
          return;
        }

        setShowLogin(false);
        setPassword("");
        setConfirmPassword("");

        showToast("✅ Login successful. Opening your API Dashboard.");

        router.push("/api-dashboard");
        router.refresh();

        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (data.session && data.user) {
        setShowLogin(false);
        setPassword("");
        setConfirmPassword("");

        showToast("✅ Account created. Opening your API Dashboard.");

        router.push("/api-dashboard");
        router.refresh();

        return;
      }

      setAuthMessage(
        "Account created. Check your email to confirm your account, then login."
      );
    } catch (error) {
      console.error("Authentication error:", error);
      setAuthError("Connection failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function claimFree() {
    if (!user) {
      openLogin("login");
      showToast("🔐 Login first to collect your 1,000 free credits.", "error");
      return;
    }

    if (user.email?.toLowerCase() === CHAIRMAN_EMAIL) {
      showToast("Use Chairman Login for the Chairman account.", "error");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        openLogin("login");
        showToast("Your login session expired. Please login again.", "error");
        return;
      }

      const res = await fetch("/api/keys/create-free", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Free credits already claimed.", "error");
        return;
      }

      if (data.api_key) {
        setRealKey(data.api_key);
        setApiKey(data.key_prefix || "");

        setFreeLeft(
          Number(
            data.free_requests_remaining ??
              data.free_credits ??
              1000
          )
        );

        setPaidLeft(Number(data.paid_requests_remaining || 0));

        try {
          await navigator.clipboard.writeText(data.api_key);
          showToast(
            "✅ 1,000 FREE credits claimed! API key copied.",
            "success"
          );
        } catch {
          showToast(
            "✅ 1,000 FREE credits claimed! Copy your key below.",
            "success"
          );
        }

        await loadCustomerKey(user.id);
      } else {
        showToast(data.error || "Free key could not be created.", "error");
      }
    } catch (error) {
      console.error("Free key error:", error);
      showToast("Connection failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function buy(packageId: string) {
    if (!user) {
      openLogin("login");
      showToast("🔐 Login first before buying API credits.", "error");
      return;
    }

    if (user.email?.toLowerCase() === CHAIRMAN_EMAIL) {
      showToast("Use Chairman Login for the Chairman account.", "error");
      return;
    }

    // Paystack route requires an active API key.
    if (!apiKey) {
      showToast(
        "🎁 Claim your 1,000 free API credits first before buying more.",
        "error"
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        openLogin("login");
        showToast("Your login session expired. Please login again.", "error");
        return;
      }

      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          packageId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Paystack initialization failed.", "error");
        return;
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }

      showToast(data.error || "Paystack checkout unavailable.", "error");
    } catch (error) {
      console.error("Paystack error:", error);
      showToast("Connection failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();

    setUser(null);
    setApiKey("");
    setRealKey("");
    setFreeLeft(0);
    setPaidLeft(0);

    showToast("Signed out successfully.");
  }

  const playSample = async (voice: Voice) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }

      if (playingId === voice.id) {
        setPlayingId(null);
        return;
      }

      if (!voice.sample_url) {
        showToast("Voice file never dey yet.", "error");
        return;
      }

      const audio = new Audio(voice.sample_url);

      audioRef.current = audio;
      setPlayingId(voice.id);

      audio.onended = () => {
        setPlayingId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingId(null);
        audioRef.current = null;
        showToast(
          "Voice file no see. Check the sample file in /public/samples/.",
          "error"
        );
      };

      await audio.play();
    } catch (error) {
      console.error("Audio error:", error);
      setPlayingId(null);
    }
  };

  return (
    <div
      style={{
        background: "#080C08",
        minHeight: "100vh",
        width: "100%",
        padding: "8px",
      }}
    >
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        button:active {
          transform: scale(0.97);
        }

        .voice-scroll {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }

        @media (max-width: 380px) {
          .voice-scroll {
            display: flex;
            overflow-x: auto;
            gap: 8px;
            padding-bottom: 6px;
            scrollbar-width: none;
          }

          .voice-scroll::-webkit-scrollbar {
            display: none;
          }

          .voice-card {
            min-width: 88px;
            flex-shrink: 0;
          }
        }
      `}</style>

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: toastType === "error" ? "#FF5252" : "#00E676",
            color: toastType === "error" ? "white" : "black",
            padding: "10px 18px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "900",
            zIndex: 200,
            maxWidth: "90%",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,.35)",
          }}
        >
          {toast}
        </div>
      )}

      <div
        style={{
          maxWidth: "420px",
          margin: "0 auto",
          border: "2px solid #1A231A",
          borderRadius: "28px",
          background: "#050A05",
          padding: "12px",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 2px",
            gap: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                background: "white",
                borderRadius: "4px",
                width: "28px",
                height: "20px",
                display: "flex",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <div style={{ flex: 1, background: "#008751" }} />
              <div style={{ flex: 1, background: "white" }} />
              <div style={{ flex: 1, background: "#008751" }} />
            </div>

            <div
              style={{
                fontWeight: "900",
                color: "white",
                fontSize: "15px",
                whiteSpace: "nowrap",
              }}
            >
              MAIN NAIJA PIDGIN
            </div>
          </div>

          <div
            style={{
              background: "#14301A",
              border: "1px solid #1E4D2B",
              color: "#A5D6A7",
              fontSize: "9px",
              fontWeight: "800",
              padding: "6px 10px",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                background: "#00E676",
                borderRadius: "50%",
              }}
            />
            LIVE
          </div>
        </div>

        {/* MARKETPLACE HERO */}
        <div
          style={{
            marginTop: "12px",
            background: "#121C12",
            borderRadius: "14px",
            padding: "14px",
            border: "1px solid #1E2F1E",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: "900",
              color: "white",
            }}
          >
            API Marketplace
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "#9E9E9E",
              marginTop: "2px",
            }}
          >
            Authentic Naija Pidgin Voices • Paystack + Supabase
          </div>

          {/* CUSTOMER LOGIN */}
          {!user ? (
            <div
              style={{
                marginTop: "12px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "7px",
              }}
            >
              <button
                onClick={() => openLogin("login")}
                style={{
                  border: "1px solid #00E676",
                  background: "#00C853",
                  color: "white",
                  padding: "11px 8px",
                  borderRadius: "9px",
                  fontSize: "10px",
                  fontWeight: "900",
                }}
              >
                🔐 FREE API LOGIN
              </button>

              <button
                onClick={() => openLogin("signup")}
                style={{
                  border: "1px solid #2E7D32",
                  background: "#0F1A0F",
                  color: "#A5D6A7",
                  padding: "11px 8px",
                  borderRadius: "9px",
                  fontSize: "10px",
                  fontWeight: "900",
                }}
              >
                CREATE ACCOUNT
              </button>
            </div>
          ) : (
            <div
              style={{
                marginTop: "12px",
                background: "#0F1A0F",
                border: "1px solid #1E4D2B",
                borderRadius: "10px",
                padding: "9px",
              }}
            >
              <div
                style={{
                  fontSize: "9px",
                  color: "#81C784",
                  fontWeight: "800",
                }}
              >
                CUSTOMER CONNECTED
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "white",
                  fontWeight: "800",
                  marginTop: "3px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.email}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  marginTop: "8px",
                }}
              >
                <Link
                  href="/api-dashboard"
                  style={{
                    flex: 1,
                    textAlign: "center",
                    textDecoration: "none",
                    background: "#00C853",
                    color: "white",
                    padding: "8px",
                    borderRadius: "7px",
                    fontSize: "9px",
                    fontWeight: "900",
                  }}
                >
                  API DASHBOARD
                </Link>

                <button
                  onClick={signOut}
                  style={{
                    background: "transparent",
                    color: "#FF8A80",
                    border: "1px solid #5D2525",
                    padding: "8px 10px",
                    borderRadius: "7px",
                    fontSize: "9px",
                    fontWeight: "900",
                  }}
                >
                  SIGN OUT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* API KEY */}
        <div
          style={{
            marginTop: "10px",
            background: "#0F1A0F",
            border: "1.5px solid #00E676",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontWeight: "700",
              color: "#A5D6A7",
            }}
          >
            🔑 Your Live API Key
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "6px",
              gap: "8px",
            }}
          >
            <div
              style={{
                fontSize: "15px",
                fontWeight: "900",
                color: "#00E676",
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {apiKey ? apiKey : "sk_live_ •••••••••••"}
            </div>

            <button
              onClick={() => {
                if (realKey) {
                  navigator.clipboard
                    .writeText(realKey)
                    .then(() => showToast("Key copied!"))
                    .catch(() =>
                      showToast("Copy failed. Please copy it manually.", "error")
                    );
                } else if (!user) {
                  openLogin("login");
                } else {
                  showToast(
                    "Your full key is only shown when you create it.",
                    "error"
                  );
                }
              }}
              style={{
                background: "#00C853",
                color: "white",
                border: "none",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "800",
                flexShrink: 0,
              }}
            >
              ⧉ Copy
            </button>
          </div>

          <div
            style={{
              marginTop: "10px",
              borderTop: "1px solid #1E2F1E",
              paddingTop: "8px",
              display: "flex",
              gap: "12px",
              fontSize: "11px",
              color: "#BDBDBD",
              flexWrap: "wrap",
            }}
          >
            <span>
              <b style={{ color: "white" }}>{freeLeft}</b> Free Left
            </span>

            <span>
              <b style={{ color: "white" }}>{paidLeft}</b> Paid Left
            </span>

            <span style={{ color: "#333" }}>|</span>

            <span>
              <b style={{ color: "#00E676" }}>99.9%</b> Uptime
            </span>
          </div>
        </div>

        {/* PRICING */}
        <div style={{ marginTop: "14px" }}>
          <div
            style={{
              fontSize: "16px",
              fontWeight: "900",
              color: "white",
            }}
          >
            Pricing Plans
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "#888",
              display: "flex",
              gap: "6px",
              marginTop: "2px",
            }}
          >
            🛡️ Paystack Secured • Instant activation
          </div>

          {/* FREE */}
          <div
            style={{
              marginTop: "10px",
              background: "#121C12",
              border: "1px solid #00E676",
              borderRadius: "12px",
              padding: "11px",
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
                  fontSize: "11px",
                  fontWeight: "800",
                  color: "white",
                }}
              >
                🎁 FREE API
              </div>

              <div
                style={{
                  fontSize: "8px",
                  color: "#00E676",
                  fontWeight: "900",
                }}
              >
                ONE-TIME CLAIM
              </div>
            </div>

            <div
              style={{
                fontSize: "22px",
                fontWeight: "900",
                color: "#00E676",
                marginTop: "4px",
              }}
            >
              1,000 FREE
            </div>

            <div
              style={{
                fontSize: "10px",
                color: "#9E9E9E",
              }}
            >
              No card needed
            </div>

            <button
              onClick={claimFree}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "10px",
                background: "#00C853",
                color: "white",
                border: "none",
                padding: "10px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: "800",
              }}
            >
              {loading
                ? "..."
                : user
                ? "Get 1,000 Free Credits →"
                : "Login to Get Free Credits →"}
            </button>
          </div>

          {/* PAID PACKAGES */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginTop: "8px",
            }}
          >
            {PACKAGES.map((pkg, index) => (
              <div
                key={pkg.id}
                style={{
                  background:
                    index === 4 ? "#1A150A" : "#121C12",
                  border:
                    index === 4
                      ? "1px solid #FFB300"
                      : "1px solid #1E2F1E",
                  borderRadius: "12px",
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "5px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      color: "white",
                    }}
                  >
                    {pkg.icon} {pkg.name}
                  </div>

                  {pkg.id === "standard" && (
                    <div
                      style={{
                        fontSize: "7px",
                        background: "#3E3200",
                        border: "1px solid #FFB300",
                        color: "#FFB300",
                        padding: "2px 5px",
                        borderRadius: "20px",
                        fontWeight: "800",
                      }}
                    >
                      POPULAR
                    </div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "900",
                    color: "white",
                    marginTop: "6px",
                  }}
                >
                  {pkg.credits.toLocaleString()} Credits
                </div>

                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "900",
                    color: "#00E676",
                    marginTop: "2px",
                  }}
                >
                  ₦{pkg.price.toLocaleString()}
                </div>

                <button
                  onClick={() => buy(pkg.id)}
                  disabled={loading}
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    background: "transparent",
                    border: "1px solid #FFB300",
                    color: "white",
                    padding: "9px",
                    borderRadius: "8px",
                    fontSize: "10px",
                    fontWeight: "800",
                  }}
                >
                  {loading ? "..." : "Buy with Paystack"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* VOICES */}
        <div style={{ marginTop: "14px" }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "800",
              color: "white",
            }}
          >
            Preview Voices – Tap to Listen
          </div>

          <div
            style={{
              fontSize: "10px",
              color: "#00E676",
              marginTop: "2px",
            }}
          >
            100% Naija accent • Preview no dey deduct
          </div>

          <div
            className="voice-scroll"
            style={{ marginTop: "10px" }}
          >
            {voices.slice(0, 5).map((v: Voice) => (
              <div
                key={v.id}
                onClick={() => playSample(v)}
                className="voice-card"
                style={{
                  background:
                    playingId === v.id ? "#1A2F1A" : "#121C12",
                  border:
                    playingId === v.id
                      ? "1px solid #00E676"
                      : "1px solid #1E2F1E",
                  borderRadius: "12px",
                  padding: "10px 6px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    background:
                      playingId === v.id ? "#FF5252" : "#00E676",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                    fontSize: "14px",
                    color: "#000",
                    fontWeight: "900",
                  }}
                >
                  {playingId === v.id ? "■" : "▶"}
                </div>

                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: "800",
                    color: "white",
                    marginTop: "7px",
                    lineHeight: "1.1",
                  }}
                >
                  {v.name}
                </div>

                <div
                  style={{
                    fontSize: "8px",
                    color: "#999",
                    marginTop: "3px",
                  }}
                >
                  {String(v.accent || "")
                    .split("-")[0]
                    .trim() || "Naija"}
                </div>

                <div
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    justifyContent: "center",
                    gap: "2px",
                    height: "14px",
                    alignItems: "center",
                  }}
                >
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: "2.5px",
                        height: `${4 + (i % 4) * 3}px`,
                        background: "#00E676",
                        borderRadius: "2px",
                        opacity: playingId === v.id ? 1 : 0.6,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DASHBOARD */}
        <Link
          href={user ? "/api-dashboard" : "#"}
          onClick={(event) => {
            if (!user) {
              event.preventDefault();
              openLogin("login");
            }
          }}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "14px",
            background: "white",
            color: "#000",
            padding: "13px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: "900",
            textDecoration: "none",
          }}
        >
          {user ? "Go to API Dashboard" : "Login to API Dashboard"}{" "}
          <span>→</span>
        </Link>

        <div
          style={{
            textAlign: "center",
            fontSize: "8px",
            color: "#555",
            marginTop: "10px",
          }}
        >
          Paystack Secured • Supabase Powered • Preview free • Only real API
          deducts
        </div>
      </div>

      {/* LOGIN / SIGNUP MODAL */}
      {showLogin && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeLogin();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.78)",
            zIndex: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "18px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "380px",
              background: "#071007",
              border: "1px solid #00E676",
              borderRadius: "18px",
              padding: "18px",
              boxShadow: "0 20px 60px rgba(0,0,0,.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#00E676",
                    fontSize: "10px",
                    fontWeight: "900",
                  }}
                >
                  MAIN NAIJA PIDGIN
                </div>

                <div
                  style={{
                    color: "white",
                    fontSize: "20px",
                    fontWeight: "900",
                    marginTop: "3px",
                  }}
                >
                  {loginMode === "login"
                    ? "Free API Login"
                    : "Create Customer Account"}
                </div>
              </div>

              <button
                onClick={closeLogin}
                disabled={authLoading}
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  border: "1px solid #263A26",
                  background: "#101A10",
                  color: "white",
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                fontSize: "10px",
                color: "#9E9E9E",
                marginTop: "8px",
                lineHeight: "1.5",
              }}
            >
              {loginMode === "login"
                ? "Login to claim your 1,000 free API credits and access your API Dashboard."
                : "Create your customer account to claim your one-time 1,000 free API credits."}
            </div>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              style={{
                width: "100%",
                marginTop: "14px",
                background: "#0E180E",
                border: "1px solid #294329",
                color: "white",
                padding: "12px",
                borderRadius: "9px",
                outline: "none",
                fontSize: "13px",
              }}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                loginMode === "login" ? "current-password" : "new-password"
              }
              style={{
                width: "100%",
                marginTop: "8px",
                background: "#0E180E",
                border: "1px solid #294329",
                color: "white",
                padding: "12px",
                borderRadius: "9px",
                outline: "none",
                fontSize: "13px",
              }}
            />

            {loginMode === "signup" && (
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                style={{
                  width: "100%",
                  marginTop: "8px",
                  background: "#0E180E",
                  border: "1px solid #294329",
                  color: "white",
                  padding: "12px",
                  borderRadius: "9px",
                  outline: "none",
                  fontSize: "13px",
                }}
              />
            )}

            {authError && (
              <div
                style={{
                  marginTop: "10px",
                  background: "#351414",
                  border: "1px solid #6D2929",
                  color: "#FF8A80",
                  padding: "9px",
                  borderRadius: "8px",
                  fontSize: "10px",
                  fontWeight: "700",
                  lineHeight: "1.4",
                }}
              >
                {authError}
              </div>
            )}

            {authMessage && (
              <div
                style={{
                  marginTop: "10px",
                  background: "#102915",
                  border: "1px solid #245C2D",
                  color: "#A5D6A7",
                  padding: "9px",
                  borderRadius: "8px",
                  fontSize: "10px",
                  fontWeight: "700",
                  lineHeight: "1.4",
                }}
              >
                {authMessage}
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={authLoading}
              style={{
                width: "100%",
                marginTop: "12px",
                background: "#00C853",
                color: "white",
                border: "none",
                padding: "13px",
                borderRadius: "9px",
                fontSize: "12px",
                fontWeight: "900",
              }}
            >
              {authLoading
                ? "PLEASE WAIT..."
                : loginMode === "login"
                ? "LOGIN TO CUSTOMER ACCOUNT"
                : "CREATE CUSTOMER ACCOUNT"}
            </button>

            <button
              onClick={() => {
                setLoginMode(
                  loginMode === "login" ? "signup" : "login"
                );
                setAuthError("");
                setAuthMessage("");
              }}
              disabled={authLoading}
              style={{
                width: "100%",
                marginTop: "8px",
                background: "transparent",
                color: "#A5D6A7",
                border: "1px solid #294329",
                padding: "11px",
                borderRadius: "9px",
                fontSize: "10px",
                fontWeight: "800",
              }}
            >
              {loginMode === "login"
                ? "New customer? Create account"
                : "Already have an account? Login"}
            </button>

            <Link
              href="/user/login"
              onClick={() => {
                if (!authLoading) {
                  setShowLogin(false);
                }
              }}
              style={{
                display: "block",
                textAlign: "center",
                marginTop: "10px",
                color: "#777",
                fontSize: "9px",
                textDecoration: "none",
              }}
            >
              Open full customer login page
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}