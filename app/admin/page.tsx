"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";
const CAMPAIGN_START_ISO = "2026-11-21T16:00:00.000Z";

type Recording = {
  id: string;
  worker_id?: string;
  user_id?: string;
  status?: string;
  is_approved?: boolean;
  pidgin_text?: string;
  text?: string;
  transcript?: string;
  audio_url?: string;
  voice_url?: string;
  file_url?: string;
  language?: string;
  created_at?: string;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

type PayWorker = {
  worker_id: string;
  name: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  phone: string;
  unpaidAmount: number;
  unpaidCount: number;
  totalApproved: number;
  pending: number;
  lastAudio: string;
  lastText: string;
  payments: any[];
};

type Tab = "overview" | "voices" | "announce" | "payments";

export default function AdminPage() {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<Recording[]>([]);
  const [announces, setAnnounces] = useState<Announcement[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [notice, setNotice] = useState("");

  // --- PAYMENTS (SELECT + PAY SELECTED) ---
  const [payWorkers, setPayWorkers] = useState<PayWorker[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPaying, setBulkPaying] = useState(false);

  useEffect(() => {
    let active = true;
    async function verifyAdmin() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
          window.location.replace("/admin/login");
          return;
        }
        const { data: profile, error } = await supabase.from("profiles").select("email, is_chairman").eq("id", user.id).maybeSingle();
        if (error || !profile || profile.email?.toLowerCase() !== ADMIN_EMAIL || profile.is_chairman !== true) {
          await supabase.auth.signOut();
          window.location.replace("/admin/login");
          return;
        }
        await Promise.all([load(), loadAnn(), loadPayments()]);
        if (active) setLoading(false);
      } catch (error) {
        if (active) {
          setNotice(error instanceof Error ? error.message : "Admin verification failed.");
          setLoading(false);
        }
      }
    }
    verifyAdmin();
    return () => { active = false; };
  }, [supabase]);

  async function load() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { window.location.replace("/admin/login"); return; }
      const response = await fetch("/api/chairman/list", {
        method: "GET",
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load recordings.");
      const list: Recording[] = result.recordings || [];
      setItems(list);
      if (result.stats) {
        setStats({
          total: Number(result.stats.total || 0),
          pending: Number(result.stats.pending || 0),
          approved: Number(result.stats.approved || 0),
          rejected: Number(result.stats.rejected || 0),
        });
      } else {
        const approved = list.filter((item) => item.status === "approved" || item.is_approved === true).length;
        const rejected = list.filter((item) => item.status === "rejected").length;
        const pending = list.filter((item) => item.status !== "approved" && item.is_approved !== true && item.status !== "rejected").length;
        setStats({ total: list.length, pending, approved, rejected });
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Recording loading failed.");
    }
  }

  async function loadAnn() {
    const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(10);
    if (error) { setNotice("Could not load announcements: " + error.message); return; }
    setAnnounces((data || []) as Announcement[]);
  }

  async function loadPayments() {
    try {
      setPayLoading(true);
      const { data: recs } = await supabase.from("recordings").select("worker_id, earnings, status, created_at, is_paid, audio_url, text").gte("created_at", CAMPAIGN_START_ISO);
      const { data: banks } = await supabase.from("worker_bank").select("*");
      const { data: pays } = await supabase.from("payment_history").select("*").order("paid_at", { ascending: false });
      const map: Record<string, PayWorker> = {};
      (recs || []).forEach((r: any) => {
        const wid = r.worker_id;
        if (!wid) return;
        if (!map[wid]) {
          const b: any = (banks || []).find((x: any) => x.worker_id === wid);
          map[wid] = { worker_id: wid, name: b?.account_name || "", bank_name: b?.bank_name || "", account_number: b?.account_number || "", account_name: b?.account_name || "", phone: b?.phone_number || "", unpaidAmount: 0, unpaidCount: 0, totalApproved: 0, pending: 0, lastAudio: "", lastText: "", payments: [] };
        }
        if (r.status === "approved") { map[wid].totalApproved += 1; if (r.is_paid !== true) { map[wid].unpaidAmount += Number(r.earnings) || 0; map[wid].unpaidCount += 1; } }
        if (r.status === "pending") map[wid].pending += 1;
        if (r.audio_url) { map[wid].lastAudio = r.audio_url; map[wid].lastText = r.text || ""; }
      });
      (pays || []).forEach((p: any) => { if (map[p.worker_id]) map[p.worker_id].payments.push(p); });
      setPayWorkers(Object.values(map).sort((a, b) => b.unpaidAmount - a.unpaidAmount));
    } catch (e: any) {
      setNotice("Payment loading failed: " + (e.message || ""));
    } finally { setPayLoading(false); }
  }

  async function refreshDashboard() {
    setRefreshing(true);
    setNotice("");
    await Promise.all([load(), loadAnn(), loadPayments()]);
    setRefreshing(false);
  }

  async function act(id: string, status: "approved" | "rejected") {
    if (workingId) return;
    setWorkingId(id);
    setNotice("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { window.location.replace("/admin/login"); return; }
      const response = await fetch("/api/chairman/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update recording.");
      setNotice(`Recording ${status} successfully.`);
      await load();
      await loadPayments();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Recording update failed.");
    } finally { setWorkingId(""); }
  }

  async function createAnn() {
    if (!title.trim() || !msg.trim()) { setNotice("Please fill in the announcement title and message."); return; }
    if (publishing) return;
    setPublishing(true);
    setNotice("");
    try {
      const { error } = await supabase.from("announcements").insert({ title: title.trim(), message: msg.trim(), created_by: ADMIN_EMAIL });
      if (error) throw new Error(error.message);
      setNotice("Announcement published successfully.");
      setTitle("");
      setMsg("");
      await loadAnn();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Announcement publishing failed.");
    } finally { setPublishing(false); }
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.replace("/admin/login");
  }

  // --- PAYMENTS HELPERS ---
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAllUnpaid = () => setSelectedIds(payWorkers.filter(w => w.unpaidAmount > 0).map(w => w.worker_id));
  const clearSelected = () => setSelectedIds([]);
  const selectedWorkers = payWorkers.filter(w => selectedIds.includes(w.worker_id));
  const selectedTotal = selectedWorkers.reduce((s, w) => s + w.unpaidAmount, 0);

  async function markSelectedAsPaid(idsToPay?: string[]) {
    const ids = idsToPay || selectedIds;
    const selected = payWorkers.filter(w => ids.includes(w.worker_id) && w.unpaidAmount > 0);
    if (selected.length === 0) { setNotice("Tick at least 1 worker with unpaid amount first."); return; }
    const list = selected.map(w => `- ${w.worker_id} ${w.name ? `(${w.name})` : ""} — ₦${w.unpaidAmount.toLocaleString("en-NG")} • ${w.unpaidCount} recordings • Bank: ${w.bank_name} ${w.account_number}`).join("\n");
    const total = selected.reduce((s, w) => s + w.unpaidAmount, 0);
    const ok = window.confirm(`MARK SELECTED AS PAID?\n\n${list}\n\nTotal: ₦${total.toLocaleString("en-NG")} for ${selected.length} workers\n\nHave you checked slip + already paid ALL of them for bank? Server go calculate real amount, no duplicate payment.`);
    if (!ok) return;
    setBulkPaying(true);
    setNotice("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { window.location.replace("/admin/login"); return; }
      const batch_key = `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const res = await fetch("/api/chairman/mark-selected-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ worker_ids: selected.map(w => w.worker_id), batch_key }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Bulk payment failed");
      const failed = (j.results || []).filter((r: any) => !r.success);
      setNotice(`Done ✅ Paid: ${j.succeeded} / ${j.total} workers. ${failed.length ? "Failed (still unpaid, you fit retry): " + failed.map((f: any) => `${f.worker_id}: ${f.error}`).join(" | ") : "All selected paid. Their YOUR MONEY don turn ₦0."}`);
      setSelectedIds([]);
      await Promise.all([loadPayments(), load()]);
    } catch (e: any) {
      setNotice("❌ " + (e.message || "Bulk payment failed"));
    } finally { setBulkPaying(false); }
  }

  const navCards = [
    { icon: "👥", title: "Workers", description: "Manage registered workers", href: "/admin/workers", color: "#00E676" },
    { icon: "🎙️", title: "Recordings", description: "Review voice submissions", href: "/admin/recordings", color: "#00E676" },
    { icon: "🇳🇬", title: "Nigeria Pidgin Dataset", description: "Review and manage Nigerian voice data", href: "/admin/dataset", color: "#00E676" },
    { icon: "💰", title: "Payments", description: "Manage worker payments", href: "/admin/payments", color: "#FFC107" },
    { icon: "🎙️", title: "Voice Clone", description: "Create and manage Nigerian AI voices", href: "/clone", color: "#FFC107" },
    { icon: "🔑", title: "API Management", description: "Manage API keys and credits", href: "/admin/api", color: "#00E676" },
    { icon: "📢", title: "Announcements", description: "Publish platform updates", href: "/admin/announcements", color: "#FFC107" },
    { icon: "🛡️", title: "Security", description: "Access and security controls", href: "/admin/security", color: "#00E676" },
    { icon: "🛍️", title: "Marketplace", description: "Manage the separate marketplace", href: "/admin/marketplace", color: "#FFC107" },
  ];

  const cardStyle = { background: "#151515", border: "1px solid #292929", borderRadius: 14, padding: 15, minWidth: 0 };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#D4AF37", display: "grid", placeItems: "center", fontFamily: "Arial, sans-serif", textAlign: "center" }}>
        <div><div style={{ fontSize: 35 }}>👑</div><h2>MAIN NAIJA PIDGIN</h2><p style={{ color: "#999" }}>Verifying Chairman Access...</p></div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#070707", color: "white", fontFamily: "Arial, sans-serif", padding: "16px 14px 95px", boxSizing: "border-box" }}>
      <style>{`
        * { box-sizing: border-box; }
        .admin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
        .admin-tile { display: block; text-decoration: none; color: white; background: #151515; border: 1px solid #292929; border-radius: 14px; padding: 15px; min-height: 125px; transition: border-color .2s ease; }
        .admin-tile:active { border-color: #D4AF37; }
        .admin-button { cursor: pointer; font-weight: 800; }
        .admin-bottom { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; background: rgba(12,12,12,.97); border-top: 1px solid #292929; display: grid; grid-template-columns: repeat(5, 1fr); padding: 10px 5px calc(10px + env(safe-area-inset-bottom)); }
        .admin-bottom button { background: transparent; border: 0; color: #999; font-size: 11px; padding: 5px 2px; cursor: pointer; }
        .admin-bottom button.active { color: #D4AF37; font-weight: 900; }
        .recording-card { background: #171717; border: 1px solid #303030; border-radius: 13px; padding: 13px; margin-bottom: 11px; overflow: hidden; }
        @media (min-width: 700px) { .admin-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } .admin-content { max-width: 1100px; margin: 0 auto; } }
      `}</style>
      <div className="admin-content">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div>
            <div style={{ color: "#D4AF37", fontSize: 11, fontWeight: 900, letterSpacing: 2 }}>MAIN NAIJA PIDGIN</div>
            <h1 style={{ fontSize: 21, margin: "5px 0", color: "white" }}>👑 Chairman Control Centre</h1>
            <div style={{ color: "#888", fontSize: 11 }}>{ADMIN_EMAIL}</div>
          </div>
          <button onClick={logout} className="admin-button" style={{ background: "#202020", color: "white", border: "1px solid #444", borderRadius: 20, padding: "10px 13px" }}>Logout</button>
        </header>
        <div style={{ ...cardStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 17 }}>
          <div><div style={{ fontSize: 11, color: "#999" }}>ADMINISTRATOR</div><strong style={{ color: "#D4AF37" }}>Chairman Account</strong></div>
          <div style={{ color: "#00E676", fontSize: 11, fontWeight: 900 }}>● VERIFIED</div>
        </div>
        {notice && (
          <div role="status" style={{ background: "#172017", border: "1px solid #287A39", color: "#D9FFE0", padding: 12, borderRadius: 9, marginBottom: 15, fontSize: 13, overflowWrap: "anywhere" }}>
            {notice}
            <button onClick={() => setNotice("")} style={{ float: "right", border: 0, background: "transparent", color: "white" }}>✕</button>
          </div>
        )}
        {tab === "overview" && (
          <>
            <section style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>System Overview</h2>
                <button onClick={refreshDashboard} disabled={refreshing} className="admin-button" style={{ background: "#171717", color: "#00E676", border: "1px solid #00E676", borderRadius: 20, padding: "8px 11px" }}>{refreshing ? "Loading..." : "↻ Refresh"}</button>
              </div>
              <div className="admin-grid">
                {[
                  { label: "TOTAL RECORDINGS", value: stats.total, color: "#FFFFFF" },
                  { label: "PENDING", value: stats.pending, color: "#FFC107" },
                  { label: "APPROVED", value: stats.approved, color: "#00E676" },
                  { label: "REJECTED", value: stats.rejected, color: "#FF5252" },
                ].map((stat) => (
                  <div key={stat.label} style={cardStyle}>
                    <div style={{ color: "#999", fontSize: 9, fontWeight: 800 }}>{stat.label}</div>
                    <div style={{ color: stat.color, fontSize: 27, fontWeight: 900, marginTop: 8 }}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </section>
            <section style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Management Centre</h2>
              <div className="admin-grid">
                {navCards.map((card) => (
                  <Link href={card.href} key={card.title} className="admin-tile">
                    <div style={{ fontSize: 25 }}>{card.icon}</div>
                    <div style={{ fontWeight: 900, marginTop: 10, fontSize: 13 }}>{card.title}</div>
                    <div style={{ color: "#888", fontSize: 10, marginTop: 5, lineHeight: 1.5 }}>{card.description}</div>
                    <div style={{ color: card.color, fontSize: 11, marginTop: 9 }}>Open Centre →</div>
                  </Link>
                ))}
              </div>
            </section>
            <section style={cardStyle}>
              <h3 style={{ color: "#D4AF37", fontSize: 14, marginTop: 0 }}>Recording Review</h3>
              <p style={{ color: "#999", fontSize: 12 }}>You have {stats.pending} recordings waiting for review.</p>
              <button onClick={() => setTab("voices")} className="admin-button" style={{ width: "100%", background: "#00E676", color: "black", border: 0, padding: 12, borderRadius: 9 }}>Review Recordings</button>
              <button onClick={() => setTab("payments")} className="admin-button" style={{ width: "100%", background: "#FFC107", color: "black", border: 0, padding: 12, borderRadius: 9, marginTop: 10 }}>💰 Open Payments — Select + Pay Selected</button>
            </section>
          </>
        )}
        {tab === "voices" && (
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Recording Management</h2>
              <button onClick={refreshDashboard} disabled={refreshing} className="admin-button" style={{ background: "#171717", color: "#00E676", border: "1px solid #00E676", borderRadius: 20, padding: "8px 10px" }}>{refreshing ? "Loading..." : "↻ Refresh"}</button>
            </div>
            <div className="admin-grid" style={{ marginBottom: 16 }}>
              {[["Total", stats.total], ["Pending", stats.pending], ["Approved", stats.approved], ["Rejected", stats.rejected]].map(([label, value]) => (
                <div key={label} style={cardStyle}><div style={{ color: "#999", fontSize: 10 }}>{label}</div><strong style={{ fontSize: 23 }}>{value}</strong></div>
              ))}
            </div>
            {items.map((item) => {
              const approved = item.status === "approved" || item.is_approved === true;
              const rejected = item.status === "rejected";
              const audio = item.audio_url || item.voice_url || item.file_url;
              return (
                <article key={item.id} className="recording-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <strong style={{ fontSize: 12 }}>{item.worker_id || item.user_id || "Worker"}</strong>
                    <span style={{ fontSize: 10, fontWeight: 900, color: approved ? "#00E676" : rejected ? "#FF5252" : "#FFC107" }}>{approved ? "APPROVED" : rejected ? "REJECTED" : "PENDING"}</span>
                  </div>
                  <div style={{ color: "#999", fontSize: 10, marginTop: 6 }}>{item.language || "Language not specified"}{item.created_at ? " • " + new Date(item.created_at).toLocaleString() : ""}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, margin: "12px 0", overflowWrap: "anywhere" }}>{(item.pidgin_text || item.text || item.transcript || "No transcript available.").slice(0, 300)}</div>
                  {audio && <audio controls preload="none" src={audio} style={{ width: "100%", height: 38, marginBottom: 8 }} />}
                  {!approved && !rejected && (
                    <div style={{ display: "flex", gap: 9, marginTop: 8 }}>
                      <button disabled={workingId === item.id} onClick={() => act(item.id, "approved")} className="admin-button" style={{ flex: 1, padding: 11, background: "#16A34A", color: "white", border: 0, borderRadius: 8 }}>{workingId === item.id ? "Working..." : "Approve"}</button>
                      <button disabled={workingId === item.id} onClick={() => act(item.id, "rejected")} className="admin-button" style={{ flex: 1, padding: 11, background: "#DC2626", color: "white", border: 0, borderRadius: 8 }}>Reject</button>
                    </div>
                  )}
                </article>
              );
            })}
            {items.length === 0 && <div style={{ textAlign: "center", color: "#999", padding: 35 }}>No recordings found.</div>}
          </section>
        )}
        {tab === "announce" && (
          <section>
            <div style={{ ...cardStyle, borderColor: "#806018", background: "#171307" }}>
              <h2 style={{ color: "#FFC107", fontSize: 17, marginTop: 0 }}>📢 Create Announcement</h2>
              <p style={{ color: "#999", fontSize: 11, lineHeight: 1.6 }}>Publish an update for the parts of the platform that read from the announcements table.</p>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" style={{ width: "100%", padding: 13, marginTop: 10, borderRadius: 8, background: "#101010", color: "white", border: "1px solid #444", fontSize: 13 }} />
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Announcement message..." style={{ width: "100%", padding: 13, marginTop: 10, height: 110, borderRadius: 8, background: "#101010", color: "white", border: "1px solid #444", fontSize: 13, resize: "vertical" }} />
              <button onClick={createAnn} disabled={publishing} className="admin-button" style={{ width: "100%", marginTop: 12, padding: 13, background: "#FFC107", color: "black", border: 0, borderRadius: 9 }}>{publishing ? "Publishing..." : "Publish Announcement"}</button>
            </div>
            <div style={{ marginTop: 22 }}>
              <h3 style={{ fontSize: 13, color: "#D4AF37" }}>Recent Announcements ({announces.length})</h3>
              {announces.map((announcement) => (
                <article key={announcement.id} style={{ ...cardStyle, marginBottom: 9 }}>
                  <strong style={{ fontSize: 13 }}>{announcement.title}</strong>
                  <p style={{ color: "#BBB", fontSize: 12, lineHeight: 1.6 }}>{announcement.message}</p>
                  <div style={{ color: "#777", fontSize: 10 }}>{new Date(announcement.created_at).toLocaleString()}</div>
                </article>
              ))}
              {announces.length === 0 && <p style={{ color: "#888", fontSize: 12 }}>No announcements yet.</p>}
            </div>
          </section>
        )}
        {tab === "payments" && (
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>💰 Payments — New Campaign</h2>
              <button onClick={refreshDashboard} disabled={refreshing} className="admin-button" style={{ background: "#171717", color: "#00E676", border: "1px solid #00E676", borderRadius: 20, padding: "8px 10px" }}>{refreshing ? "Loading..." : "↻ Refresh"}</button>
            </div>
            <p style={{ color: "#999", fontSize: 12, marginTop: 0 }}>From 21 Nov 2026, 5:00 PM Lagos. One click, multiple selected workers, separate protected payments. No Pay All.</p>
            <div style={{ background: "#1A2A00", border: "1px solid #EAB308", borderRadius: 12, padding: 12, marginBottom: 14, position: "sticky", top: 10, zIndex: 5 }}>
              <div style={{ fontWeight: 900, fontSize: 13 }}>✅ Selected: {selectedIds.length} workers • Total: ₦{selectedTotal.toLocaleString("en-NG")}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={selectAllUnpaid} className="admin-button" style={{ background: "#333", color: "white", border: 0, padding: "10px 12px", borderRadius: 10, fontSize: 12 }}>☑️ Select All Unpaid</button>
                <button onClick={clearSelected} className="admin-button" style={{ background: "#333", color: "white", border: 0, padding: "10px 12px", borderRadius: 10, fontSize: 12 }}>Clear Selection</button>
                <button onClick={() => markSelectedAsPaid()} disabled={bulkPaying || selectedIds.length === 0} className="admin-button" style={{ background: selectedIds.length > 0 ? "#00E676" : "#333", color: selectedIds.length > 0 ? "black" : "#888", border: 0, padding: "10px 14px", borderRadius: 10, fontSize: 12 }}>{bulkPaying ? "⏳ PAYING SELECTED..." : `✅ MARK SELECTED AS PAID (${selectedIds.length})`}</button>
              </div>
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 6 }}>Only ticked workers go pay. Server calculates real amount. Duplicate click no go pay twice. Failed remain unpaid, you fit retry.</div>
            </div>
            {payLoading && <p style={{ color: "#999" }}>Loading payments...</p>}
            {!payLoading && payWorkers.length === 0 && <p style={{ color: "#888" }}>No workers for New Campaign yet.</p>}
            {payWorkers.map((w) => (
              <article key={w.worker_id} className="recording-card" style={{ borderColor: selectedIds.includes(w.worker_id) ? "#00E676" : "#303030" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <input type="checkbox" checked={selectedIds.includes(w.worker_id)} disabled={w.unpaidAmount <= 0} onChange={() => toggleSelect(w.worker_id)} style={{ width: 22, height: 22, accentColor: "#00E676", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong style={{ fontSize: 13 }}>{w.worker_id} {w.name ? `• ${w.name}` : ""}</strong>
                      <strong style={{ color: "#00E676", fontSize: 16 }}>₦{w.unpaidAmount.toLocaleString("en-NG")}</strong>
                    </div>
                    <div style={{ color: "#999", fontSize: 11, marginTop: 4 }}>Bank: {w.bank_name || "—"} • {w.account_number || "—"} • {w.account_name || "—"} • Phone: {w.phone || "—"}</div>
                    <div style={{ color: "#ccc", fontSize: 11, marginTop: 4 }}>Unpaid: {w.unpaidCount} • Approved Total: {w.totalApproved} • Waiting: {w.pending}</div>
                    {w.lastAudio && <div style={{ marginTop: 10 }}><div style={{ fontSize: 11, color: "#ccc" }}>🎧 Last Recording — Listen + Check Slip:</div><div style={{ fontSize: 12, color: "#aaa", margin: "6px 0" }}>{w.lastText?.slice(0, 120)}</div><audio controls preload="none" src={w.lastAudio} style={{ width: "100%", height: 36 }} /></div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      <button onClick={() => markSelectedAsPaid([w.worker_id])} disabled={bulkPaying || w.unpaidAmount <= 0} className="admin-button" style={{ background: w.unpaidAmount > 0 ? "#FFC107" : "#333", color: w.unpaidAmount > 0 ? "black" : "#888", border: 0, padding: "10px 12px", borderRadius: 9, fontSize: 12 }}>{w.unpaidAmount > 0 ? `✅ MARK THIS WORKER AS PAID — ₦${w.unpaidAmount.toLocaleString("en-NG")}` : "✅ PAID — ₦0"}</button>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12 }}><b style={{ color: "#aaa" }}>💵 PREVIOUS PAYMENT HISTORY:</b>{w.payments.length === 0 ? <span style={{ color: "#888" }}> No payment yet</span> : w.payments.map((p: any) => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#ccc" }}><span>{new Date(p.paid_at).toLocaleString()} • You paid</span><b style={{ color: "#00E676" }}>₦{Number(p.amount_paid || 0).toLocaleString("en-NG")}</b></div>)}</div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
      <nav className="admin-bottom">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><div style={{ fontSize: 19 }}>⌂</div>Home</button>
        <button className={tab === "voices" ? "active" : ""} onClick={() => setTab("voices")}><div style={{ fontSize: 19 }}>🎙️</div>Recordings</button>
        <button className={tab === "payments" ? "active" : ""} onClick={() => setTab("payments")}><div style={{ fontSize: 19 }}>💰</div>Payments</button>
        <button className={tab === "announce" ? "active" : ""} onClick={() => setTab("announce")}><div style={{ fontSize: 19 }}>📢</div>Alerts</button>
        <button onClick={logout}><div style={{ fontSize: 19 }}>⚙️</div>Logout</button>
      </nav>
    </main>
  );
}