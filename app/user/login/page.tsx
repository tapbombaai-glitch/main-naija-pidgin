"use client";

import { useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export default function CustomerLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error"
  >("error");

  function showMessage(
    text: string,
    type: "success" | "error" = "error"
  ) {
    setMessage(text);
    setMessageType(type);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showMessage("Please enter your email and password.");
      return;
    }

    // Keep Chairman authentication separate.
    if (cleanEmail === CHAIRMAN_EMAIL) {
      showMessage(
        "This is the customer login. Please use the Chairman Dashboard login."
      );
      return;
    }

    if (mode === "signup") {
      if (password.length < 8) {
        showMessage("Your password must contain at least 8 characters.");
        return;
      }

      if (password !== confirmPassword) {
        showMessage("Your passwords do not match.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          showMessage(
            error.message === "Invalid login credentials"
              ? "Incorrect email or password. Please try again."
              : error.message
          );
          return;
        }

        if (!data.user) {
          showMessage("Login could not be completed. Please try again.");
          return;
        }

        router.replace("/api-dashboard");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/api-dashboard`,
        },
      });

      if (error) {
        showMessage(error.message);
        return;
      }

      if (data.session) {
        showMessage(
          "Your customer account has been created successfully.",
          "success"
        );

        router.replace("/api-dashboard");
        router.refresh();
        return;
      }

      showMessage(
        "Your account has been created. Please check your email for the confirmation link before logging in.",
        "success"
      );

      setMode("login");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("CUSTOMER AUTH ERROR:", error);

      showMessage(
        "Something went wrong. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="customer-page">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      <div className="customer-container">
        <Link href="/marketplace" className="brand">
          <div className="brand-logo">♛</div>

          <div>
            <div className="brand-name">MAIN NAIJA PIDGIN</div>
            <div className="brand-caption">VOICE API MARKETPLACE</div>
          </div>
        </Link>

        <section className="login-card">
          <div className="card-icon">👤</div>

          <div className="eyebrow">CUSTOMER ACCOUNT</div>

          <h1>
            {mode === "login"
              ? "Welcome Back"
              : "Create Your Account"}
          </h1>

          <p className="subtitle">
            {mode === "login"
              ? "Log in to manage your API keys, credits and purchases."
              : "Register to access the Main Naija Pidgin Voice API."}
          </p>

          <div className="mode-switch">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Login
            </button>

            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="customer-email">Email Address</label>

            <input
              id="customer-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <label htmlFor="customer-password">Password</label>

            <div className="password-wrap">
              <input
                id="customer-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                required
              />

              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>

            {mode === "signup" && (
              <>
                <label htmlFor="confirm-password">
                  Confirm Password
                </label>

                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password again"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <div className="password-hint">
                  Use at least 8 characters.
                </div>
              </>
            )}

            {message && (
              <div
                className={`message ${
                  messageType === "success" ? "success" : "error"
                }`}
                role="alert"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading
                ? "PLEASE WAIT..."
                : mode === "login"
                ? "LOGIN TO CUSTOMER DASHBOARD"
                : "CREATE CUSTOMER ACCOUNT"}
            </button>
          </form>

          <div className="security-note">
            <span>🔒</span>
            Your account and API information are protected.
          </div>
        </section>

        <div className="bottom-links">
          <Link href="/marketplace">Back to Marketplace</Link>
          <span>•</span>
          <Link href="/admin/login">Chairman Login</Link>
        </div>

        <div className="copyright">
          © {new Date().getFullYear()} Main Naija Pidgin
        </div>
      </div>

      <style jsx>{`
        .customer-page {
          min-height: 100vh;
          background: #050907;
          color: #f5fff8;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 35px 16px;
          position: relative;
          overflow: hidden;
          font-family: Arial, sans-serif;
        }

        .background-glow {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.13;
          pointer-events: none;
        }

        .glow-one {
          background: #00e676;
          top: -120px;
          left: -100px;
        }

        .glow-two {
          background: #b5ff00;
          bottom: -150px;
          right: -100px;
        }

        .customer-container {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 1;
        }

        .brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 28px;
          text-decoration: none;
          color: white;
        }

        .brand-logo {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #00e676, #a8ff00);
          color: #041108;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 29px;
          font-weight: bold;
        }

        .brand-name {
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .brand-caption {
          color: #8da99a;
          font-size: 10px;
          letter-spacing: 2px;
          margin-top: 5px;
        }

        .login-card {
          background: #0c1510;
          border: 1px solid #203a2a;
          border-radius: 22px;
          padding: 30px 25px;
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.4);
        }

        .card-icon {
          width: 48px;
          height: 48px;
          border-radius: 15px;
          background: #142c1d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
          margin-bottom: 20px;
        }

        .eyebrow {
          color: #00e676;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        h1 {
          font-size: 27px;
          margin: 9px 0;
          letter-spacing: -0.7px;
        }

        .subtitle {
          color: #9aada1;
          font-size: 13px;
          line-height: 1.6;
          margin: 0 0 23px;
        }

        .mode-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          background: #07100a;
          border: 1px solid #203a2a;
          padding: 5px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .mode-switch button {
          border: 0;
          border-radius: 8px;
          padding: 12px 5px;
          background: transparent;
          color: #91a79a;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .mode-switch button.active {
          background: #00d96b;
          color: #031108;
        }

        form {
          display: flex;
          flex-direction: column;
        }

        label {
          font-size: 12px;
          font-weight: 700;
          margin: 0 0 8px;
          color: #dcebe1;
        }

        input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          background: #070e09;
          border: 1px solid #294333;
          color: white;
          padding: 15px 13px;
          border-radius: 10px;
          outline: none;
          font-size: 14px;
          margin-bottom: 18px;
        }

        input:focus {
          border-color: #00e676;
          box-shadow: 0 0 0 2px rgba(0, 230, 118, 0.1);
        }

        input::placeholder {
          color: #617568;
        }

        .password-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .password-wrap input {
          padding-right: 65px;
        }

        .show-password {
          position: absolute;
          right: 12px;
          top: 12px;
          border: 0;
          background: transparent;
          color: #00e676;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          padding: 5px;
        }

        .password-hint {
          color: #81988a;
          font-size: 11px;
          margin-top: -10px;
          margin-bottom: 18px;
        }

        .message {
          padding: 12px;
          border-radius: 9px;
          font-size: 12px;
          line-height: 1.5;
          margin-bottom: 16px;
          overflow-wrap: anywhere;
        }

        .message.error {
          color: #ffb4b4;
          background: #351717;
          border: 1px solid #713333;
        }

        .message.success {
          color: #a7ffc8;
          background: #10301d;
          border: 1px solid #23623a;
        }

        .submit-button {
          border: 0;
          border-radius: 11px;
          padding: 16px 10px;
          background: linear-gradient(110deg, #00e676, #b5ff00);
          color: #031108;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.4px;
          cursor: pointer;
          margin-top: 3px;
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .security-note {
          color: #81988a;
          font-size: 11px;
          text-align: center;
          margin-top: 22px;
        }

        .security-note span {
          margin-right: 5px;
        }

        .bottom-links {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
          font-size: 12px;
          color: #668071;
        }

        .bottom-links a {
          color: #9bb9a6;
          text-decoration: none;
        }

        .bottom-links a:hover {
          color: #00e676;
        }

        .copyright {
          text-align: center;
          margin-top: 20px;
          color: #52665a;
          font-size: 10px;
        }

        @media (max-width: 380px) {
          .login-card {
            padding: 25px 18px;
          }

          h1 {
            font-size: 24px;
          }
        }
      `}</style>
    </main>
  );
}