const loadWorkerData = async (wid: string) => {
  // LOAD ANNOUNCEMENTS
  const { data: anns } = await supabase
    .from("announcements")
    .select("id, title, message, type, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(5);

  if (anns) setAnnouncements(anns);
  setAnnouncementLoading(false);

  const window = getLagosRecordingWindow();

  // LOAD WORKER RECORDINGS
  const { data, error } = await supabase
    .from("recordings")
    .select("id, earnings, status, created_at, is_paid, earnings_paid")
    .eq("worker_id", wid);

  if (error) {
    console.error("Worker recordings loading error:", error.message);
    return;
  }

  const recs: any[] = data || [];

  let allTimeEarnings = 0;
  let campaignApproved = 0;
  let campaignPending = 0;
  let campaignRejected = 0;
  let campaignToday = 0;
  let todayAmount = 0;
  let todayCount = 0;
  let balanceAmount = 0;
  let balanceCount = 0;

  const byDay: Record<string, { count: number; amount: number }> = {};

  // SECURE ALLOCATION LOOKUP
  // Pending and approved withdrawals remain allocated until paid.
  // If verification fails, available balance remains zero.

  const allocatedIds = new Set<string>();
  let allocationFailed = false;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Login session unavailable.");
    }

    const allocRes = await fetch(
      "/api/worker/allocated-recordings",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      }
    );

    const allocJson = await allocRes.json();

    if (!allocRes.ok) {
      throw new Error(
        allocJson.error || "Allocation lookup failed."
      );
    }

    if (!Array.isArray(allocJson.allocatedIds)) {
      throw new Error("Invalid allocation response.");
    }

    allocJson.allocatedIds.forEach((id: string) => {
      allocatedIds.add(String(id));
    });

  } catch (e: any) {
    console.error(
      "Allocation lookup failed - balance blocked for safety:",
      e.message
    );

    allocationFailed = true;
  }

  // CALCULATE EARNINGS AND CAMPAIGN PROGRESS
  recs.forEach((r: any) => {
    const createdMs = r.created_at
      ? new Date(r.created_at).getTime()
      : 0;

    const isNewCampaign = createdMs >= CAMPAIGN_START_MS;
    const amt = Number(r.earnings) || 0;

    // ALL-TIME APPROVED EARNINGS
    if (r.status === "approved") {
      allTimeEarnings += amt;

      const dayKey = getLagosDayKey(r.created_at);

      if (!byDay[dayKey]) {
        byDay[dayKey] = {
          count: 0,
          amount: 0,
        };
      }

      byDay[dayKey].count += 1;
      byDay[dayKey].amount += amt;
    }

    // NEW CAMPAIGN BALANCE
    // Exclude paid recordings and recordings already allocated
    // to pending or approved withdrawals.

    const isAllocated = allocatedIds.has(String(r.id));

    if (
      !allocationFailed &&
      isNewCampaign &&
      r.status === "approved" &&
      r.is_paid !== true &&
      r.earnings_paid !== true &&
      !isAllocated
    ) {
      balanceAmount += amt;
      balanceCount += 1;
    }

    // CAMPAIGN PROGRESS
    if (isNewCampaign) {
      if (r.status === "approved") {
        campaignApproved += 1;
      } else if (r.status === "rejected") {
        campaignRejected += 1;
      } else {
        campaignPending += 1;
      }

      // TODAY'S RECORDINGS
      if (
        createdMs >= window.startMs &&
        createdMs < window.nextResetMs
      ) {
        campaignToday += 1;

        if (r.status === "approved") {
          todayAmount += amt;
          todayCount += 1;
        }
      }
    }
  });

  // UPDATE DASHBOARD
  setEarnings({
    approved: allTimeEarnings,
  });

  setTaskProgress({
    total: campaignApproved,
    today: campaignToday,
    approved: campaignApproved,
    pending: campaignPending,
    rejected: campaignRejected,
  });

  setBalance({
    amount: balanceAmount,
    count: balanceCount,
  });

  setTodayEarn({
    amount: todayAmount,
    count: todayCount,
  });

  // DAILY HISTORY
  const history = Object.keys(byDay)
    .sort()
    .reverse()
    .map((d) => ({
      date: d,
      count: byDay[d].count,
      amount: byDay[d].amount,
    }));

  setDailyHistory(history);

  // PAYMENT HISTORY
  const { data: pays } = await supabase
    .from("payment_history")
    .select("*")
    .eq("worker_id", wid)
    .order("paid_at", { ascending: false })
    .limit(10);

  if (pays) setPaymentHistory(pays);

  // LOAD BANK DETAILS
  await loadBankFromSupabase(wid);
};