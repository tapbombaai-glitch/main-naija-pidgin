"use client";
import Link from "next/link";

export default function WorkerDashboard() {
  return (
    <main style={{background:'#0a0f0a', minHeight:'100vh', color:'white', padding:'20px'}}>
      <Link href="/" style={{color:'#00d084'}}>← Back to Home</Link>
      <h1 style={{marginTop:'30px', color:'#00d084'}}>🎤 Worker Workspace</h1>
      <p>Welcome Kingsley! Your Pidgin recording workspace go dey here.</p>
      <div style={{marginTop:'20px', background:'#132a13', padding:'20px', borderRadius:'12px'}}>
        <p>✅ Login Successful!</p>
        <p>Next: We go add Listen, Record, Submit functions here</p>
      </div>
    </main>
  );
}