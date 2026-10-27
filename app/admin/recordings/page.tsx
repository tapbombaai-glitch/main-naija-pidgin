"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

type Recording = {
  id: string;
  user_id?: string | null;
  file_name?: string | null;
  audio_path?: string | null;
  pidgin_text?: string | null;
  transcription?: string | null;
  language?: string | null;
  word_count?: number | null;
  recording_number?: string | null;
  is_free_talk?: boolean | null;
  is_whatsapp_group?: boolean | null;
  admin_status?: string | null;
  created_at?: string | null;
  duration_seconds?: number | null;
};

type Worker = {
  id: string;
  display_name?: string | null;
  email?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

function statusLabel(value?: string | null) {
  const status = (value || "pending").toLowerCase();

  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";

  return "Pending review";
}

export default function ChairmanRecordingsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<Recording[]>([]);
  const [workers, setWorkers] = useState<Record<string, Worker>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.replace("/login");
        return;
      }

      const email = (sessionData.session.user.email || "")
        .trim()
        .toLowerCase();

      if (email !== CHAIRMAN_EMAIL) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("recordings")
        .select(
          "id,user_id,file_name,audio_path,pidgin_text,transcription,language,word_count,recording_number,is_free_talk,is_whatsapp_group,admin_status,created_at,duration_seconds"
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(
          `Could not load recordings: ${error.message}`
        );
      }

      const recordingList = (data || []) as Recording[];
      setRecords(recordingList);

      const workerIds = [
        ...new Set(
          recordingList
            .map((record) => record.user_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      if (workerIds.length > 0) {
        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .select("id,display_name,email")
            .in("id", workerIds);

        if (profileError) {
          console.warn(
            "Worker names could not be loaded:",
            profileError.message
          );
        }

        const workerMap: Record<string, Worker> = {};

        for (const worker of (profileData || []) as Worker[]) {
          workerMap[worker.id] = worker;
        }

        setWorkers(workerMap);
      } else {
        setWorkers({});
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading recordings."
      );
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    void loadRecordings();
  }, [loadRecordings]);

  async function changeStatus(
    recording: Recording,
    newStatus: "approved" | "rejected"
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      router.replace("/login");
      return;
    }

    const email = (sessionData.session.user.email || "")
      .trim()
      .toLowerCase();

    if (email !== CHAIRMAN_EMAIL) {
      await supabase.auth.signOut();
      router.replace("/login");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${newStatus} this recording?`
    );

    if (!confirmed) return;

    setUpdatingId(recording.id);

    try {
      // The database must independently enforce Chairman permissions.
      const { data, error } = await supabase
        .from("recordings")
        .update({ admin_status: newStatus })
        .eq("id", recording.id)
        .select("id,admin_status")
        .maybeSingle();

      if (error) {
        throw new Error(
          `Could not update recording: ${error.message}`
        );
      }

      if (!data) {
        throw new Error(
          "The recording was not updated. Check the database permissions."
        );
      }

      setRecords((previous) =>
        previous.map((item) =>
          item.id === recording.id
            ? { ...item, admin_status: newStatus }
            : item
        )
      );

      setSuccessMessage(
        `Recording ${recording.recording_number || recording.id} marked ${newStatus}.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update the recording."
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

  const filteredRecords = records.filter((record) => {
    if (filter === "all") return true;

    return (
      (record.admin_status || "pending").toLowerCase() === filter
    );
  });

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
              Recording Management
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="rounded-lg border border-gray-600 px-4 py-2"
            >
              Back to Dashboard
            </button>

            <button
              onClick={() => void loadRecordings()}
              disabled={loading}
              className="rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="mt-6 rounded-lg border border-red-800 bg-red-950 p-4 text-red-200">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-6 rounded-lg border border-green-800 bg-green-950 p-4 text-green-200">
            {successMessage}
          </div>
        )}

        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Total", records.length],
            [
              "Pending",
              records.filter(
                (record) =>
                  !record.admin_status ||
                  record.admin_status.toLowerCase() === "pending"
              ).length,
            ],
            [
              "Approved",
              records.filter(
                (record) =>
                  record.admin_status?.toLowerCase() === "approved"
              ).length,
            ],
            [
              "Rejected",
              records.filter(
                (record) =>
                  record.admin_status?.toLowerCase() === "rejected"
              ).length,
            ],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5"
            >
              <p className="text-sm text-gray-400">{label}</p>
              <p className="mt-2 text-3xl font-bold text-yellow-400">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <label
            htmlFor="recordingFilter"
            className="mb-2 block text-sm font-semibold"
          >
            Filter recordings
          </label>

          <select
            id="recordingFilter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-full max-w-xs rounded-lg border border-gray-700 bg-gray-900 p-3"
          >
            <option value="all">All recordings</option>
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </section>

        <section className="mt-6 space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-gray-300">
              {loading
                ? "Loading recordings..."
                : "No recordings found for this filter."}
            </div>
          ) : (
            filteredRecords.map((record) => {
              const status = (
                record.admin_status || "pending"
              ).toLowerCase();

              const worker = record.user_id
                ? workers[record.user_id]
                : undefined;

              return (
                <article
                  key={record.id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">
                        {record.recording_number ||
                          record.file_name ||
                          "Voice Recording"}
                      </h2>

                      <p className="mt-1 text-sm text-gray-400">
                        Worker:{" "}
                        {worker?.display_name ||
                          worker?.email ||
                          record.user_id ||
                          "Unknown"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(record.created_at)}
                      </p>
                    </div>

                    <span className="rounded-full bg-gray-800 px-3 py-1 text-sm">
                      {statusLabel(record.admin_status)}
                    </span>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap leading-7 text-gray-200">
                    {record.pidgin_text ||
                      record.transcription ||
                      "No text saved for this recording."}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-300">
                    <span className="rounded bg-gray-800 px-3 py-2">
                      {record.language || "Unknown language"}
                    </span>

                    <span className="rounded bg-gray-800 px-3 py-2">
                      {record.is_free_talk ? "Free Talk" : "Read Text"}
                    </span>

                    <span className="rounded bg-gray-800 px-3 py-2">
                      {Number(record.word_count || 0)} words
                    </span>

                    <span className="rounded bg-gray-800 px-3 py-2">
                      {Number(record.duration_seconds || 0)} seconds
                    </span>

                    {record.is_whatsapp_group && (
                      <span className="rounded bg-green-950 px-3 py-2 text-green-300">
                        WhatsApp Group
                      </span>
                    )}
                  </div>

                  {status !== "approved" && (
                    <button
                      onClick={() =>
                        void changeStatus(record, "approved")
                      }
                      disabled={updatingId === record.id}
                      className="mt-5 rounded-lg bg-green-500 px-4 py-3 font-bold text-black disabled:opacity-50"
                    >
                      {updatingId === record.id
                        ? "Updating..."
                        : "Approve"}
                    </button>
                  )}

                  {status !== "rejected" && (
                    <button
                      onClick={() =>
                        void changeStatus(record, "rejected")
                      }
                      disabled={updatingId === record.id}
                      className="ml-3 mt-5 rounded-lg bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-50"
                    >
                      {updatingId === record.id
                        ? "Updating..."
                        : "Reject"}
                    </button>
                  )}
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}