const handleRequestWithdrawal = async () => {  
  if (allocationLoading) {  
    setWithdrawalMessage("⏳ Still checking your balance. Please wait.");  
    return;  
  }  
  
  if (availableWithdrawal.amount < 1000) {  
    setWithdrawalMessage("Minimum withdrawal is ₦1,000.");  
    return;  
  }  
  
  if (activeWithdrawal) {  
    setWithdrawalMessage(  
      "You already have an active withdrawal request waiting for Chairman."  
    );  
    return;  
  }  
  
  if (!bankName || !accountNumber || !accountName) {  
    setWithdrawalMessage("Please save your bank details first.");  
    return;  
  }  
  
  const gross = availableWithdrawal.amount;  
  const fee = Math.round(gross * 0.30);  
  const net = gross - fee;  
  
  if (  
    !confirm(  
      `Request ₦${gross.toLocaleString()}?\n` +  
      `Fee (30%): ₦${fee.toLocaleString()}\n` +  
      `You will receive: ₦${net.toLocaleString()}`  
    )  
  ) {  
    return;  
  }  
  
  setRequestingWithdrawal(true);  
  setWithdrawalMessage("");  
  
  try {  
    const {  
      data: { session },  
    } = await supabase.auth.getSession();  
  
    if (!session?.access_token) {  
      throw new Error("Please log in again.");  
    }  
  
    const response = await fetch("/api/worker/withdrawal-request", {  
      method: "POST",  
      headers: {  
        "Content-Type": "application/json",  
        Authorization: `Bearer ${session.access_token}`,  
      },  
      cache: "no-store",  
    });  
  
    const result = await response.json();  
  
    if (!response.ok || result.success === false) {  
      throw new Error(result.error || "Withdrawal request failed.");  
    }  
  
    setWithdrawalMessage(  
      `✅ Request submitted! Your expected payout is ₦${Number(  
        result.net_amount  
      ).toLocaleString()}.`  
    );  
  
    await loadWorkerData(workerId);  
  } catch (error: any) {  
    setWithdrawalMessage(`❌ ${error.message}`);  
  } finally {  
    setRequestingWithdrawal(false);  
  }  
};