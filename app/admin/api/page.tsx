"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

type ApiCustomer = {
  id: string;
  user_id: string | null;
  email: string | null;
  name: string | null;
  business_name: string | null;
  key_prefix: string | null;

  credits_remaining: number;
  credits_used: number;
  credits_total: number;

  free_requests_remaining: number;
  paid_requests_remaining: number;

  plan: string | null;
  tier: string | null;
  type: string | null;

  status: string | null;
  is_active: boolean;
  is_approved: boolean;
  is_free: boolean;
  has_claimed_free: boolean;

  amount_paid: number;
  paystack_ref: string | null;
  payment_ref: string | null;
  payment_status: string | null;

  created_at: string;
};

type Summary = {
  total_keys: number;
  active_keys: number;
  inactive_keys: number;
  free_customers: number;
  paid_customers: number;
  total_remaining_credits: number;
  total_used_credits: number;
};

export default function ApiManagementPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total_keys: 0,
    active_keys: 0,
    inactive_keys: 0,
    free_customers: 0,
    paid_customers: 0,
    total_remaining_credits: 0,
    total_used_credits: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadApiManagement(showRefresh = false) {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        window.location.href = "/admin/login";
        return;
      }

      const email =
        session.user.email?.trim().toLowerCase();

      if (email !== ADMIN_EMAIL.toLowerCase()) {
        await supabase.auth.signOut();
        window.location.href = "/admin/login";
        return;
      }

      const response = await fetch(
        "/api/admin/api",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "Could not load API Management."
        );
      }

      setCustomers(data.customers || []);

      setSummary(
        data.summary || {
          total_keys: 0,
          active_keys: 0,
          inactive_keys: 0,
          free_customers: 0,
          paid_customers: 0,
          total_remaining_credits: 0,
          total_used_credits: 0,
        }
      );
    } catch (err) {
      console.error(
        "API MANAGEMENT LOAD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not load API Management."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadApiManagement();
  }, []);

  function formatNumber(value: number) {
    return new Intl.NumberFormat("en-NG").format(
      value || 0
    );
  }

  function formatDate(value: string | null) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleDateString(
        "en-NG",
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "—";
    }
  }

  function customerName(
    customer: ApiCustomer
  ) {
    return (
      customer.business_name ||
      customer.name ||
      customer.email ||
      "API Customer"
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-green-400 text-sm">
            MAIN NAIJA PIDGIN
          </div>

          <h1 className="text-2xl font-bold mt-2">
            API Management
          </h1>

          <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-zinc-400">
              Loading API customers...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-5 pb-24">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-widest text-green-400">
              MAIN NAIJA PIDGIN
            </div>

            <h1 className="text-2xl font-black mt-1">
              API Management
            </h1>

            <p className="text-sm text-zinc-500 mt-1">
              Chairman control centre
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadApiManagement(true)
            }
            disabled={refreshing}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold hover:bg-zinc-800 disabled:opacity-50"
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* BACK */}
        <Link
          href="/admin"
          className="inline-block mt-5 text-sm text-green-400 hover:text-green-300"
        >
          ← Back to Chairman Dashboard
        </Link>

        {/* ERROR */}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-900 bg-red-950/40 p-4">
            <div className="font-semibold text-red-300">
              API Management Error
            </div>

            <p className="text-sm text-red-200 mt-1">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                loadApiManagement(true)
              }
              className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold"
            >
              Try Again
            </button>
          </div>
        )}

        {/* SUMMARY */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-xs text-zinc-500">
              TOTAL API KEYS
            </div>
            <div className="text-2xl font-black mt-2">
              {formatNumber(
                summary.total_keys
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-green-900/50 bg-green-950/20 p-4">
            <div className="text-xs text-green-500">
              ACTIVE KEYS
            </div>
            <div className="text-2xl font-black text-green-400 mt-2">
              {formatNumber(
                summary.active_keys
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-xs text-zinc-500">
              FREE CUSTOMERS
            </div>
            <div className="text-2xl font-black mt-2">
              {formatNumber(
                summary.free_customers
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-900/40 bg-yellow-950/20 p-4">
            <div className="text-xs text-yellow-500">
              PAID CUSTOMERS
            </div>
            <div className="text-2xl font-black text-yellow-400 mt-2">
              {formatNumber(
                summary.paid_customers
              )}
            </div>
          </div>

        </section>

        {/* CREDIT SUMMARY */}
        <section className="grid grid-cols-2 gap-3 mt-3">

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-xs text-zinc-500">
              CREDITS REMAINING
            </div>

            <div className="text-xl font-black text-green-400 mt-2">
              {formatNumber(
                summary.total_remaining_credits
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-xs text-zinc-500">
              CREDITS USED
            </div>

            <div className="text-xl font-black mt-2">
              {formatNumber(
                summary.total_used_credits
              )}
            </div>
          </div>

        </section>

        {/* CUSTOMER LIST */}
        <section className="mt-7">

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">
              API Customers
            </h2>

            <span className="text-xs text-zinc-500">
              {customers.length} customer
              {customers.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          {customers.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
              <div className="text-zinc-400">
                No API customers yet.
              </div>

              <div className="text-xs text-zinc-600 mt-2">
                Customer API keys will appear here
                automatically.
              </div>
            </div>
          ) : (
            <div className="space-y-4">

              {customers.map(
                (customer) => (
                  <article
                    key={customer.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-lg"
                  >

                    {/* CUSTOMER HEADER */}
                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">
                        <h3 className="font-bold text-base truncate">
                          {customerName(
                            customer
                          )}
                        </h3>

                        <p className="text-xs text-zinc-500 mt-1 break-all">
                          {customer.email ||
                            "No email"}
                        </p>
                      </div>

                      <div
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          customer.is_active &&
                          (!customer.status ||
                            customer.status ===
                              "active")
                            ? "bg-green-950 text-green-400 border border-green-900"
                            : "bg-red-950 text-red-400 border border-red-900"
                        }`}
                      >
                        {customer.is_active &&
                        (!customer.status ||
                          customer.status ===
                            "active")
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </div>

                    </div>

                    {/* KEY */}
                    <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-3">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                        API KEY
                      </div>

                      <div className="font-mono text-sm text-green-300 mt-1 break-all">
                        {customer.key_prefix ||
                          "Key prefix unavailable"}
                      </div>
                    </div>

                    {/* CREDIT CARDS */}
                    <div className="grid grid-cols-3 gap-2 mt-3">

                      <div className="rounded-xl bg-zinc-900 p-3">
                        <div className="text-[10px] text-zinc-500">
                          REMAINING
                        </div>

                        <div className="font-bold text-green-400 mt-1">
                          {formatNumber(
                            customer.credits_remaining
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-900 p-3">
                        <div className="text-[10px] text-zinc-500">
                          USED
                        </div>

                        <div className="font-bold mt-1">
                          {formatNumber(
                            customer.credits_used
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl bg-zinc-900 p-3">
                        <div className="text-[10px] text-zinc-500">
                          TOTAL
                        </div>

                        <div className="font-bold mt-1">
                          {formatNumber(
                            customer.credits_total
                          )}
                        </div>
                      </div>

                    </div>

                    {/* FREE / PAID */}
                    <div className="grid grid-cols-2 gap-2 mt-2">

                      <div className="rounded-xl border border-zinc-800 p-3">
                        <div className="text-[10px] text-zinc-500">
                          FREE LEFT
                        </div>

                        <div className="font-semibold text-sm mt-1">
                          {formatNumber(
                            customer.free_requests_remaining
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-800 p-3">
                        <div className="text-[10px] text-zinc-500">
                          PAID LEFT
                        </div>

                        <div className="font-semibold text-sm mt-1">
                          {formatNumber(
                            customer.paid_requests_remaining
                          )}
                        </div>
                      </div>

                    </div>

                    {/* DETAILS */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4 text-sm">

                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase">
                          Plan
                        </div>
                        <div className="text-zinc-300 mt-1">
                          {customer.plan ||
                            customer.tier ||
                            "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase">
                          Type
                        </div>
                        <div className="text-zinc-300 mt-1">
                          {customer.type ||
                            (customer.is_free
                              ? "Free"
                              : "Paid")}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase">
                          Payment
                        </div>
                        <div className="text-zinc-300 mt-1">
                          {customer.payment_status ||
                            "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase">
                          Amount Paid
                        </div>
                        <div className="text-zinc-300 mt-1">
                          ₦
                          {formatNumber(
                            customer.amount_paid
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase">
                          Approved
                        </div>
                        <div className="text-zinc-300 mt-1">
                          {customer.is_approved
                            ? "Yes"
                            : "No"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-zinc-600 uppercase">
                          Created
                        </div>
                        <div className="text-zinc-300 mt-1">
                          {formatDate(
                            customer.created_at
                          )}
                        </div>
                      </div>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

        {/* FUTURE CONTROLS NOTICE */}
        <div className="mt-8 rounded-2xl border border-green-900/40 bg-green-950/10 p-4">
          <div className="font-semibold text-green-400">
            Chairman Controls
          </div>

          <p className="text-xs text-zinc-500 mt-1">
            Credit adjustments and key
            activation controls will be added
            after we verify the existing billing
            functions. Your current Marketplace
            credit system remains untouched.
          </p>
        </div>

      </div>
    </main>
  );
}