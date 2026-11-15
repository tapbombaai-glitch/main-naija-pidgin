"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Announcement = {
  id: string;
  title: string;
  message: string;
  published: boolean;
  created_at: string;
  updated_at?: string;
};

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export default function ChairmanAnnouncementsPage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { initialize(); }, []);

  async function initialize() {
    setLoading(true);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) { setNotice("Please log in to access the Chairman Announcement Board."); setLoading(false); return; }
    if (data.user.email?.toLowerCase() !== CHAIRMAN_EMAIL) { setNotice("Access denied. Chairman only."); setLoading(false); return; }
    setUser(data.user);
    await loadAnnouncements();
    setLoading(false);
  }

  async function loadAnnouncements() {
    // FIX: No more updated_at in select - na that one dey cause "column does not exist"
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,message,published,created_at")
      .order("created_at", { ascending: false });
    if (error) { setNotice("Could not load announcements: " + error.message); return; }
    setAnnouncements(data || []);
  }

  function resetForm() { setTitle(""); setMessage(""); setEditingId(null); }

  async function saveAnnouncement(publish: boolean) {
    if (!user) return;
    if (!title.trim() || !message.trim()) { setNotice("Please enter both a title and a message."); return; }
    setSaving(true); setNotice("");
    // FIX: No updated_at here too - table no get am
    const announcementData = { title: title.trim(), message: message.trim(), published: publish };
    let error;
    if (editingId) {
      const result = await supabase.from("announcements").update(announcementData).eq("id", editingId);
      error = result.error;
    } else {
      const result = await supabase.from("announcements").insert({ ...announcementData, created_by: user.id });
      error = result.error;
    }
    if (error) setNotice("Could not save announcement: " + error.message);
    else { setNotice(publish ? "Announcement published successfully!" : "Announcement saved as draft!"); resetForm(); await loadAnnouncements(); }
    setSaving(false);
  }

  function editAnnouncement(item: Announcement) { setEditingId(item.id); setTitle(item.title); setMessage(item.message); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function togglePublish(item: Announcement) {
    const { error } = await supabase.from("announcements").update({ published: !item.published }).eq("id", item.id);
    if (error) { setNotice("Could not update announcement: " + error.message); return; }
    setNotice(item.published ? "Announcement unpublished." : "Announcement published!");
    await loadAnnouncements();
  }

  async function deleteAnnouncement(id: string) {
    if (!window.confirm("Are you sure you want to permanently delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (error) { setNotice("Could not delete announcement: " + error.message); return; }
    setNotice("Announcement deleted."); if (editingId === id) resetForm(); await loadAnnouncements();
  }

  if (loading) return <main style={{ minHeight: "100vh", background: "#07110C", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading Chairman Announcement Board...</main>;

  if (!user || user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
    return (
      <main style={{ minHeight: "100vh", background: "#07110C", color: "white", padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#102219", border: "1px solid #FF3B30", borderRadius: 16, padding: 24, maxWidth: 400, width: "100%", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#FF6B6B" }}>Access Denied</h1>
          <p style={{ color: "#CCC", marginTop: 12 }}>{notice || "This page is only available to the Chairman."}</p>
          <a href="/admin" style={{ display: "inline-block", marginTop: 20, background: "#00C853", color: "white", padding: "12px 20px", borderRadius: 12, fontWeight: 800, textDecoration: "none" }}>Back to Dashboard</a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#07110C", color: "white", padding: 16 }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
          <div>
            <p style={{ color: "#00E676", fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>MAIN NAIJA PIDGIN</p>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: "4px 0 0" }}>Chairman Announcement Board</h1>
            <p style={{ color: "#AAAAAA", fontSize: 14, margin: "8px 0 0" }}>Send important messages directly to your workers.</p>
          </div>
          <a href="/admin" style={{ background: "#183526", border: "1px solid #2E7D32", padding: "8px 12px", borderRadius: 12, fontSize: 14, color: "white", textDecoration: "none", whiteSpace: "nowrap" }}>← Back</a>
        </div>

        {notice && <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: "#153522", border: "1px solid #2E7D32", color: "#B9F6CA", fontSize: 14 }}>{notice}</div>}

        {/* CREATE BOX - FORCED GREEN, NOT BLACK & WHITE */}
        <section style={{ background: "#102219", border: "2px solid #00C853", borderRadius: 16, padding: 20, marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 20px" }}>{editingId ? "Edit Announcement" : "Create New Announcement"}</h2>
          <label style={{ display: "block", fontSize: 14, color: "#CCCCCC", marginBottom: 8 }}>Announcement Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter announcement title" maxLength={150} style={{ width: "100%", boxSizing: "border-box", background: "#FFFFFF", color: "#000000", border: "1px solid #333", borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 20 }} />
          <label style={{ display: "block", fontSize: 14, color: "#CCCCCC", marginBottom: 8 }}>Your Message to Workers</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your announcement here..." rows={7} maxLength={10000} style={{ width: "100%", boxSizing: "border-box", background: "#FFFFFF", color: "#000000", border: "1px solid #333", borderRadius: 12, padding: 14, fontSize: 15 }} />
          <div style={{ textAlign: "right", fontSize: 12, color: "#888", marginTop: 8 }}>{message.length}/10000 characters</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
            <button onClick={() => saveAnnouncement(true)} disabled={saving} style={{ width: "100%", background: "#00C853", color: "white", border: 0, borderRadius: 12, padding: 14, fontWeight: 800, fontSize: 15 }}> {saving ? "Saving..." : "📢 Publish to Workers"} </button>
            <button onClick={() => saveAnnouncement(false)} disabled={saving} style={{ width: "100%", background: "#263B30", color: "white", border: "1px solid #444", borderRadius: 12, padding: 14, fontWeight: 800 }}>Save as Draft</button>
          </div>
          {editingId && <button onClick={resetForm} style={{ width: "100%", marginTop: 12, background: "transparent", border: "1px solid #666", color: "#CCC", borderRadius: 12, padding: 12 }}>Cancel Editing</button>}
        </section>

        {/* HISTORY */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Announcement History</h2>
            <button onClick={loadAnnouncements} style={{ background: "none", border: 0, color: "#00E676", fontSize: 14, fontWeight: 800 }}>↻ Refresh</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "#102219", border: "1px solid #2E7D32", borderRadius: 12, padding: 16 }}><p style={{ color: "#AAA", fontSize: 14 }}>Total</p><p style={{ fontSize: 32, fontWeight: 900 }}>{announcements.length}</p></div>
            <div style={{ background: "#102219", border: "1px solid #2E7D32", borderRadius: 12, padding: 16 }}><p style={{ color: "#AAA", fontSize: 14 }}>Published</p><p style={{ fontSize: 32, fontWeight: 900, color: "#00E676" }}>{announcements.filter((a) => a.published).length}</p></div>
          </div>
          {announcements.length === 0 ? (
            <div style={{ background: "#102219", border: "1px solid #2E7D32", borderRadius: 16, padding: 32, textAlign: "center", color: "#AAA" }}>No announcements yet. Create your first announcement above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {announcements.map((item) => (
                <article key={item.id} style={{ background: "#102219", border: "1px solid #2E7D32", borderRadius: 16, padding: 16 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 999, background: item.published ? "#1B5E20" : "#4A3200", color: item.published ? "#B9F6CA" : "#FFE082" }}>{item.published ? "PUBLISHED" : "DRAFT"}</span>
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: "12px 0 0" }}>{item.title}</h3>
                  <p style={{ color: "#CCCCCC", fontSize: 14, marginTop: 12, whiteSpace: "pre-wrap" }}>{item.message}</p>
                  <p style={{ color: "#888", fontSize: 12, marginTop: 16 }}>Created: {new Date(item.created_at).toLocaleString()}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
                    <button onClick={() => editAnnouncement(item)} style={{ background: "#1E3A8A", color: "#BFDBFE", border: 0, borderRadius: 8, padding: 12, fontSize: 12, fontWeight: 800 }}>Edit</button>
                    <button onClick={() => togglePublish(item)} style={{ background: "#294332", color: "#B9F6CA", border: 0, borderRadius: 8, padding: 12, fontSize: 12, fontWeight: 800 }}>{item.published ? "Unpublish" : "Publish"}</button>
                    <button onClick={() => deleteAnnouncement(item.id)} style={{ background: "#5C1A1A", color: "#FFCDD2", border: 0, borderRadius: 8, padding: 12, fontSize: 12, fontWeight: 800 }}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <p style={{ textAlign: "center", color: "#666", fontSize: 12, margin: "40px 0 20px" }}>MAIN NAIJA PIDGIN • CHAIRMAN CONTROL CENTRE</p>
      </div>
    </main>
  );
}