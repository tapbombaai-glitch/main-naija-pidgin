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

type FilterType = "all" | "pending" | "approved" | "rejected";

function normalizeStatus(value?: string | null): "pending" | "approved" | "rejected" {
  const status = (value || "pending").toLowerCase();
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "pending";
}

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

function formatDuration(seconds?: number | null) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

function statusClasses(status: string) {
  if (status === "approved") return "border-green-700 bg-green-950 text-green-300";
  if (status === "rejected") return "border-red-700 bg-red-950 text-red-300";
  return "border-yellow-700 bg-yellow-950 text-yellow-300";
}

export default function ChairmanRecordingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<Recording[]>([]);
  const [workers, setWorkers] = useState<Record<string, Worker>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [refreshNumber, setRefreshNumber] = useState(0);

  const verifyChairman = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      router.replace("/login");
      return false;
    }
    const email = (data.session.user.email || "").trim().toLowerCase();
    if (email !== CHAIRMAN_EMAIL) {
      await supabase.auth.signOut();
      router.replace("/login");
      return false;
    }
    return true;
  }, [router, supabase]);

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const authorized = await verifyChairman();
      if (!authorized) return;

      const { data, error } = await supabase
        .from("recordings")
        .select(
          [
            "id",
            "user_id",
            "file_name",
            "audio_path",
            "pidgin_text",
            "transcription",
            "language",
            "word_count",
            "recording_number",
            "is_free_talk",
            "is_whatsapp_group",
            "admin_status",
            "created_at",
            "duration_seconds",
          ].join(",")
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Could not load recordings: ${error.message}`);
      }

      // ✅ YOUR FIX APPLIED - This fixes TS build error
      const recordingList: Recording[] = (data ?? []).map((row: any) => ({
        id: String(row.id),
        user_id: row.user_id ?? null,
        file_name: row.file_name ?? null,
        audio_path: row.audio_path ?? null,
        pidgin_text: row.pidgin_text ?? null,
        transcription: row.transcription ?? null,
        language: row.language ?? null,
        word_count: row.word_count ?? null,
        recording_number: row.recording_number ?? null,
        is_free_talk: row.is_free_talk ?? null,
        is_whatsapp_group: row.is_whatsapp_group ?? null,
        admin_status: row.admin_status ?? null,
        created_at: row.created_at ?? null,
        duration_seconds: row.duration_seconds ?? null,
      }));

      setRecords(recordingList);

      const workerIds = [
        ...new Set(
          recordingList.map((record) => record.user_id).filter((id): id is string => Boolean(id))
        ),
      ];

      if (workerIds.length === 0) {
        setWorkers({});
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,display_name,email")
        .in("id", workerIds);

      if (profileError) {
        console.warn("Could not load worker profiles:", profileError.message);
        setWorkers({});
        return;
      }

      const workerMap: Record<string, Worker> = {};
      for (const worker of (profileData || []) as Worker[]) {
        workerMap[worker.id] = worker;
      }
      setWorkers(workerMap);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load recordings.");
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, [supabase, verifyChairman]);

  useEffect(() => {
    void loadRecordings();
  }, [loadRecordings, refreshNumber]);

  async function changeStatus(recording: Recording, newStatus: "approved" | "rejected") {
    setErrorMessage("");
    setSuccessMessage("");
    if (updatingId !== null) return;
    const authorized = await verifyChairman();
    if (!authorized) return;
    const currentStatus = normalizeStatus(recording.admin_status);
    if (currentStatus === newStatus) {
      setSuccessMessage(`This recording is already ${newStatus}.`);
      return;
    }
    const recordingName = recording.recording_number || recording.file_name || recording.id;
    const confirmed = window.confirm(
      `Are you sure you want to ${newStatus} recording ${recordingName}?`
    );
    if (!confirmed) return;
    setUpdatingId(recording.id);
    try {
      const { data, error } = await supabase
        .from("recordings")
        .update({ admin_status: newStatus })
        .eq("id", recording.id)
        .select("id,admin_status")
        .maybeSingle();
      if (error) throw new Error(`Could not update recording: ${error.message}`);
      if (!data) throw new Error("No recording was updated. Check your Supabase RLS policies and recording ID.");
      setRecords((previous) => previous.map((item) => (item.id === recording.id ? { ...item, admin_status: newStatus } : item)));
      setSuccessMessage(`${recordingName} has been marked ${newStatus}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to change recording status.");
    } finally {
      setUpdatingId(null);
    }
  }

  const statistics = useMemo(() => {
    const pending = records.filter((record) => normalizeStatus(record.admin_status) === "pending").length;
    const approved = records.filter((record) => normalizeStatus(record.admin_status) === "approved").length;
    const rejected = records.filter((record) => normalizeStatus(record.admin_status) === "rejected").length;
    const totalWords = records.reduce((total, record) => total + Math.max(0, Number(record.word_count) || 0), 0);
    return { total: records.length, pending, approved, rejected, totalWords };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const status = normalizeStatus(record.admin_status);
      if (filter !== "all" && status !== filter) return false;
      if (!query) return true;
      const worker = record.user_id ? workers[record.user_id] : undefined;
      const searchableText = [record.recording_number, record.file_name, record.pidgin_text, record.transcription, record.language, record.user_id, worker?.display_name, worker?.email].filter(Boolean).join(" ").toLowerCase();
      return searchableText.includes(query);
    });
  }, [records, workers, filter, search]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
        <div role="status" className="rounded-xl border border-gray-800 bg-gray-900 p-6 text-center">
          <p className="text-lg font-bold text-yellow-400">Main Naija Pidgin</p>
          <p className="mt-3 text-gray-300">Checking Chairman access...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-green-400">Main Naija Pidgin</p>
            <h1 className="mt-2 text-3xl font-bold text-yellow-400 md:text-4xl">Chairman Recordings</h1>
            <p className="mt-2 text-gray-400">Review and manage worker submissions.</p>
            <p className="mt-2 break-all text-xs text-gray-500">Authorized account: {CHAIRMAN_EMAIL}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => router.push("/admin/dashboard")} className="rounded-lg border border-gray-700 px-4 py-3 transition hover:bg-gray-800">Back to Dashboard</button>
            <button type="button" onClick={() => setRefreshNumber((number) => number + 1)} disabled={loading} className="rounded-lg bg-yellow-400 px-5 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Refreshing..." : "Refresh"}</button>
          </div>
        </header>
        {errorMessage && <div role="alert" className="mt-6 rounded-xl border border-red-800 bg-red-950 p-4 text-red-200"><p className="font-bold">Something went wrong</p><p className="mt-1 break-words">{errorMessage}</p></div>}
        {successMessage && <div role="status" className="mt-6 rounded-xl border border-green-800 bg-green-950 p-4 text-green-200">{successMessage}</div>}
        <section aria-label="Recording statistics" className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[{ label: "Total Recordings", value: statistics.total },{ label: "Pending", value: statistics.pending },{ label: "Approved", value: statistics.approved },{ label: "Rejected", value: statistics.rejected },{ label: "Total Words", value: statistics.totalWords.toLocaleString() }].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <p className="text-sm text-gray-400">{item.label}</p>
              <p className="mt-3 text-2xl font-bold text-yellow-400 md:text-3xl">{item.value}</p>
            </div>
          ))}
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="recordingSearch" className="mb-2 block text-sm font-semibold text-gray-300">Search recordings</label>
            <input id="recordingSearch" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search worker, recording ID, language or text..." className="w-full rounded-xl border border-gray-700 bg-gray-900 p-3 outline-none transition placeholder:text-gray-600 focus:border-yellow-400" />
          </div>
          <div>
            <label htmlFor="recordingFilter" className="mb-2 block text-sm font-semibold text-gray-300">Filter by status</label>
            <select id="recordingFilter" value={filter} onChange={(event) => setFilter(event.target.value as FilterType)} className="w-full rounded-xl border border-gray-700 bg-gray-900 p-3 outline-none focus:border-yellow-400"><option value="all">All recordings</option><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
          </div>
        </section>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-400">
          <p>Showing {filteredRecords.length} of {records.length} recordings</p>
          {loading && <p role="status" className="text-yellow-400">Updating recording list...</p>}
        </div>
        <section className="mt-4 space-y-5">
          {!loading && filteredRecords.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
              <p className="text-lg font-bold">No recordings found</p>
              <p className="mt-2 text-gray-400">Try another search or change the status filter.</p>
              {(search || filter !== "all") && <button type="button" onClick={() => { setSearch(""); setFilter("all"); }} className="mt-4 rounded-lg bg-yellow-400 px-4 py-2 font-bold text-black">Clear filters</button>}
            </div>
          ) : (
            filteredRecords.map((record) => {
              const status = normalizeStatus(record.admin_status);
              const worker = record.user_id ? workers[record.user_id] : undefined;
              const recordingName = record.recording_number || record.file_name || record.id;
              return (
                <article key={record.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-lg md:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <h2 className="break-words text-lg font-bold md:text-xl">{recordingName}</h2>
                      <p className="mt-2 break-words text-sm text-gray-300">Worker: {worker?.display_name || worker?.email || record.user_id || "Unknown worker"}</p>
                      {worker?.email && worker?.display_name && <p className="mt-1 break-all text-xs text-gray-500">{worker.email}</p>}
                      <p className="mt-2 text-xs text-gray-500">Submitted: {formatDate(record.created_at)}</p>
                    </div>
                    <span className={`w-fit rounded-full border px-3 py-1.5 text-sm font-semibold ${statusClasses(status)}`}>{status === "pending" ? "Pending Review" : status === "approved" ? "Approved" : "Rejected"}</span>
                  </div>
                  <div className="mt-5 rounded-xl border border-gray-800 bg-gray-950 p-4">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Recording Text</p>
                    <p className="whitespace-pre-wrap break-words leading-7 text-gray-200">{record.pidgin_text || record.transcription || "No text saved for this recording."}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">Language: {record.language || "Unknown"}</span>
                    <span className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">Type: {record.is_free_talk ? "Free Talk" : "Read Text"}</span>
                    <span className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">Words: {Number(record.word_count) || 0}</span>
                    <span className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">Duration: {formatDuration(record.duration_seconds)}</span>
                    {record.is_whatsapp_group && <span className="rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-green-300">WhatsApp Group</span>}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-800 pt-5">
                    {status !== "approved" && <button type="button" onClick={() => void changeStatus(record, "approved")} disabled={updatingId !== null} className="rounded-lg bg-green-500 px-5 py-3 font-bold text-black transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50">{updatingId === record.id ? "Updating..." : "Approve Recording"}</button>}
                    {status !== "rejected" && <button type="button" onClick={() => void changeStatus(record, "rejected")} disabled={updatingId !== null} className="rounded-lg bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">{updatingId === record.id ? "Updating..." : "Reject Recording"}</button>}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}