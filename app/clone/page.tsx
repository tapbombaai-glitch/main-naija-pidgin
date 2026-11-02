"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

type Voice = { id: string; name: string; voice_id: string; gender: string; elevenlabs_id: string }

export default function ChairmanStudioFinal() {
  const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com"

  // Auth - CORRECTED
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email] = useState(CHAIRMAN_EMAIL)
  const [password, setPassword] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")

  // Studio - loads ONLY after auth
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState("")
  const [text, setText] = useState("How far my people, na Chairman dey here! Main Naija Pidgin don land gbam!")
  const [generatedUrl, setGeneratedUrl] = useState("")
  const [loading, setLoading] = useState<"none"|"cloning"|"generating"|"loadingVoices">("none")
  
  const [voiceName, setVoiceName] = useState("")
  const [gender, setGender] = useState<'male'|'female'>('male')
  const [recordedBlob, setRecordedBlob] = useState<Blob|null>(null)
  const [recordedUrl, setRecordedUrl] = useState("")
  const [uploadFile, setUploadFile] = useState<File|null>(null)
  const [recording, setRecording] = useState(false)
  const [recTime, setRecTime] = useState(0)
  const [cloneMsg, setCloneMsg] = useState<{type:'error'|'success', text:string}|null>(null)

  const mediaRecorderRef = useRef<MediaRecorder|null>(null)
  const timerRef = useRef<NodeJS.Timeout|null>(null)
  const chunksRef = useRef<Blob[]>([])

  // AUTH LISTENER - handle session expiry
  useEffect(()=>{
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session)=>{
      if(event === 'SIGNED_OUT' || !session){
        setIsLoggedIn(false); setVoices([]); setSelectedVoiceId("")
      }
      if(event === 'SIGNED_IN' && session){
        // Verify BOTH email + is_chairman
        const { data: profile } = await supabase.from("profiles").select("is_chairman, email").eq("id", session.user.id).single()
        const emailOk = (session.user.email?.toLowerCase() === CHAIRMAN_EMAIL.toLowerCase()) || (profile?.email?.toLowerCase() === CHAIRMAN_EMAIL.toLowerCase())
        if(profile?.is_chairman === true && emailOk){
          setIsLoggedIn(true)
        }
      }
    })
    checkSession()
    return ()=> subscription.unsubscribe()
  },[])

  // Load voices ONLY after successful auth
  useEffect(()=>{
    if(isLoggedIn){
      loadVoices()
    }
  },[isLoggedIn])

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ""
  }

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if(!session) return
    const { data: profile } = await supabase.from("profiles").select("is_chairman, email").eq("id", session.user.id).single()
    const emailOk = (session.user.email?.toLowerCase() === CHAIRMAN_EMAIL.toLowerCase()) || (profile?.email?.toLowerCase() === CHAIRMAN_EMAIL.toLowerCase())
    if(profile?.is_chairman === true && emailOk){
      setIsLoggedIn(true)
    }
  }

  const loadVoices = async () => {
    setLoading("loadingVoices")
    try{
      const token = await getAccessToken()
      let fetched: Voice[] = []

      // Try API with Bearer token
      try{
        const res = await fetch("/api/voice-clone", { 
          method:"GET",
          headers: { Authorization: `Bearer ${token}` }
        })
        if(res.ok){
          const data = await res.json()
          const raw = Array.isArray(data) ? data : (data.voices || data.clonedVoices || [])
          fetched = raw.map((v:any)=>({
            id: v.id || v.voice_id,
            name: v.name,
            voice_id: v.voice_id || v.elevenlabs_voice_id || v.elevenlabs_id,
            elevenlabs_id: v.elevenlabs_voice_id || v.voice_id || v.elevenlabs_id,
            gender: v.gender || 'male'
          })).filter((v:Voice)=> v.elevenlabs_id)
        }
      }catch{}

      // Also load from Supabase cloned_voices - preserve Main Naija Pidgin & Warri Babe with REAL IDs
      const { data: sbVoices } = await supabase.from("cloned_voices").select("*").order("created_at", {ascending:false})
      const sbMapped: Voice[] = (sbVoices||[]).map((v:any)=>({
        id: v.id,
        name: v.name,
        voice_id: v.elevenlabs_voice_id || v.voice_id,
        elevenlabs_id: v.elevenlabs_voice_id || v.voice_id,
        gender: v.gender || 'male'
      })).filter((v:Voice)=> v.elevenlabs_id) // ONLY real ElevenLabs IDs, no placeholders

      const merged = new Map<string, Voice>()
      ;[...sbMapped, ...fetched].forEach(v=>{ if(!merged.has(v.elevenlabs_id)) merged.set(v.elevenlabs_id, v) })
      
      const finalVoices = Array.from(merged.values())
      setVoices(finalVoices)
      if(finalVoices.length>0 && !selectedVoiceId) setSelectedVoiceId(finalVoices[0].elevenlabs_id)

    } finally { setLoading("none") }
  }

  const handleLogin = async () => {
    setAuthLoading(true); setAuthError("")
    try{
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if(error) throw error
      const { data: profile } = await supabase.from("profiles").select("is_chairman, email").eq("id", data.user.id).single()
      const emailOk = (data.user.email?.toLowerCase() === CHAIRMAN_EMAIL.toLowerCase()) || (profile?.email?.toLowerCase() === CHAIRMAN_EMAIL.toLowerCase())
      if(profile?.is_chairman !== true) throw new Error("Profile is_chairman is not true")
      if(!emailOk) throw new Error(`Email must be ${CHAIRMAN_EMAIL}`)
      setIsLoggedIn(true)
    }catch(e:any){ setAuthError(e.message) } finally { setAuthLoading(false) }
  }

  // Recording with 30s timer + auto-stop
  const startRecording = async () => {
    setCloneMsg(null); setRecTime(0)
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true })
    const mr = new MediaRecorder(stream)
    mediaRecorderRef.current = mr
    chunksRef.current = []
    mr.ondataavailable = e=>{ if(e.data.size>0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type:'audio/webm' })
      setRecordedBlob(blob)
      setRecordedUrl(URL.createObjectURL(blob))
      stream.getTracks().forEach(t=>t.stop())
      if(timerRef.current) clearInterval(timerRef.current)
    }
    mr.start(); setRecording(true)
    timerRef.current = setInterval(()=>{
      setRecTime(prev=>{
        if(prev >= 29){
          mr.stop(); setRecording(false)
          if(timerRef.current) clearInterval(timerRef.current)
          return 30
        }
        return prev+1
      })
    }, 1000)
  }
  const stopRecording = () => { 
    mediaRecorderRef.current?.stop(); 
    setRecording(false)
    if(timerRef.current) clearInterval(timerRef.current)
  }

  // REAL CLONE - sends audio field + Bearer token
  const handleCreateClone = async () => {
    setCloneMsg(null)
    const fileToSend = uploadFile || (recordedBlob ? new File([recordedBlob], `${voiceName||'recording'}.webm`, {type:'audio/webm'}) : null)
    if(!fileToSend){ setCloneMsg({type:'error', text:"Upload or record voice first"}); return }
    if(!voiceName.trim()){ setCloneMsg({type:'error', text:"Enter voice name"}); return }

    setLoading("cloning")
    try{
      const token = await getAccessToken()
      const form = new FormData()
      // REQUIRED CORRECTION: field name must be "audio" not "file"
      form.append("audio", fileToSend)
      form.append("name", voiceName.trim())
      form.append("gender", gender)
      form.append("language", "pidgin")

      const res = await fetch("/api/voice-clone", { 
        method:"POST", 
        headers: { Authorization: `Bearer ${token}` },
        body: form 
      })
      const json = await res.json()
      if(!res.ok) throw new Error(json.error || json.message || "Clone failed")
      
      setVoiceName(""); setUploadFile(null); setRecordedBlob(null); setRecordedUrl(""); setRecTime(0)
      setCloneMsg({type:'success', text:`✅ ${json.name || voiceName} cloned!`})
      await loadVoices()
    }catch(e:any){ setCloneMsg({type:'error', text:e.message}) } finally { setLoading("none") }
  }

  // REAL GENERATE - sends Bearer token
  const handleGenerate = async () => {
    if(!selectedVoiceId){ alert("Select voice"); return }
    if(!text.trim()){ alert("Type Pidgin text"); return }
    setLoading("generating"); setGeneratedUrl("")
    try{
      const token = await getAccessToken()
      const res = await fetch("/api/voice-clone/test", {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: text.trim(), voice_id: selectedVoiceId, voiceId: selectedVoiceId, language:"pidgin" })
      })
      if(!res.ok){
        const err = await res.json().catch(()=>({error:"Generate failed"}))
        throw new Error(err.error || err.message || `HTTP ${res.status}`)
      }
      const contentType = res.headers.get("content-type")||""
      if(contentType.includes("audio") || contentType.includes("octet-stream")){
        const blob = await res.blob()
        setGeneratedUrl(URL.createObjectURL(blob))
      } else {
        const json = await res.json()
        const url = json.audioUrl || json.url || json.audio_url
        if(url) setGeneratedUrl(url)
        else if(json.audioBase64) setGeneratedUrl(`data:audio/mpeg;base64,${json.audioBase64}`)
        else throw new Error("No audio returned from /api/voice-clone/test")
      }
    }catch(e:any){ alert(`Generate error: ${e.message}`) } finally { setLoading("none") }
  }

  if(!isLoggedIn){
    return (
      <div style={{minHeight:"100vh", background:"#050807", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px"}}>
        <div style={{width:"100%", maxWidth:"400px", background:"#0a100d", border:"1px solid #1a2e22", borderRadius:"16px", padding:"24px"}}>
          <div style={{textAlign:"center", marginBottom:"20px"}}><div style={{fontSize:"32px"}}>👑</div><h1 style={{color:"#22c55e", margin:"8px 0 0", fontSize:"22px"}}>Main Naija Pidgin</h1><p style={{color:"#6b7280", fontSize:"12px"}}>Chairman Voice Studio</p></div>
          <input value={email} readOnly style={{width:"100%", height:"54px", background:"#050807", border:"1px solid #1f3a26", borderRadius:"10px", color:"#fff", WebkitTextFillColor:"#fff", padding:"0 14px", marginBottom:"12px"}}/>
          {/* CORRECTED: neutral placeholder, not actual password */}
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter Chairman password" style={{width:"100%", height:"54px", background:"#050807", border:"1px solid #1f3a26", borderRadius:"10px", color:"#fff", WebkitTextFillColor:"#fff", padding:"0 14px", marginBottom:"16px"}}/>
          {authError && <div style={{background:"#2a0f0f", color:"#fca5a5", padding:"10px", borderRadius:"8px", marginBottom:"12px", fontSize:"13px"}}>{authError}</div>}
          <button onClick={handleLogin} disabled={authLoading} style={{width:"100%", height:"52px", background:"#22c55e", color:"#000", border:"none", borderRadius:"10px", fontWeight:"bold"}}>{authLoading ? "Checking..." : "Enter Voice Studio"}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:"100vh", background:"#020403", color:"#fff", padding:"16px"}}>
      <div style={{maxWidth:"800px", margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0"}}><h2 style={{margin:0}}>👑 Chairman Studio</h2><button onClick={async()=>{await supabase.auth.signOut()}} style={{background:"#1a2e22", color:"#22c55e", border:"1px solid #22c55e", padding:"8px 14px", borderRadius:"8px"}}>Logout</button></div>

        <div style={{background:"#0a100d", border:"1px solid #1a2e22", borderRadius:"16px", padding:"18px", marginBottom:"16px"}}>
          <h3 style={{color:"#22c55e", margin:"0 0 10px"}}>🎚️ Select Voice {loading==="loadingVoices" ? "(Loading real voices...)" : `(${voices.length} real)`}</h3>
          {voices.length===0 ? <p style={{color:"#fbbf24", fontSize:"13px"}}>No voices yet - create first clone below. Main Naija Pidgin & Warri Babe will appear here with real ElevenLabs IDs.</p> : 
          <select value={selectedVoiceId} onChange={e=>setSelectedVoiceId(e.target.value)} style={{width:"100%", height:"48px", background:"#050807", color:"#fff", border:"1px solid #1f3a26", borderRadius:"10px", padding:"0 12px"}}>
            {voices.map(v=><option key={v.elevenlabs_id} value={v.elevenlabs_id}>{v.name} • {v.gender}</option>)}
          </select>}
        </div>

        <div style={{background:"#0a100d", border:"1px solid #1a2e22", borderRadius:"16px", padding:"18px", marginBottom:"16px"}}>
          <h3 style={{color:"#22c55e", margin:"0 0 10px"}}>🗣️ Generate Speech - Real via /api/voice-clone/test + Bearer Token</h3>
          <textarea value={text} onChange={e=>setText(e.target.value)} style={{width:"100%", height:"110px", background:"#050807", border:"1px solid #1f3a26", borderRadius:"10px", color:"#fff", padding:"12px", boxSizing:"border-box"}}/>
          <button onClick={handleGenerate} disabled={loading==="generating" || !selectedVoiceId} style={{width:"100%", height:"50px", marginTop:"12px", background: loading==="generating"?"#14532d":"#22c55e", color: loading==="generating"?"#86efac":"#000", border:"none", borderRadius:"10px", fontWeight:"bold", opacity: !selectedVoiceId ? 0.5 : 1}}>{loading==="generating" ? "Generating..." : "🔊 Generate Real Pidgin Speech"}</button>
          {generatedUrl && <div style={{marginTop:"14px", background:"#050807", border:"1px solid #22c55e", borderRadius:"10px", padding:"12px"}}><audio controls src={generatedUrl} style={{width:"100%"}}/><a href={generatedUrl} download={`Chairman_${Date.now()}.mp3`} style={{display:"inline-block", marginTop:"8px", color:"#22c55e", fontSize:"13px"}}>⬇️ Download</a></div>}
        </div>

        <div style={{background:"#0a100d", border:"1px solid #1a2e22", borderRadius:"16px", padding:"18px"}}>
          <h3 style={{color:"#22c55e", margin:"0 0 10px"}}>🎙️ Create Clone - Real via /api/voice-clone (audio + Bearer)</h3>
          <div style={{display:"flex", gap:"8px", marginBottom:"12px"}}>
            <button onClick={()=>setGender('male')} style={{flex:1, height:"40px", background: gender==='male'?"#22c55e":"#1a2e22", color: gender==='male'?"#000":"#fff", border:"1px solid #1f3a26", borderRadius:"8px"}}>👨 Male</button>
            <button onClick={()=>setGender('female')} style={{flex:1, height:"40px", background: gender==='female'?"#ec4899":"#1a2e22", color:"#fff", border:"1px solid #1f3a26", borderRadius:"8px"}}>👩 Female</button>
          </div>
          <input value={voiceName} onChange={e=>setVoiceName(e.target.value)} placeholder="Voice name e.g. Main Naija Pidgin" style={{width:"100%", height:"44px", background:"#050807", border:"1px solid #1f3a26", borderRadius:"10px", color:"#fff", padding:"0 12px", boxSizing:"border-box", marginBottom:"12px"}}/>
          <div style={{display:"flex", gap:"10px", marginBottom:"12px"}}>
            <button onClick={recording ? stopRecording : startRecording} style={{flex:1, height:"46px", background: recording?"#ef4444":"#1a2e22", color:"#fff", border:"1px solid #22c55e", borderRadius:"10px"}}>{recording ? `⏹️ Stop (${recTime}s/30s)` : "🎙️ Record (max 30s)"}</button>
            <label style={{flex:1, height:"46px", background:"#1a2e22", border:"1px solid #1f3a26", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer"}}>🎧 Upload<input type="file" accept="audio/*" hidden onChange={e=>setUploadFile(e.target.files?.[0]||null)}/></label>
          </div>
          {recording && <div style={{height:"6px", background:"#1a2e22", borderRadius:"3px", marginBottom:"12px"}}><div style={{height:"100%", width:`${(recTime/30)*100}%`, background:"#22c55e", borderRadius:"3px"}}/></div>}
          {recordedUrl && <div style={{marginBottom:"12px"}}><p style={{fontSize:"12px", color:"#86efac"}}>🎧 Listen before saving:</p><audio controls src={recordedUrl} style={{width:"100%", marginTop:"6px"}}/></div>}
          {uploadFile && <p style={{fontSize:"12px", color:"#86efac", marginBottom:"12px"}}>✅ {uploadFile.name} ready</p>}
          {cloneMsg && <div style={{background: cloneMsg.type==='error'?"#2a0f0f":"#052e16", color: cloneMsg.type==='error'?"#fca5a5":"#86efac", padding:"8px", borderRadius:"8px", fontSize:"12px", marginBottom:"12px"}}>{cloneMsg.text}</div>}
          <button onClick={handleCreateClone} disabled={loading==="cloning"} style={{width:"100%", height:"50px", background: loading==="cloning"?"#14532d":"#fff", color:"#000", border:"none", borderRadius:"10px", fontWeight:"bold"}}>{loading==="cloning" ? "Cloning..." : `Create ${gender} Clone`}</button>
        </div>
      </div>
    </div>
  )
}