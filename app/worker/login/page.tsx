"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WorkerLogin() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      setError("Enter your Worker ID or email and password.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/worker/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      // FIXED: If API no exist, e go return HTML, not JSON - handle am, no hang
      const text = await response.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Worker login API no dey respond. Check /api/worker/login route exists on Vercel.");
      }

      if (!response.ok) throw new Error(result.error || "Login failed.");

      if (!result.workerId) throw new Error("Login succeed but no workerId returned. Check API.");

      localStorage.setItem("gin_worker_id", result.workerId);
      // Also save for other pages wey dey check different key
      try { localStorage.setItem("worker_id", result.workerId); } catch {}
      await new Promise((r) => setTimeout(r, 300));
      router.push("/worker");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
  onContextMenu={(e) => e.preventDefault()}
  onCopy={(e) => e.preventDefault()}
  style={{ minHeight: "100vh", background: "#050805", padding: "40px 20px", color: "white", fontFamily: "system-ui", userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
>
      <div style={{ margin: "0 auto", maxWidth: "448px", minHeight: "85vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <header style={{ marginBottom: "32px", textAlign: "center" }}>
          <div style={{ margin: "0 auto 16px", height: "80px", width: "80px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "24px", border: "1px solid rgba(34,197,94,0.4)", background: "#052e16", fontSize: "48px" }}>🇳🇬</div>
          <h1 style={{ fontSize: "30px", fontWeight: 900, color: "#4ADE80", margin: 0 }}>MAIN NAIJA PIDGIN</h1>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "#9CA3AF" }}>Nigerian Voice Dataset</p>
          <div style={{ marginTop: "28px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 800, color: "white", margin: 0 }}>Worker Login</h2>
            <p style={{ marginTop: "8px", fontSize: "14px", color: "#9CA3AF" }}>Welcome back! Login to your worker account.</p>
          </div>
        </header>

        <form onSubmit={handleLogin} style={{ borderRadius: "24px", border: "1px solid rgba(20,83,45,0.5)", background: "#101510", padding: "24px" }}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "#D1D5DB" }}>Worker ID or Email Address</label>
            <input
              placeholder="Enter Worker ID or Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
              style={{ width: "100%", borderRadius: "12px", border: "1px solid #374151", background: "#080C08", padding: "16px", color: "white", outline: "none", fontSize: "15px", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: 600, color: "#D1D5DB" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%", borderRadius: "12px", border: "1px solid #374151", background: "#080C08", padding: "16px", paddingRight: "60px", color: "white", outline: "none", fontSize: "15px", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#4ADE80", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
          </div>

          {error && <div style={{ borderRadius: "12px", border: "1px solid rgba(239,68,68,0.4)", background: "rgba(76,5,25,0.5)", padding: "16px", fontSize: "14px", color: "#FCA5A5", marginBottom: "20px" }}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", borderRadius: "12px", background: loading ? "#16A34A" : "#22C55E", padding: "16px", fontWeight: 900, color: "black", border: "none", fontSize: "16px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}
          >
            {loading ? "LOGGING IN..." : "LOGIN TO WORKER ACCOUNT"}
          </button>

          <div style={{ borderTop: "1px solid #1F2937", paddingTop: "20px", textAlign: "center", marginTop: "20px" }}>
            <p style={{ fontSize: "14px", color: "#9CA3AF", margin: 0 }}>Don&apos;t have a worker account?</p>
            <Link href="/worker/register" style={{ display: "inline-block", marginTop: "12px", fontWeight: 800, color: "#4ADE80" }}>CREATE WORKER ACCOUNT →</Link>
          </div>
        </form>

        <footer style={{ marginTop: "28px", textAlign: "center" }}>
          <p style={{ fontSize: "12px", fontWeight: 500, color: "#6B7280", margin: 0 }}>MAIN NAIJA PIDGIN • WORKER PORTAL</p>
          <p style={{ marginTop: "8px", fontSize: "12px", color: "#EAB308" }}>🇳🇬 Built for Nigerian Voices</p>
        </footer>
      </div>
    </main>
  );
}