"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

type WorkerProfile = {
  id: string;
  email?: string | null;
  display_name?: string | null;
  status?: string | null;
  total_words?: number | null;
  recordings_count?: number | null;
  is_chairman?: boolean | null;
};

type FilterType = "all" | "active" | "suspended";

function normalizeStatus(
  status?: string | null
): "active" | "suspended" {
  return status?.trim().toLowerCase() === "suspended"
    ? "suspended"
    : "active";
}

function displayStatus(status?: string | null) {
  return normalizeStatus(status) === "suspended"
    ? "Suspended"
    : "Active";
}

function statusClasses(status: string) {
  return status === "suspended"
    ? "border-red-800 bg-red-950 text-red-300"
    : "border-green-800 bg-green-950 text-green-300";
}

export default function ChairmanWorkersPage() {
  const router = useRouter();

  // Reuse one browser client for this mounted page.
  const supabase = useMemo(() => createClient(), []);

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [refreshNumber, setRefreshNumber] = useState(0);

  const verifyChairman = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      router.replace("/login");
      return false;
    }

    const email = (session.user.email || "")
      .trim()
      .toLowerCase();

    if (email !== CHAIRMAN_EMAIL) {
      await supabase.auth.signOut();
      router.replace("/login");
      return false;
    }

    return true;
  }, [router, supabase]);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const authorized = await verifyChairman();

      if (!authorized) return;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,email,display_name,status,total_words,recordings_count,is_chairman"
        )
        .order("display_name", { ascending: true });

      if (error) {
        throw new Error(
          `Could not load worker accounts: ${error.message}`
        );
      }

      const workerList = (
        (data || []) as WorkerProfile[]
      ).filter((profile) => {
        const profileEmail = (profile.email || "")
          .trim()
          .toLowerCase();

        return (
          profile.is_chairman !== true &&
          profileEmail !== CHAIRMAN_EMAIL
        );
      });

      setWorkers(workerList);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load worker accounts."
      );
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, [supabase, verifyChairman]);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers, refreshNumber]);

  async function changeWorkerStatus(
    worker: WorkerProfile,
    nextStatus: "active" | "suspended"
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    if (updatingId !== null) return;

    const authorized = await verifyChairman();

    if (!authorized) return;

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      router.replace("/login");
      return;
    }

    if (worker.id === session.user.id) {
      setErrorMessage(
        "You cannot change your own account status from this page."
      );
      return;
    }

    const workerName =
      worker.display_name || worker.email || "this worker";

    const action =
      nextStatus === "suspended"
        ? "suspend"
        : "reactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${workerName}?`
    );

    if (!confirmed) return;

    setUpdatingId(worker.id);

    try {
      /*
       * IMPORTANT:
       * Supabase RLS must independently authorize this update.
       * A browser-side email check is not sufficient security.
       */
      const { data, error } = await supabase
        .from("profiles")
        .update({ status: nextStatus })
        .eq("id", worker.id)
        .select("id,status")
        .maybeSingle();

      if (error) {
        throw new Error(
          `Could not update worker account: ${error.message}`
        );
      }

      if (!data) {
        throw new Error(
          "The account was not updated. Check Supabase RLS policies and database permissions."
        );
      }

      setWorkers((previous) =>
        previous.map((item) =>
          item.id === worker.id
            ? { ...item, status: nextStatus }
            : item
        )
      );

      setSuccessMessage(
        `${workerName} is now ${nextStatus}.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update the worker account."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const statistics = useMemo(() => {
    const suspended = workers.filter(
      (worker) =>
        normalizeStatus(worker.status) === "suspended"
    ).length;

    const totalWords = workers.reduce(
      (total, worker) =>
        total + Math.max(0, Number(worker.total_words) || 0),
      0
    );

    const totalRecordings = workers.reduce(
      (total, worker) =>
        total +
        Math.max(0, Number(worker.recordings_count) || 0),
      0
    );

    return {
      total: workers.length,
      suspended,
      active: workers.length - suspended,
      totalWords,
      totalRecordings,
    };
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return workers.filter((worker) => {
      const status = normalizeStatus(worker.status);

      if (filter !== "all" && status !== filter) {
        return false;
      }

      if (!query) return true;

      return [
        worker.display_name || "",
        worker.email || "",
        worker.id,
        worker.status || "",
      ].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [workers, search, filter]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
        <div
          role="status"
          className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center"
        >
          <p className="font-bold text-yellow-400">
            Main Naija Pidgin
          </p>

          <p className="mt-3 text-gray-300">
            Checking Chairman access...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-green-400">
              Main Naija Pidgin
            </p>

            <h1 className="mt-2 text-3xl font-bold text-yellow-400 md:text-4xl">
              Chairman Workers
            </h1>

            <p className="mt-2 text-gray-400">
              Manage worker accounts and recording activity.
            </p>

            <p className="mt-2 break-all text-xs text-gray-500">
              Authorized account: {CHAIRMAN_EMAIL}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="rounded-lg border border-gray-700 px-4 py-3 transition hover:bg-gray-800"
            >
              Back to Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                setRefreshNumber((number) => number + 1)
              }
              disabled={loading}
              className="rounded-lg bg-yellow-400 px-5 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-800 bg-red-950 p-4 text-red-200"
          >
            <p className="font-bold">Action failed</p>
            <p className="mt-1 break-words">{errorMessage}</p>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-green-800 bg-green-950 p-4 text-green-200"
          >
            {successMessage}
          </div>
        )}

        <section
          aria-label="Worker statistics"
          className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5"
        >
          {[
            {
              label: "Worker Accounts",
              value: statistics.total,
            },
            {
              label: "Active",
              value: statistics.active,
            },
            {
              label: "Suspended",
              value: statistics.suspended,
            },
            {
              label: "Total Words",
              value: statistics.totalWords.toLocaleString(),
            },
            {
              label: "Total Recordings",
              value: statistics.totalRecordings.toLocaleString(),
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5"
            >
              <p className="text-sm text-gray-400">
                {item.label}
              </p>

              <p className="mt-3 text-2xl font-bold text-yellow-400 md:text-3xl">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label
              htmlFor="workerSearch"
              className="mb-2 block text-sm font-semibold text-gray-300"
            >
              Search worker accounts
            </label>

            <input
              id="workerSearch"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, ID or status..."
              className="w-full rounded-xl border border-gray-700 bg-gray-900 p-3 outline-none placeholder:text-gray-600 focus:border-yellow-400"
            />
          </div>

          <div>
            <label
              htmlFor="workerFilter"
              className="mb-2 block text-sm font-semibold text-gray-300"
            >
              Account status
            </label>

            <select
              id="workerFilter"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as FilterType)
              }
              className="w-full rounded-xl border border-gray-700 bg-gray-900 p-3 outline-none focus:border-yellow-400"
            >
              <option value="all">All workers</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
          <p>
            Showing {filteredWorkers.length} of {workers.length} workers
          </p>

          {loading && (
            <p role="status" className="text-yellow-400">
              Loading worker accounts...
            </p>
          )}
        </div>

        <section className="mt-4 space-y-5">
          {!loading && filteredWorkers.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
              <p className="text-lg font-bold">
                No worker accounts found
              </p>

              <p className="mt-2 text-gray-400">
                Try another search or account-status filter.
              </p>

              {(search || filter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            filteredWorkers.map((worker) => {
              const suspended =
                normalizeStatus(worker.status) === "suspended";

              return (
                <article
                  key={worker.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-lg md:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-bold md:text-xl">
                        {worker.display_name || "Unnamed Worker"}
                      </h2>

                      <p className="mt-2 break-words text-sm text-gray-300">
                        {worker.email || "Email unavailable"}
                      </p>

                      <p className="mt-2 break-all text-xs text-gray-500">
                        Worker ID: {worker.id}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full border px-3 py-1.5 text-sm font-semibold ${statusClasses(
                        suspended ? "suspended" : "active"
                      )}`}
                    >
                      {displayStatus(worker.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                      <p className="text-sm text-gray-400">
                        Words Recorded
                      </p>

                      <p className="mt-2 text-2xl font-bold text-yellow-400">
                        {Math.max(
                          0,
                          Number(worker.total_words) || 0
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
                      <p className="text-sm text-gray-400">
                        Recordings Count
                      </p>

                      <p className="mt-2 text-2xl font-bold text-yellow-400">
                        {Math.max(
                          0,
                          Number(worker.recordings_count) || 0
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-800 pt-5">
                    <button
                      type="button"
                      onClick={() =>
                        void changeWorkerStatus(
                          worker,
                          suspended ? "active" : "suspended"
                        )
                      }
                      disabled={updatingId !== null}
                      className={`rounded-lg px-5 py-3 font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        suspended
                          ? "bg-green-500 text-black hover:bg-green-400"
                          : "bg-red-600 text-white hover:bg-red-500"
                      }`}
                    >
                      {updatingId === worker.id
                        ? "Updating..."
                        : suspended
                          ? "Reactivate Worker"
                          : "Suspend Worker"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <footer className="mt-10 border-t border-gray-800 py-6 text-center text-xs text-gray-500">
          Main Naija Pidgin · Chairman Worker Management
        </footer>
      </div>
    </main>
  );
}