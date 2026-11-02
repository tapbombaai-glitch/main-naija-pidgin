// app/clone/page.tsx - EMERGENCY PURE INLINE - NO TAILWIND
"use client";
import { useEffect, useRef, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export default function ClonePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  // ... keep your other states for voice ...

  async function verifyChairman(s: Session) {
    if (s.user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      setAuthorized(false); setLoginError(`Current login ${s.user.email}. Use Chairman.`); await supabase.auth.signOut(); return false;
    }
    const { data: profile } = await supabase.from("profiles").select("email,is_chairman").eq("id", s.user.id).maybeSingle();
    if (!profile || profile.is_chairman !== true) { setAuthorized(false); await supabase.auth.signOut(); return false; }
    setSession(s); setAuthorized(true); setLoginError(""); return true;
  }

  useEffect(() => {
    let mounted = true; let verificationTimer: any = null;
    async function check() {
      try { const { data } = await supabase.auth.getSession(); if (mounted && data.session) await verifyChairman(data.session); }
      finally { if (mounted) setAuthLoading(false); }
    }
    void check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      if (event === "SIGNED_OUT" || !newSession) { setSession(null); setAuthorized(false); return; }
      verificationTimer = setTimeout(() => { if (mounted) void verifyChairman(newSession); }, 0);
    });
    return () => { mounted = false; subscription.unsubscribe(); if (verificationTimer) clearTimeout(verificationTimer); };
  }, []);

  async function handleLogin(e: any) {
    e.preventDefault(); setLoginLoading(true); setLoginError("");
    try {
      await supabase.auth.signOut();
      const { data, error } = await supabase.auth.signInWithPassword({ email: CHAIRMAN_EMAIL, password });
      if (error || !data.session) { setLoginError(error?.message || "Failed"); return; }
      await verifyChairman(data.session);
    } catch { setLoginError("Login failed"); } finally { setLoginLoading(false); }
  }

  if (authLoading) {
    return <div style={{ minHeight: '100vh', background: '#050807', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Checking Chairman...</div>;
  }

  if (!authorized) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: '#050807', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#101915', border: '1px solid #166534', borderRadius: '16px', padding: '24px', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '36px' }}>👑</div>
            <h1 style={{ color: '#4ade80', fontWeight: '900', fontSize: '20px', margin: '8px 0 0 0' }}>Main Naija Pidgin</h1>
            <p style={{ color: '#9ca3af', fontSize: '12px' }}>Chairman Voice Studio</p>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ color: '#d1d5db', fontSize: '12px' }}>Chairman Email</label>
            <input type="email" value={CHAIRMAN_EMAIL} readOnly style={{ display: 'block', width: '100%', height: '54px', padding: '14px', backgroundColor: '#050807', color: '#ffffff', border: '1px solid #166534', borderRadius: '10px', fontSize: '16px', WebkitTextFillColor: '#ffffff', boxSizing: 'border-box' }} />

            <label style={{ color: '#d1d5db', fontSize: '12px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter Chairman password" required style={{ display: 'block', width: '100%', height: '54px', padding: '14px', backgroundColor: '#050807', color: '#ffffff', border: '1px solid #166534', borderRadius: '10px', fontSize: '16px', WebkitTextFillColor: '#ffffff', boxSizing: 'border-box' }} />

            {loginError && <div style={{ background: '#450a0a', color: '#fca5a5', padding: '10px', borderRadius: '8px', fontSize: '12px' }}>{loginError}</div>}

            <button type="submit" disabled={loginLoading} style={{ width: '100%', height: '54px', backgroundColor: '#22c55e', color: 'black', fontWeight: '900', borderRadius: '10px', border: 'none', fontSize: '16px', marginTop: '8px' }}>{loginLoading ? "Checking..." : "Enter Voice Studio"}</button>
          </form>

          <button onClick={async () => { await supabase.auth.signOut(); setSession(null); setAuthorized(false); }} style={{ width: '100%', height: '44px', background: 'transparent', color: '#9ca3af', border: '1px solid #333', borderRadius: '10px', marginTop: '12px', fontSize: '13px' }}>Clear Previous Login</button>
        </div>
      </div>
    );
  }

  // For authorized - return your normal studio - you can paste your studio code here after login works
  return <div style={{ background: '#050807', minHeight: '100vh', color: 'white', padding: '20px' }}><h1>Chairman Studio Loaded - Now add your voice cloning UI back</h1><button onClick={async () => { await supabase.auth.signOut(); setSession(null); setAuthorized(false); }} style={{ padding: '10px', background: '#22c55e', color: 'black', borderRadius: '8px' }}>Logout</button></div>;
}