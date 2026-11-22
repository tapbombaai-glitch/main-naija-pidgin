// ============================================================
// A. PUT THIS BEFORE return ( - INSIDE WorkerDashboard
// ============================================================
const [availableWithdrawal, setAvailableWithdrawal] = useState({ amount: 0, count: 0 });
const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
const [activeWithdrawal, setActiveWithdrawal] = useState<any>(null);
const [allocationLoading, setAllocationLoading] = useState(true);
const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);
const [withdrawalMessage, setWithdrawalMessage] = useState("");
const [showEarningsModal, setShowEarningsModal] = useState(false);

const loadWorkerData = async (wid: string) => {
  setAllocationLoading(true);
  try {
    const { data: anns } = await supabase.from("announcements").select("id, title, message, type, created_at").eq("is_published", true).order("created_at", { ascending: false }).limit(5);
    if (anns) setAnnouncements(anns);
    setAnnouncementLoading(false);
    const window = getLagosRecordingWindow();
    const { data, error } = await supabase.from("recordings").select("id, earnings, status, created_at, is_paid").eq("worker_id", wid);
    if (error) {
      console.error("Worker recordings loading error:", error.message);
      setAllocationLoading(false);
      return;
    }
    const recs: any[] = data || [];
    let allTimeEarnings = 0, campaignApproved = 0, campaignPending = 0, campaignRejected = 0, campaignToday = 0, todayAmount = 0, todayCount = 0, balanceAmount = 0, balanceCount = 0, availableAmount = 0, availableCount = 0;
    const byDay: Record<string, { count: number; amount: number }> = {};
    const allocatedIds = new Set<string>();
    let allocationFailed = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Login session unavailable.");
      const allocRes = await fetch("/api/worker/allocated-recordings", { method: "GET", headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const allocJson = await allocRes.json();
      if (!allocRes.ok) throw new Error(allocJson.error || "Allocation lookup failed.");
      if (!Array.isArray(allocJson.allocatedIds)) throw new Error("Invalid allocation response.");
      allocJson.allocatedIds.forEach((id: string) => allocatedIds.add(String(id)));
    } catch (e: any) {
      console.error("Allocation lookup failed:", e.message);
      allocationFailed = true;
    } finally {
      setAllocationLoading(false);
    }
    recs.forEach((r: any) => {
      const createdMs = r.created_at ? new Date(r.created_at).getTime() : 0;
      const isNewCampaign = createdMs >= CAMPAIGN_START_MS;
      const amount = Number(r.earnings) || 0;
      if (r.status === "approved") {
        allTimeEarnings += amount;
        const dayKey = getLagosDayKey(r.created_at);
        if (!byDay[dayKey]) byDay[dayKey] = { count: 0, amount: 0 };
        byDay[dayKey].count += 1;
        byDay[dayKey].amount += amount;
      }
      const isAllocated = allocatedIds.has(String(r.id));
      const isUnpaidApproved = isNewCampaign && r.status === "approved" && r.is_paid !== true && amount > 0;
      if (isUnpaidApproved) {
        balanceAmount += amount; balanceCount += 1;
        if (!allocationFailed && !isAllocated) { availableAmount += amount; availableCount += 1; }
      }
      if (isNewCampaign) {
        if (r.status === "approved") campaignApproved += 1;
        else if (r.status === "rejected") campaignRejected += 1;
        else campaignPending += 1;
        if (createdMs >= window.startMs && createdMs < window.nextResetMs) {
          campaignToday += 1;
          if (r.status === "approved") { todayAmount += amount; todayCount += 1; }
        }
      }
    });
    setEarnings({ approved: allTimeEarnings });
    setTaskProgress({ total: campaignApproved, today: campaignToday, approved: campaignApproved, pending: campaignPending, rejected: campaignRejected });
    setBalance({ amount: balanceAmount, count: balanceCount });
    setAvailableWithdrawal({ amount: availableAmount, count: availableCount });
    setTodayEarn({ amount: todayAmount, count: todayCount });
    const history = Object.keys(byDay).sort().reverse().map((date) => ({ date, count: byDay[date].count, amount: byDay[date].amount }));
    setDailyHistory(history);
    const { data: pays, error: paymentError } = await supabase.from("payment_history").select("*").eq("worker_id", wid).order("paid_at", { ascending: false }).limit(10);
    if (paymentError) console.error("Payment history error:", paymentError.message);
    else if (pays) setPaymentHistory(pays);
    const { data: withdrawals, error: withdrawalError } = await supabase.from("withdrawal_requests").select("id, amount, fee, net_amount, status, requested_at, processed_at, payment_reference").eq("worker_id", wid).order("requested_at", { ascending: false });
    if (withdrawalError) {
      console.error("Withdrawal history error:", withdrawalError.message);
    } else {
      const rows = withdrawals || [];
      setWithdrawalHistory(rows);
      const active = rows.find((item: any) => item.status === "pending" || item.status === "approved");
      setActiveWithdrawal(active || null);
    }
    await loadBankFromSupabase(wid);
  } catch (error: any) {
    console.error("Worker dashboard loading error:", error.message);
    setAllocationLoading(false);
  }
};

const handleRequestWithdrawal = async () => {
  if (allocationLoading) { setWithdrawalMessage("⏳ Still checking your balance. Please wait."); return; }
  if (availableWithdrawal.amount < 1000) { setWithdrawalMessage("Minimum withdrawal is ₦1,000."); return; }
  if (activeWithdrawal) { setWithdrawalMessage("You already have an active withdrawal request waiting for Chairman."); return; }
  const gross = availableWithdrawal.amount;
  const fee = Math.round(gross * 0.30);
  const net = gross - fee;
  if (!confirm(`Request ₦${gross.toLocaleString()}?\nFee (30%): ₦${fee.toLocaleString()}\nYou will receive: ₦${net.toLocaleString()}`)) return;
  setRequestingWithdrawal(true);
  setWithdrawalMessage("");
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Please log in again.");
    const response = await fetch("/api/worker/withdrawal-request", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok || result.success === false) throw new Error(result.error || "Withdrawal request failed.");
    setWithdrawalMessage(`✅ Request submitted! Your expected payout is ₦${Number(result.net_amount).toLocaleString()}. Waiting for Chairman's approval.`);
    await loadWorkerData(workerId);
  } catch (error: any) {
    setWithdrawalMessage(`❌ ${error.message}`);
  } finally {
    setRequestingWithdrawal(false);
  }
};

// ============================================================
// B/C/D - PUT ALL THIS INSIDE YOUR EXISTING return ( ... )
// ============================================================
return (
  <div>
    {/* ... KEEP YOUR EXISTING DASHBOARD TOP HERE ... */}
    {/* ... KEEP YOUR BANK DETAILS HERE ... */}

    {/* B. WITHDRAWAL CENTRE */}
    <div className="mt-4 rounded-2xl border border-green-800 bg-[#0a1f14] p-4">
      <h3 className="text-lg font-bold text-green-400">💳 WITHDRAWAL CENTRE</h3>
      <p className="text-xs text-gray-400">Chairman approves and pays manually • 48hrs processing after approval • No duplicate request</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-black/40 p-3"><p className="text-xs text-gray-400">💰 Total Unpaid Balance</p><p className="text-xl font-bold text-white">₦{balance.amount.toLocaleString()}</p><p className="text-[11px] text-gray-400">{balance.count} recordings</p></div>
        <div className="rounded-xl bg-black/40 p-3"><p className="text-xs text-gray-400">💵 Available to Withdraw</p><p className="text-xl font-bold text-green-400">₦{availableWithdrawal.amount.toLocaleString()}</p><p className="text-[11px] text-gray-400">{availableWithdrawal.count} recordings</p></div>
        <div className="rounded-xl bg-black/40 p-3"><p className="text-xs text-gray-400">📉 30% Service Fee</p><p className="text-lg font-bold text-red-400">- ₦{Math.round(availableWithdrawal.amount * 0.30).toLocaleString()}</p></div>
        <div className="rounded-xl bg-black/40 p-3"><p className="text-xs text-gray-400">✅ You Go Receive (70%)</p><p className="text-lg font-bold text-green-300">₦{Math.round(availableWithdrawal.amount * 0.70).toLocaleString()}</p></div>
      </div>
      {allocationLoading && <p className="mt-2 text-xs text-yellow-300">⏳ Checking balance...</p>}
      {withdrawalMessage && <p className="mt-2 text-sm">{withdrawalMessage}</p>}
      <button type="button" onClick={handleRequestWithdrawal} disabled={requestingWithdrawal || allocationLoading || availableWithdrawal.amount < 1000 || !!activeWithdrawal} className={`mt-3 w-full rounded-xl py-3 font-bold ${availableWithdrawal.amount >= 1000 && !activeWithdrawal ? "bg-green-500 text-black" : "bg-gray-700 text-gray-400"}`}>
        {requestingWithdrawal ? "Sending..." : activeWithdrawal ? "⏳ REQUEST ALREADY PENDING - WAIT CHAIRMAN" : availableWithdrawal.amount >= 1000 ? "🟢 REQUEST WITHDRAWAL" : `Need ₦1,000 to withdraw (You get ₦${Math.round(availableWithdrawal.amount * 0.70).toLocaleString()})`}
      </button>
      {activeWithdrawal && (
        <div className="mt-4 rounded-xl bg-yellow-900/30 p-3 text-sm">
          <p className="font-bold text-yellow-300">⏳ Pending Withdrawal Request</p>
          <p>₦{Number(activeWithdrawal.net_amount).toLocaleString()} • {String(activeWithdrawal.status).toUpperCase()} • {new Date(activeWithdrawal.requested_at).toLocaleDateString()}</p>
          <p className="text-xs text-gray-400">Gross ₦{Number(activeWithdrawal.amount).toLocaleString()} - Fee ₦{Number(activeWithdrawal.fee).toLocaleString()}</p>
          <p className="text-xs text-yellow-200">{activeWithdrawal.status === "pending" ? "Waiting Chairman approval" : "Approved — 48hrs processing"}</p>
        </div>
      )}
      {withdrawalHistory.length > 0 && (
        <div className="mt-4">
          <p className="font-bold text-gray-300">💳 Withdrawal History</p>
          {withdrawalHistory.map((r: any) => (
            <div key={r.id} className="mt-2 rounded-xl bg-black/30 p-3 text-sm">
              <p>₦{Number(r.net_amount).toLocaleString()} • {String(r.status).toUpperCase()} • {new Date(r.requested_at).toLocaleDateString()}</p>
              {r.payment_reference && <p className="text-xs text-gray-400">Ref: {r.payment_reference}</p>}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* C. EARNINGS BUTTON - Replace old ₦570 card */}
    <button type="button" onClick={() => setShowEarningsModal(true)} className="w-full rounded-2xl border border-yellow-700 bg-[#1a1400] p-4 text-left active:scale-[0.98]">
      <p className="text-xs text-gray-400">💰 APPROVED EARNINGS — ALL TIME</p>
      <p className="mt-1 text-lg font-bold text-yellow-300">👁️ VIEW MY EARNINGS →</p>
      <p className="text-[11px] text-gray-400">Tap to see your total approved earnings</p>
    </button>

    {/* ... KEEP YOUR OTHER SECTIONS HERE ... */}

    {/* D. MODAL - Near bottom, before last </div> */}
    {showEarningsModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowEarningsModal(false)}>
        <div className="w-full max-w-sm rounded-2xl bg-[#111] p-5 border border-yellow-700" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-yellow-300">💰 Approved Earnings</h3>
            <button type="button" onClick={() => setShowEarningsModal(false)} className="rounded-full bg-gray-700 px-3 py-1 text-sm">✕</button>
          </div>
          <p className="mt-4 text-center text-xs text-gray-400">ALL TIME APPROVED EARNINGS</p>
          <p className="text-center text-4xl font-bold text-white mt-1">₦{earnings.approved.toLocaleString()}</p>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between rounded-xl bg-black/40 p-3"><span className="text-gray-400">New Campaign Approved</span><span className="font-bold text-white">{taskProgress.approved} recordings</span></div>
            <div className="flex justify-between rounded-xl bg-black/40 p-3"><span className="text-gray-400">Total Unpaid Balance</span><span className="font-bold text-green-400">₦{balance.amount.toLocaleString()}</span></div>
            <div className="flex justify-between rounded-xl bg-black/40 p-3"><span className="text-gray-400">Available to Withdraw</span><span className="font-bold text-green-300">₦{availableWithdrawal.amount.toLocaleString()}</span></div>
          </div>
          <button type="button" onClick={() => setShowEarningsModal(false)} className="mt-5 w-full rounded-xl bg-yellow-500 py-3 font-bold text-black">Close</button>
        </div>
      </div>
    )}
  </div>
);