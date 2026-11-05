// ============================================
// FINE NAME: app/marketplace/page.tsx
// APP NAME: MAIN NAIJA PIDGIN - MARKETPLACE
// VOICES: 1. Warri Babe, 2. Main Naija Pidgin 1, 3. Main Naija Pidgin 2, 4. Main Naija Pidgin 4, 5. Main Naija Pidgin 5
// FIX: TOP 3 = MP3 ONLY (Protected), DOWN 2 = YOUR RECORDED VOICE
// ============================================
"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

import type { FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

/* =========================================
   SUPABASE BROWSER CONFIGURATION
========================================= */

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing.");
}

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder-key"
);

/* =========================================
   TYPES
========================================= */

type AuthMode = "login" | "signup";

type Voice = {
  id: string;
  name: string;
  accent: string;
  category: string;
  sample_text: string;
  sample_url: string;
  audioData?: string;
  rating: number;
  sales: number;
  isBestSeller: boolean;
  isFeatured: boolean;
  tag: string;
};

/* =========================================
   VOICE CATALOGUE - ARRANGED
   5 VOICES - WARRI BABE NA NUMBER 1
   TOP 3 = MP3 PROTECTED, DOWN 2 = RECORDING
========================================= */

const DEFAULT_VOICES: Voice[] = [
  {
    id: "w5p3k3PueAgQOT4lq0SF",
    name: "Warri Babe",
    accent: "Sweet - Expressive - Professional - BEST SELLER",
    category: "Female",
    sample_text:
      "How far my people! Na Warri Babe dey here - Sweet professional voice wey go entice all your customers, come buy me now!",
    sample_url:
      "/samples/warri-babe-nov5.mp3",
    rating: 5.0,
    sales: 1200,
    isBestSeller: true,
    isFeatured: true,
    tag: "FEMALE",
  },
  {
    id: "1",
    name: "Main Naija Pidgin 1",
    accent: "Natural - Young - Fast",
    category: "Lagos",
    sample_text:
      "How far boss! Main Naija Pidgin 1 dey here - Fast young vibe!",
    sample_url: "/samples/main-naija-pidgin-test-3.mp3",
    rating: 4.8,
    sales: 312,
    isBestSeller: false,
    isFeatured: false,
    tag: "MALE",
  },
  {
    id: "2",
    name: "Main Naija Pidgin 2",
    accent: "Warm - Professional - Calm",
    category: "PH",
    sample_text:
      "Good morning, na Main Naija Pidgin 2 - Warm professional.",
    sample_url: "/samples/warri-babe-nov2.mp3",
    rating: 4.9,
    sales: 456,
    isBestSeller: true,
    isFeatured: false,
    tag: "MALE",
  },
  {
    id: "4",
    name: "Main Naija Pidgin 4",
    accent: "Rugged - Local - Street",
    category: "Warri",
    sample_text:
      "Warri no dey carry last! Rugged local vibe!",
    sample_url: "/voices/main-naija-pidgin-4.mp3",
    rating: 4.7,
    sales: 234,
    isBestSeller: false,
    isFeatured: false,
    tag: "MALE",
  },
  {
    id: "5",
    name: "Main Naija Pidgin 5",
    accent: "Hybrid - Bilingual - Balanced",
    category: "Lagos",
    sample_text:
      "E kaaro! I fit speak Yoruba and pidgin join - Hybrid!",
    sample_url: "/voices/main-naija-pidgin-5.mp3",
    rating: 4.8,
    sales: 189,
    isBestSeller: false,
    isFeatured: false,
    tag: "MALE",
  },
];

const CATEGORIES = [
  "All",
  "Lagos",
  "Warri",
  "PH",
  "Female",
];

/* =========================================
   MAIN MARKETPLACE
========================================= */

export default function Marketplace() {
  const [user, setUser] = useState<any>(null);
  const [apiKey, setApiKey] = useState("");
  const [realKey, setRealKey] = useState("");
  const [freeLeft, setFreeLeft] = useState(0);
  const [paidLeft, setPaidLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [voices, setVoices] = useState<Voice[]>(DEFAULT_VOICES);
  const [realStats, setRealStats] = useState({
    totalUsers: 0,
    totalVoices: 5,
    totalSales: 0,
  });
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [cart, setCart] = useState<any[]>([]);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");
  const [announces, setAnnounces] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const [myLocalVoices, setMyLocalVoices] = useState<any[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [testText, setTestText] = useState("");
  const [testVoice, setTestVoice] = useState("Warri Babe");
  const [testingApi, setTestingApi] = useState(false);
  const [testAudio, setTestAudio] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const [testTime, setTestTime] = useState<number | null>(null);
  const [testCredits, setTestCredits] = useState<number | null>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast(message);
      setToastType(type);
      window.setTimeout(() => {
        setToast("");
      }, 3000);
    },
    []
  );

  /* =========================================
     LOAD MARKETPLACE DATA - TOP 3 PROTECTED
  ========================================= */

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser || null);
      try {
        const { count } = await supabase
          .from("api_keys")
          .select("id", {
            count: "exact",
            head: true,
          });
        setRealStats((previous) => ({
          ...previous,
          totalUsers: count || 0,
        }));
      } catch (error) {
        console.error("Marketplace statistics:", error);
      }
      if (typeof window !== "undefined") {
        const guestId =
          localStorage.getItem("guest_id") ||
          `guest_${Date.now()}`;
        localStorage.setItem("guest_id", guestId);
        const uid = currentUser?.id || guestId;
        if (currentUser) {
          const { data: keys, error } = await supabase
            .from("api_keys")
            .select("*")
            .eq("user_id", uid)
            .eq("is_active", true)
            .order("created_at", {
              ascending: false,
            })
            .limit(1);
          if (!error && keys?.[0]) {
            setApiKey(keys[0].key_prefix || "");
            setRealKey(keys[0].key || "");
            setFreeLeft(keys[0].free_requests_remaining || 0);
            setPaidLeft(keys[0].paid_requests_remaining || 0);
          } else {
            setApiKey("");
            setRealKey("");
            setFreeLeft(0);
            setPaidLeft(0);
          }
        }
        try {
          const saved = JSON.parse(
            localStorage.getItem("gin_recordings") || "[]"
          );
          const myRecs = saved.filter((item: any) => item.audioData);
          setMyLocalVoices(myRecs);
          setCart(
            JSON.parse(
              localStorage.getItem("gin_cart") || "[]"
            )
          );

          // ===== TOP 3 PROTECTED - MP3 ONLY, NO RECORDING GO CHANGE THEM =====
          // TOP 3: Warri Babe, Main 1, Main 2 = Always MP3
          // DOWN 2: Main 4, Main 5 = Recording fit change them
          const PROTECTED_TOP_3 = ["Warri Babe", "Main Naija Pidgin 1", "Main Naija Pidgin 2"];
          if (myRecs.length > 0) {
            const mapped: Voice[] = myRecs.map((rec: any, i: number) => {
              const match = DEFAULT_VOICES.find(
                (d) => d.name.toLowerCase() === (rec.name || "").toLowerCase()
              );
              if (match && PROTECTED_TOP_3.includes(match.name)) {
                return { ...match, audioData: undefined };
              }
              return {
                id: rec.id || match?.id || `rec-${i}`,
                name: rec.name || match?.name || `My Voice ${i + 1}`,
                accent: rec.accent || match?.accent || "Recorded - Real Voice",
                category: rec.category || match?.category || "Lagos",
                sample_text: rec.text || rec.sample_text || match?.sample_text || "My recorded voice",
                sample_url: match?.sample_url || "",
                audioData: rec.audioData,
                rating: match?.rating || 5.0,
                sales: match?.sales || 0,
                isBestSeller: match?.isBestSeller || i === 0,
                isFeatured: match?.isFeatured || i === 0,
                tag: rec.tag || match?.tag || "MALE",
              };
            });
            const top3 = DEFAULT_VOICES.filter((d) => PROTECTED_TOP_3.includes(d.name));
            const down2FromRecs = mapped.filter((m) => !PROTECTED_TOP_3.includes(m.name));
            const down2Defaults = DEFAULT_VOICES.filter((d) => !PROTECTED_TOP_3.includes(d.name));
            const down2 = down2FromRecs.length > 0 ? down2FromRecs.slice(0, 2) : down2Defaults;
            const finalDown2 = [...down2];
            for (const d of down2Defaults) {
              if (finalDown2.length >= 2) break;
              if (!finalDown2.some((m) => m.name === d.name)) finalDown2.push(d);
            }
            setVoices([...top3, ...finalDown2.slice(0, 2)]);
            setRealStats((prev) => ({ ...prev, totalVoices: 5 }));
          } else {
            setVoices(DEFAULT_VOICES);
          }
        } catch {
          setCart([]);
          setMyLocalVoices([]);
        }
      }
      try {
        const { data: announcements } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", {
            ascending: false,
          })
          .limit(3);
        if (announcements) {
          setAnnounces(announcements);
        }
      } catch (error) {
        console.error("Announcements:", error);
      }
    } catch (error) {
      console.error("Marketplace loading error:", error);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          loadData();
        } else {
          setApiKey("");
          setRealKey("");
          setFreeLeft(0);
          setPaidLeft(0);
        }
      }
    );
    return () => {
      subscription.unsubscribe();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [loadData]);

  const filteredVoices = voices.filter((voice) => {
    const search = searchTerm.toLowerCase();
    const matchSearch =
      voice.name.toLowerCase().includes(search) ||
      voice.accent.toLowerCase().includes(search);
    const matchCategory =
      selectedCategory === "All" ||
      voice.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const addToCart = (voice: Voice) => {
    if (cart.some((item) => item.id === voice.id)) {
      showToast("This voice is already in your cart.", "error");
      return;
    }
    const updatedCart = [...cart, voice];
    setCart(updatedCart);
    localStorage.setItem(
      "gin_cart",
      JSON.stringify(updatedCart)
    );
    showToast(`${voice.name} added to cart.`);
  };

  const removeFromCart = (id: string) => {
    const updatedCart = cart.filter(
      (item) => item.id !== id
    );
    setCart(updatedCart);
    localStorage.setItem(
      "gin_cart",
      JSON.stringify(updatedCart)
    );
  };

  /* =========================================
   AUDIO PREVIEW - TOP 3 MP3 FIRST, DOWN 2 RECORDING FIRST
  ========================================= */

  const playSample = async (voice: Voice) => {
    if (!user) {
      showToast("Login first to listen to voice previews.", "error");
      setAuthMode("login");
      setShowAuth(true);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (playingId === voice.id) {
      setPlayingId(null);
      return;
    }
    setPlayingId(voice.id);
    const speakFallback = () => {
      const utterance = new SpeechSynthesisUtterance(voice.sample_text);
      utterance.rate = 1;
      utterance.onend = () => setPlayingId(null);
      utterance.onerror = () => setPlayingId(null);
      window.speechSynthesis.speak(utterance);
    };

    // 1. TOP 3 = MP3 FIRST, DOWN 2 = RECORDING FIRST
    const TOP3_NAMES = ["Warri Babe", "Main Naija Pidgin 1", "Main Naija Pidgin 2"];
    const isTop3 = TOP3_NAMES.includes(voice.name);
    if (!isTop3 && voice.audioData) {
      try {
        const audio = new Audio(voice.audioData);
        audioRef.current = audio;
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => speakFallback();
        await audio.play();
        showToast(`${voice.name} - Your real recorded voice!`);
        return;
      } catch {
        speakFallback();
        return;
      }
    }

    // 2. IF NO RECORDING, TRY MP3
    try {
      if (!voice.sample_url) {
        showToast(`No recording yet for ${voice.name}. Go Clone page to record am.`, "error");
        speakFallback();
        return;
      }
      const check = await fetch(voice.sample_url, { method: "HEAD" });
      if (!check.ok) {
        console.log("Preview file missing (404):", voice.sample_url);
        showToast(`Preview file never upload for ${voice.name}, playing with device voice.`, "error");
        speakFallback();
        return;
      }
      const audio = new Audio(voice.sample_url);
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        speakFallback();
      };
      await audio.play();
    } catch (err) {
      console.log("Play failed, using fallback:", err);
      speakFallback();
    }
  };

  const requireAccount = (packageId: string) => {
    if (user) {
      continuePurchase(packageId);
      return;
    }
    setPendingAction(packageId);
    setAuthMode("login");
    setShowAuth(true);
  };

  const claimFree = async () => {
    if (!user) {
      requireAccount("free_100");
      return;
    }
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Please log in again.");
      }
      const response = await fetch(
        "/api/keys/create-free",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Free key request failed.");
      }
      if (data.api_key) {
        setRealKey(data.api_key);
        setApiKey(data.key_prefix || "");
        setFreeLeft(100);
        showToast("100 FREE API requests claimed!");
        await loadData();
      } else {
        showToast(
          data.error || "Free key already claimed.",
          "error"
        );
      }
    } catch (error: any) {
      showToast(error.message || "Failed to claim free key.", "error");
    } finally {
      setLoading(false);
    }
  };

  const buy = async (packageId: string) => {
    if (!user) {
      requireAccount(packageId);
      return;
    }
    if (packageId === "free_100") {
      await claimFree();
      return;
    }
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Please log in again.");
      }
      const response = await fetch(
        "/api/paystack/initialize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            packageId,
            email: user.email,
            userId: user.id,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Paystack initialization failed.");
      }
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        throw new Error("Paystack did not return a payment link.");
      }
    } catch (error: any) {
      showToast(error.message || "Payment connection failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const continuePurchase = async (packageId: string) => {
    setPendingAction(null);
    setShowAuth(false);
    if (packageId === "free_100") {
      await claimFree();
    } else {
      await buy(packageId);
    }
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = authEmail.trim().toLowerCase();
    if (!email || !authPassword) {
      showToast("Enter your email and password.", "error");
      return;
    }
    if (authMode === "signup" && authPassword.length < 6) {
      showToast("Password must contain at least 6 characters.", "error");
      return;
    }
    setLoading(true);
    try {
      if (authMode === "signup") {
        const { data, error } =
          await supabase.auth.signUp({
            email,
            password: authPassword,
          });
        if (error) throw error;
        if (!data.session) {
          showToast("Check your email to confirm your account.");
          setAuthMode("login");
          return;
        }
        setUser(data.user);
        setShowAuth(false);
        showToast("Account created successfully.");
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email,
            password: authPassword,
          });
        if (error) throw error;
        setUser(data.user);
        setShowAuth(false);
        showToast("Login successful.");
      }
      if (pendingAction) {
        await continuePurchase(pendingAction);
      } else {
        await loadData();
      }
    } catch (error: any) {
      showToast(error.message || "Authentication failed.", "error");
    } finally {
      setLoading(false);
      setAuthPassword("");
      setConfirmPassword("");
    }
  };

  const testMyApi = async () => {
    if (!user) {
      setAuthMode("login");
      setShowAuth(true);
      showToast("Please login first.", "error");
      return;
    }
    if (!realKey) {
      showToast("Collect your free API key first.", "error");
      return;
    }
    if (!testText.trim()) {
      showToast("Enter text to generate speech.", "error");
      return;
    }
    setTestingApi(true);
    setTestAudio("");
    setTestStatus("Generating...");
    setTestTime(null);
    const started = Date.now();
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Your session has expired.");
      }
      const response = await fetch(
        "/api/tts/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            text: testText.trim(),
            voice: testVoice,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(
          result.error || `Generation failed: ${response.status}`
        );
      }
      const audioUrl =
        result.audio_url || result.audioUrl;
      if (!audioUrl) {
        throw new Error("No audio was returned.");
      }
      setTestAudio(audioUrl);
      setTestTime(Date.now() - started);
      setTestCredits(result.remaining_credits ?? null);
      setTestStatus("Success!");
      showToast("API test successful!");
      await loadData();
    } catch (error: any) {
      setTestStatus(error.message);
      showToast(error.message, "error");
    } finally {
      setTestingApi(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setApiKey("");
    setRealKey("");
    setFreeLeft(0);
    setPaidLeft(0);
    showToast("Logged out successfully.");
  };

  if (!mounted) {
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          background: "#080C08",
          color: "white",
          minHeight: "100vh",
        }}
      >
        Loading Main Naija Pidgin Marketplace...
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#080C08",
        minHeight: "100vh",
        width: "100%",
        paddingBottom: 90,
        color: "white",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        button { cursor: pointer; }
        button:active { transform: scale(.97); }
        .market-modal { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.85); display: flex; align-items: flex-end; justify-content: center; }
        .market-modal-card { width: 100%; max-width: 420px; max-height: 88vh; overflow-y: auto; background: #0D170D; border-top: 2px solid #00E676; border-radius: 20px 20px 0 0; padding: 18px 14px 30px; }
        .market-input { width: 100%; background: #071007; color: white; border: 1px solid #1E4D2B; border-radius: 10px; padding: 14px; outline: none; font-size: 14px; margin-top: 6px; }
        .market-label { display: block; color: #A5D6A7; font-size: 11px; font-weight: 800; margin-top: 14px; }
        .cat-scroll { display: flex; gap: 8px; overflow-x: auto; padding: 10px 0 6px; scrollbar-width: none; }
        .cat-scroll::-webkit-scrollbar { display: none; }
        .voice-card { background: #121C12; border: 1px solid #1E2F1E; border-radius: 16px; padding: 14px; margin-top: 10px; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #0A150A; border-top: 1px solid #1E2F1E; display: flex; justify-content: space-around; padding: 8px 0 12px; z-index: 100; max-width: 420px; margin: 0 auto; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; color: #777; font-size: 9px; font-weight: 800; text-decoration: none; }
        .nav-item.active { color: #00E676; }
        .nav-icon { font-size: 20px; }
        @media (min-width: 600px) { .market-content { max-width: 420px; margin: auto; } }
      `}</style>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: toastType === "error" ? "#FF5252" : "#00E676",
            color: toastType === "error" ? "white" : "black",
            padding: "10px 18px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 900,
            zIndex: 300,
            maxWidth: "90%",
            textAlign: "center",
          }}
        >
          {toast}
        </div>
      )}
      {showCart && (
        <div className="market-modal" onClick={() => setShowCart(false)}>
          <div className="market-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "white", fontWeight: 900 }}>🛒 Cart ({cart.length})</div>
              <button onClick={() => setShowCart(false)} style={{ background: "#263326", border: "none", color: "white", borderRadius: "50%", width: 34, height: 34 }}>×</button>
            </div>
            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "#777" }}>Your cart is empty.</div>
            ) : (
              <>
                {cart.map((item) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#121C12", padding: 12, borderRadius: 10, marginTop: 10 }}>
                    <div>
                      <div style={{ color: "white", fontWeight: 800 }}>{item.name}</div>
                      <div style={{ color: "#FFD600", fontSize: 11 }}>Voice preview</div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} style={{ background: "#FF5252", color: "white", border: "none", padding: "8px 12px", borderRadius: 8 }}>Remove</button>
                  </div>
                ))}
                <p style={{ color: "#FFD600", fontSize: 11, marginTop: 15 }}>Checkout is not connected to voice purchases yet.</p>
              </>
            )}
          </div>
        </div>
      )}
      {showAuth && (
        <div className="market-modal" onClick={() => !loading && setShowAuth(false)}>
          <div className="market-modal-card" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ color: "white" }}>{authMode === "signup" ? "Create Account" : "Welcome Back"}</h2>
              <button onClick={() => setShowAuth(false)} style={{ background: "#263326", border: "none", color: "white", borderRadius: "50%", width: 34, height: 34 }}>×</button>
            </div>
            <form onSubmit={submitAuth}>
              <label className="market-label">EMAIL</label>
              <input className="market-input" type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} required />
              <label className="market-label">PASSWORD</label>
              <input className="market-input" type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} required />
              {authMode === "signup" && (
                <>
                  <label className="market-label">CONFIRM PASSWORD</label>
                  <input className="market-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                </>
              )}
              <button type="submit" disabled={loading} style={{ width: "100%", marginTop: 20, background: "#00E676", color: "black", border: "none", borderRadius: 12, padding: 16, fontWeight: 900 }}>
                {loading ? "PLEASE WAIT..." : authMode === "signup" ? "CREATE ACCOUNT →" : "LOGIN →"}
              </button>
            </form>
            <div style={{ textAlign: "center", color: "#999", fontSize: 11, marginTop: 18 }}>
              {authMode === "signup" ? "Already have an account?" : "Don't have an account?"}
              <button onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")} style={{ background: "none", border: "none", color: "#00E676", fontWeight: 900, marginLeft: 6 }}>
                {authMode === "signup" ? "Login" : "Register"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="market-content" style={{ maxWidth: 420, margin: "0 auto", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 900, color: "white", fontSize: 15 }}>MAIN NAIJA PIDGIN</div>
          <button onClick={() => setShowCart(true)} style={{ background: "#FFD600", border: "none", borderRadius: 20, padding: "7px 14px", fontWeight: 900 }}>🛒 {cart.length}</button>
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div style={{ background: "#121C12", borderRadius: 12, padding: 10, textAlign: "center" }}>
            <div style={{ fontWeight: 900, color: "#00E676" }}>{realStats.totalUsers || "—"}</div>
            <div style={{ fontSize: 8, color: "#777" }}>USERS</div>
          </div>
          <div style={{ background: "#121C12", borderRadius: 12, padding: 10, textAlign: "center" }}>
            <div style={{ fontWeight: 900, color: "#FFD600" }}>{realStats.totalVoices}</div>
            <div style={{ fontSize: 8, color: "#777" }}>VOICES</div>
          </div>
          <div style={{ background: "#121C12", borderRadius: 12, padding: 10, textAlign: "center" }}>
            <div style={{ fontWeight: 900, color: "white" }}>{myLocalVoices.length} RECORDED</div>
            <div style={{ fontSize: 8, color: "#777" }}>YOUR VOICES</div>
          </div>
        </div>
        {myLocalVoices.length > 0 && (
          <div style={{ background: "#102010", padding: 12, borderRadius: 12, marginTop: 12, color: "#00E676", fontSize: 11, fontWeight: 800 }}>
            🎙️ {myLocalVoices.length} Recorded Voices Found - Using your real recorded voices! Names: {myLocalVoices.map((v: any) => v.name).join(", ")}
          </div>
        )}
        {announces.length > 0 && (
          <div style={{ background: "#102010", padding: 12, borderRadius: 12, marginTop: 12 }}>
            <div style={{ color: "#00E676", fontWeight: 900, fontSize: 11 }}>📢 ANNOUNCEMENTS</div>
            {announces.map((announcement) => (
              <button key={announcement.id} onClick={() => setSelectedAnnouncement(announcement)} style={{ display: "block", width: "100%", background: "transparent", color: "white", textAlign: "left", border: "none", padding: "8px 0", fontSize: 12 }}>
                {announcement.title}
              </button>
            ))}
          </div>
        )}
        {selectedAnnouncement && (
          <div style={{ background: "#142414", padding: 14, borderRadius: 12, marginTop: 10 }}>
            <div style={{ fontWeight: 900 }}>{selectedAnnouncement.title}</div>
            <p style={{ fontSize: 12, color: "#CCC" }}>{selectedAnnouncement.message}</p>
            <button onClick={() => setSelectedAnnouncement(null)} style={{ background: "#00E676", border: "none", borderRadius: 8, padding: 8, fontWeight: 900 }}>Close</button>
          </div>
        )}
        {activeTab === "home" && (
          <>
            <input placeholder="🔍 Search voices..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} style={{ width: "100%", marginTop: 14, background: "#121C12", border: "1px solid #00E676", borderRadius: 12, padding: "13px 14px", color: "white", outline: "none" }} />
            <div className="cat-scroll">
              {CATEGORIES.map((category) => (
                <button key={category} onClick={() => setSelectedCategory(category)} style={{ background: selectedCategory === category ? "#00E676" : "#121C12", color: selectedCategory === category ? "black" : "#AAA", border: "1px solid #1E2F1E", padding: "8px 14px", borderRadius: 20, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {category}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14, fontWeight: 900, color: "white" }}>Voices • 🔒 Login to Listen • {filteredVoices.length} found • 🎙️ {myLocalVoices.length} Recorded</div>
            {filteredVoices.length === 0 && <p style={{ color: "#888", fontSize: 12 }}>No voices found.</p>}
            {filteredVoices.map((voice) => (
              <div key={voice.id} className="voice-card" style={{ border: voice.isFeatured ? "1.5px solid #FFD600" : "1px solid #1E2F1E", background: voice.tag === "FEMALE" ? "#1A1218" : "#121C12" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <button onClick={() => playSample(voice)} style={{ width: 50, height: 50, flexShrink: 0, background: playingId === voice.id ? "#FF5252" : "#1E2F1E", borderRadius: "50%", border: "none", color: "#00E676" }}>
                    {playingId === voice.id ? "■" : "▶"}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "white", fontWeight: 900, fontSize: 13 }}>{voice.name}{voice.isFeatured && " 🏆"}{voice.tag === "FEMALE" && " 👩"}</div>
                    <div style={{ color: "#888", fontSize: 11 }}>{voice.accent}</div>
                    <div style={{ color: "#FFD600", fontSize: 10 }}>⭐ {voice.rating} • {voice.sales} sales {voice.audioData ? "• 🎙️ YOUR VOICE" : "• MP3"}</div>
                    {voice.isBestSeller && <div style={{ color: "#00E676", fontSize: 9, fontWeight: 900, marginTop: 4 }}>★ BEST SELLER</div>}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  <button onClick={() => addToCart(voice)} style={{ background: "#0A1A0A", color: "#00E676", border: "1px solid #1E4D2B", padding: 12, borderRadius: 10, fontWeight: 900, fontSize: 11 }}>🛒 Add to Cart</button>
                  <button onClick={() => buy("pro")} style={{ background: voice.tag === "FEMALE" ? "#FF1493" : "white", color: voice.tag === "FEMALE" ? "white" : "black", border: "none", padding: 12, borderRadius: 10, fontWeight: 900, fontSize: 11 }}>💳 Buy ₦5,000</button>
                </div>
                {!voice.audioData && <Link href="/clone" style={{ display: "block", textAlign: "center", marginTop: 8, color: "#FFD600", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>🎙️ Record {voice.name} → Go to Clone</Link>}
              </div>
            ))}
          </>
        )}
        {activeTab === "api" && (
          <div style={{ marginTop: 12, background: "#0F1A0F", border: "1.5px solid #00E676", borderRadius: 14, padding: 14 }}>
            <div style={{ color: "#00E676", fontWeight: 900 }}>🧪 API TESTING - 5 VOICES</div>
            <div style={{ color: "#AAA", fontSize: 11, marginTop: 8 }}>Free requests: {freeLeft}<br />Paid requests: {paidLeft}<br />Recorded: {myLocalVoices.length}</div>
            {!realKey && (
              <button onClick={claimFree} disabled={loading} style={{ width: "100%", marginTop: 12, background: "#FFD600", color: "black", border: "none", padding: 13, borderRadius: 10, fontWeight: 900 }}>
                {loading ? "PLEASE WAIT..." : "GET 100 FREE REQUESTS"}
              </button>
            )}
            <label className="market-label">TEXT</label>
            <textarea className="market-input" value={testText} onChange={(event) => setTestText(event.target.value)} rows={3} placeholder="Type Pidgin text here..." />
            <label className="market-label">VOICE</label>
            <select className="market-input" value={testVoice} onChange={(event) => setTestVoice(event.target.value)}>
              {DEFAULT_VOICES.map((voice) => (
                <option key={voice.id} value={voice.name}>{voice.name} - {voice.tag}</option>
              ))}
            </select>
            <button onClick={testMyApi} disabled={testingApi} style={{ width: "100%", marginTop: 14, padding: 16, border: "none", borderRadius: 12, background: "#00E676", color: "black", fontWeight: 900 }}>
              {testingApi ? "GENERATING..." : "▶ TEST MY API"}
            </button>
            {testStatus && <div style={{ marginTop: 12, padding: 10, background: "#071007", color: "#00E676", fontSize: 11 }}>{testStatus}</div>}
            {testAudio && <audio controls src={testAudio} style={{ width: "100%", marginTop: 12 }} />}
            {testTime !== null && <div style={{ color: "#AAA", fontSize: 11, marginTop: 8 }}>Generation time: {testTime} ms</div>}
            {testCredits !== null && <div style={{ color: "#AAA", fontSize: 11, marginTop: 5 }}>Remaining credits: {testCredits}</div>}
          </div>
        )}
        {activeTab === "pricing" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900, color: "white", fontSize: 17 }}>Choose Your API Plan</div>
            <div style={{ background: "#102010", border: "1px solid #00E676", borderRadius: 16, padding: 16, marginTop: 12 }}>
              <div style={{ fontWeight: 900, color: "#00E676" }}>FREE STARTER</div>
              <div style={{ fontSize: 23, fontWeight: 900, color: "white", marginTop: 8 }}>₦0</div>
              <div style={{ color: "#AAA", fontSize: 12 }}>100 free API requests</div>
              <button onClick={claimFree} disabled={loading} style={{ width: "100%", marginTop: 12, background: "#00E676", color: "black", border: "none", padding: 14, borderRadius: 10, fontWeight: 900 }}>GET FREE KEY</button>
            </div>
            <div style={{ background: "#1A150A", border: "2px solid #FFD600", borderRadius: 16, padding: 16, marginTop: 12 }}>
              <div style={{ fontWeight: 900, color: "white" }}>👑 PRO - 1,000 REQUESTS</div>
              <div style={{ fontSize: 23, fontWeight: 900, color: "white", marginTop: 8 }}>₦5,000</div>
              <button onClick={() => requireAccount("pro")} disabled={loading} style={{ width: "100%", marginTop: 12, background: "#FFD600", color: "black", border: "none", padding: 14, borderRadius: 10, fontWeight: 900 }}>BUY WITH PAYSTACK</button>
            </div>
          </div>
        )}
        <div style={{ textAlign: "center", fontSize: 9, color: "#666", marginTop: 20, paddingBottom: 10 }}>
          {user ? user.email : "Guest - Login to listen"}
          <br />
          5 Voices • Warri Babe Featured • Your Recorded Voice First
        </div>
        {user && (
          <button onClick={logout} style={{ display: "block", margin: "10px auto", background: "#263326", color: "white", border: "none", borderRadius: 10, padding: 10, fontSize: 11, fontWeight: 800 }}>
            LOG OUT
          </button>
        )}
      </div>
      <div className="bottom-nav">
        <button className={`nav-item ${activeTab === "home" ? "active" : ""}`} onClick={() => setActiveTab("home")}><span className="nav-icon">🏠</span>Home</button>
        <button className={`nav-item ${activeTab === "api" ? "active" : ""}`} onClick={() => setActiveTab("api")}><span className="nav-icon">🧪</span>Test API</button>
        <button className={`nav-item ${activeTab === "pricing" ? "active" : ""}`} onClick={() => setActiveTab("pricing")}><span className="nav-icon">💳</span>Pricing</button>
        <button className="nav-item" onClick={() => setShowCart(true)}><span className="nav-icon">🛒</span>Cart</button>
        <Link href="/clone" className="nav-item"><span className="nav-icon">🎙️</span>Clone</Link>
      </div>
    </div>
  );
}