"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi",
  "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun",
  "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba",
  "Yobe", "Zamfara",
];

const ACCENTS = [
  "Lagos Pidgin",
  "Warri Pidgin",
  "Port Harcourt Pidgin",
  "Benin Pidgin",
  "Calabar Pidgin",
  "Abuja Pidgin",
  "Eastern Nigerian Pidgin",
  "Northern Nigerian Pidgin",
  "Other / Mixed Nigerian Pidgin",
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [accent, setAccent] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword ||
      !state ||
      !city.trim() ||
      !accent
    ) {
      setError("Please complete every field.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              account_type: "worker",
              full_name: fullName.trim(),
              state,
              city: city.trim(),
              accent,
            },
          },
        });

      if (signupError) {
        throw signupError;
      }

      if (data.session) {
        setSuccess("Your worker account has been created!");
        router.push("/worker");
        return;
      }

      setSuccess(
        "Registration successful! Please check your email to confirm your account before logging in."
      );
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px",
    borderRadius: "10px",
    border: "1px solid #303b33",
    background: "#111a13",
    color: "white",
    outline: "none",
    marginTop: "6px",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    color: "#b7c7ba",
    fontSize: "13px",
    fontWeight: 700,
    marginTop: "15px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070d08",
        color: "white",
        padding: "25px 15px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <form
        onSubmit={handleRegister}
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#101812",
          border: "1px solid #26372a",
          borderRadius: "20px",
          padding: "25px 20px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "35px" }}>🎙️</div>

          <h1
            style={{
              color: "#00e676",
              fontSize: "25px",
              fontWeight: 900,
              margin: "8px 0",
            }}
          >
            WORKER REGISTRATION
          </h1>

          <p style={{ color: "#aab8ad", fontSize: "13px" }}>
            Join Main Naija Pidgin and start earning.
          </p>
        </div>

        <label style={labelStyle}>FULL NAME</label>
        <input
          style={inputStyle}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Enter your full name"
          autoComplete="name"
        />

        <label style={labelStyle}>EMAIL ADDRESS</label>
        <input
          style={inputStyle}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          autoComplete="email"
        />

        <label style={labelStyle}>PASSWORD</label>
        <input
          style={inputStyle}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />

        <label style={labelStyle}>CONFIRM PASSWORD</label>
        <input
          style={inputStyle}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Enter password again"
          autoComplete="new-password"
        />

        <label style={labelStyle}>STATE</label>
        <select
          style={inputStyle}
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="">Select your state</option>
          {STATES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label style={labelStyle}>CITY / TOWN</label>
        <input
          style={inputStyle}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Warri, Port Harcourt, Ikeja"
        />

        <label style={labelStyle}>YOUR NATURAL SPEAKING ACCENT</label>
        <select
          style={inputStyle}
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
        >
          <option value="">Select your speaking accent</option>
          {ACCENTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {error && (
          <div
            style={{
              background: "#401818",
              color: "#ff8a80",
              padding: "12px",
              borderRadius: "9px",
              marginTop: "16px",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: "#12351f",
              color: "#69f0ae",
              padding: "12px",
              borderRadius: "9px",
              marginTop: "16px",
              fontSize: "13px",
            }}
          >
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "15px",
            marginTop: "22px",
            border: "none",
            borderRadius: "11px",
            background: loading ? "#526458" : "#00e676",
            color: "#061008",
            fontWeight: 900,
            fontSize: "15px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "CREATING ACCOUNT..." : "CREATE WORKER ACCOUNT"}
        </button>

        <p
          style={{
            textAlign: "center",
            color: "#aab8ad",
            fontSize: "13px",
            marginTop: "20px",
          }}
        >
          Already registered?{" "}
          <a
            href="/login"
            style={{ color: "#00e676", fontWeight: 800 }}
          >
            Login
          </a>
        </p>
      </form>
    </main>
  );
}