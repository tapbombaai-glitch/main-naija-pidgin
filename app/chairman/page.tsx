"use client"
import { useEffect, useState } from "react"

export default function ChairmanPage() {
  const [items, setItems] = useState<any[]>([])
  const [pass, setPass] = useState("")
  const [ok, setOk] = useState(false)
  const [stats, setStats] = useState({total:0, pending:0, approved:0})
  const CHAIRMAN_PASS = "chairman2024"
  const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com"

  useEffect(()=>{ if(ok) load() },[ok])
  
  async function load(){
    const r = await fetch("/api/chairman/list")
    const d = await r.json()
    const list = d.recordings || d || []
    setItems(list)
    setStats({
      total: list.length,
      pending: list.filter((x:any)=>x.status!=='approved' && x.status!=='rejected').length,
      approved: list.filter((x:any)=>x.status==='approved').length
    })
  }
  
  async function act(id:string, status:string){
    await fetch("/api/chairman/approve",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id, status, chairman_email:CHAIRMAN_EMAIL})
    })
    load()
  }

  if(!ok) return (
    <div style={{padding:20, maxWidth:400, margin:"80px auto", fontFamily:"sans-serif"}}>
      <h2>👑 Chairman</h2>
      <p style={{fontSize:11, color:"#888"}}>{CHAIRMAN_EMAIL}</p>
      <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password"
        style={{width:"100%", padding:12, borderRadius:8, border:"1px solid #ccc", marginTop:10}}/>
      <button onClick={()=> pass===CHAIRMAN_PASS ? setOk(true) : alert("Wrong")}
        style={{width:"100%", padding:12, marginTop:10, background:"black", color:"white", borderRadius:8}}>Enter</button>
    </div>
  )

  return (
    <div style={{fontFamily:"sans-serif", background:"black", minHeight:"100vh", color:"white", padding:15}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:15}}>
        <div><b>👑 CHAIRMAN</b> <div style={{fontSize:10, color:"#888"}}>{CHAIRMAN_EMAIL}</div></div>
        <button onClick={load} style={{padding:"8px 14px", borderRadius:20, background:"#1a1a1a", color:"#22c55e", border:"1px solid #22c55e"}}>Verify ↻ {stats.total}</button>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20}}>
        <div style={{background:"#111", padding:12, borderRadius:12}}><div style={{fontSize:10, color:"#999"}}>PENDING</div><div style={{fontSize:22, fontWeight:"bold"}}>{stats.pending}</div></div>
        <div style={{background:"#111", padding:12, borderRadius:12}}><div style={{fontSize:10, color:"#999"}}>APPROVED</div><div style={{fontSize:22, fontWeight:"bold"}}>{stats.approved}</div></div>
      </div>

      {items.map((it:any)=>(
        <div key={it.id} style={{background:"white", color:"black", padding:12, borderRadius:12, marginBottom:10}}>
          <div style={{fontSize:11, color:"#666"}}>{it.worker_id || it.user_id} • {it.status || 'pending'}</div>
          <div style={{fontWeight:"bold", margin:"4px 0"}}>{(it.pidgin_text || it.text || "").slice(0,80)}</div>
          <audio controls src={it.audio_url || it.voice_url} style={{width:"100%", height:30}}/>
          <div style={{display:"flex", gap:8, marginTop:8}}>
            <button onClick={()=>act(it.id,"approved")} style={{flex:1, padding:10, background:"#16a34a", color:"white", borderRadius:8, border:0}}>Approve</button>
            <button onClick={()=>act(it.id,"rejected")} style={{flex:1, padding:10, background:"#dc2626", color:"white", borderRadius:8, border:0}}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  )
}