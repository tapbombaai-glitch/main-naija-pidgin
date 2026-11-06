"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const MINIMUM_PAYOUT = 5000;

type WorkerPayment = {
  worker_id: string;
  name: string;
  email?: string | null;
  state?: string | null;
  city?: string | null;
  account_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  approved_earnings: number;
  amount_paid: number;
  outstanding: number;
  eligible: boolean;
};

type PaymentRecord = {
  id: string;
  worker_id: string;
  amount: number;
  payment_reference: string | null;
  payment_method: string | null;
  status: string;
  paid_at: string | null;
};

type PaymentData = {
  workers: WorkerPayment[];
  payments: PaymentRecord[];
  overview: {
    total_earnings: number;
    total_paid: number;
    total_outstanding: number;
  };
};

const money = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function ChairmanPaymentsPage() {
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedWorker, setSelectedWorker] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () =>
      data?.workers.find(
        (worker) => worker.worker_id === selectedWorker
      ) || null,
    [data, selectedWorker]
  );

  async function getToken() {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session?.access_token) {
      throw new Error("Please log in to your Chairman account again.");
    }

    return sessionData.session.access_token;
  }

  async function loadPayments() {
    setLoading(true);
    setError("");

    try {
      const token = await getToken();

      const response = await fetch("/api/admin/payments", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load payments.");
      }

      setData(result);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  async function recordPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selected) {
      setError("Please select a worker.");
      return;
    }

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (selected.approved_earnings < MINIMUM_PAYOUT) {
      setError("This worker has not reached the ₦5,000 minimum.");
      return;
    }

    if (paymentAmount > selected.outstanding) {
      setError("Payment cannot exceed the outstanding balance.");
      return;
    }

    if (!reference.trim()) {
      setError("Enter the bank transfer reference.");
      return;
    }

    const confirmed = window.confirm(
      `Have you completed the bank transfer of ${money(
        paymentAmount
      )} to ${selected.name}? Only confirm if the transfer was successful.`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      const token = await getToken();

      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          worker_id: selected.worker_id,
          amount: paymentAmount,
          payment_reference: reference.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Payment could not be recorded.");
      }

      setSuccess("Payment recorded successfully.");
      setAmount("");
      setReference("");

      await loadPayments();
    } catch (err: any) {
      setError(err.message || "Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) {
    return (
      <main className="min-h-screen bg-black p-6 text-white">
        <p className="text-green-400">Loading Chairman Payments...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050807] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-green-500">
              MAIN NAIJA PIDGIN
            </p>
            <h1 className="mt-2 text-3xl font-black">
              Chairman Payments
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Review worker earnings and record manual bank transfers.
            </p>
          </div>

          <button
            onClick={loadPayments}
            className="rounded-xl border border-green-700 px-4 py-2 text-sm font-bold text-green-400 hover:bg-green-950"
          >
            Refresh
          </button>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-800 bg-green-950/40 p-4 text-sm text-green-300">
            {success}
          </div>
        )}

        {/* PAYMENT OVERVIEW */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-[#101714] p-5">
            <p className="text-sm text-gray-400">Approved Earnings</p>
            <p className="mt-3 text-2xl font-black text-white">
              {money(data?.overview.total_earnings || 0)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#101714] p-5">
            <p className="text-sm text-gray-400">Total Paid</p>
            <p className="mt-3 text-2xl font-black text-green-400">
              {money(data?.overview.total_paid || 0)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-[#101714] p-5">
            <p className="text-sm text-gray-400">Outstanding Balance</p>
            <p className="mt-3 text-2xl font-black text-yellow-400">
              {money(data?.overview.total_outstanding || 0)}
            </p>
          </div>
        </section>

        {/* WORKER BALANCES */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-bold">Worker Payment Accounts</h2>

          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#101714]">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="border-b border-gray-800 text-gray-400">
                <tr>
                  <th className="p-4">Worker</th>
                  <th className="p-4">Approved</th>
                  <th className="p-4">Paid</th>
                  <th className="p-4">Outstanding</th>
                  <th className="p-4">Eligibility</th>
                </tr>
              </thead>

              <tbody>
                {(data?.workers || []).map((worker) => (
                  <tr
                    key={worker.worker_id}
                    className="border-b border-gray-800 last:border-0"
                  >
                    <td className="p-4">
                      <p className="font-bold">{worker.name}</p>
                      <p className="text-xs text-gray-500">
                        {worker.worker_id}
                      </p>
                    </td>

                    <td className="p-4">
                      {money(worker.approved_earnings)}
                    </td>

                    <td className="p-4 text-green-400">
                      {money(worker.amount_paid)}
                    </td>

                    <td className="p-4 font-bold text-yellow-400">
                      {money(worker.outstanding)}
                    </td>

                    <td className="p-4">
                      {worker.eligible ? (
                        <span className="rounded-full bg-green-950 px-3 py-1 text-xs text-green-400">
                          Eligible
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">
                          Not eligible
                        </span>
                      )}
                    </td>
                  </tr>
                ))}

                {!data?.workers.length && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      No worker payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RECORD PAYMENT */}
        <section className="mb-8 rounded-2xl border border-green-900 bg-[#101714] p-5 sm:p-6">
          <h2 className="text-xl font-bold">Record Worker Payment</h2>

          <p className="mt-2 text-sm text-gray-400">
            Make the bank transfer outside the platform first. Then record
            the amount actually transferred here.
          </p>

          <div className="mt-4 rounded-xl border border-yellow-900 bg-yellow-950/30 p-3 text-sm text-yellow-300">
            Minimum eligibility: ₦5,000 in approved earnings. Partial
            payments are allowed.
          </div>

          <form onSubmit={recordPayment} className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Select Worker
              </label>

              <select
                value={selectedWorker}
                onChange={(event) => setSelectedWorker(event.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-black p-3 text-white"
                required
              >
                <option value="">Choose a worker</option>

                {(data?.workers || [])
                  .filter(
                    (worker) =>
                      worker.approved_earnings >= MINIMUM_PAYOUT &&
                      worker.outstanding > 0
                  )
                  .map((worker) => (
                    <option key={worker.worker_id} value={worker.worker_id}>
                      {worker.name} — {worker.worker_id}
                    </option>
                  ))}
              </select>
            </div>

            {selected && (
              <div className="rounded-xl border border-gray-800 bg-black p-4">
                <p className="font-bold">{selected.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {selected.worker_id}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">Bank</p>
                    <p className="mt-1">
                      {selected.bank_name || "Bank details not added"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Account Number</p>
                    <p className="mt-1">
                      {selected.account_number || "Not provided"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Approved Earnings</p>
                    <p className="mt-1 text-green-400">
                      {money(selected.approved_earnings)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className="mt-1 font-bold text-yellow-400">
                      {money(selected.outstanding)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Amount Transferred (₦)
              </label>

              <input
                type="number"
                min="0.01"
                max={selected?.outstanding || undefined}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter amount paid"
                className="w-full rounded-xl border border-gray-700 bg-black p-3 text-white"
                required
              />

              {selected && (
                <button
                  type="button"
                  onClick={() => setAmount(String(selected.outstanding))}
                  className="mt-2 text-xs font-bold text-green-400"
                >
                  Pay full outstanding balance
                </button>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Bank Transfer Reference
              </label>

              <input
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Enter transfer reference"
                className="w-full rounded-xl border border-gray-700 bg-black p-3 text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving || !selected}
              className="w-full rounded-xl bg-green-600 px-5 py-3 font-black text-black hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Recording Payment..." : "Confirm & Record Payment"}
            </button>
          </form>
        </section>

        {/* PAYMENT HISTORY */}
        <section>
          <h2 className="mb-4 text-xl font-bold">Payment History</h2>

          <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-[#101714]">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="border-b border-gray-800 text-gray-400">
                <tr>
                  <th className="p-4">Worker ID</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Reference</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>

              <tbody>
                {(data?.payments || []).map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-800">
                    <td className="p-4">{payment.worker_id}</td>
                    <td className="p-4 font-bold text-green-400">
                      {money(Number(payment.amount))}
                    </td>
                    <td className="p-4">
                      {payment.payment_reference || "—"}
                    </td>
                    <td className="p-4">
                      {payment.paid_at
                        ? new Date(payment.paid_at).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-green-950 px-3 py-1 text-xs text-green-400">
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {!data?.payments.length && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      No payments have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-gray-600">
          MAIN NAIJA PIDGIN • CHAIRMAN PAYMENT CONTROL
        </p>
      </div>
    </main>
  );
}