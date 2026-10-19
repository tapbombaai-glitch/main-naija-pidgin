'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ONLY YOU CAN ENTER ADMIN - CHAIRMAN EMAILS
const CHAIRMAN_EMAILS = [
  'tapbomba.ai@gmail.com',
  'tapbombaai@gmail.com',
  'kingsleyalfsuoye@gmail.com',
  'admin@bomba.ai'
];

export default function LoginPage(){
  const [mode, setMode] = useState('api'); // 'api' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleApiKeySignIn(){
    if(!email.includes('@')) return setMsg('❌ Enter valid email');
    if(!apiKey.startsWith('sk_')) return setMsg('❌ Enter valid API key - sk_free_ or sk_live_');
    setLoading(true);
    setMsg('⏳ Checking your API key...');
    try{
      const res = await fetch(`/api/check-key?key=${encodeURIComponent(apiKey)}`);
      const data = await res.json();
      if(data.valid){
        // Login with Supabase email/password OR create session
        // For API users - we store key and redirect to /api-access dashboard
        localStorage.setItem('bomba_api_key', apiKey);
        localStorage.setItem('bomba_user_email', email);
        setMsg('✅ API KEY VALID! Opening your API dashboard...');
        setTimeout(()=>{ window.location.href='/api-access?key='+encodeURIComponent(apiKey); }, 1000);
      }else{
        setMsg('❌ Invalid key - '+data.error);
      }
    }catch(e){ setMsg('❌ '+e.message); }
    setLoading(false);
  }

  async function handleAdminSignIn(){
    if(!email.includes('@')) return setMsg('❌ Enter Chairman email');
    // CHECK IF CHAIRMAN - ONLY YOU!
    if(!CHAIRMAN_EMAILS.includes(email.toLowerCase())){
      setMsg('❌ ACCESS DENIED - Admin sign in only for Chairman! You are not Chairman! Use API Key Sign In!');
      return;
    }
    if(!password){ return setMsg('❌ Enter Chairman password'); }
    setLoading(true);
    setMsg('⏳ Checking Chairman...');
    try{
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if(error){ setMsg('❌ '+error.message); setLoading(false); return; }
      setMsg('✅ Chairman Welcome! Opening Admin Dashboard...');
      setTimeout(()=>{ window.location.href='/admin/dashboard'; }, 1000);
    }catch(e){ setMsg('❌ '+e.message); }
    setLoading(false);
  }

  return (
    <div style={{background:'#000', color:'#fff', minHeight:'100vh', padding:20, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{width:'100%', maxWidth:450, border:'2px solid gold', borderRadius:25, padding:25, background:'#0a0a0a'}}>
        <h1 style={{textAlign:'center', color:'gold', margin:0}}>🔐 BOMBA AI SIGN IN</h1>
        <p style={{textAlign:'center', color:'#aaa', fontSize:12, marginTop:5}}>Choose your sign in type</p>

        {/* 2 SIGN IN TABS - API KEY & ADMIN */}
        <div style={{display:'flex', gap:10, marginTop:20, background:'#111', borderRadius:30, padding:5}}>
          <button onClick={()=>setMode('api')} style={{flex:1, padding:12, borderRadius:25, border:'none', background: mode==='api'?'#00aaff':'transparent', color: mode==='api'?'#fff':'#aaa', fontWeight:900}}>🔑 API KEY SIGN IN</button>
          <button onClick={()=>setMode('admin')} style={{flex:1, padding:12, borderRadius:25, border:'none', background: mode==='admin'?'gold':'transparent', color: mode==='admin'?'#000':'#aaa', fontWeight:900}}>👑 ADMIN SIGN IN</button>
        </div>

        <div style={{marginTop:20}}>
          <label style={{color: mode==='api'?'#00aaff':'gold', fontSize:12, fontWeight:900}}>{mode==='api' ? 'API USER EMAIL' : 'CHAIRMAN EMAIL (PRIVATE)'}</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder={mode==='api' ? 'dev@gmail.com' : 'tapbomba.ai@gmail.com - Only Chairman'} style={{width:'100%', padding:14, borderRadius:12, background:'#222', color:'#fff', border:`1px solid ${mode==='api'?'#00aaff':'gold'}`, marginTop:5, boxSizing:'border-box'}}/>
        </div>

        {mode==='api' ? (
          <>
            <div style={{marginTop:15}}>
              <label style={{color:'#00aaff', fontSize:12, fontWeight:900}}>YOUR API KEY - sk_free_ or sk_live_</label>
              <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk_free_xxxx... or sk_live_xxxx..." style={{width:'100%', padding:14, borderRadius:12, background:'#222', color:'#00ff88', border:'1px solid #00aaff', marginTop:5, boxSizing:'border-box', fontSize:13}}/>
            </div>
            <button onClick={handleApiKeySignIn} disabled={loading} style={{width:'100%', padding:16, borderRadius:30, background:'#00aaff', color:'#fff', fontWeight:900, border:'none', marginTop:20, fontSize:16}}>{loading?'⏳ Checking Key...':'🔑 API KEY SIGN IN - OPEN MY API'}</button>
            <p style={{textAlign:'center', color:'#555', fontSize:10, marginTop:10}}>For customers with FREE sk_free_ or PAID sk_live_ ₦5,000 - Anybody can enter</p>
          </>
        ) : (
          <>
            <div style={{marginTop:15}}>
              <label style={{color:'gold', fontSize:12, fontWeight:900}}>CHAIRMAN PASSWORD - PRIVATE</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Chairman password only" style={{width:'100%', padding:14, borderRadius:12, background:'#222', color:'#fff', border:'1px solid gold', marginTop:5, boxSizing:'border-box'}}/>
            </div>
            <button onClick={handleAdminSignIn} disabled={loading} style={{width:'100%', padding:16, borderRadius:30, background:'gold', color:'#000', fontWeight:900, border:'none', marginTop:20, fontSize:16}}>{loading?'⏳ Checking Chairman...':'👑 ADMIN SIGN IN - CHAIRMAN ONLY'}</button>
            <p style={{textAlign:'center', color:'#ff0040', fontSize:10, marginTop:10, fontWeight:900}}>⚠️ PRIVATE - Only Chairman tapbomba.ai@gmail.com can enter - Others blocked!</p>
          </>
        )}

        {msg && <div style={{marginTop:15, padding:12, borderRadius:12, background: msg.includes('✅') ? '#002200' : '#220000', border:`1px solid ${msg.includes('✅') ? '#00ff88' : '#ff0040'}`, fontSize:13}}>{msg}</div>}

        <div style={{textAlign:'center', marginTop:20, borderTop:'1px solid #222', paddingTop:15}}>
          <button onClick={()=>window.location.href='/'} style={{background:'transparent', color:'#aaa', border:'none', fontSize:12}}>← Back to Home</button>
          <div style={{marginTop:10, display:'flex', gap:10, justifyContent:'center'}}>
            <button onClick={()=>window.location.href='/api-access'} style={{background:'#111', color:'#00aaff', border:'1px solid #00aaff', padding:8, borderRadius:20, fontSize:11}}>API Panel Flyer Link</button>
            <button onClick={()=>window.location.href='/workers'} style={{background:'#111', color:'#00ff88', border:'1px solid #00ff88', padding:8, borderRadius:20, fontSize:11}}>Workers Panel Flyer Link</button>
          </div>
        </div>
      </div>
    </div>
  );
}