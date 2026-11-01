"use client"
import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function ChairmanAnnounceBoard() {
  const [pass, setPass] = useState("")
  const [ok, setOk] = useState(false)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [type, setType] = useState("general") // general, task, payment
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const CHAIRMAN_PASS = "chairman2024"
  const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com"

  useEffect(()=>{ if(ok) load() },[ok])

  async function load(){
    const {data} = await supabase.from("announcements").select("*").order("created_at",{ascending:false}).limit(20)
    if(data) setList(data)
  }

  async function publish(){
    if(!title || !message) return alert("Fill title and message!")
    setLoading(true)
    const {error} = await supabase.from("announcements").insert({
      title,
      message,
      type,
      created_by: CHAIRMAN_EMAIL
    })
    setLoading(false)
    if(error) alert(error.message)
    else {
      alert("✅ Published! Workers & Marketplace go see am now!")
      setTitle(""); setMessage("")
      load()
    }
  }

  async function del(id:string){
    if(!confirm("Delete this announcement?")) return
    await supabase.from("announcements").delete().eq("id", id)
    load()
  }

  if(!ok) return (
    <div style={{maxWidth:400, margin:"100px auto", padding:20, fontFamily:"sans-serif"}}>
      <h1>👑 Chairman Board</h1>
      <p style={{fontSize:11, color:"#888"}}>{CHAIRMAN_EMAIL}</p>
      <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password" style={{width:"100%", padding:14, borderRadius:10, border:"1px solid #ccc", marginTop:10}}/>
      <button onClick={()=> pass===CHAIRMAN_PASS ? setOk(true) : alert("Wrong password")} style={{width:"100%", padding:14, marginTop:10, background:"black", color:"white", borderRadius:10, fontWeight:900}}>Enter Board</button>
    </div>
  )

  return (
    <div style={{background:"black", minHeight:"100vh", color:"white", fontFamily:"sans-serif", padding:15}}>
      <div style={{maxWidth:600, margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h2>📢 Chairman Announcement Board</h2>
          <a href="https://main-naija-pidgin.onrender.com/worker" style={{fontSize:11, color:"#FFB300"}}>View as Worker →</a>
        </div>

        <div style={{background:"#1A150A", border:"2px solid #FFB300", borderRadius:16, padding:16, marginTop:15}}>
          <div style={{fontWeight:900, color:"#FFB300"}}>Create New Announcement</div>
          <div style={{fontSize:11, color:"#999", marginBottom:10}}>This go appear for Workers Dashboard + Marketplace</div>
          
          <select value={type} onChange={e=>setType(e.target.value)} style={{width:"100%", padding:12, borderRadius:8, background:"#111", color:"white", border:"1px solid #333"}}>
            <option value="general">📢 General Info</option>
            <option value="task">🎙️ New Task Available</option>
            <option value="payment">💳 Payment Update</option>
            <option value="urgent">🚨 Urgent</option>
          </select>

          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title e.g: New Lagos Task 50 Sentences!" style={{width:"100%", padding:12, marginTop:10, borderRadius:8, background:"#111", color:"white", border:"1px solid #333"}}/>
          
          <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Write message for workers... e.g: How far team! New Pidgin task don drop. Go worker dashboard click start. Pay na ₦15 per clip. Chairman" style={{width:"100%", padding:12, marginTop:10, height:110, borderRadius:8, background:"#111", color:"white", border:"1px solid #333"}}/>

          <button onClick={publish} disabled={loading} style={{width:"100%", marginTop:12, padding:14, background:"#FFB300", color:"black", fontWeight:900, borderRadius:10, border:0}}>{loading ? "Publishing..." : "🚀 Publish to All Workers & Marketplace"}</button>
        </div>

        <div style={{marginTop:25}}>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <b style={{fontSize:13, color:"#888"}}>RECENT ({list.length}) - Live on Supabase</b>
            <button onClick={load} style={{background:"#111", color:"#888", border:"1px solid #333", borderRadius:20, padding:"4px 10px", fontSize:11}}>Refresh ↻</button>
          </div>

          {list.map(a=>(
            <div key={a.id} style={{background:"#111", border:"1px solid #222", borderRadius:12, padding:12, marginTop:10}}>
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <span style={{background: a.type==="urgent"?"#E53935":a.type==="task"?"#00E676":"#FFB300", color:"black", fontSize:9, fontWeight:900, padding:"2px 8px", borderRadius:10}}>{a.type?.toUpperCase()}</span>
                <span style={{fontSize:10, color:"#666"}}>{new Date(a.created_at).toLocaleString()}</span>
              </div>
              <div style={{fontWeight:800, marginTop:6}}>{a.title}</div>
              <div style={{fontSize:13, color:"#bbb", marginTop:4}}>{a.message}</div>
              <button onClick={()=>del(a.id)} style={{marginTop:8, background:"transparent", border:"1px solid #E53935", color:"#E53935", borderRadius:6, padding:"4px 8px", fontSize:10}}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}