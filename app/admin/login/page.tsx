"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rupuxvpupdhlhxgjrbsh.supabase.co";
const SUPABASE_KEY = "sb_publishable_DQ27GSl6cVVYy8s5U4ZsFA_ye9e-hpY";
const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function ChairmanLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");

  async function doLogin() {
    if (!email || !pass) {
      setMsg("Fill email and password");
      return;
    }
    setMsg("Checking...");

    try {
      const res = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      if (res.error) {
        setMsg(res.error.message);
        return;
      }

      const sess = await supabase.auth.getSession();
      const userId = sess.data.session?.user.id;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !profile) {
        setMsg("Profile not found");
        return;
      }

      // THIS IS THE PATTERN FROM YOUR HTML
      if (
        profile.email !== CHAIRMAN_EMAIL ||
        profile.is_chairman !== true
      ) {
        setMsg(`🚫 BLOCKED - Only ${CHAIRMAN_EMAIL} na chairman`);
        await supabase.auth.signOut();
        return;
      }

      // Success - Go to Chairman Dashboard
      setMsg("✅ Chairman verified! Going...");
      window.location.href = "/chairman";
    } catch (err: any) {
      setMsg("❌ " + err.message);
    }
  }

  return (
    <div style={{ background: "#000", minHeight: "100vh", padding: "20px", color: "#fff" }}>
      <div
        style={{
          maxWidth: "450px",
          margin: "30px auto",
          border: "2px solid gold",
          borderRadius: "16px",
          padding: "20px",
          background: "#111",
        }}
      >
        <h2>👑 CHAIRMAN LOGIN</h2>
        <p>Only {CHAIRMAN_EMAIL}</p>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid #444",
            background: "#222",
            color: "#fff",
            margin: "6px 0",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid #444",
            background: "#222",
            color: "#fff",
            margin: "6px 0",
          }}
        />

        <button
          onClick={doLogin}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "40px",
            background: "gold",
            color: "#000",
            fontWeight: 800,
            border: "none",
            marginTop: "10px",
            cursor: "pointer",
          }}
        >
          LOGIN AS CHAIRMAN
        </button>

        <p
          style={{
            background: "#000",
            padding: "10px",
            borderRadius: "8px",
            marginTop: "12px",
            minHeight: "20px",
          }}
        >
          {msg}
        </p>
      </div>
    </div>
  );
}