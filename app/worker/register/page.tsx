"use client";

import { useState } from "react";

export default function WorkerRegister() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [workerId, setWorkerId] = useState("");

  const regions = [
    "Port Harcourt",
    "Warri",
    "Lagos",
    "Abuja",
    "Benin City",
    "Enugu",
    "Owerri",
    "Uyo",
    "Calabar",
    "Onitsha",
    "Aba",
    "Other",
  ];

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/worker/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          region,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed.");
      }

      setWorkerId(result.workerId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed."
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
            Worker Registration
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Create your worker account to get started.
          </p>
        </div>

        {workerId ? (
          <div className="rounded-2xl border border-green-500 bg-[#101b12] p-6 text-center">

            <div className="text-5xl">✅</div>

            <h2 className="mt-4 text-2xl font-bold text-green-400">
              Registration Successful!
            </h2>

            <p className="mt-3 text-gray-300">
              Your new Worker ID is:
            </p>

            <div className="my-5 rounded-xl bg-black p-4 text-2xl font-black text-green-400">
              {workerId}
            </div>

            <p className="text-sm text-gray-300">
              Save this ID. You will need it to access your worker account.
            </p>

            <p className="mt-5 text-sm text-gray-400">
              Your account has been created. The worker login page is the
              next step.
            </p>

          </div>
        ) : (
          <form
            onSubmit={handleRegister}
            className="space-y-4 rounded-2xl border border-gray-800 bg-[#0d0d0d] p-5"
          >

            <input
              className={inputStyle}
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <input
              className={inputStyle}
              placeholder="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />

            <input
              className={inputStyle}
              placeholder="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <select
              className={inputStyle}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
            >
              <option value="">Select Your Nigerian Location</option>

              {regions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              className={inputStyle}
              placeholder="Create Password (minimum 8 characters)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />

            <input
              className={inputStyle}
              placeholder="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? "CREATING ACCOUNT..." : "CREATE WORKER ACCOUNT"}
            </button>

            <p className="text-center text-xs text-gray-500">
              Your account details are securely registered.
            </p>

          </form>
        )}

      </div>
    </main>
  );
}