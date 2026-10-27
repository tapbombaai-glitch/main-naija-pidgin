"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";

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

function displayStatus(status?: string | null) {
  if (!status) return "Active";

  if (status.toLowerCase() === "suspended") {
    return "Suspended";
  }

  return status;
}

export default function ChairmanWorkersPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      const email = (session.user.email || "")
        .trim()
        .toLowerCase();

      if (email !== CHAIRMAN_EMAIL) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

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

      const workerList = ((data || []) as WorkerProfile[]).filter(
        (profile) =>
          profile.is_chairman !== true &&
          (profile.email || "").trim().toLowerCase() !==
            CHAIRMAN_EMAIL
      );

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
  }, [router]);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  async function changeWorkerStatus(
    worker: WorkerProfile,
    nextStatus: "active" | "suspended"
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      router.replace("/login");
      return;
    }

    const email = (session.user.email || "")
      .trim()
      .toLowerCase();

    if (email !== CHAIRMAN_EMAIL) {
      await supabase.auth.signOut();
      router.replace("/login");
      return;
    }

    if (worker.id === session.user.id) {
      setErrorMessage(
        "You cannot change your own account status from this page."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${
        nextStatus === "suspended" ? "suspend" : "reactivate"
      } ${worker.display_name || worker.email || "this worker"}?`
    );

    if (!confirmed) return;

    setUpdatingId(worker.id);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ status: nextStatus })
        .eq("id", worker.id)
        .select("id,status")
        .maybeSingle();

      if (error) {
        throw new Error(
          `Could not update the worker: ${error.message}`
        );
      }

      if (!data) {
        throw new Error(
          "The account was not updated. Check the database permissions."
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
        `${worker.display_name || worker.email || "Worker"} is now ${nextStatus}.`
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

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
        Checking Chairman access...
      </main>
    );
  }

  const normalizedSearch = search.trim().toLowerCase();

  const filteredWorkers = workers.filter((worker) =>
    [
      worker.display_name || "",
      worker.email || "",
      worker.id,
      worker.status || "",
    ].some((value) =>
      value.toLowerCase().includes(normalizedSearch)
    )
  );

  const suspendedCount = workers.filter(
    (worker) => worker.status?.toLowerCase() === "suspended"
  ).length;

  return (
    <main className="min-h-screen bg-gray-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-green-400">
              Main Naija Pidgin
            </p>

            <h1 className="mt-2 text-3xl font-bold text-yellow-400">
              Water Spine
            </h1>

            <p className="mt-2 text-gray-300">
              Worker Account Management
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="rounded-lg border border-gray-600 px-4 py-2"
            >
              Back to Dashboard
            </button>

            <button
              type="button"
              onClick={() => void loadWorkers()}
              disabled={loading}
              className="rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-800 bg-red-950 p-4 text-red-200"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-green-800 bg-green-950 p-4 text-green-200"
          >
            {successMessage}
          </div>
        )}

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-sm text-gray-400">Worker Accounts</p>
            <p className="mt-2 text-3xl font-bold text-yellow-400">
              {workers.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-sm text-gray-400">Suspended</p>
            <p className="mt-2 text-3xl font-bold text-red-400">
              {suspendedCount}
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-sm text-gray-400">Not Suspended</p>
            <p className="mt-2 text-3xl font-bold text-green-400">
              {workers.length - suspendedCount}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <label
            htmlFor="workerSearch"
            className="mb-2 block text-sm font-semibold"
          >
            Search worker accounts
          </label>

          <input
            id="workerSearch"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, ID or status..."
            className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3 text-white"
          />
        </section>

        <section className="mt-6 space-y-4">
          {filteredWorkers.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-gray-300">
              {loading
                ? "Loading worker accounts..."
                : "No worker accounts found."}
            </div>
          ) : (
            filteredWorkers.map((worker) => {
              const suspended =
                worker.status?.toLowerCase() === "suspended";

              return (
                <article
                  key={worker.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-bold">
                        {worker.display_name || "Unnamed Worker"}
                      </h2>

                      <p className="mt-1 break-words text-sm text-gray-300">
                        {worker.email || "Email unavailable"}
                      </p>

                      <p className="mt-1 break-all text-xs text-gray-500">
                        Worker ID: {worker.id}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        suspended
                          ? "bg-red-950 text-red-300"
                          : "bg-green-950 text-green-300"
                      }`}
                    >
                      {displayStatus(worker.status)}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-950 p-3">
                      <p className="text-xs text-gray-400">
                        Words Recorded
                      </p>
                      <p className="mt-1 text-xl font-bold">
                        {Number(worker.total_words || 0)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-950 p-3">
                      <p className="text-xs text-gray-400">
                        Recordings Count
                      </p>
                      <p className="mt-1 text-xl font-bold">
                        {Number(worker.recordings_count || 0)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void changeWorkerStatus(
                        worker,
                        suspended ? "active" : "suspended"
                      )
                    }
                    disabled={updatingId === worker.id}
                    className={`mt-5 rounded-lg px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
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
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}