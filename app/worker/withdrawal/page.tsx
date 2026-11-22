"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const CAMPAIGN_START_MS = new Date("2026-11-21T16:00:00.000Z").getTime();

export default function WorkerWithdrawalPage() {
  const router = useRouter();
  const [workerId, setWorkerId] = useState("");
  const [balance, setBalance] = useState({ amount: 0, count: 0 });
  const [available, setAvailable] = useState({ amount: 0, count: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [bank, setBank] = useState({ name: "", bank: "", account: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const load = async (wid: string) => {
    setLoading(true);
    try {
      const { data: recs } = await supabase.from("recordings")
        .select("id, earnings, status, created_at, is_paid")
        .eq("worker_id", wid);

      let balAmt = 0, balCount = 0;
      (recs || []).forEach((r: any) => {
        const ms = r.created_at ? new Date(r.created_at).getTime() : 0;
        if (ms >= CAMPAIGN_START_MS && r.status === "approved" && r.is_paid !== true) {
          balAmt += Number(r.earnings) || 0; balCount += 1;
        }
      });
      setBalance({ amount: balAmt, count: balCount });

      // Allocated IDs
      let allocated = new Set<string>();
      let allocFailed = false;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/worker/allocated-recordings", {
          headers: { Authorization: `Bearer ${session?.access_token}` },
          cache: "no-store",
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Allocation failed");
        (j.allocatedIds || []).forEach((id: string) => allocated.add(String(id)));
      } catch { allocFailed = true; }

      let avAmt = 0, avCount = 0;
      if (!allocFailed) {
        (recs || []).forEach((r: any) => {
          const ms = r.created_at ? new Date(r.created_at).getTime() : 0;
          if (ms >= CAMPAIGN_START_MS && r.status === "approved" && r.is_paid !== true && !allocated.has(String(r.id))) {
            avAmt += Number(r.earnings) || 0; avCount += 1;
          }
        });
      }
      setAvailable({ amount: avAmt, count: avCount });

      const { data: w } = await supabase.from("withdrawal_requests")
        .select("*").eq("worker_id", wid).order("requested_at", { ascending: false });
      setHistory(w || []);
      setActive((w || []).find((x: any) => x.status === "pending" || x.status === "approved") || null);

      const { data: b } = await supabase.from("worker_bank").select("*").eq("worker_id", wid).maybeSingle();
      if (b) setBank({ name: b.account_name || "", bank: b.bank_name || "", account: b.account_number || "" });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const wid = localStorage.getItem("gin_worker_id") || "";
    if (!wid) { router.replace("/worker/login"); return; }
    setWorkerId(wid);
    load(wid);
  }, []);

  const request = async () => {
    if (requesting || active) return;
    if (!bank.name || !bank.bank || !bank.account) {
      setMessage("Add your bank details first."); router.push("/worker"); return;
    }
    if (available.amount <= 0) { setMessage("No available balance yet."); return; }
    const fee = Math.round(available.amount * 0.02);
    const net = available.amount - fee;
    const ok = window.confirm(
      `Request Withdrawal?\n\nGross: ₦${available.amount.toLocaleString("en-NG")} (${available.count})\nFee (2%): ₦${fee.toLocaleString("en-NG")}\nYou go receive: ₦${net.toLocaleString("en-NG")}\nBank: ${bank.bank} • ${bank.account} • ${bank.name}\n\nPress OK to send to Chairman.`
    );
    if (!ok) return;
    setRequesting(true); setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/worker/request-withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({}), cache: "no-store",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setMessage(`✅ Request sent! You go receive ₦${net.toLocaleString("en-NG")}.`);
      await load(workerId);
    } catch (e: any) { setMessage(`❌ ${e.message}`); }
    finally { setRequesting(false); }
  };

  return (
    <div style={{ background: "#060A06", minHeight: "100vh", color: "white", fontFamily: "system-ui" }}>
      <div style={{ maxWidth: "390px", margin: "0 auto", padding: "10px", paddingBottom: "40px" }}>
        <button onClick={() => router.push("/worker")} style={{ background: "none", border: "none", color: "#00E676", fontWeight: "900", cursor: "pointer" }}>← BACK TO DASHBOARD</button>
        <h1 style={{ fontSize: "20px", fontWeight: "900", marginTop: "10px" }}>🏧 Withdrawal Dashboard</h1>
        <p style={{ fontSize: "11px", color: "#aaa" }}>{workerId}</p>

        <div style={{ background: "#111A11", border: "1px solid #00E676", borderRadius: "12px", padding: "16px", marginTop: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "#aaa", fontWeight: "900" }}>AVAILABLE TO WITHDRAW</div>
          <div style={{ color: "#00E676", fontWeight: "900", fontSize: "28px", marginTop: "6px" }}>₦{loading ? "..." : available.amount.toLocaleString("en-NG")}</div>
          <div style={{ fontSize: "11px", color: "#ccc" }}>{available.count} recordings • Fee 2% go comot</div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "6px" }}>Total Unpaid: ₦{balance.amount.toLocaleString("en-NG")} ({balance.count})</div>
        </div>

        <div style={{ background: "#111A11", border: "1px solid #333", borderRadius: "12px", padding: "12px", marginTop: "10px", fontSize: "12px" }}>
          💳 <b>Bank:</b> {bank.bank ? `${bank.bank} • ${bank.account} • ${bank.name}` : "No bank yet — go dashboard add am"}
        </div>

        {active ? (
          <div style={{ background: "#1A1400", border: "1px solid #FACC15", borderRadius: "12px", padding: "12px", marginTop: "10px", fontSize: "12px", lineHeight: 1.6 }}>
            ⏳ <b>Withdrawal Pending</b><br />Amount: ₦{Number(active.amount || 0).toLocaleString("en-NG")} • You go receive: ₦{Number(active.net_amount || 0).toLocaleString("en-NG")}<br />Status: <b>{String(active.status).toUpperCase()}</b>
          </div>
        ) : (
          <button onClick={request} disabled={requesting || available.amount <= 0} style={{ width: "100%", marginTop: "10px", padding: "15px", borderRadius: "12px", border: "none", background: available.amount > 0 ? "#00E676" : "#1A3A1A", color: available.amount > 0 ? "black" : "#666", fontWeight: "900", cursor: "pointer" }}>
            {requesting ? "⏳ SENDING..." : available.amount > 0 ? `💰 REQUEST WITHDRAWAL — ₦${available.amount.toLocaleString("en-NG")}` : "💰 NO AVAILABLE BALANCE YET"}
          </button>
        )}

        {message && <div style={{ marginTop: "10px", fontSize: "12px", fontWeight: "700", color: message.startsWith("❌") ? "#FF5252" : "#00E676" }}>{message}</div>}

        <div style={{ fontSize: "12px", fontWeight: "900", marginTop: "14px" }}>📜 WITHDRAWAL HISTORY</div>
        {history.length === 0 ? <div style={{ fontSize: "12px", color: "#888", marginTop: "6px" }}>No withdrawal yet.</div> :
          history.map((w: any) => (
            <div key={w.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "8px 0", borderBottom: "1px solid #1E2F1E" }}>
              <span>{new Date(w.requested_at).toLocaleDateString()} • {String(w.status).toUpperCase()}</span>
              <b style={{ color: w.status === "paid" ? "#00E676" : "#FACC15" }}>₦{Number(w.net_amount || w.amount || 0).toLocaleString("en-NG")}</b>
            </div>
          ))}
      </div>
    </div>
  );
}