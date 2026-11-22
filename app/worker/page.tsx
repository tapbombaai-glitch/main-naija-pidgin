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
    .select("id, earnings, status, created_at, is_paid")
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

  // Displayed unpaid balance includes allocated recordings.
  let balanceAmount = 0;
  let balanceCount = 0;

  // Available balance excludes recordings already in a withdrawal request.
  let availableAmount = 0;
  let availableCount = 0;

  const byDay: Record<string, { count: number; amount: number }> = {};

  // SECURE ALLOCATION LOOKUP
  const allocatedIds = new Set<string>();
  let allocationFailed = false;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Login session unavailable.");
    }

    const allocRes = await fetch("/api/worker/allocated-recordings", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      cache: "no-store",
    });

    const allocJson = await allocRes.json();

    if (!allocRes.ok) {
      throw new Error(allocJson.error || "Allocation lookup failed.");
    }

    if (!Array.isArray(allocJson.allocatedIds)) {
      throw new Error("Invalid allocation response.");
    }

    allocJson.allocatedIds.forEach((id: string) => {
      allocatedIds.add(String(id));
    });
  } catch (e: any) {
    console.error(
      "Allocation lookup failed - new withdrawal requests blocked:",
      e.message
    );
    allocationFailed = true;
  }

  recs.forEach((r: any) => {
    const createdMs = r.created_at
      ? new Date(r.created_at).getTime()
      : 0;

    const isNewCampaign = createdMs >= CAMPAIGN_START_MS;
    const amount = Number(r.earnings) || 0;

    if (r.status === "approved") {
      allTimeEarnings += amount;

      const dayKey = getLagosDayKey(r.created_at);

      if (!byDay[dayKey]) {
        byDay[dayKey] = { count: 0, amount: 0 };
      }

      byDay[dayKey].count += 1;
      byDay[dayKey].amount += amount;
    }

    const isAllocated = allocatedIds.has(String(r.id));

    const isUnpaidApproved =
      isNewCampaign &&
      r.status === "approved" &&
      r.is_paid !== true &&
      amount > 0;

    if (isUnpaidApproved) {
      // Keep displaying the unpaid balance until Chairman marks it paid.
      balanceAmount += amount;
      balanceCount += 1;

      // Only unallocated recordings can fund a new withdrawal request.
      if (!allocationFailed && !isAllocated) {
        availableAmount += amount;
        availableCount += 1;
      }
    }

    if (isNewCampaign) {
      if (r.status === "approved") {
        campaignApproved += 1;
      } else if (r.status === "rejected") {
        campaignRejected += 1;
      } else {
        campaignPending += 1;
      }

      if (
        createdMs >= window.startMs &&
        createdMs < window.nextResetMs
      ) {
        campaignToday += 1;

        if (r.status === "approved") {
          todayAmount += amount;
          todayCount += 1;
        }
      }
    }
  });

  setEarnings({ approved: allTimeEarnings });

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

  // This state must be declared near your other useState declarations:
  // const [availableWithdrawal, setAvailableWithdrawal] =
  //   useState({ amount: 0, count: 0 });

  setAvailableWithdrawal({
    amount: availableAmount,
    count: availableCount,
  });

  setTodayEarn({
    amount: todayAmount,
    count: todayCount,
  });

  const history = Object.keys(byDay)
    .sort()
    .reverse()
    .map((date) => ({
      date,
      count: byDay[date].count,
      amount: byDay[date].amount,
    }));

  setDailyHistory(history);

  const { data: pays } = await supabase
    .from("payment_history")
    .select("*")
    .eq("worker_id", wid)
    .order("paid_at", { ascending: false })
    .limit(10);

  if (pays) {
    setPaymentHistory(pays);
  }

  await loadBankFromSupabase(wid);
};