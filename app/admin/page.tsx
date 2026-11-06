"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "tapbomba.ai@gmail.com";

type Recording = {
id: string;
worker_id?: string;
user_id?: string;
status?: string;
pidgin_text?: string;
text?: string;
audio_url?: string;
voice_url?: string;
};

type Announcement = {
id: string;
title: string;
message: string;
created_at: string;
};

export default function AdminPage() {
const [supabase] = useState(() => createClient());

const [items, setItems] = useState<Recording[]>([]);
const [announces, setAnnounces] = useState<Announcement[]>([]);

const [tab, setTab] = useState<"voices" | "announce">("voices");
const [stats, setStats] = useState({
total: 0,
pending: 0,
approved: 0,
});

const [title, setTitle] = useState("");
const [msg, setMsg] = useState("");
const [loading, setLoading] = useState(true);
const [workingId, setWorkingId] = useState("");
const [notice, setNotice] = useState("");

useEffect(() => {
async function verifyAdmin() {
const { data } = await supabase.auth.getUser();
const user = data.user;

  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
    window.location.replace("/admin/login");
    return;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("email, is_chairman")
    .eq("id", user.id)
    .maybeSingle();

  if (
    error ||
    !profile ||
    profile.email?.toLowerCase() !== ADMIN_EMAIL ||
    profile.is_chairman !== true
  ) {
    await supabase.auth.signOut();
    window.location.replace("/admin/login");
    return;
  }

  await load();
  await loadAnn();
  setLoading(false);
}

verifyAdmin();

}, [supabase]);

async function load() {
try {
const response = await fetch("/api/chairman/list", {
cache: "no-store",
});

  if (!response.ok) {
    throw new Error("Could not load recordings.");
  }

  const data = await response.json();
  const list: Recording[] = Array.isArray(data)
    ? data
    : data.recordings || [];

  setItems(list);

  setStats({
    total: list.length,
    pending: list.filter(
      (item) =>
        item.status !== "approved" && item.status !== "rejected"
    ).length,
    approved: list.filter((item) => item.status === "approved").length,
  });
} catch (error) {
  setNotice(
    error instanceof Error ? error.message : "Recording loading failed."
  );
}

}

async function loadAnn() {
const { data, error } = await supabase
.from("announcements")
.select("*")
.order("created_at", { ascending: false })
.limit(10);

if (error) {
  setNotice("Could not load announcements: " + error.message);
  return;
}

setAnnounces(data || []);

}

async function act(id: string, status: "approved" | "rejected") {
if (workingId) return;

setWorkingId(id);
setNotice("");

try {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    window.location.replace("/admin/login");
    return;
  }

  const response = await fetch("/api/chairman/recordings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ id, status }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Could not update recording.");
  }

  setNotice(`Recording ${status} successfully.`);
  await load();
} catch (error) {
  setNotice(
    error instanceof Error ? error.message : "Recording update failed."
  );
} finally {
  setWorkingId("");
}

}

async function createAnn() {
if (!title.trim() || !msg.trim()) {
setNotice("Please fill in the announcement title and message.");
return;
}

const { error } = await supabase.from("announcements").insert({
  title: title.trim(),
  message: msg.trim(),
  created_by: ADMIN_EMAIL,
});

if (error) {
  setNotice(error.message);
  return;
}

setNotice("Announcement published successfully.");
setTitle("");
setMsg("");
await loadAnn();

}

async function logout() {
await supabase.auth.signOut();
window.location.replace("/admin/login");
}

if (loading) {
return (
<main
style={{
minHeight: "100vh",
background: "#050505",
color: "#d4af37",
display: "grid",
placeItems: "center",
fontFamily: "sans-serif",
}}
>
Verifying Admin Access...
</main>
);
}

return (
<main
style={{
fontFamily: "sans-serif",
background: "#050505",
minHeight: "100vh",
color: "white",
padding: 15,
}}
>
<header
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: 20,
gap: 10,
}}
>
<div>
<h1 style={{ color: "#d4af37", fontSize: 22, margin: 0 }}>
👑 ADMIN DASHBOARD
</h1>
<p style={{ fontSize: 11, color: "#888" }}>{ADMIN_EMAIL}</p>
</div>

    <button
      onClick={logout}
      style={{
        padding: "9px 12px",
        borderRadius: 20,
        background: "#222",
        color: "white",
        border: "1px solid #555",
      }}
    >
      Logout
    </button>
  </header>

  {notice && (
    <div
      role="status"
      style={{
        background: "#172017",
        border: "1px solid #287a39",
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        fontSize: 13,
      }}
    >
      {notice}
    </div>
  )}

  <div style={{ display: "flex", gap: 8, marginBottom: 15 }}>
    <button
      onClick={() => setTab("voices")}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 8,
        border: 0,
        background: tab === "voices" ? "#00E676" : "#171717",
        color: tab === "voices" ? "black" : "white",
        fontWeight: 900,
      }}
    >
      Voices ({stats.pending})
    </button>

    <button
      onClick={() => setTab("announce")}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 8,
        border: 0,
        background: tab === "announce" ? "#FFB300" : "#171717",
        color: tab === "announce" ? "black" : "white",
        fontWeight: 900,
      }}
    >
      📢 Announcements
    </button>
  </div>

  {tab === "voices" && (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
          marginBottom: 20,
        }}
      >
        {[
          ["TOTAL", stats.total],
          ["PENDING", stats.pending],
          ["APPROVED", stats.approved],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              background: "#171717",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 10, color: "#999" }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: "bold" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={load}
        style={{
          padding: "9px 15px",
          borderRadius: 20,
          background: "#171717",
          color: "#00E676",
          border: "1px solid #00E676",
          marginBottom: 15,
        }}
      >
        ↻ Refresh Recordings
      </button>

      {items.map((item) => (
        <div
          key={item.id}
          style={{
            background: "white",
            color: "black",
            padding: 12,
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 11, color: "#666" }}>
            {item.worker_id || item.user_id || "Worker"} •{" "}
            {item.status || "pending"}
          </div>

          <div style={{ fontWeight: "bold", margin: "8px 0" }}>
            {(item.pidgin_text || item.text || "").slice(0, 120)}
          </div>

          {(item.audio_url || item.voice_url) && (
            <audio
              controls
              src={item.audio_url || item.voice_url}
              style={{ width: "100%", height: 35 }}
            />
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              disabled={
                workingId === item.id ||
                item.status === "approved" ||
                item.status === "rejected"
              }
              onClick={() => act(item.id, "approved")}
              style={{
                flex: 1,
                padding: 11,
                background: "#16a34a",
                color: "white",
                borderRadius: 8,
                border: 0,
                opacity: item.status === "approved" ? 0.5 : 1,
              }}
            >
              {workingId === item.id ? "Working..." : "Approve"}
            </button>

            <button
              disabled={
                workingId === item.id ||
                item.status === "approved" ||
                item.status === "rejected"
              }
              onClick={() => act(item.id, "rejected")}
              style={{
                flex: 1,
                padding: 11,
                background: "#dc2626",
                color: "white",
                borderRadius: 8,
                border: 0,
                opacity: item.status === "rejected" ? 0.5 : 1,
              }}
            >
              Reject
            </button>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <p style={{ color: "#999", textAlign: "center" }}>
          No recordings found.
        </p>
      )}
    </>
  )}

  {tab === "announce" && (
    <section>
      <div
        style={{
          background: "#1A150A",
          border: "1px solid #FFB300",
          padding: 14,
          borderRadius: 12,
        }}
      >
        <h3 style={{ color: "#FFB300", margin: 0 }}>
          📢 Create Announcement
        </h3>

        <p style={{ fontSize: 11, color: "#999" }}>
          This announcement will appear wherever your Marketplace
          announcement board reads from the announcements table.
        </p>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 12,
            marginTop: 10,
            borderRadius: 8,
            background: "#111",
            color: "white",
            border: "1px solid #333",
          }}
        />

        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Announcement message..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 12,
            marginTop: 10,
            height: 100,
            borderRadius: 8,
            background: "#111",
            color: "white",
            border: "1px solid #333",
          }}
        />

        <button
          onClick={createAnn}
          style={{
            width: "100%",
            marginTop: 12,
            padding: 12,
            background: "#FFB300",
            color: "black",
            fontWeight: 900,
            borderRadius: 8,
            border: 0,
          }}
        >
          Publish Announcement
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#999" }}>
          RECENT ANNOUNCEMENTS ({announces.length})
        </div>

        {announces.map((announcement) => (
          <div
            key={announcement.id}
            style={{
              background: "#171717",
              padding: 12,
              borderRadius: 10,
              marginTop: 8,
              border: "1px solid #333",
            }}
          >
            <div style={{ fontWeight: 800, color: "white" }}>
              {announcement.title}
            </div>

            <div style={{ fontSize: 12, color: "#bbb", marginTop: 4 }}>
              {(announcement.message || "").slice(0, 120)}
            </div>

            <div style={{ fontSize: 10, color: "#666", marginTop: 6 }}>
              {new Date(announcement.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </section>
  )}
</main>

);
}