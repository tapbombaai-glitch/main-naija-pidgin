"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase"; // FIXED PATH

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export default function WorkerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setMessage("Enter your email and password.");
      return;
    }

    if (normalizedEmail === CHAIRMAN_EMAIL) {
      setMessage("This is the Chairman account. Please use Chairman Login.");
      return;
    }

    setLoading(true);
    setMessage("Checking your worker account...");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error || !data.user) {
        setMessage("Login failed. Check your email and password.");
        return;
      }

      if (data.user.email?.trim().toLowerCase() === CHAIRMAN_EMAIL) {
        await supabase.auth.signOut();
        setMessage("This account is reserved for the Chairman. Please use Chairman Login.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, is_chairman")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        setMessage("We could not verify your worker profile. Please try again.");
        return;
      }

      if (!profile || profile.is_chairman === true) {
        await supabase.auth.signOut();
        setMessage("No valid worker profile was found for this account. Contact the administrator.");
        return;
      }

      router.replace("/worker");
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-yellow-500/30 bg-gray-950 p-6">
        <div className="mb-6 text-center">
          <div className="text-4xl">🎙️</div>
          <h1 className="mt-2 text-2xl font-extrabold text-yellow-400">Worker Login</h1>
          <p className="mt-2 text-sm text-gray-400">Main Naija Pidgin Recording Workspace</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="worker-email" className="mb-1 block text-sm font-semibold text-yellow-400">EMAIL ADDRESS</label>
            <input id="worker-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your worker email" required disabled={loading} className="w-full rounded-lg border border-gray-700 bg-black px-3 py-3 outline-none focus:border-yellow-400" />
          </div>
          <div>
            <label htmlFor="worker-password" className="mb-1 block text-sm font-semibold text-yellow-400">PASSWORD</label>
            <input id="worker-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required disabled={loading} className="w-full rounded-lg border border-gray-700 bg-black px-3 py-3 outline-none focus:border-yellow-400" />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-yellow-400 px-4 py-3 font-extrabold text-black disabled:opacity-50">
            {loading ? "Checking account..." : "Sign In to Worker Panel"}
          </button>
        </form>
        {message && <p className="mt-4 rounded-lg border border-gray-700 bg-gray-900 p-3 text-sm">{message}</p>}
        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-gray-300 hover:text-yellow-400">← Back to Main Naija Pidgin</a>
        </div>
      </section>
    </main>
  );
}