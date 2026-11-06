"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

export default function AdminLogin() {
const router = useRouter();
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [message, setMessage] = useState("");
const [loading, setLoading] = useState(false);

const supabase = createClient();

async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
e.preventDefault();

if (loading) return;

const cleanEmail = email.trim().toLowerCase();

if (!cleanEmail || !password) {
  setMessage("Please enter your email and password.");
  return;
}

if (cleanEmail !== ADMIN_EMAIL) {
  setMessage(`Access denied. Only ${ADMIN_EMAIL} is authorised.`);
  return;
}

setLoading(true);
setMessage("Verifying admin account...");

try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error || !data.user) {
    setMessage(error?.message || "Login failed. Please try again.");
    setLoading(false);
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, is_chairman")
    .eq("id", data.user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.email?.toLowerCase() !== ADMIN_EMAIL ||
    profile.is_chairman !== true
  ) {
    await supabase.auth.signOut();
    setMessage("Access denied. This account is not authorised as Admin.");
    setLoading(false);
    return;
  }

  setMessage("Admin verified. Opening dashboard...");

  router.replace("/admin");
} catch (error) {
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred.";

  setMessage(errorMessage);
  setLoading(false);
}

}

return (
<main
style={{
minHeight: "100vh",
background: "#050505",
color: "#fff",
padding: "24px 16px",
display: "flex",
alignItems: "center",
justifyContent: "center",
}}
>
<section
style={{
width: "100%",
maxWidth: "430px",
background: "#111",
border: "1px solid #d4af37",
borderRadius: "20px",
padding: "26px 20px",
boxShadow: "0 0 30px rgba(212,175,55,0.12)",
}}
>
<div style={{ textAlign: "center", marginBottom: "25px" }}>
<div style={{ fontSize: "42px" }}>👑</div>

      <h1
        style={{
          color: "#f5c542",
          fontSize: "25px",
          fontWeight: 900,
          margin: "10px 0",
        }}
      >
        ADMIN LOGIN
      </h1>

      <p style={{ color: "#aaa", fontSize: "13px" }}>
        MAIN NAIJA PIDGIN • SECURE ACCESS
      </p>
    </div>

    <form onSubmit={handleLogin}>
      <label style={{ display: "block", marginBottom: "7px" }}>
        Admin Email
      </label>

      <input
        type="email"
        placeholder="Enter admin email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="username"
        required
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "14px",
          borderRadius: "10px",
          border: "1px solid #444",
          background: "#222",
          color: "#fff",
          marginBottom: "18px",
          fontSize: "15px",
        }}
      />

      <label style={{ display: "block", marginBottom: "7px" }}>
        Password
      </label>

      <input
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "14px",
          borderRadius: "10px",
          border: "1px solid #444",
          background: "#222",
          color: "#fff",
          marginBottom: "20px",
          fontSize: "15px",
        }}
      />

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "15px",
          borderRadius: "30px",
          border: "none",
          background: loading ? "#777" : "#d4af37",
          color: "#000",
          fontWeight: 900,
          fontSize: "15px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "VERIFYING..." : "LOGIN TO ADMIN DASHBOARD"}
      </button>
    </form>

    <div
      role="status"
      aria-live="polite"
      style={{
        background: "#080808",
        border: "1px solid #333",
        borderRadius: "10px",
        padding: "12px",
        marginTop: "18px",
        color: "#ddd",
        fontSize: "13px",
        textAlign: "center",
        overflowWrap: "anywhere",
      }}
    >
      {message || "Authorised account: " + ADMIN_EMAIL}
    </div>
  </section>
</main>

);
}