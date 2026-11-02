"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"

type Voice = { id: string; name: string; voice_id: string; gender: string; category?: string }

export default function ChairmanStudioReal() {
  // Auth - KEEP WORKING LOGIN - DO NOT TOUCH DB
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email] = useState("tapbomba.ai@gmail.com")
  const [password, setPassword] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState("")

  // Real Voices - loaded from Supabase + API
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState("")
  const [text, setText] = useState("How far my people, na Chairman dey here! Main Naija Pidgin don land gbam!")
  const [generatedUrl, setGeneratedUrl] = useState("")
  const [loading, setLoading] = useState<"none"|"cloning"|"generating"|"loadingVoices">("none")
  
  // Clone creation
  const [voiceName, setVoiceName] = useState("")
  const [gender, setGender] = useState<'male'|'female'>('male')
  const [recordedBlob, setRecordedBlob] = useState<Blob|null>(null)
  const [recordedUrl, setRecordedUrl] = useState("")
  const [uploadFile, setUploadFile] = useState<File|null>(null)
  const [recording, setRecording] = useState(false)
  const [cloneError, setCloneError] = useState("")

  const mediaRecorderRef = useRef<MediaRecorder|null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(()=>{ checkSession(); loadVoices() },[])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if(session){
      const { data } = await supabase.from("profiles").select("is_chairman").eq("id", session.user.id).single()
      if(data?.is_chairman) setIsLoggedIn(true)
    }
  }

  const loadVoices = async () => {
    setLoading("loadingVoices")
    try{
      // 1. Try your API first
      let apiVoices: Voice[] = []
      try{
        const res = await fetch("/api/voice-clone", { method:"GET" })
        if(res.ok){
          const data = await res.json()
          // Support both {voices: [...]} and [...]
          apiVoices = Array.isArray(data) ? data : (data.voices || data.clonedVoices || [])
        }
      }catch{}

      // 2. Always also load from Supabase to preserve Main Naija Pidgin + Warri Babe
      const { data: sbVoices } = await supabase.from("cloned_voices").select("*").order("created_at", {ascending:false})
      const sbMapped: Voice[] = (sbVoices||[]).map((v:any)=>({
        id: v.id, name: v.name, voice_id: v.elevenlabs_voice_id || v.voice_id, gender: v.gender||'male', category: v.category
      }))

      // Merge - keep all, no delete
      const mergedMap = new Map<string, Voice>()
      ;[...sbMapped, ...apiVoices.map((v:any)=>({ id: v.id||v.voice_id, name: v.name, voice_id: v.voice_id||v.elevenlabs_voice_id, gender: v.gender||'male' }))].forEach(v=>{
        if(v.voice_id && !mergedMap.has(v.voice_id)) mergedMap.set(v.voice_id, v)
      })

      // Fallback hardcoded if DB empty
      let finalVoices = Array.from(mergedMap.values())
      if(finalVoices.length===0){
        finalVoices = [
          { id:'main', name:'Main Naija Pidgin - Male', voice_id:'MAIN_NAIJA_PIDGIN', gender:'male', category:'main' },
          { id:'warri', name:'Warri Babe - Female', voice_id:'WARRI_BABE', gender:'female', category:'main' },
        ]
      }
      setVoices(finalVoices)
      if(finalVoices.length>0 && !selectedVoiceId) setSelectedVoiceId(finalVoices[0].voice_id)

    }finally{ setLoading("none") }
  }

  const handleLogin = async () => {
    setAuthLoading(true); setAuthError("")
    try{
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if(error) throw error
      const { data: profile } = await supabase.from("profiles").select("is_chairman").eq("id", data.user.id).single()
      if(!profile?.is_chairman) throw new Error("Profile not Chairman - but you already fixed this")
      setIsLoggedIn(true)
    }catch(e:any){ setAuthError(e.message) } finally { setAuthLoading(false) }
  }

  // Recording
  const startRecording = async () => {
    setCloneError("")
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
    }
    mr.start(); setRecording(true)
  }
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false) }

  // REAL CLONE - /api/voice-clone
  const handleCreateClone = async () => {
    setCloneError("")
    const fileToSend = uploadFile || (recordedBlob ? new File([recordedBlob], `${voiceName||'recording'}.webm`, {type:'audio/webm'}) : null)
    if(!fileToSend){ setCloneError("Upload or record voice first"); return }
    if(!voiceName.trim()){ setCloneError("Enter voice name"); return }

    setLoading("cloning")
    try{
      const form = new FormData()
      form.append("file", fileToSend)
      form.append("name", voiceName.trim())
      form.append("gender", gender)
      form.append("language", "pidgin")

      const res = await fetch("/api/voice-clone", { method:"POST", body: form })
      const json = await res.json()
      if(!res.ok) throw new Error(json.error || json.message || "Clone failed")

      // Success - reload voices
      setVoiceName(""); setUploadFile(null); setRecordedBlob(null); setRecordedUrl("")
      await loadVoices()
      alert(`✅ ${voiceName} cloned! Voice ID: ${json.voice_id || json.elevenlabs_voice_id}`)
    }catch(e:any){ setCloneError(e.message) } finally { setLoading("none") }
  }

  // REAL GENERATE - /api/voice-clone/test
  const handleGenerate = async () => {
    if(!selectedVoiceId){ alert("Select voice"); return }
    if(!text.trim()){ alert("Type Pidgin text"); return }
    setLoading("generating"); setGeneratedUrl("")
    try{
      const res = await fetch("/api/voice-clone/test", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ 
          text: text.trim(), 
          voice_id: selectedVoiceId,
          voiceId: selectedVoiceId, // support both keys
          language: "pidgin"
        })
      })
      if(!res.ok){
        const err = await res.json().catch(()=>({error:"Generate failed"}))
        throw new Error(err.error || err.message || `HTTP ${res.status}`)
      }
      // API may return audio blob or {audioUrl, url}
      const contentType = res.headers.get("content-type")||""
      if(contentType.includes("audio") || contentType.includes("octet-stream")){
        const blob = await res.blob()
        setGeneratedUrl(URL.createObjectURL(blob))
      } else {
        const json = await res.json()
        const url = json.audioUrl || json.url || json.audio_url
        if(url) setGeneratedUrl(url)
        else {
          // If API returns base64
          if(json.audioBase64){ setGeneratedUrl(`data:audio/mpeg;base64,${json.audioBase64}`) }
          else throw new Error("No audio returned")
        }
      }
    }catch(e:any){ alert(`Generate error: ${e.message}\nCheck /api/voice-clone/test route & ElevenLabs key`) } finally { setLoading("none") }
  }

  if(!isLoggedIn){
    return (
      <div style={{minHeight:"100vh", background:"#050807", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px"}}>
        <div style={{width:"100%", maxWidth:"400px", background:"#0a100d", border:"1px solid #1a2e22", borderRadius:"16px", padding:"24px"}}>
          <div style={{textAlign:"center", marginBottom:"20px"}}><div style={{fontSize:"32px"}}>👑</div><h1 style={{color:"#22c55e", margin:"8px 0 0", fontSize:"22px"}}>Main Naija Pidgin</h1><p style={{color:"#6b7280", fontSize:"12px"}}>Chairman Voice Studio</p></div>
          <input value={email} readOnly style={{width:"100%", height:"54px", background:"#050807", border:"1px solid #1f3a26", borderRadius:"10px", color:"#fff", WebkitTextFillColor:"#fff", padding:"0 14px", marginBottom:"12px"}}/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Naija2026!" style={{width:"100%", height:"54px", background:"#050807", border:"1px solid #1f3a26", borderRadius:"10px", color:"#fff", WebkitTextFillColor:"#fff", padding:"0 14px", marginBottom:"16px"}}/>
          {authError && <div style={{background:"#2a0f0f", color:"#fca5a5", padding:"10px", borderRadius:"8px", marginBottom:"12px", fontSize:"13px"}}>{authError}</div>}
          <button onClick={handleLogin} disabled={authLoading} style={{width:"100%", height:"52px", background:"#22c55e", color:"#000", border:"none", borderRadius:"10px", fontWeight:"bold"}}>{authLoading ? "Checking..." : "Enter Voice Studio"}</button>
        </div>
      </div>
    )
  }

  const selectedVoice = voices.find(v=>v.voice_id===selectedVoiceId)

  return (
    <div style={{minHeight:"100vh", background:"#020403", color:"#fff", padding:"16px"}}>
      <div style={{maxWidth:"800px", margin:"0 auto"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0"}}><h2 style={{margin:0}}>👑 Chairman Studio - REAL</h2><button onClick={async()=>{await supabase.auth.signOut(); setIsLoggedIn(false)}} style={{background:"#1a2e22", color:"#22c55e", border:"1px solid #22c55e", padding:"8px 14px", borderRadius:"8px"}}>Logout</button></div>

        <div style={{background:"#0a100d", border:"1px solid #1a2e22", borderRadius:"16px", padding:"18px", marginBottom:"16px"}}>
          <h3 style={{color:"#22c55e", margin:"0 0 10px"}}>🎚️ Select Voice {loading==="loadingVoices" ? "(Loading...)" : `(${voices.length})`}</h3>
          <select value={selectedVoiceId} onChange={e=>setSelectedVoiceId(e.target.value)} style={{width:"100%", height:"48px", background:"#050807", color:"#fff", border:"1px solid #1f3a26", borderRadius:"10px", padding:"0 12px"}}>
            {voices.map(v=><option key={v.voice_id} value={v.voice_id}>{v.name} • {v.gender}</option>)}
          </select>
          <button onClick={loadVoices} style={{marginTop:"8px", background:"transparent", color:"#6b7280", border:"none", fontSize:"12px", cursor:"pointer"}}>↻ Reload voices from Supabase</button>
        </div>

        <div style={{background:"#0a100d", border:"1px solid #1a2e22", borderRadius:"16px", padding:"18px", marginBottom:"16px"}}>
          <h3 style={{color:"#22c55e", margin:"0 0 10px"}}>🗣️ Generate Speech - Real ElevenLabs via /api/voice-clone/test</h3>
          <textarea value={text} onChange={e=>setText(e.target.value)} style={{width:"100%", height:"110px", background:"#050807", border:"1px solid #1f3a26", borderRadius:"10px", color:"#fff", padding:"12px", boxSizing:"border-box"}}/>
          <button onClick={handleGenerate} disabled={loading==="generating"} style={{width:"100%", height:"50px", marginTop:"12px", background: loading==="generating"?"#14532d":"#22c55e", color: loading==="generating"?"#86efac":"#000", border:"none", borderRadius:"10px", fontWeight:"bold"}}>{loading==="generating" ? "⏳ Generating real voice..." : `🔊 Generate with ${selectedVoice?.name || "Selected Voice"}`}</button>
          {generatedUrl && <div style={{marginTop:"14px", background:"#050807", border:"1px solid #22c55e", borderRadius:"10px", padding:"12px"}}><p style={{color:"#86efac", fontSize:"13px", margin:"0 0 8px"}}>✅ Real Generated Audio:</p><audio controls src={generatedUrl} style={{width:"100%"}}/><a href={generatedUrl} download={`NaijaPidgin_${Date.now()}.mp3`} style={{display:"inline-block", marginTop:"8px", color:"#22c55e", fontSize:"13px"}}>⬇️ Download MP3</a></div>}
        </div>

        <div style={{background:"#0a100d", border:"1px solid #1a2e22", borderRadius:"16px", padding:"18px"}}>
          <h3 style={{color:"#22c55e", margin:"0 0 10px"}}>🎙️ Create Clone - Real via /api/voice-clone</h3>
          <div style={{display:"flex", gap:"8px", marginBottom:"12px"}}>
            <button onClick={()=>setGender('male')} style={{flex:1, height:"40px", background: gender==='male'?"#22c55e":"#1a2e22", color: gender==='male'?"#000":"#fff", border:"1px solid #1f3a26", borderRadius:"8px"}}>👨 Male</button>
            <button onClick={()=>setGender('female')} style={{flex:1, height:"40px", background: gender==='female'?"#ec4899":"#1a2e22", color:"#fff", border:"1px solid #1f3a26", borderRadius:"8px"}}>👩 Female</button>
          </div>
          <input value={voiceName} onChange={e=>setVoiceName(e.target.value)} placeholder="Voice name e.g. Main Naija Pidgin Male" style={{width:"100%", height:"44px", background:"#050807", border:"1px solid #1f3a26", borderRadius:"10px", color:"#fff", padding:"0 12px", boxSizing:"border-box", marginBottom:"12px"}}/>
          <div style={{display:"flex", gap:"10px", marginBottom:"12px"}}>
            <button onClick={recording ? stopRecording : startRecording} style={{flex:1, height:"46px", background: recording?"#ef4444":"#1a2e22", color:"#fff", border:"1px solid #22c55e", borderRadius:"10px"}}>{recording ? "⏹️ Stop" : "🎙️ Record 30s"}</button>
            <label style={{flex:1, height:"46px", background:"#1a2e22", border:"1px solid #1f3a26", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer"}}>🎧 Upload<input type="file" accept="audio/*" hidden onChange={e=>setUploadFile(e.target.files?.[0]||null)}/></label>
          </div>
          {recordedUrl && <div style={{marginBottom:"12px"}}><p style={{fontSize:"12px", color:"#86efac"}}>🎧 Listen before saving:</p><audio controls src={recordedUrl} style={{width:"100%", marginTop:"6px"}}/></div>}
          {uploadFile && <p style={{fontSize:"12px", color:"#86efac", marginBottom:"12px"}}>✅ {uploadFile.name} ready</p>}
          {cloneError && <div style={{background:"#2a0f0f", color:"#fca5a5", padding:"8px", borderRadius:"8px", fontSize:"12px", marginBottom:"12px"}}>{cloneError}</div>}
          <button onClick={handleCreateClone} disabled={loading==="cloning"} style={{width:"100%", height:"50px", background: loading==="cloning"?"#14532d":"#fff", color:"#000", border:"none", borderRadius:"10px", fontWeight:"bold"}}>{loading==="cloning" ? "⏳ Cloning via ElevenLabs..." : `Create ${gender} Clone via /api/voice-clone`}</button>
          <p style={{fontSize:"11px", color:"#6b7280", marginTop:"10px"}}>✅ Keeps existing recordings, cloned_voices, marketplace - only INSERT. No DELETE.</p>
        </div>
      </div>
    </div>
  )
}