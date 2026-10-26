'use client';

import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';

const CHAIRMAN_EMAIL = 'tapbomba.ai@gmail.com';

export default function LoginPage() {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [msg, setMsg] = useState('');

async function handleLogin(event) {
event.preventDefault();

if (loading) return;

const normalizedEmail = email.trim().toLowerCase();

if (normalizedEmail !== CHAIRMAN_EMAIL) {
  setMsg('Access denied. This login is reserved for the Chairman.');
  return;
}

if (!password) {
  setMsg('Please enter your Chairman password.');
  return;
}

setLoading(true);
setMsg('Checking your Chairman account...');

try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) {
    setMsg('Login failed. Check your email and password.');
    return;
  }

  if (data.user?.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
    await supabase.auth.signOut();
    setMsg('Access denied. This account is not authorised.');
    return;
  }

  setMsg('Login successful. Opening Chairman Dashboard...');

  window.location.replace('/admin/dashboard');
} catch {
  setMsg('Something went wrong. Please try again.');
} finally {
  setLoading(false);
}

}

return (
<main
style={{
minHeight: '100vh',
padding: 20,
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
background:
'radial-gradient(circle at top, #27200b 0%, #090909 45%, #000 100%)',
color: '#fff',
fontFamily: 'Arial, sans-serif',
}}
>
<section
style={{
width: '100%',
maxWidth: 430,
padding: 28,
border: '1px solid #806817',
borderRadius: 22,
background: '#0b0b0b',
boxShadow: '0 20px 70px rgba(0,0,0,0.5)',
boxSizing: 'border-box',
}}
>
<div style={{ textAlign: 'center' }}>
<div style={{ fontSize: 42 }}>👑</div>
<h1 style={{ color: '#facc15', marginBottom: 8 }}>
Chairman Login
</h1>
<p style={{ color: '#a3a3a3', fontSize: 14, lineHeight: 1.7 }}>
Main Naija Pidgin Administration
</p>
</div>

    <div
      style={{
        margin: '22px 0',
        padding: 12,
        borderRadius: 12,
        border: '1px solid #594715',
        background: '#171307',
        color: '#facc15',
        textAlign: 'center',
        fontSize: 12,
        lineHeight: 1.7,
      }}
    >
      🔒 Restricted access
      <br />
      Authorised Chairman account only
    </div>

    <form onSubmit={handleLogin}>
      <label
        htmlFor="chairman-email"
        style={{
          display: 'block',
          marginBottom: 7,
          fontSize: 12,
          fontWeight: 700,
          color: '#facc15',
        }}
      >
        CHAIRMAN EMAIL
      </label>

      <input
        id="chairman-email"
        type="email"
        autoComplete="username"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter Chairman email"
        required
        disabled={loading}
        style={{
          width: '100%',
          padding: 14,
          boxSizing: 'border-box',
          borderRadius: 10,
          border: '1px solid #51451e',
          background: '#171717',
          color: '#fff',
          marginBottom: 18,
        }}
      />

      <label
        htmlFor="chairman-password"
        style={{
          display: 'block',
          marginBottom: 7,
          fontSize: 12,
          fontWeight: 700,
          color: '#facc15',
        }}
      >
        PASSWORD
      </label>

      <input
        id="chairman-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your password"
        required
        disabled={loading}
        style={{
          width: '100%',
          padding: 14,
          boxSizing: 'border-box',
          borderRadius: 10,
          border: '1px solid #51451e',
          background: '#171717',
          color: '#fff',
          marginBottom: 20,
        }}
      />

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: 15,
          border: 'none',
          borderRadius: 12,
          background: loading ? '#78672c' : '#facc15',
          color: '#111',
          fontSize: 15,
          fontWeight: 900,
          cursor: loading ? 'wait' : 'pointer',
        }}
      >
        {loading ? 'Checking account...' : '👑 Sign In to Chairman Panel'}
      </button>
    </form>

    {msg && (
      <div
        role="status"
        aria-live="polite"
        style={{
          marginTop: 18,
          padding: 12,
          borderRadius: 10,
          background: '#151515',
          border: '1px solid #383838',
          color: '#e5e5e5',
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {msg}
      </div>
    )}

    <div
      style={{
        marginTop: 24,
        paddingTop: 18,
        borderTop: '1px solid #292929',
        textAlign: 'center',
      }}
    >
      <a
        href="/"
        style={{
          color: '#d4d4d4',
          fontSize: 13,
          textDecoration: 'none',
        }}
      >
        ← Back to Main Naija Pidgin
      </a>
    </div>
  </section>
</main>

);
}