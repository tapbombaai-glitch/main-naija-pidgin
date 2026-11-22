{showEarningsModal && (
  <div
    className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4"
    onClick={() => setShowEarningsModal(false)}
  >
    <div
      className="w-full max-w-md rounded-2xl bg-[#111] p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">📊 Earnings Details</h3>
        <button
          onClick={() => setShowEarningsModal(false)}
          className="rounded-full bg-white/10 px-3 py-1"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <p>
          💰 All-Time Approved:{" "}
          <b>₦{earnings.approved.toLocaleString()}</b>
        </p>
        <p>
          💵 Unpaid Balance:{" "}
          <b>₦{balance.amount.toLocaleString()}</b> ({balance.count}{" "}
          recordings)
        </p>
        <p>
          ✅ Available to Withdraw:{" "}
          <b className="text-green-400">
            ₦{availableWithdrawal.amount.toLocaleString()}
          </b>
        </p>
        <p>
          📅 Today: <b>₦{todayEarn.amount.toLocaleString()}</b> (
          {todayEarn.count} approved)
        </p>
      </div>

      <p className="mt-4 font-bold">Daily History</p>
      {dailyHistory.length === 0 && (
        <p className="mt-2 text-sm text-gray-400">No approved earnings yet.</p>
      )}
      {dailyHistory.map((d: any) => (
        <div
          key={d.date}
          className="mt-2 flex justify-between rounded-xl bg-black/30 p-3 text-sm"
        >
          <span>
            {d.date} • {d.count} tasks
          </span>
          <b>₦{Number(d.amount).toLocaleString()}</b>
        </div>
      ))}

      <p className="mt-4 font-bold">Payment History</p>
      {paymentHistory.length === 0 && (
        <p className="mt-2 text-sm text-gray-400">No payments yet.</p>
      )}
      {paymentHistory.map((p: any) => (
        <div key={p.id} className="mt-2 rounded-xl bg-black/30 p-3 text-sm">
          <p>
            ₦{Number(p.amount).toLocaleString()} •{" "}
            {String(p.status || "paid").toUpperCase()}
          </p>
          <p className="text-xs text-gray-400">
            {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : ""}{" "}
            {p.payment_reference ? `• Ref: ${p.payment_reference}` : ""}
          </p>
        </div>
      ))}
    </div>
  </div>
)}