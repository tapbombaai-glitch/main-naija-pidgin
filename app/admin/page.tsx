"use client"
import { useEffect, useState } from "react"

export default function AdminPage() {
  const [items, setItems] = useState<any[]>([])
  const [pass, setPass] = useState("")
  const [ok, setOk] = useState(false)
  const CHAIRMAN_PASS = "chairman2024"

  useEffect(() => {
    if(ok) fetchList()
  }, [ok])

  async function fetchList() {
    const res = await fetch("/api/chairman/list")
    const data = await res.json()
    setItems(data.recordings || data || [])
  }

  async function approve(id: string) {
    await fetch("/api/chairman/approve", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "approved" }) 
    })
    fetchList()
  }
  
  async function reject(id: string) {
    await fetch("/api/chairman/approve", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "rejected" }) 
    })
    fetchList()
  }

  if(!ok) {
    return (
      <div style={{padding:20, maxWidth:400, margin:"50px auto", fontFamily:"sans-serif"}}>
        <h2>👑 Chairman Login</h2>
        <input type="password" placeholder="Enter Chairman Password" 
          style={{width:"100%", padding:12, marginTop:10, borderRadius:8, border:"1px solid #ccc"}}
          value={pass} onChange={e=>setPass(e.target.value)} />
        <button onClick={()=>{if(pass===CHAIRMAN_PASS) setOk(true); else alert("Wrong pass Chairman!")}} 
          style={{width:"100%", padding:12, marginTop:10, background:"black", color:"white", borderRadius:8}}>
          Enter
        </button>
      </div>
    )
  }

  return (
    <div style={{padding:15, fontFamily:"sans-serif", background:"#f5f5f5", minHeight:"100vh"}}>
      <h2 style={{fontSize:20}}>👑 Chairman Voice Approval</h2>
      <p style={{color:"#666", fontSize:14}}>{items.length} pending voices</p>
      <button onClick={fetchList} style={{padding:8, marginBottom:15, borderRadius:6}}>🔄 Refresh</button>
      
      {items.map((it:any)=>(
        <div key={it.id} style={{background:"white", padding:12, borderRadius:12, marginBottom:12, boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}}>
          <div style={{fontSize:13, color:"#666"}}>
            {it.language || it.pidgin_text?.slice(0,20)} • {it.worker_id || it.user_id || "Worker"} • {new Date(it.created_at).toLocaleDateString()}
          </div>
          <div style={{margin:"8px 0", fontWeight:"bold"}}>{it.pidgin_text || it.text || it.voice_name || "Custom Voice"}</div>
          <audio controls src={it.audio_url || it.voice_url} style={{width:"100%", height:35}} />
          <div style={{display:"flex", gap:10, marginTop:10}}>
            <button onClick={()=>approve(it.id)} style={{flex:1, padding:10, background:"#16a34a", color:"white", borderRadius:8, border:0}}>✅ Approve</button>
            <button onClick={()=>reject(it.id)} style={{flex:1, padding:10, background:"#dc2626", color:"white", borderRadius:8, border:0}}>❌ Reject</button>
          </div>
        </div>
      ))}
      {items.length===0 && <p style={{textAlign:"center", marginTop:50, color:"#999"}}>No pending voices - Money dey sleep 😴</p>}
    </div>
  )
}