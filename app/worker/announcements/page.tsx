"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function WorkerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = async () => {
    const { data, error } = await supabase.from("announcements").select("id, title, message, type, created_at").eq("is_published", true).order("created_at", { ascending: false });
    if (error) console.error("Announcement loading error:", error.message);
    else setAnnouncements(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
    const channel = supabase.channel("worker-announcements-page").on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => loadAnnouncements()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: "390px", margin: "0 auto", padding: "10px", paddingBottom: "90px" }}>
        <a href="/worker" style={{ color: "#aaa", fontSize: "12px", textDecoration: "none" }}>← Back to Worker Dashboard</a>
        <h1 style={{ fontSize: "18px", fontWeight: "900", margin: "10px 0 3px" }}>📢 Announcement Board</h1>
        <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>Messages from Chairman</p>
        <div style={{ background: "#111A11", border: "1px solid #EAB308", borderRadius: "12px", padding: "12px", marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "#FACC15", fontSize: "14px" }}>📢 CHAIRMAN ANNOUNCEMENTS</strong>
            {announcements.length > 0 && <span style={{ background: "#EAB308", color: "black", padding: "3px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: "900" }}>{announcements.length} MESSAGES</span>}
          </div>
          {loading ? <p style={{ color: "#aaa", fontSize: "12px" }}>Loading announcements...</p>
          : announcements.length === 0 ? <p style={{ color: "#888", fontSize: "12px" }}>No announcements yet. Check again later.</p>
          : announcements.map((a) => (
            <div key={a.id} style={{ background: "#080E08", border: "1px solid #263526", borderRadius: "10px", padding: "10px", marginTop: "10px" }}>
              <div style={{ color: a.type === "urgent" ? "#ff5252" : "#FACC15", fontSize: "10px", fontWeight: "900" }}>📢 {String(a.type || "GENERAL").toUpperCase()}</div>
              <div style={{ fontWeight: "900", fontSize: "14px", marginTop: "5px" }}>{a.title}</div>
              <p style={{ color: "#ccc", fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.message}</p>
              <div style={{ color: "#777", fontSize: "10px" }}>{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}