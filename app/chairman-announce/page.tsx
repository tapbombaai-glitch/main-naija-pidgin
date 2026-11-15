"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

export default function ChairmanAnnounceBoard() {
  const [pass, setPass] = useState("")
  const [ok, setOk] = useState(false)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [type, setType] = useState("general") // general, task, payment, urgent
  const [list, setList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [visits, setVisits] = useState<any[]>([])

  const CHAIRMAN_PASS = "chairman2024"
  const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com"

  useEffect(()=>{ if(ok) { load(); loadVisits(); } },[ok])

  // REALTIME: If worker enter marketplace, you go see am without refresh
  useEffect(()=>{
    if(!ok) return
    const channel = supabase.channel("chairman-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, ()=> load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "marketplace_visits" }, ()=> loadVisits())
      .subscribe()
    return ()=>{ supabase.removeChannel(channel) }
  },[ok])

  async function load(){
    const {data} = await supabase.from("announcements").select("*").order("created_at",{ascending:false}).limit(20)
    if(data) setList(data)
  }

  async function loadVisits(){
    const {data} = await supabase.from("marketplace_visits").select("*").order("entered_at",{ascending:false}).limit(20)
    if(data) setVisits(data)
  }

  async function publish(){
    if(!title.trim() || !message.trim()) return alert("Fill title and message!")
    setLoading(true)
    // FIX 1: MUST SEND is_published: true, else Worker no go see am
    const {error} = await supabase.from("announcements").insert({
      title: title.trim(),
      message: message.trim(),
      type,
      created_by: CHAIRMAN_EMAIL,
      is_published: true,
    })
    setLoading(false)
    if(error) alert("Publish failed: " + error.message)
    else {
      alert("✅ Published! Workers & Marketplace go see am now!")
      setTitle(""); setMessage("")
      load()
    }
  }

  async function del(id:string){
    if(!confirm("Delete this announcement?")) return
    const {error} = await supabase.from("announcements").delete().eq("id", id)
    if(error) alert(error.message)
    else load()
  }

  async function clearVisits(){
    if(!confirm("Clear marketplace visits history?")) return
    // Delete old visits - so Supabase no full up
    const {error} = await supabase.from("marketplace_visits").delete().neq("id", 0)
    if(!error) loadVisits()
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
          <a href="/worker" style={{fontSize:11, color:"#FFB300"}}>View as Worker →</a>
        </div>

        {/* FIX 2: MARKETPLACE TRACKING - YOU GO KNOW WHEN PERSON ENTER */}
        <div style={{background:"#0A150A", border:"1px solid #00E676", borderRadius:16, padding:14, marginTop:15}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <b style={{color:"#00E676", fontSize:13}}>👀 MARKETPLACE — WHO ENTER ({visits.length})</b>
            <button onClick={clearVisits} style={{background:"transparent", border:"1px solid #E53935", color:"#E53935", borderRadius:20, padding:"4px 10px", fontSize:11}}>Clear 🗑️</button>
          </div>
          {visits.length===0 ? <p style={{fontSize:12, color:"#888", marginTop:8}}>Nobody enter Marketplace yet today.</p>
          : visits.slice(0,5).map((v:any)=>(
            <div key={v.id} style={{fontSize:12, color:"#ccc", marginTop:6, borderBottom:"1px solid #1A251A", paddingBottom:6}}>
              <b style={{color:"white"}}>{v.worker_id}</b> enter <b>{v.page}</b> — {new Date(v.entered_at).toLocaleString()}
            </div>
          ))}
          {visits.length>0 && <button onClick={loadVisits} style={{marginTop:8, background:"#111", color:"#888", border:"1px solid #333", borderRadius:20, padding:"4px 10px", fontSize:11}}>Refresh ↻</button>}
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

          {list.length===0 && <p style={{fontSize:12, color:"#666", marginTop:10}}>No announcements yet. Post one above.</p>}

          {list.map(a=>(
            <div key={a.id} style={{background:"#111", border:"1px solid #222", borderRadius:12, padding:12, marginTop:10}}>
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <span style={{background: a.type==="urgent"?"#E53935":a.type==="task"?"#00E676":"#FFB300", color:"black", fontSize:9, fontWeight:900, padding:"2px 8px", borderRadius:10}}>{a.type?.toUpperCase()}</span>
                <span style={{fontSize:10, color:"#666"}}>{new Date(a.created_at).toLocaleString()}</span>
              </div>
              <div style={{fontWeight:800, marginTop:6}}>{a.title}</div>
              <div style={{fontSize:13, color:"#bbb", marginTop:4}}>{a.message}</div>
              <div style={{fontSize:10, color: a.is_published ? "#00E676" : "#E53935", marginTop:4}}>{a.is_published ? "✅ Published - Workers can see" : "❌ NOT Published - Workers cannot see"}</div>
              <button onClick={()=>del(a.id)} style={{marginTop:8, background:"transparent", border:"1px solid #E53935", color:"#E53935", borderRadius:6, padding:"4px 8px", fontSize:10}}>Delete</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}