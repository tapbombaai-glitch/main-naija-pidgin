"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg("Logging in...");
    const supabase = createClient();
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      setMsg(error.message);
    } else {
      setMsg("Success! Entering dashboard...");
      window.location.href = "/admin/dashboard";
    }
  };

  return (
    <main style={{minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#101010", color:"#fff"}}>
      <form onSubmit={handleLogin} style={{background:"#1b1b1b", padding:"24px", borderRadius:"12px", width:"320px", display:"flex", flexDirection:"column", gap:"12px"}}>
        <h2 style={{color:"#d4af37"}}>Chairman Login</h2>
        <input type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required style={{padding:"12px", borderRadius:"8px", border:"1px solid #333"}} />
        <input type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} required style={{padding:"12px", borderRadius:"8px", border:"1px solid #333"}} />
        <button type="submit" style={{padding:"12px", borderRadius:"8px", background:"#d4af37", border:"none", fontWeight:"700", cursor:"pointer"}}>Login</button>
        {msg && <p style={{fontSize:"13px", color:"#ffbaba"}}>{msg}</p>}
      </form>
    </main>
  );
}