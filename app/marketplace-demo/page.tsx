"use client";

import { useState } from "react";
import Link from "next/link";

const WHATSAPP_COMMUNITY_LINK =
  "https://chat.whatsapp.com/DM0KpQtO6MhAmrbnTFZ0Kj?s=cl&p=a&mlu=4&ilr=4&iam=2";

const DEMO_TRANSLATIONS = [
  { en: "How much is the delivery?", pidgin: "How much be delivery?" },
  { en: "How much is this?", pidgin: "How much be this?" },
  { en: "I want to buy", pidgin: "I wan buy" },
  { en: "I have sent the money", pidgin: "I don send the money" },
  {
    en: "Can you deliver to Port Harcourt?",
    pidgin: "You fit deliver to Port Harcourt?",
  },
  { en: "Good morning", pidgin: "Good morning, how you dey?" },
  { en: "Thank you very much", pidgin: "Thank you well well" },
  { en: "Where is my order?", pidgin: "Where my order dey?" },
  {
    en: "Please bring it tomorrow",
    pidgin: "Abeg carry am come tomorrow",
  },
  { en: "This is too expensive", pidgin: "This one too cost" },
  {
    en: "Can you reduce the price?",
    pidgin: "You fit reduce price small?",
  },
  { en: "I have received it", pidgin: "I don collect am" },
  { en: "I will call you later", pidgin: "I go call you later" },
  { en: "I don't understand", pidgin: "I no understand" },
  { en: "Please speak slowly", pidgin: "Abeg dey talk small small" },
  { en: "I like this one", pidgin: "I like this one well well" },
  { en: "I will pay cash", pidgin: "I go pay cash" },
  {
    en: "Send me your account number",
    pidgin: "Send me your account number",
  },
  { en: "Don't worry", pidgin: "No worry" },
  { en: "Let us do business", pidgin: "Make we do business" },
];

type Translation = {
  en: string;
  pidgin: string;
};

export default function MarketplaceDemo() {
  const [input, setInput] = useState("How much is the delivery?");
  const [result, setResult] = useState<Translation>(DEMO_TRANSLATIONS[0]);
  const [notFound, setNotFound] = useState(false);

  function findTranslation(text: string) {
    const q = text.toLowerCase().trim();

    if (!q) return null;

    // Exact match only.
    // This prevents the demo from giving a wrong translation.
    return (
      DEMO_TRANSLATIONS.find(
        (item) => item.en.toLowerCase().trim() === q
      ) || null
    );
  }

  function handleTranslate() {
    const found = findTranslation(input);

    if (found) {
      setResult(found);
      setNotFound(false);
      speak(found.pidgin);
    } else {
      setNotFound(true);
    }
  }

  function speak(text: string) {
    if (typeof window === "undefined") return;

    try {
      if (!("speechSynthesis" in window)) {
        alert("Your phone browser no support voice playback.");
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = "en-NG";
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();

      const naijaVoice =
        voices.find((voice) =>
          voice.lang.toLowerCase().includes("en-ng")
        ) ||
        voices.find((voice) =>
          voice.lang.toLowerCase().includes("ng")
        ) ||
        voices.find((voice) =>
          voice.lang.toLowerCase().includes("en-gb")
        ) ||
        voices.find((voice) =>
          voice.lang.toLowerCase().includes("en")
        ) ||
        voices[0];

      if (naijaVoice) {
        utterance.voice = naijaVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Speech error:", error);
    }
  }

  function handleCardClick(item: Translation) {
    setInput(item.en);
    setResult(item);
    setNotFound(false);
    speak(item.pidgin);
  }

  return (
    <div
      style={{
        background: "#080C08",
        minHeight: "100vh",
        width: "100%",
        padding: "8px",
      }}
    >
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
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
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
            }}
          >
            FREE DEMO
          </div>
        </div>

        {/* TITLE BOX */}
        <div
          style={{
            marginTop: "12px",
            background: "#121C12",
            borderRadius: "14px",
            padding: "14px",
            border: "1px solid #1E2F1E",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: "900",
              color: "white",
            }}
          >
            🇳🇬 Try Naija Pidgin FREE
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "#9E9E9E",
              marginTop: "4px",
            }}
          >
            Type English → See Pidgin → Hear Voice
          </div>

          <div
            style={{
              display: "inline-block",
              marginTop: "8px",
              background: "#FFD700",
              color: "black",
              fontSize: "10px",
              fontWeight: "900",
              padding: "5px 10px",
              borderRadius: "20px",
            }}
          >
            ✨ TEMPORARY TEST VERSION - NO LOGIN, NO CREDIT
          </div>
        </div>

        {/* ENGLISH INPUT */}
        <div style={{ marginTop: "14px" }}>
          <div
            style={{
              color: "#A5D6A7",
              fontSize: "10px",
              fontWeight: "900",
            }}
          >
            ✍️ ENGLISH INPUT
          </div>

          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setNotFound(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleTranslate();
              }
            }}
            placeholder="Type English e.g. How much is the delivery?"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "#0E180E",
              border: "1px solid #294329",
              color: "white",
              padding: "14px",
              borderRadius: "10px",
              outline: "none",
              fontSize: "14px",
              marginTop: "6px",
            }}
          />

          <button
            type="button"
            onClick={handleTranslate}
            style={{
              width: "100%",
              marginTop: "10px",
              background: "#00C853",
              color: "white",
              border: "none",
              padding: "14px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "900",
              cursor: "pointer",
            }}
          >
            TRANSLATE TO PIDGIN →
          </button>
        </div>

        {/* RESULT BOX */}
        {result && !notFound && (
          <div
            style={{
              marginTop: "12px",
              background: "#0F1A0F",
              border: "1.5px solid #00E676",
              borderRadius: "14px",
              padding: "14px",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#81C784",
                fontWeight: "900",
              }}
            >
              ENGLISH:
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#BDBDBD",
                marginTop: "3px",
              }}
            >
              {result.en}
            </div>

            <div
              style={{
                fontSize: "10px",
                color: "#81C784",
                fontWeight: "900",
                marginTop: "10px",
              }}
            >
              PIDGIN RESULT:
            </div>

            <div
              style={{
                fontSize: "20px",
                fontWeight: "900",
                color: "white",
                marginTop: "3px",
                lineHeight: "1.3",
              }}
            >
              {result.pidgin}
            </div>

            <button
              type="button"
              onClick={() => speak(result.pidgin)}
              style={{
                width: "100%",
                marginTop: "12px",
                background: "#FF6B00",
                color: "white",
                border: "none",
                padding: "13px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "900",
                cursor: "pointer",
              }}
            >
              🔊 LISTEN
            </button>
          </div>
        )}

        {/* NOT FOUND */}
        {notFound && (
          <div
            style={{
              marginTop: "12px",
              background: "#351414",
              border: "1px solid #6D2929",
              color: "#FF8A80",
              padding: "12px",
              borderRadius: "10px",
              fontSize: "11px",
              fontWeight: "700",
              lineHeight: "1.5",
            }}
          >
            No be that one for this free demo yet.
            <br />
            Try one of the phrases below.
          </div>
        )}

        {/* WHATSAPP COMMUNITY */}
        <a
          href={WHATSAPP_COMMUNITY_LINK}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            marginTop: "12px",
            background: "#0B2A18",
            border: "1.5px solid #00E676",
            borderRadius: "12px",
            padding: "13px",
            textDecoration: "none",
            color: "white",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: "900",
                color: "#00E676",
              }}
            >
              🇳🇬 JOIN MAIN NAIJA PIDGIN COMMUNITY
            </div>

            <div
              style={{
                fontSize: "9px",
                color: "#A5D6A7",
                marginTop: "3px",
              }}
            >
              Meet other users, get updates & follow the project
            </div>
          </div>

          <div
            style={{
              background: "#00C853",
              color: "white",
              padding: "8px 11px",
              borderRadius: "8px",
              fontSize: "9px",
              fontWeight: "900",
              flexShrink: 0,
            }}
          >
            JOIN →
          </div>
        </a>

        {/* LIST TO TEST */}
        <div style={{ marginTop: "16px" }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "900",
              color: "white",
            }}
          >
            🔥 Tap To Test — Press Listen
          </div>

          <div
            style={{
              fontSize: "10px",
              color: "#888",
              marginTop: "2px",
            }}
          >
            Free demo • No login • No credit dey deduct
          </div>

          {DEMO_TRANSLATIONS.map((item, index) => (
            <div
              key={index}
              style={{
                background: "#121C12",
                border: "1px solid #1E2F1E",
                borderRadius: "12px",
                padding: "12px",
                marginTop: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "white",
                }}
              >
                English: {item.en}
              </div>

              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#00E676",
                  marginTop: "4px",
                }}
              >
                👉 Pidgin: {item.pidgin}
              </div>

              <button
                type="button"
                onClick={() => handleCardClick(item)}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  background: "#14301A",
                  color: "#00E676",
                  border: "1px solid #245C2D",
                  padding: "10px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "900",
                  cursor: "pointer",
                }}
              >
                🔊 LISTEN
              </button>
            </div>
          ))}
        </div>

        {/* GO TO FULL MARKETPLACE */}
        <Link
          href="/marketplace"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "16px",
            background: "white",
            color: "#000",
            padding: "14px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: "900",
            textDecoration: "none",
          }}
        >
          Go to Full Marketplace → Buy Credits
        </Link>

        <div
          style={{
            textAlign: "center",
            fontSize: "9px",
            color: "#555",
            marginTop: "10px",
            lineHeight: "1.5",
          }}
        >
          Demo voice na phone voice for now — free for testing.
          <br />
          Full real Naija voice dey inside Main Marketplace.
        </div>
      </div>
    </div>
  );
}