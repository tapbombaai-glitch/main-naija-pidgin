"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WorkerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = () => {
    setError("");
    if (!email || !password) {
      setError("Email and password required!");
      return;
    }
    setLoading(true);
    // FRONTEND DEMO ONLY — No Supabase yet
    setTimeout(() => {
      localStorage.setItem("worker_email", email);
      localStorage.setItem("worker_logged_in", "true");
      setLoading(false);
      router.push("/worker");
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-[#090B0E] text-white flex items-center justify-center p-4">
      <style jsx global>{`*{box-sizing:border-box} body{margin:0}`}</style>
      
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D9AE52] text-2xl font-black text-black">N</div>
          <h1 className="mt-4 text-xl font-black tracking-wide">MAIN NAIJA PIDGIN</h1>
          <p className="text-xs tracking-[3px] text-[#D9AE52]">WORKER LOGIN</p>
          <p className="mt-2 text-xs text-gray-500">Separate from Chairman Panel</p>
        </div>

        {/* Login Card */}
        <div className="rounded-[18px] border border-[#292B30] bg-gradient-to-br from-[#171A20] to-[#101216] p-6">
          <h2 className="text-lg font-bold">Welcome Back, Worker 👋</h2>
          <p className="mt-1 text-xs text-gray-400">Login to your recording workspace. Every voice counts!</p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">{error}</div>
          )}

          <div className="mt-5">
            <label className="text-xs text-gray-400">Worker Email</label>
            <input
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="worker@example.com"
              className="mt-1 w-full rounded-xl border border-[#292B30] bg-[#0F1116] px-4 py-3 text-sm outline-none focus:border-[#D9AE52]"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-400">Password</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#292B30] bg-[#0F1116] px-4 py-3 pr-12 text-sm outline-none focus:border-[#D9AE52]"
              />
              <button onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">{show ? "Hide" : "Show"}</button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-[#D9AE52] py-3 text-sm font-bold text-black hover:bg-[#F0CC79] disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login to Workspace →"}
          </button>

          <div className="mt-4 flex justify-between text-xs">
            <Link href="/worker/signup" className="text-[#D9AE52] hover:underline">New worker? Sign up</Link>
            <Link href="/worker/forgot" className="text-gray-500 hover:text-gray-300">Forgot password?</Link>
          </div>

          <div className="mt-6 rounded-xl bg-[#191711] border border-[#393022] p-3">
            <p className="text-[11px] text-gray-400">Frontend Demo Only</p>
            <p className="mt-1 text-[10px] leading-4 text-gray-500">No Supabase yet. Any email/password works for demo. Later we connect real auth and protect /worker routes so 04 Pending will show real count for that worker only.</p>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-4 text-xs">
          <Link href="/" className="text-gray-500 hover:text-gray-300">← Home</Link>
          <Link href="/admin/login" className="text-gray-600 hover:text-gray-400">Chairman Login (separate) →</Link>
        </div>

        <p className="mt-6 text-center text-[10px] text-gray-600">MAIN NAIJA PIDGIN · Worker Portal · Frontend Demo</p>
      </div>
    </main>
  );
}