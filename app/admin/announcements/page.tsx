"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Announcement = {
  id: string;
  title: string;
  message: string;
  published: boolean;
  created_at: string;
  updated_at?: string;
};

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

export default function ChairmanAnnouncementsPage() {
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setNotice("Please log in to access the Chairman Announcement Board.");
      setLoading(false);
      return;
    }

    if (data.user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
      setNotice("Access denied. Chairman only.");
      setLoading(false);
      return;
    }

    setUser(data.user);
    await loadAnnouncements();
    setLoading(false);
  }

  async function loadAnnouncements() {
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,message,published,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      setNotice("Could not load announcements: " + error.message);
      return;
    }

    setAnnouncements(data || []);
  }

  function resetForm() {
    setTitle("");
    setMessage("");
    setEditingId(null);
  }

  async function saveAnnouncement(publish: boolean) {
    if (!user) return;

    if (!title.trim() || !message.trim()) {
      setNotice("Please enter both a title and a message.");
      return;
    }

    setSaving(true);
    setNotice("");

    const announcementData = {
      title: title.trim(),
      message: message.trim(),
      published: publish,
      updated_at: new Date().toISOString(),
    };

    let error;

    if (editingId) {
      const result = await supabase
        .from("announcements")
        .update(announcementData)
        .eq("id", editingId);

      error = result.error;
    } else {
      const result = await supabase
        .from("announcements")
        .insert({
          ...announcementData,
          created_by: user.id,
        });

      error = result.error;
    }

    if (error) {
      setNotice("Could not save announcement: " + error.message);
    } else {
      setNotice(
        publish
          ? "Announcement published successfully!"
          : "Announcement saved as draft!"
      );

      resetForm();
      await loadAnnouncements();
    }

    setSaving(false);
  }

  function editAnnouncement(item: Announcement) {
    setEditingId(item.id);
    setTitle(item.title);
    setMessage(item.message);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function togglePublish(item: Announcement) {
    const { error } = await supabase
      .from("announcements")
      .update({
        published: !item.published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setNotice("Could not update announcement: " + error.message);
      return;
    }

    setNotice(
      item.published
        ? "Announcement unpublished."
        : "Announcement published!"
    );

    await loadAnnouncements();
  }

  async function deleteAnnouncement(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this announcement?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      setNotice("Could not delete announcement: " + error.message);
      return;
    }

    setNotice("Announcement deleted.");
    if (editingId === id) resetForm();
    await loadAnnouncements();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07110c] text-white flex items-center justify-center">
        Loading Chairman Announcement Board...
      </main>
    );
  }

  if (!user || user.email?.toLowerCase() !== CHAIRMAN_EMAIL) {
    return (
      <main className="min-h-screen bg-[#07110c] text-white p-6 flex items-center justify-center">
        <div className="bg-[#102219] border border-red-500/30 rounded-2xl p-6 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-400">
            Access Denied
          </h1>
          <p className="text-gray-300 mt-3">
            {notice || "This page is only available to the Chairman."}
          </p>
          <a
            href="/admin"
            className="inline-block mt-5 bg-green-600 px-5 py-3 rounded-xl font-bold"
          >
            Back to Dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07110c] text-white p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <p className="text-green-400 text-xs font-bold tracking-widest">
              MAIN NAIJA PIDGIN
            </p>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              Chairman Announcement Board
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Send important messages directly to your workers.
            </p>
          </div>

          <a
            href="/admin"
            className="bg-[#183526] border border-green-800 px-3 py-2 rounded-xl text-sm"
          >
            ← Back
          </a>
        </div>

        {notice && (
          <div className="mb-5 p-4 rounded-xl bg-[#153522] border border-green-700 text-green-200 text-sm break-words">
            {notice}
          </div>
        )}

        <section className="bg-[#102219] border border-green-900 rounded-2xl p-4 sm:p-6 mb-8">
          <h2 className="text-xl font-bold mb-5">
            {editingId ? "Edit Announcement" : "Create New Announcement"}
          </h2>

          <label className="block text-sm text-gray-300 mb-2">
            Announcement Title
          </label>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter announcement title"
            maxLength={150}
            className="w-full bg-[#07110c] border border-green-900 rounded-xl p-4 outline-none focus:border-green-500 mb-5"
          />

          <label className="block text-sm text-gray-300 mb-2">
            Your Message to Workers
          </label>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your announcement here..."
            rows={7}
            maxLength={10000}
            className="w-full bg-[#07110c] border border-green-900 rounded-xl p-4 outline-none focus:border-green-500 resize-y"
          />

          <div className="text-right text-xs text-gray-500 mt-2">
            {message.length}/10000 characters
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button
              onClick={() => saveAnnouncement(true)}
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl p-4 font-bold"
            >
              {saving ? "Saving..." : "📢 Publish to Workers"}
            </button>

            <button
              onClick={() => saveAnnouncement(false)}
              disabled={saving}
              className="flex-1 bg-[#263b30] hover:bg-[#345440] disabled:opacity-50 rounded-xl p-4 font-bold"
            >
              Save as Draft
            </button>
          </div>

          {editingId && (
            <button
              onClick={resetForm}
              className="w-full mt-3 border border-gray-600 rounded-xl p-3 text-gray-300"
            >
              Cancel Editing
            </button>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              Announcement History
            </h2>

            <button
              onClick={loadAnnouncements}
              className="text-green-400 text-sm font-bold"
            >
              ↻ Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-[#102219] border border-green-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Total</p>
              <p className="text-3xl font-black">
                {announcements.length}
              </p>
            </div>

            <div className="bg-[#102219] border border-green-900 rounded-xl p-4">
              <p className="text-gray-400 text-sm">Published</p>
              <p className="text-3xl font-black text-green-400">
                {announcements.filter((a) => a.published).length}
              </p>
            </div>
          </div>

          {announcements.length === 0 ? (
            <div className="bg-[#102219] border border-green-900 rounded-2xl p-8 text-center text-gray-400">
              No announcements yet. Create your first announcement above.
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((item) => (
                <article
                  key={item.id}
                  className="bg-[#102219] border border-green-900 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          item.published
                            ? "bg-green-900 text-green-300"
                            : "bg-yellow-900/50 text-yellow-300"
                        }`}
                      >
                        {item.published ? "PUBLISHED" : "DRAFT"}
                      </span>

                      <h3 className="text-lg font-bold mt-3 break-words">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mt-3 whitespace-pre-wrap break-words">
                    {item.message}
                  </p>

                  <p className="text-gray-500 text-xs mt-4">
                    Created:{" "}
                    {new Date(item.created_at).toLocaleString()}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <button
                      onClick={() => editAnnouncement(item)}
                      className="bg-blue-900/60 text-blue-200 rounded-lg p-3 text-xs font-bold"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => togglePublish(item)}
                      className="bg-[#294332] text-green-200 rounded-lg p-3 text-xs font-bold"
                    >
                      {item.published ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      onClick={() => deleteAnnouncement(item.id)}
                      className="bg-red-900/60 text-red-200 rounded-lg p-3 text-xs font-bold"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-center text-gray-600 text-xs mt-10 mb-5">
          MAIN NAIJA PIDGIN • CHAIRMAN CONTROL CENTRE
        </p>
      </div>
    </main>
  );
}