"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkerLogin() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login failed.");
      }

      // Keep Worker ID available for the dashboard UI.
      localStorage.setItem("gin_worker_id", result.workerId);

      router.push("/worker");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle =
    "w-full rounded-xl border border-gray-700 bg-[#151515] p-4 text-white outline-none focus:border-green-500";

  return (
    <main className="min-h-screen bg-black px-5 py-10 text-white">
      <div className="mx-auto max-w-md">

        <div className="mb-8 text-center">
          <div className="mb-3 text-5xl">🇳🇬</div>

          <h1 className="text-3xl font-black text-green-400">
            MAIN NAIJA PIDGIN
          </h1>

          <p className="mt-2 text-gray-400">
            Nigerian Voice Dataset
          </p>

          <h2 className="mt-8 text-2xl font-bold">
            Worker Login
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Login to your worker account.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="space-y-4 rounded-2xl border border-gray-800 bg-[#0d0d0d] p-5"
        >

          <input
            className={inputStyle}
            placeholder="Worker ID or Email Address"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            required
          />

          <input
            className={inputStyle}
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="rounded-xl border border-red-500 bg-red-950 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-500 p-4 font-black text-black disabled:opacity-50"
          >
            {loading ? "LOGGING IN..." : "LOGIN TO WORKER ACCOUNT"}
          </button>

          <div className="pt-2 text-center">
            <p className="text-xs text-gray-500">
              Don't have a worker account?
            </p>

            <a
              href="/worker/register"
              className="mt-2 inline-block font-bold text-green-400"
            >
              CREATE WORKER ACCOUNT →
            </a>
          </div>

        </form>

        <p className="mt-6 text-center text-xs text-gray-600">
          Main Naija Pidgin • Worker Portal
        </p>

      </div>
    </main>
  );
}