"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RecordingsPage() {
const [recordings, setRecordings] = useState<any[]>([]);
const [filter, setFilter] = useState<'all'|'pending'|'approved'|'rejected'>('all');
const [loading, setLoading] = useState(true);
const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
const [playingId, setPlayingId] = useState<string | null>(null);

useEffect(() => {
loadAllRecordings();
}, []);

async function loadAllRecordings() {
setLoading(true);
try {
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.email !== "tapbomba.ai@gmail.com") {
// window.location.href = "/chairman/login";
}

const { data, error } = await supabase  
    .from('recordings')  
    .select('*')  
    .order('created_at', { ascending: false });  

  if (error) throw error;  

  if (data && data.length > 0) {  
    const withUrls = await Promise.all(data.map(async (rec) => {  
      let signedUrl = null;  
      if (rec.audio_path) {  
        const { data: urlData } = await supabase.storage  
          .from('voices')  
          .createSignedUrl(rec.audio_path, 3600);  
        signedUrl = urlData?.signedUrl;  
      }  
      return { ...rec, signedUrl };  
    }));  
    setRecordings(withUrls);  
    setCounts({  
      total: withUrls.length,  
      pending: withUrls.filter(r => r.status === 'pending' || !r.status).length,  
      approved: withUrls.filter(r => r.status === 'approved').length,  
      rejected: withUrls.filter(r => r.status === 'rejected').length,  
    });  
  } else {  
    setRecordings([  
      { id: "REC-024", worker_id: "Worker-024", worker_email: "worker024@test.com", language: "Pidgin", text: "How far boss! Lagos male voice dey here", type: "Free Talk", status: "pending", created_at: new Date().toISOString(), signedUrl: null },  
      { id: "REC-023", worker_id: "Worker-023", language: "Hausa", type: "Read Text", status: "pending", created_at: new Date().toISOString(), signedUrl: null },  
      { id: "REC-022", worker_id: "Worker-022", language: "Igbo", type: "Free Talk", status: "approved", created_at: new Date().toISOString(), signedUrl: null },  
    ]);  
  }  
} catch (e) {  
  console.error(e);  
} finally {  
  setLoading(false);  
}

}

async function handleApproval(id: string, newStatus: 'approved' | 'rejected') {
const { error } = await supabase
.from('recordings')
.update({
status: newStatus,
reviewed_by: "tapbomba.ai@gmail.com",
reviewed_at: new Date().toISOString()
})
.eq('id', id);

if (!error) {  
  setRecordings(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));  
}

}

const filtered = recordings.filter(r => {
if (filter === 'all') return true;
return (r.status || 'pending') === filter;
});

return (
<div style={{ minHeight: "100vh", background: "#0f172a", padding: "16px", color: "white" }}>
<Link href="/chairman" style={{ color: "#22c55e", fontSize: "12px", textDecoration: "none" }}>← Back to Chairman Overview</Link>
<h1 style={{ fontSize: "20px", marginTop: "12px", fontWeight: 800 }}>Recording Review</h1>
<p style={{ color: "#64748b", fontSize: "11px" }}>
{loading ? "Loading live recordings..." : ${counts.total} total • ${counts.pending} pending • ${counts.approved} approved • ${counts.rejected} rejected • Chairman only: tapbomba.ai@gmail.com}
</p>

<div style={{ display: "flex", gap: "6px", marginTop: "12px", overflowX: "auto" }}>  
    {(['all','pending','approved','rejected'] as const).map(f => (  
      <button   
        key={f}   
        onClick={() => setFilter(f)}  
        style={{   
          background: filter===f ? "#f59e0b" : "#1e293b",   
          color: filter===f ? "black" : "#94a3b8",   
          border: "none",   
          padding: "6px 12px",   
          borderRadius: "20px",   
          fontSize: "11px",   
          fontWeight: 800,  
          whiteSpace: "nowrap"  
        }}  
      >  
        {f.toUpperCase()} {f==='all' ? `(${counts.total})` : f==='pending' ? `(${counts.pending})` : f==='approved' ? `(${counts.approved})` : `(${counts.rejected})`}  
      </button>  
    ))}  
  </div>  
    
  <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>  
    {filtered.map(r => (  
      <div key={r.id} style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: "12px", padding: "12px" }}>  
        <div style={{ display: "flex", justifyContent: "space-between" }}>  
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 700 }}>{r.id} • {r.type || r.language || "Free Talk"}</p>  
          <span style={{   
            background: (r.status||'pending')==="pending"?"#422006":(r.status==="approved"?"#052e16":"#450a0a"),   
            color: (r.status||'pending')==="pending"?"#fbbf24":(r.status==="approved"?"#4ade80":"#f87171"),   
            padding: "3px 8px",   
            borderRadius: "20px",   
            fontSize: "9px",   
            fontWeight: 800   
          }}>  
            {(r.status || "pending").toUpperCase()}  
          </span>  
        </div>  
        <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#64748b" }}>  
          {r.worker_id || r.worker_email || r.worker} • {r.language || r.lang} • {r.text?.slice(0, 60) || "Authentic Naija Pidgin"} • {new Date(r.created_at).toLocaleString()}  
        </p>  
          
        <div style={{ background: "#0f172a", borderRadius: "8px", padding: "10px", marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>  
          {r.signedUrl ? (  
            <>  
              <audio id={`audio-${r.id}`} src={r.signedUrl} onEnded={() => setPlayingId(null)} style={{ display: "none" }} />  
              <button   
                onClick={() => {  
                  const audio = document.getElementById(`audio-${r.id}`) as HTMLAudioElement;  
                  if (playingId === r.id) {  
                    audio.pause();  
                    setPlayingId(null);  
                  } else {  
                    document.querySelectorAll('audio').forEach(a => (a as HTMLAudioElement).pause());  
                    audio.play();  
                    setPlayingId(r.id);  
                  }  
                }}  
                style={{ width: "32px", height: "32px", borderRadius: "50%", background: playingId===r.id ? "#ef4444" : "#f59e0b", border: "none", fontSize: "14px" }}  
              >  
                {playingId===r.id ? "⏸️" : "▶️"}  
              </button>  
              <div style={{ flex: 1, height: "4px", background: "#1e293b", borderRadius: "2px" }}><div style={{ width: playingId===r.id ? "100%" : "60%", height: "100%", background: "#f59e0b" }}></div></div>  
              <span style={{ fontSize: "10px", color: "#64748b" }}>Chairman Play</span>  
            </>  
          ) : (  
            <>  
              <button style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#334155", border: "none", opacity: 0.5 }}>▶️</button>  
              <div style={{ flex: 1, height: "4px", background: "#1e293b", borderRadius: "2px" }}></div>  
              <span style={{ fontSize: "10px", color: "#64748b" }}>No audio yet - Demo</span>  
            </>  
          )}  
        </div>  
          
        <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>  
          <button onClick={() => handleApproval(r.id, 'approved')} disabled={r.status==='approved'} style={{ flex: 1, background: r.status==='approved' ? "#14532d" : "#052e16", border: "1px solid #14532d", color: "#4ade80", padding: "9px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, opacity: r.status==='approved' ? 0.6 : 1 }}>  
            {r.status==='approved' ? "✓ Approved (Kept Forever)" : "✓ Approve"}  
          </button>  
          <button onClick={() => handleApproval(r.id, 'rejected')} disabled={r.status==='rejected'} style={{ flex: 1, background: r.status==='rejected' ? "#7f1d1d" : "#450a0a", border: "1px solid #7f1d1d", color: "#f87171", padding: "9px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, opacity: r.status==='rejected' ? 0.6 : 1 }}>  
            {r.status==='rejected' ? "✕ Rejected (Still Stored)" : "✕ Reject"}  
          </button>  
        </div>  
      </div>  
    ))}  
  </div>  
</div>

);
}
