 "use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ChairmanHomepage() {
  const [email, setEmail] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || null);
      const { data } = await supabase.from("recordings").select("status");
      if (data) {
        setStats({
          total: data.length,
          pending: data.filter(r => r.status === "pending").length,
          approved: data.filter(r => r.status === "approved").length,
          rejected: data.filter(r => r.status === "rejected").length,
        });
      }
    })();
  }, []);

  const isChairman = email === "tapbomba.ai@gmail.com";

  if (!isChairman) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "grid", placeItems: "center", color: "white", fontFamily: "system-ui" }}>
        <div style={{ textAlign: "center", background: "#020617", padding: "32px", borderRadius: "16px", border: "1px solid #1e293b" }}>
          <div style={{ fontSize: "40px" }}>🔒</div>
          <div style={{ fontWeight: 900, marginTop: "12px" }}>Chairman Homepage</div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>Only tapbomba.ai@gmail.com</div>
          <div style={{ fontSize: "10px", color: "#475569", marginTop: "12px" }}>Please login as Chairman</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "white", fontFamily: "system-ui" }}>
      {/* Chairman Homepage Header */}
      <div style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "black", padding: "20px 16px" }}>
        <div style={{ fontWeight: 900, fontSize: "22px" }}>👑 Chairman Homepage</div>
        <div style={{ fontSize: "12px", fontWeight: 600, marginTop: "4px" }}>{email}</div>
        <div style={{ fontSize: "10px", marginTop: "4px", opacity: 0.8 }}>Main Naija Pidgin - Chairman Entry - Keep Forever</div>
      </div>

      {/* Chairman Stats */}
      <div style={{ padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div style={{ background: "#020617", border: "1px solid #1e293b", padding: "16px", borderRadius: "12px" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8" }}>TOTAL</div>
          <div style={{ fontSize: "24px", fontWeight: 900 }}>{stats.total}</div>
          <div style={{ fontSize: "9px", color: "#22c55e" }}>Never decreases</div>
        </div>
        <div style={{ background: "#020617", border: "1px solid #1e293b", padding: "16px", borderRadius: "12px" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8" }}>PENDING</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#f59e0b" }}>{stats.pending}</div>
        </div>
        <div style={{ background: "#020617", border: "1px solid #1e293b", padding: "16px", borderRadius: "12px" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8" }}>APPROVED</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#22c55e" }}>{stats.approved}</div>
        </div>
        <div style={{ background: "#020617", border: "1px solid #1e293b", padding: "16px", borderRadius: "12px" }}>
          <div style={{ fontSize: "10px", color: "#94a3b8" }}>REJECTED</div>
          <div style={{ fontSize: "24px", fontWeight: 900, color: "#ef4444" }}>{stats.rejected}</div>
        </div>
      </div>

      {/* Chairman Navigation - Inside Homepage */}
      <div style={{ padding: "0 16px 16px", display: "grid", gap: "10px" }}>
        <div style={{ background: "#020617", border: "1px solid #f59e0b", padding: "14px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "13px" }}>🎙️ Marketplace - 5 Voices</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>Chairman voices bucket</div>
          </div>
          <div style={{ fontSize: "11px", background: "#f59e0b", color: "black", padding: "4px 10px", borderRadius: "20px", fontWeight: 800 }}>View</div>
        </div>

        <div style={{ background: "#020617", border: "1px solid #1e293b", padding: "14px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "13px" }}>🎧 Worker Studio</div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>Recordings table - keep forever</div>
          </div>
          <div style={{ fontSize: "11px", background: "#1e293b", color: "white", padding: "4px 10px", borderRadius: "20px", fontWeight: 800 }}>Manage</div>
        </div>

        <div style={{ background: "#f59e0b", padding: "14px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "black" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "13px" }}>🔍 Recording Review</div>
            <div style={{ fontSize: "10px", fontWeight: 600 }}>Approve / Reject - Keep forever</div>
          </div>
          <div style={{ fontSize: "11px", background: "black", color: "#f59e0b", padding: "4px 10px", borderRadius: "20px", fontWeight: 800 }}>Open</div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "16px", fontSize: "9px", color: "#475569" }}>
        Chairman Homepage - app/page.tsx - tapbomba.ai@gmail.com - Do and Keep
      </div>
    </div>
  );
}