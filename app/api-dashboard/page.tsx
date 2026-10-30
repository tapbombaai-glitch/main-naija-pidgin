"use client"
import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function ApiDashboard(){
  const [keys,setKeys]=useState<any[]>([])
  const [user,setUser]=useState<any>(null)
  useEffect(()=>{ supabase.auth.getUser().then(({data})=>setUser(data.user)); fetchKeys() },[])
  const fetchKeys = async () => {
    const {data} = await supabase.from('api_keys').select('*').order('created_at',{ascending:false})
    setKeys(data||[])
  }
  return (
    <div style={{background:'#060A06',minHeight:'100vh',color:'white',padding:'20px',maxWidth:'420px',margin:'0 auto'}}>
      <h1 style={{fontWeight:900,fontSize:'20px'}}>🇳🇬 API Dashboard</h1>
      <p style={{fontSize:'11px',color:'#888'}}>100 free voice requests • Deduct only on success</p>
      {keys.map(k=>(
        <div key={k.id} style={{background:'#121C12',border:'1px solid #00E676',borderRadius:'14px',padding:'14px',marginTop:'14px'}}>
          <div style={{fontSize:'11px',fontWeight:800}}>{k.name}</div>
          <div style={{fontSize:'10px',color:'#666',marginTop:'4px'}}>{k.key_prefix}</div>
          <div style={{display:'flex',gap:'12px',marginTop:'12px'}}>
            <div><div style={{fontSize:'22px',fontWeight:900,color:'#00E676'}}>{k.free_requests_remaining}</div><div style={{fontSize:'9px',color:'#888'}}>Free Left</div></div>
            <div><div style={{fontSize:'22px',fontWeight:900}}>{k.paid_requests_remaining}</div><div style={{fontSize:'9px',color:'#888'}}>Paid Left</div></div>
            <div><div style={{fontSize:'22px',fontWeight:900,color:'#FFD54F'}}>{k.credits_remaining}</div><div style={{fontSize:'9px',color:'#888'}}>Total Left</div></div>
          </div>
          <div style={{fontSize:'10px',color:'#555',marginTop:'8px'}}>Used: {k.credits_used} • Total: {k.credits_total}</div>
        </div>
      ))}
      {keys.length===0 && <div style={{marginTop:'20px',color:'#666',fontSize:'12px'}}>No API keys yet. Go to Marketplace to claim your free 100 voice requests.</div>}
    </div>
  )
}