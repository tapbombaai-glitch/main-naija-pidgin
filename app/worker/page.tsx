const loadWorkerData = async (wid: string) => {
  setAllocationLoading(true);

  try {
    const { data: anns } = await supabase
      .from("announcements")
      .select("id, title, message, type, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(5);

    if (anns) setAnnouncements(anns);
    setAnnouncementLoading(false);

    const recordingWindow = getLagosRecordingWindow();

    let { data, error } = await supabase
      .from("recordings")
      .select("id, earnings, status, created_at, is_paid, language")
      .eq("worker_id", wid);

    if (error && String(error.message).includes("is_paid")) {
      const retry = await supabase
        .from("recordings")
        .select("id, earnings, status, created_at, language")
        .eq("worker_id", wid);

      data = retry.data as any;
      error = retry.error as any;
    }

    if (error) {
      console.error("Worker recordings loading error:", error.message);
      setAvailableWithdrawal({ amount: 0, count: 0 });
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
    let nvTodayCount = 0;

    const byDay: Record<string, { count: number; amount: number }> = {};

    // Check which recordings already belong to active withdrawal requests.
    const allocatedIds = new Set<string>();
    let allocationFailed = false;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Login session unavailable.");
      }

      const allocationResponse = await fetch(
        "/api/worker/allocated-recordings",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const allocationData = await allocationResponse.json();

      if (!allocationResponse.ok) {
        throw new Error(
          allocationData.error || "Allocation lookup failed."
        );
      }

      if (Array.isArray(allocationData.allocatedIds)) {
        allocationData.allocatedIds.forEach((id: string) => {
          allocatedIds.add(String(id));
        });
      }
    } catch (allocationError) {
      console.error("Withdrawal allocation lookup failed:", allocationError);
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

      // Total unpaid balance includes recordings allocated
      // to an active withdrawal request.
      if (
        isNewCampaign &&
        r.status === "approved" &&
        r.is_paid !== true &&
        amount > 0
      ) {
        balanceAmount += amount;
        balanceCount += 1;
      }

      // Available balance excludes recordings already allocated.
      if (
        isNewCampaign &&
        r.status === "approved" &&
        r.is_paid !== true &&
        amount > 0 &&
        !allocationFailed &&
        !allocatedIds.has(String(r.id))
      ) {
        // These values are calculated separately below.
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
          createdMs >= recordingWindow.startMs &&
          createdMs < recordingWindow.nextResetMs
        ) {
          campaignToday += 1;

          if (r.status === "approved") {
            todayAmount += amount;
            todayCount += 1;
          }

          // Nigerian English daily limit comes from database records.
          if (
            r.language === DATASET_NIGERIAN_ENGLISH ||
            r.language === "nigerian-voice"
          ) {
            nvTodayCount += 1;
          }
        }
      }
    });

    // Calculate available withdrawal separately.
    let availableAmount = 0;
    let availableCount = 0;

    if (!allocationFailed) {
      recs.forEach((r: any) => {
        const createdMs = r.created_at
          ? new Date(r.created_at).getTime()
          : 0;

        const amount = Number(r.earnings) || 0;

        if (
          createdMs >= CAMPAIGN_START_MS &&
          r.status === "approved" &&
          r.is_paid !== true &&
          amount > 0 &&
          !allocatedIds.has(String(r.id))
        ) {
          availableAmount += amount;
          availableCount += 1;
        }
      });
    }

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

    setAvailableWithdrawal({
      amount: availableAmount,
      count: availableCount,
    });

    setTodayEarn({
      amount: todayAmount,
      count: todayCount,
    });

    setNigerianVoiceToday(nvTodayCount);

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

    if (pays) setPaymentHistory(pays);

    // Load withdrawal request history and find any active request.
    const { data: withdrawals, error: withdrawalError } = await supabase
      .from("withdrawal_requests")
      .select(
        "id, amount, fee, net_amount, status, requested_at, processed_at, payment_reference"
      )
      .eq("worker_id", wid)
      .order("requested_at", { ascending: false });

    if (withdrawalError) {
      console.error(
        "Withdrawal history loading error:",
        withdrawalError.message
      );
    } else {
      const rows = withdrawals || [];

      setWithdrawalHistory(rows);

      setActiveWithdrawal(
        rows.find(
          (item: any) =>
            item.status === "pending" || item.status === "approved"
        ) || null
      );
    }

    await loadBankFromSupabase(wid);
  } catch (error) {
    console.error("Worker dashboard loading error:", error);
  } finally {
    setAllocationLoading(false);
  }
};