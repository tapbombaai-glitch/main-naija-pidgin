"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WorkerLogin() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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

      localStorage.setItem("gin_worker_id", result.workerId);

      router.push("/worker");
      router.refresh();

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050805] px-5 py-10 text-white">

      <div className="mx-auto flex min-h-[85vh] max-w-md flex-col justify-center">

        <header className="mb-8 text-center">

          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-green-500/40 bg-green-950 text-5xl shadow-lg shadow-green-900/20">
            🇳🇬
          </div>

          <h1 className="text-3xl font-black tracking-tight text-green-400">
            MAIN NAIJA PIDGIN
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Nigerian Voice Dataset
          </p>

          <div className="mt-7">
            <h2 className="text-2xl font-extrabold text-white">
              Worker Login
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Welcome back! Login to your worker account.
            </p>
          </div>

        </header>

        <form
          onSubmit={handleLogin}
          className="space-y-5 rounded-3xl border border-green-900/50 bg-[#101510] p-6 shadow-2xl"
        >

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-300">
              Worker ID or Email Address
            </label>

            <input
              className="w-full rounded-xl border border-gray-700 bg-[#080c08] p-4 text-white outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              placeholder="Enter Worker ID or Email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-300">
              Password
            </label>

            <input
              className="w-full rounded-xl border border-gray-700 bg-[#080c08] p-4 text-white outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-500 p-4 font-black text-black shadow-lg shadow-green-900/20 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "LOGGING IN..." : "LOGIN TO WORKER ACCOUNT"}
          </button>

          <div className="border-t border-gray-800 pt-5 text-center">

            <p className="text-sm text-gray-400">
              Don't have a worker account?
            </p>

            <Link
              href="/worker/register"
              className="mt-3 inline-block font-extrabold text-green-400 transition hover:text-yellow-400"
            >
              CREATE WORKER ACCOUNT →
            </Link>

          </div>

        </form>

        <footer className="mt-7 text-center">

          <p className="text-xs font-medium text-gray-500">
            MAIN NAIJA PIDGIN • WORKER PORTAL
          </p>

          <p className="mt-2 text-xs text-yellow-500">
            🇳🇬 Built for Nigerian Voices
          </p>

        </footer>

      </div>
    </main>
  );
}