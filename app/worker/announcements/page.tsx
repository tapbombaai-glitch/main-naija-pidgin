"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Announcement = {
  id: string;
  title: string;
  message: string;
  type: string | null;
  published: boolean;
  created_at: string;
};

export default function WorkerAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadAnnouncements = async () => {
    try {
      // TRY 1: With type
      let { data, error } = await supabase
        .from("announcements")
        .select("id, title, message, type, published, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });

      // TRY 2: If type column no dey, retry without type
      if (error && error.message.includes("type")) {
        const retry = await supabase
          .from("announcements")
          .select("id, title, message, published, created_at")
          .eq("published", true)
          .order("created_at", { ascending: false });
        data = retry.data;
        error = retry.error;
        if (data) data = (data as any[]).map((a) => ({ ...a, type: "general" }));
      }

      if (error) {
        setErrorMsg("Could not load: " + error.message);
        setAnnouncements([]);
      } else {
        setErrorMsg("");
        setAnnouncements((data as Announcement[]) || []);
      }
    } catch (e: any) {
      setErrorMsg("Error: " + (e?.message || "Unknown"));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
    const channel = supabase
      .channel("worker-announcements-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => loadAnnouncements())
      .subscribe();
    const interval = setInterval(() => { loadAnnouncements(); }, 30000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: "390px", margin: "0 auto", padding: "10px", paddingBottom: "90px" }}>
        <a href="/worker" style={{ color: "#aaa", fontSize: "12px", textDecoration: "none" }}>← Back to Worker Dashboard</a>
        <h1 style={{ fontSize: "18px", fontWeight: "900", margin: "10px 0 3px" }}>📢 Announcement Board</h1>
        <p style={{ fontSize: "11px", color: "#aaa", margin: 0 }}>Messages from Chairman</p>

        {errorMsg && (
          <div style={{ background: "#5C1A1A", border: "1px solid #FF5252", borderRadius: "10px", padding: "10px", marginTop: "12px", fontSize: "12px", color: "#FFCDD2" }}>
            {errorMsg}
            <br />
            <button onClick={loadAnnouncements} style={{ marginTop: "8px", background: "#FF5252", color: "white", border: 0, borderRadius: "8px", padding: "8px 12px", fontWeight: 800 }}>Try Again</button>
          </div>
        )}

        <div style={{ background: "#111A11", border: "1px solid #EAB308", borderRadius: "12px", padding: "12px", marginTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "#FACC15", fontSize: "14px" }}>📢 CHAIRMAN ANNOUNCEMENTS</strong>
            {announcements.length > 0 && <span style={{ background: "#EAB308", color: "black", padding: "3px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: "900" }}>{announcements.length} MESSAGES</span>}
          </div>

          {loading ? (
            <p style={{ color: "#aaa", fontSize: "12px" }}>Loading announcements...</p>
          ) : announcements.length === 0 ? (
            <p style={{ color: "#888", fontSize: "12px" }}>No announcements yet. Check again later.</p>
          ) : (
            announcements.map((a) => (
              <div key={a.id} style={{ background: "#080E08", border: "1px solid #263526", borderRadius: "10px", padding: "10px", marginTop: "10px" }}>
                <div style={{ color: a.type === "urgent" ? "#ff5252" : "#FACC15", fontSize: "10px", fontWeight: "900" }}>
                  📢 {String(a.type || "GENERAL").toUpperCase()}
                </div>
                <div style={{ fontWeight: "900", fontSize: "14px", marginTop: "5px" }}>{a.title}</div>
                <p style={{ color: "#ccc", fontSize: "12px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{a.message}</p>
                <div style={{ color: "#777", fontSize: "10px" }}>{new Date(a.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}