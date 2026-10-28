"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ChairmanLogin() {
  const [email, setEmail] = useState("tapbomba.ai@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (email.trim().toLowerCase() !== "tapbomba.ai@gmail.com") {
      setError("Only Chairman tapbomba.ai@gmail.com fit login here");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/admin/dashboard");
  };

  return (
    <div style={{padding: 40, maxWidth: 400, margin: "auto", color: "white", background: "#111", minHeight: "100vh"}}>
      <h1>👑 Chairman Panel</h1>
      <p>Chairman only - tapbomba.ai@gmail.com</p>
      <form onSubmit={handleLogin}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Chairman Email" style={{width:"100%", padding:10, marginBottom:10}} />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" style={{width:"100%", padding:10, marginBottom:10}} />
        {error && <p style={{color:"red"}}>{error}</p>}
        <button type="submit" disabled={loading} style={{width:"100%", padding:12, background:"gold", color:"black", fontWeight:"bold"}}>
          {loading ? "Checking Chairman..." : "Chairman Login →"}
        </button>
      </form>
      <p style={{marginTop:20, fontSize:12, opacity:0.6}}>✅ Secured by Supabase Auth</p>
      <a href="/" style={{color:"gold"}}>← Back to Home</a>
    </div>
  );
}