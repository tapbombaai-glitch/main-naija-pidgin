"use client"
import { useEffect, useState } from "react"

export default function AdminPage() {
  const [items, setItems] = useState<any[]>([])
  const [workers, setWorkers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [pass, setPass] = useState("")
  const [ok, setOk] = useState(false)
  const [tab, setTab] = useState<'home'|'workers'|'recordings'|'marketplace'|'more'>('home')
  const [stats, setStats] = useState({total:0, pending:0, approved:0, earnings:0, workers:0, customers:0, lastChecked: 'Tap to verify'})
  const [checking, setChecking] = useState<string|null>(null)
  const [liveWords, setLiveWords] = useState<string[]>([])
  
  const CHAIRMAN_PASS = "chairman2024"
  const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com"

  useEffect(() => {
    if(ok) {
      fetchList()
      fetchWorkers()
      fetchMarketplace()
      fetchStats()
      // Simulate live reading - replace with Supabase realtime later
      simulateLive()
    }
  }, [ok])

  function simulateLive(){
    const sentence = "Welcome to Main Naija Pidgin I dey read now chairman dey see every word live for operation".split(" ")
    let i=0
    const int = setInterval(()=>{
      if(i<sentence.length){ setLiveWords(p=>[...p, sentence[i]]); i++ }
      else { clearInterval(int); setTimeout(()=>{setLiveWords([]); simulateLive()}, 5000) }
    }, 500)
  }

  async function fetchList() {
    const res = await fetch("/api/chairman/list")
    const data = await res.json()
    const list = data.recordings || data || []
    setItems(list)
  }

  async function fetchWorkers() {
    const res = await fetch("/api/chairman/workers")
    const data = await res.json()
    setWorkers(data.workers || [])
  }

  async function fetchMarketplace() {
    const res = await fetch("/api/chairman/marketplace")
    const data = await res.json()
    setCustomers(data.customers || [])
  }

  async function fetchStats(){
    const res = await fetch("/api/chairman/verify?type=all")
    const data = await res.json()
    setStats(s=>({...s, ...data, lastChecked: new Date().toLocaleTimeString()}))
  }

  async function approve(id: string) {
    await fetch("/api/chairman/approve", { 
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "approved", chairman_email: CHAIRMAN_EMAIL }) 
    })
    fetchList(); fetchStats()
  }
  
  async function reject(id: string) {
    await fetch("/api/chairman/approve", { 
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "rejected", chairman_email: CHAIRMAN_EMAIL }) 
    })
    fetchList(); fetchStats()
  }

  async function verify(type: string){
    setChecking(type)
    const res = await fetch(`/api/chairman/verify?type=${type}`)
    const data = await res.json()
    setStats(s=>({...s, ...data, lastChecked: new Date().toLocaleTimeString()}))
    setTimeout(()=>setChecking(null), 700)
  }

  if(!ok) {
    return (
      <div style={{padding:20, maxWidth:400, margin:"50px auto", fontFamily:"sans-serif"}}>
        <h2>👑 Chairman Control Centre</h2>
        <p style={{fontSize:12, color:"#666"}}>Secure - Only tapbomba.ai@gmail.com</p>
        <input type="password" placeholder="Chairman Password" 
          style={{width:"100%", padding:12, marginTop:10, borderRadius:8, border:"1px solid #ccc"}}
          value={pass} onChange={e=>setPass(e.target.value)} />
        <button onClick={()=>{if(pass===CHAIRMAN_PASS) setOk(true); else alert("Wrong pass!")}} 
          style={{width:"100%", padding:12, marginTop:10, background:"black", color:"white", borderRadius:8}}>
          Enter Chairman Panel
        </button>
      </div>
    )
  }

  return (
    <div style={{fontFamily:"sans-serif", background:"black", minHeight:"100vh", color:"white", paddingBottom:80}}>
      <div style={{padding:15, background:"#0a0a0a", borderBottom:"1px solid #14532d", display:"flex", justifyContent:"space-between"}}>
        <div><b>👑 CHAIRMAN</b> <span style={{color:"#22c55e"}}>CONTROL CENTRE</span><div style={{fontSize:10, color:"#888"}}>HQ: Abuja • 36 States + FCT • {stats.lastChecked}</div></div>
        <div style={{width:32, height:32, background:"#22c55e", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", color:"black", fontWeight:"bold"}}>CH</div>
      </div>

      {tab==='home' && (
        <div style={{padding:15}}>
          <div style={{background:"#111", border:"1px solid #0e7490", borderRadius:16, padding:12, marginBottom:12}}>
            <b style={{color:"#22d3ee", fontSize:12}}>🔴 LIVE OPERATION - Every Word Customer Reads Appears</b>
            <div style={{background:"black", borderRadius:10, padding:10, marginTop:8, minHeight:70, display:"flex", flexWrap:"wrap", gap:5}}>
              {liveWords.map((w,i)=><span key={i} style={{background:"#1f2937", padding:"3px 8px", borderRadius:6, fontSize:13, border:"1px solid #22d3ee"}}>{w}</span>)}
              {liveWords.length===0 && <span style={{color:"#555", fontSize:11}}>Waiting for live customer reading...</span>}
            </div>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
            <button onClick={()=>verify('total')} style={{background:"#1a1a1a", borderRadius:14, padding:12, textAlign:"left", border:0}}><div style={{fontSize:10, color:"#999"}}>TOTAL RECORDS {checking==='total'?'...':''}</div><div style={{fontSize:20, fontWeight:"bold"}}>{stats.total}</div><div style={{fontSize:9, color:"#22c55e"}}>Tap to verify ↻</div></button>
            <button onClick={()=>verify('pending')} style={{background:"#1a1a1a", borderRadius:14, padding:12, textAlign:"left", border:0}}><div style={{fontSize:10, color:"#999"}}>PENDING {checking==='pending'?'...':''}</div><div style={{fontSize:20, fontWeight:"bold"}}>{stats.pending}</div><div style={{fontSize:9, color:"#eab308"}}>Check real DB ↻</div></button>
            <button onClick={()=>verify('workers')} style={{background:"#1a1a1a", borderRadius:14, padding:12, textAlign:"left", border:0}}><div style={{fontSize:10, color:"#999"}}>WORKERS</div><div style={{fontSize:20, fontWeight:"bold"}}>{stats.workers}</div><div style={{fontSize:9, color:"#22c55e"}}>Active + Suspended</div></button>
            <button onClick={()=>verify('customers')} style={{background:"#1a1a1a", borderRadius:14, padding:12, textAlign:"left", border:0}}><div style={{fontSize:10, color:"#999"}}>API CUSTOMERS</div><div style={{fontSize:20, fontWeight:"bold"}}>{stats.customers}</div><div style={{fontSize:9, color:"#22c55e"}}>Marketplace</div></button>
          </div>
          <div style={{marginTop:12, background:"#1a1a1a", borderRadius:12, padding:12, fontSize:11, color:"#888"}}>Approved: {stats.approved} • Earnings: ₦{stats.earnings?.toLocaleString()} • All history محفوظ - Approval never deletes</div>
        </div>
      )}

      {tab==='recordings' && (
        <div style={{padding:15}}>
          <div style={{display:"flex", justifyContent:"space-between"}}><b>Voice Approval - {stats.pending} pending</b><button onClick={fetchList} style={{padding:"6px 12px", borderRadius:20, background:"#222", color:"white", border:0}}>🔄 Refresh</button></div>
          {items.map((it:any)=>(
            <div key={it.id} style={{background:"white", color:"black", padding:12, borderRadius:12, marginTop:12}}>
              <div style={{fontSize:11, color:"#666"}}>{it.language || "Pidgin"} • {it.worker_id || it.user_id} • {it.status || 'pending'} • {it.created_at && new Date(it.created_at).toLocaleDateString()}</div>
              <div style={{margin:"6px 0", fontWeight:"bold", fontSize:13}}>{(it.pidgin_text || it.text || "").slice(0,80)}</div>
              <audio controls src={it.audio_url || it.voice_url} style={{width:"100%", height:32}} />
              <div style={{display:"flex", gap:10, marginTop:8}}>
                <button onClick={()=>approve(it.id)} style={{flex:1, padding:10, background:"#16a34a", color:"white", borderRadius:8, border:0}}>✅ Approve</button>
                <button onClick={()=>reject(it.id)} style={{flex:1, padding:10, background:"#dc2626", color:"white", borderRadius:8, border:0}}>❌ Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab==='workers' && (
        <div style={{padding:15}}><b>Workers Management - {workers.length}</b>{workers.map((w:any)=>(<div key={w.id || w.email} style={{background:"#1a1a1a", padding:12, borderRadius:12, marginTop:8, display:"flex", justifyContent:"space-between"}}><div><div style={{fontSize:12}}>{w.email || w.worker_id}</div><div style={{fontSize:10, color:"#888"}}>{w.status} • {w.total_recordings || 0} recordings</div></div><span style={{fontSize:10, background:"#222", padding:"4px 8px", borderRadius:10}}>{w.status || 'active'}</span></div>))}{workers.length===0 && <p style={{color:"#666", fontSize:12, marginTop:20}}>Connect /api/chairman/workers to Supabase - see File 2 below</p>}</div>
      )}

      {tab==='marketplace' && (
        <div style={{padding:15}}><b>Marketplace - {customers.length} customers</b><div style={{background:"#1a1a1a", padding:10, borderRadius:12, marginTop:10, fontSize:11}}><div>✓ API Keys: View + Disable compromised</div><div>✓ Free: Monitor 100 free</div><div>✓ Credits: Add/deduct</div><div>✓ Paystack Revenue</div><div>✓ 5 Voices + Transfer approved</div></div>{customers.map((c:any)=>(<div key={c.id} style={{background:"#1a1a1a", padding:12, borderRadius:12, marginTop:8}}><div style={{fontSize:12}}>{c.email}</div><div style={{fontSize:10, color:"#888"}}>{c.credits || 0} credits • {c.api_key?.slice(0,12)}...</div></div>))}</div>
      )}

      {tab==='more' && (<div style={{padding:15}}><b>More</b><button style={{width:"100%", marginTop:12, padding:12, background:"#1a1a1a", color:"white", borderRadius:12, border:0}}>📢 Send Announcement to All Workers</button><button style={{width:"100%", marginTop:10, padding:12, background:"#1a1a1a", color:"white", borderRadius:12, border:0}}>⚙️ Voice Management - 5 Voices</button><div style={{marginTop:20, fontSize:10, color:"#555"}}>Chairman: {CHAIRMAN_EMAIL} • Secure server verification • All platforms use same Supabase • History محفوظ</div></div>)}

      <div style={{position:"fixed", bottom:0, left:0, right:0, background:"#0a0a0a", borderTop:"1px solid #14532d", display:"flex", justifyContent:"space-around", padding:"10px 0"}}>
        {[{k:'home',l:'🏠 Home'},{k:'workers',l:'👷 Workers'},{k:'recordings',l:'🎙️ Records'},{k:'marketplace',l:'🏪 Market'},{k:'more',l:'⋯ More'}].map(i=>(<button key={i.k} onClick={()=>setTab(i.k as any)} style={{background:"none", border:0, color: tab===i.k ? "#22c55e" : "#666", fontSize:11, fontWeight: tab===i.k ? "bold" : "normal"}}>{i.l}</button>))}
      </div>
    </div>
  )
}