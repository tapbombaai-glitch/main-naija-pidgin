"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Worker = {
  user_id: string;
  worker_id: string | null;
  full_name: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  accent: string | null;
  status: string | null;
  created_at: string | null;
  recordings_count: number;
};

export default function ChairmanWorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  async function loadWorkers(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Your login session has expired. Please log in again.");
      }

      const response = await fetch("/api/chairman/workers", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load workers.");
      }

      setWorkers(Array.isArray(data.workers) ? data.workers : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading workers."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadWorkers();
  }, []);

  const filteredWorkers = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return workers;

    return workers.filter((worker) =>
      [
        worker.worker_id,
        worker.full_name,
        worker.email,
        worker.city,
        worker.state,
        worker.accent,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [workers, search]);

  const activeWorkers = workers.filter(
    (worker) => worker.status?.toLowerCase() === "active"
  ).length;

  return (
    <main className="min-h-screen bg-[#080d0a] text-white px-4 py-6">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-green-400">
              MAIN NAIJA PIDGIN
            </p>

            <h1 className="mt-2 text-2xl font-black">
              Workers Management
            </h1>

            <p className="mt-1 text-sm text-gray-400">
              Chairman Control Centre
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-green-800 px-4 py-2 text-sm text-green-300"
          >
            ← Back
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-green-900 bg-[#101a13] p-4">
            <p className="text-xs text-gray-400">TOTAL WORKERS</p>
            <p className="mt-2 text-3xl font-black text-green-400">
              {workers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-green-900 bg-[#101a13] p-4">
            <p className="text-xs text-gray-400">ACTIVE WORKERS</p>
            <p className="mt-2 text-3xl font-black text-green-400">
              {activeWorkers}
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search worker name, ID, email or location..."
            className="w-full rounded-xl border border-gray-700 bg-[#111915] px-4 py-3 text-sm text-white outline-none focus:border-green-500"
          />

          <button
            onClick={() => loadWorkers(true)}
            disabled={refreshing}
            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {loading && (
          <div className="rounded-2xl border border-gray-800 bg-[#101713] p-8 text-center text-gray-400">
            Loading workers from Supabase...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-900 bg-red-950/40 p-5">
            <p className="font-bold text-red-400">Could not load workers</p>
            <p className="mt-2 text-sm text-gray-300">{error}</p>

            <button
              onClick={() => loadWorkers()}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && workers.length === 0 && (
          <div className="rounded-2xl border border-gray-800 bg-[#101713] p-8 text-center">
            <p className="text-lg font-bold">No worker profiles found</p>
            <p className="mt-2 text-sm text-gray-400">
              The Workers page is open, but Supabase returned no worker profiles.
            </p>
          </div>
        )}

        {!loading && !error && filteredWorkers.length === 0 && workers.length > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-[#101713] p-6 text-center text-gray-400">
            No workers match your search.
          </div>
        )}

        <div className="space-y-4">
          {!loading &&
            !error &&
            filteredWorkers.map((worker) => (
              <section
                key={worker.user_id}
                className="rounded-2xl border border-gray-800 bg-[#101713] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">
                      {worker.full_name || "Unnamed Worker"}
                    </h2>

                    <p className="mt-1 text-sm text-green-400">
                      {worker.worker_id || "No worker ID"}
                    </p>
                  </div>

                  <span className="rounded-full border border-green-800 bg-green-950 px-3 py-1 text-xs font-bold text-green-300">
                    {worker.status || "Status unknown"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">EMAIL</p>
                    <p className="mt-1 break-all">
                      {worker.email || "Not provided"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">LOCATION</p>
                    <p className="mt-1">
                      {[worker.city, worker.state]
                        .filter(Boolean)
                        .join(", ") || "Not provided"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">ACCENT</p>
                    <p className="mt-1">{worker.accent || "Not provided"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">RECORDINGS</p>
                    <p className="mt-1 font-bold text-green-400">
                      {worker.recordings_count}
                    </p>
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-800 pt-3 text-xs text-gray-500">
                  Joined:{" "}
                  {worker.created_at
                    ? new Date(worker.created_at).toLocaleDateString()
                    : "Date unavailable"}
                </div>
              </section>
            ))}
        </div>

        <p className="mt-8 text-center text-xs text-gray-600">
          MAIN NAIJA PIDGIN • CHAIRMAN ACCESS
        </p>
      </div>
    </main>
  );
}