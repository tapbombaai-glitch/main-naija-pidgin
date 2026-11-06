"use client"
import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ChairmanPage() {
const [items, setItems] = useState<any[]>([])
const [pass, setPass] = useState("")
const [ok, setOk] = useState(false)
const [tab, setTab] = useState<"voices"|"announce">("voices")
const [stats, setStats] = useState({total:0, pending:0, approved:0})
const [title, setTitle] = useState("")
const [msg, setMsg] = useState("")
const [announces, setAnnounces] = useState<any[]>([])

const CHAIRMAN_PASS = "chairman2024"
const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com"

useEffect(()=>{ if(ok) { load(); loadAnn() } },[ok])

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

async function loadAnn(){
const {data} = await supabase.from("announcements").select("*").order("created_at",{ascending:false}).limit(10)
if(data) setAnnounces(data)
}

async function act(id:string, status:string){
await fetch("/api/chairman/approve",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id, status, chairman_email:CHAIRMAN_EMAIL})
})
load()
}

async function createAnn(){
if(!title || !msg) return alert("Fill title & message")
const {error} = await supabase.from("announcements").insert({title, message:msg, created_by:CHAIRMAN_EMAIL})
if(error) alert(error.message)
else { alert("✅ Published to Marketplace!"); setTitle(""); setMsg(""); loadAnn() }
}

if(!ok) return (

<div style={{padding:20, maxWidth:400, margin:"80px auto", fontFamily:"sans-serif"}}>  
## 👑 Chairman  <p style={{fontSize:11, color:"#888"}}>{CHAIRMAN_EMAIL}  <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password"
style={{width:"100%", padding:12, borderRadius:8, border:"1px solid #ccc", marginTop:10}}/>
<button onClick={()=> pass===CHAIRMAN_PASS ? setOk(true) : alert("Wrong")}
style={{width:"100%", padding:12, marginTop:10, background:"black", color:"white", borderRadius:8}}>Enter

)

return (

<div style={{fontFamily:"sans-serif", background:"black", minHeight:"100vh", color:"white", padding:15}}>  
<div style={{display:"flex", justifyContent:"space-between", marginBottom:15}}>  
**👑 CHAIRMAN** <div style={{fontSize:10, color:"#888"}}>{CHAIRMAN_EMAIL}  <button onClick={load} style={{padding:"8px 14px", borderRadius:20, background:"#1a1a1a", color:"#22c55e", border:"1px solid #22c55e"}}>↻ {stats.total}

{/* TABS */}    
  <div style={{display:"flex", gap:8, marginBottom:15}}>    
    <button onClick={()=>setTab("voices")} style={{flex:1, padding:10, borderRadius:8, border:0, background: tab==="voices"?"#00E676":"#111", color: tab==="voices"?"black":"white", fontWeight:900}}>Voices ({stats.pending})</button>    
    <button onClick={()=>setTab("announce")} style={{flex:1, padding:10, borderRadius:8, border:0, background: tab==="announce"?"#FFB300":"#111", color: tab==="announce"?"black":"white", fontWeight:900}}>📢 Announce</button>    
  </div>    
  
  {tab==="voices" && (    
    <>    
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
    </>    
  )}    
  
  {tab==="announce" && (    
    <div>    
      <div style={{background:"#1A150A", border:"1px solid #FFB300", padding:14, borderRadius:12}}>    
        <h3 style={{color:"#FFB300", margin:0}}>📢 Create for Marketplace</h3>    
        <p style={{fontSize:11, color:"#999"}}>This go show for marketplace announcement board</p>    
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title e.g New Lagos Voice Live!" style={{width:"100%", padding:12, marginTop:10, borderRadius:8, background:"#111", color:"white", border:"1px solid #333"}}/>    
        <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Message..." style={{width:"100%", padding:12, marginTop:10, height:90, borderRadius:8, background:"#111", color:"white", border:"1px solid #333"}}/>    
        <button onClick={createAnn} style={{width:"100%", marginTop:12, padding:12, background:"#FFB300", color:"black", fontWeight:900, borderRadius:8, border:0}}>Publish to Marketplace →</button>    
      </div>    
  
      <div style={{marginTop:20}}>    
        <div style={{fontSize:12, fontWeight:800, color:"#999"}}>RECENT ANNOUNCEMENTS ({announces.length})</div>    
        {announces.map((a:any)=>(    
          <div key={a.id} style={{background:"#111", padding:12, borderRadius:10, marginTop:8, border:"1px solid #222"}}>    
            <div style={{fontWeight:800, color:"white"}}>{a.title}</div>    
            <div style={{fontSize:12, color:"#bbb", marginTop:4}}>{a.message.slice(0,120)}</div>    
            <div style={{fontSize:10, color:"#666", marginTop:6}}>{new Date(a.created_at).toLocaleString()}</div>    
          </div>    
        ))}    
      </div>    
    </div>    
  )}    
</div>

)
}