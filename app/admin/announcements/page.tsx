"use client";

import {
useCallback,
useEffect,
useMemo,
useState,
} from "react";

import type {
FormEvent,
CSSProperties,
} from "react";

import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";
const MAX_TITLE_LENGTH = 150;
const MAX_MESSAGE_LENGTH = 10000;

type Announcement = {
id: string;
title: string;
message: string;
is_published: boolean;
created_at: string;
published_at: string | null;
};

function normalizeEmail(email: string | null | undefined): string {
return (email ?? "").trim().toLowerCase();
}

function getErrorMessage(error: unknown): string {
if (
typeof error === "object" &&
error !== null &&
"message" in error &&
typeof error.message === "string"
) {
return error.message;
}

return "An unexpected error occurred.";
}

function formatDate(date: string | null): string {
if (!date) return "Not published";

const parsed = new Date(date);

if (Number.isNaN(parsed.getTime())) {
return "Date unavailable";
}

return parsed.toLocaleString();
}

export default function ChairmanAnnouncementsPage() {
const router = useRouter();

const isSupabaseConfigured = Boolean(
process.env.NEXT_PUBLIC_SUPABASE_URL &&
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabase = useMemo(() => {
if (!isSupabaseConfigured) return null;
return createClient();
}, [isSupabaseConfigured]);

const [checking, setChecking] = useState(true);
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);
const [deletingId, setDeletingId] = useState<string | null>(null);

const [email, setEmail] = useState("");
const [announcements, setAnnouncements] = useState<Announcement[]>([]);

const [title, setTitle] = useState("");
const [message, setMessage] = useState("");
const [isPublished, setIsPublished] = useState(false);
const [editingId, setEditingId] = useState<string | null>(null);

const [notice, setNotice] = useState("");
const [errorMessage, setErrorMessage] = useState("");

const verifyCurrentChairman = useCallback(async () => {
if (!supabase) {
setErrorMessage(
"Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Render."
);
return null;
}

const { data, error } = await supabase.auth.getUser();

if (error || !data.user) {
  router.replace("/login");
  return null;
}

const userEmail = normalizeEmail(data.user.email);

if (userEmail !== CHAIRMAN_EMAIL) {
  await supabase.auth.signOut();
  router.replace("/login");
  return null;
}

setEmail(userEmail);
return data.user;

}, [router, supabase]);

const loadAnnouncements = useCallback(async () => {
if (!supabase) {
setErrorMessage(
"Supabase is not configured. Check your Render environment variables."
);
return;
}

setLoading(true);
setErrorMessage("");

try {
  const user = await verifyCurrentChairman();

  if (!user) return;

  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id, title, message, is_published, created_at, published_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  setAnnouncements((data ?? []) as Announcement[]);
} catch (error) {
  console.error("Loading announcements failed:", error);

  setErrorMessage(
    `Unable to load announcements: ${getErrorMessage(error)}`
  );
} finally {
  setLoading(false);
}

}, [supabase, verifyCurrentChairman]);

useEffect(() => {
let active = true;

async function initialize() {
  try {
    if (!supabase) {
      setErrorMessage(
        "Supabase is not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Render."
      );
      return;
    }

    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      router.replace("/login");
      return;
    }

    const userEmail = normalizeEmail(data.user.email);

    if (userEmail !== CHAIRMAN_EMAIL) {
      await supabase.auth.signOut();
      router.replace("/login");
      return;
    }

    if (!active) return;

    setEmail(userEmail);
    await loadAnnouncements();
  } catch (error) {
    console.error("Chairman verification failed:", error);

    if (active) {
      setErrorMessage(
        `Unable to verify Chairman access: ${getErrorMessage(error)}`
      );
    }
  } finally {
    if (active) {
      setChecking(false);
    }
  }
}

void initialize();

return () => {
  active = false;
};

}, [router, supabase, loadAnnouncements]);

function resetForm() {
setTitle("");
setMessage("");
setIsPublished(false);
setEditingId(null);
setNotice("");
setErrorMessage("");
}

async function saveAnnouncement(
event: FormEvent<HTMLFormElement>
) {
event.preventDefault();

setNotice("");
setErrorMessage("");

if (!supabase) {
  setErrorMessage(
    "Supabase is not configured. Check your Render environment variables."
  );
  return;
}

const cleanTitle = title.trim();
const cleanMessage = message.trim();

if (!cleanTitle || !cleanMessage) {
  setErrorMessage(
    "Enter both an announcement title and message."
  );
  return;
}

if (cleanTitle.length > MAX_TITLE_LENGTH) {
  setErrorMessage(
    `The title cannot exceed ${MAX_TITLE_LENGTH} characters.`
  );
  return;
}

if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
  setErrorMessage(
    `The message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`
  );
  return;
}

setSaving(true);

try {
  const user = await verifyCurrentChairman();

  if (!user) return;

  let existingAnnouncement: Announcement | null = null;

  if (editingId) {
    const { data, error } = await supabase
      .from("announcements")
      .select(
        "id, title, message, is_published, created_at, published_at"
      )
      .eq("id", editingId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "This announcement no longer exists. Refresh the page."
      );
    }

    existingAnnouncement = data as Announcement;
  }

  const wasPublished =
    existingAnnouncement?.is_published ?? false;

  const previousPublishedAt =
    existingAnnouncement?.published_at ?? null;

  const announcementData = {
    title: cleanTitle,
    message: cleanMessage,
    is_published: isPublished,
    published_at: isPublished
      ? wasPublished && previousPublishedAt
        ? previousPublishedAt
        : new Date().toISOString()
      : null,
  };

  if (editingId) {
    const { error } = await supabase
      .from("announcements")
      .update(announcementData)
      .eq("id", editingId);

    if (error) throw error;

    setNotice(
      isPublished
        ? "Announcement updated successfully."
        : "Announcement saved as a draft."
    );
  } else {
    const { error } = await supabase
      .from("announcements")
      .insert(announcementData);

    if (error) throw error;

    setNotice(
      isPublished
        ? "Announcement published successfully."
        : "Draft saved successfully."
    );
  }

  setTitle("");
  setMessage("");
  setIsPublished(false);
  setEditingId(null);

  await loadAnnouncements();
} catch (error) {
  console.error("Saving announcement failed:", error);

  setErrorMessage(
    `Unable to save announcement: ${getErrorMessage(error)}`
  );
} finally {
  setSaving(false);
}

}

function editAnnouncement(item: Announcement) {
setEditingId(item.id);
setTitle(item.title);
setMessage(item.message);
setIsPublished(item.is_published);
setNotice("");
setErrorMessage("");

window.scrollTo({
  top: 0,
  behavior: "smooth",
});

}

async function deleteAnnouncement(item: Announcement) {
// FIXED: Backticks allow the announcement title to be inserted safely.
const confirmed = window.confirm(
"Delete "${item.title}" permanently? This action cannot be undone."
);

if (!confirmed) return;

if (!supabase) {
  setErrorMessage(
    "Supabase is not configured. Check your Render environment variables."
  );
  return;
}

setNotice("");
setErrorMessage("");
setDeletingId(item.id);

try {
  const user = await verifyCurrentChairman();

  if (!user) return;

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", item.id);

  if (error) throw error;

  setNotice("Announcement deleted successfully.");

  if (editingId === item.id) {
    setTitle("");
    setMessage("");
    setIsPublished(false);
    setEditingId(null);
  }

  await loadAnnouncements();
} catch (error) {
  console.error("Deleting announcement failed:", error);

  setErrorMessage(
    `Unable to delete announcement: ${getErrorMessage(error)}`
  );
} finally {
  setDeletingId(null);
}

}

async function signOut() {
try {
if (supabase) {
await supabase.auth.signOut();
}
} finally {
router.replace("/login");
}
}

if (checking) {
return (
<main style={styles.page}>
<section style={styles.card}>
<p>Verifying Chairman access...</p>
</section>
</main>
);
}

if (!email) {
return (
<main style={styles.page}>
<section style={styles.card}>
<h1 style={styles.heading}>Announcement Board</h1>

      <p style={styles.error} role="alert">
        {errorMessage ||
          "Chairman access could not be verified."}
      </p>

      <button
        type="button"
        style={styles.button}
        onClick={() => router.replace("/login")}
      >
        Return to Login
      </button>
    </section>
  </main>
);

}

const publishedCount = announcements.filter(
(item) => item.is_published
).length;

const draftCount = announcements.length - publishedCount;

return (
<main style={styles.page}>
<header style={styles.header}>
<div>
<p style={styles.label}>MAIN NAIJA PIDGIN</p>
<h1 style={styles.heading}>Announcement Board</h1>
<p style={styles.muted}>Chairman: {email}</p>
</div>

    <div style={styles.actions}>
      <button
        type="button"
        style={styles.secondaryButton}
        onClick={() => router.push("/admin/dashboard")}
      >
        Dashboard
      </button>

      <button
        type="button"
        style={styles.button}
        onClick={() => void signOut()}
      >
        Sign Out
      </button>
    </div>
  </header>

  {notice && (
    <p style={styles.success} role="status">
      {notice}
    </p>
  )}

  {errorMessage && (
    <p style={styles.error} role="alert">
      {errorMessage}
    </p>
  )}

  <section style={styles.card}>
    <h2>
      {editingId ? "Edit Announcement" : "Create Announcement"}
    </h2>

    <form onSubmit={saveAnnouncement} style={styles.form}>
      <label style={styles.field}>
        Announcement title

        <input
          style={styles.input}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={MAX_TITLE_LENGTH}
          required
          disabled={saving}
          placeholder="Enter announcement title"
        />

        <small style={styles.muted}>
          {title.length}/{MAX_TITLE_LENGTH} characters
        </small>
      </label>

      <label style={styles.field}>
        Message

        <textarea
          style={styles.textarea}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={7}
          maxLength={MAX_MESSAGE_LENGTH}
          required
          disabled={saving}
          placeholder="Write your announcement here..."
        />

        <small style={styles.muted}>
          {message.length}/{MAX_MESSAGE_LENGTH} characters
        </small>
      </label>

      <label style={styles.checkbox}>
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(event) =>
            setIsPublished(event.target.checked)
          }
          disabled={saving}
        />

        Publish now so workers can read it
      </label>

      <div style={styles.actions}>
        <button
          type="submit"
          style={styles.button}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : editingId
              ? "Save Changes"
              : isPublished
                ? "Publish Announcement"
                : "Save Draft"}
        </button>

        {editingId && (
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={resetForm}
            disabled={saving}
          >
            Cancel Edit
          </button>
        )}
      </div>
    </form>
  </section>

  <section style={styles.listSection}>
    <div style={styles.listHeader}>
      <div>
        <h2>Previous Announcements</h2>

        <p style={styles.muted}>
          Total: {announcements.length}
          {" · "}
          Published: {publishedCount}
          {" · "}
          Drafts: {draftCount}
        </p>
      </div>

      <button
        type="button"
        style={styles.secondaryButton}
        onClick={() => void loadAnnouncements()}
        disabled={loading}
      >
        {loading ? "Loading..." : "Refresh"}
      </button>
    </div>

    {loading && (
      <p style={styles.muted}>Loading announcements...</p>
    )}

    {!loading && announcements.length === 0 && (
      <article style={styles.card}>
        <p>
          No announcements found. Create your first announcement
          above.
        </p>
      </article>
    )}

    <div style={styles.list}>
      {announcements.map((item) => (
        <article key={item.id} style={styles.card}>
          <div style={styles.listHeader}>
            <h3 style={styles.itemTitle}>{item.title}</h3>

            <span
              style={
                item.is_published
                  ? styles.publishedBadge
                  : styles.draftBadge
              }
            >
              {item.is_published ? "PUBLISHED" : "DRAFT"}
            </span>
          </div>

          <p style={styles.message}>{item.message}</p>

          <p style={styles.date}>
            Created: {formatDate(item.created_at)}
          </p>

          {item.published_at && (
            <p style={styles.date}>
              Published: {formatDate(item.published_at)}
            </p>
          )}

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => editAnnouncement(item)}
              disabled={saving || deletingId !== null}
            >
              Edit
            </button>

            <button
              type="button"
              style={styles.deleteButton}
              onClick={() => void deleteAnnouncement(item)}
              disabled={saving || deletingId !== null}
            >
              {deletingId === item.id ? "Deleting..." : "Delete"}
            </button>
          </div>
        </article>
      ))}
    </div>
  </section>
</main>

);
}

const styles: Record<string, CSSProperties> = {
page: {
minHeight: "100vh",
padding: "24px",
background: "#101010",
color: "#ffffff",
fontFamily: "Arial, sans-serif",
boxSizing: "border-box",
},

header: {
display: "flex",
flexWrap: "wrap",
justifyContent: "space-between",
alignItems: "center",
gap: "16px",
marginBottom: "24px",
},

label: {
color: "#d4af37",
fontWeight: 700,
letterSpacing: "2px",
},

heading: {
color: "#d4af37",
margin: "8px 0",
},

muted: {
color: "#bdbdbd",
fontSize: "13px",
lineHeight: 1.6,
},

card: {
padding: "20px",
border: "1px solid #383838",
borderRadius: "12px",
background: "#1b1b1b",
overflowWrap: "anywhere",
minWidth: 0,
},

form: {
display: "grid",
gap: "16px",
marginTop: "16px",
},

field: {
display: "grid",
gap: "8px",
fontWeight: 700,
},

input: {
width: "100%",
padding: "12px",
borderRadius: "8px",
border: "1px solid #555",
background: "#101010",
color: "#ffffff",
boxSizing: "border-box",
fontSize: "16px",
},

textarea: {
width: "100%",
padding: "12px",
borderRadius: "8px",
border: "1px solid #555",
background: "#101010",
color: "#ffffff",
resize: "vertical",
boxSizing: "border-box",
fontSize: "16px",
lineHeight: 1.6,
},

checkbox: {
display: "flex",
alignItems: "center",
gap: "10px",
},

button: {
padding: "12px 18px",
border: "none",
borderRadius: "8px",
background: "#d4af37",
color: "#101010",
fontWeight: 700,
cursor: "pointer",
},

secondaryButton: {
padding: "12px 18px",
border: "1px solid #d4af37",
borderRadius: "8px",
background: "transparent",
color: "#d4af37",
fontWeight: 700,
cursor: "pointer",
},

deleteButton: {
padding: "12px 18px",
border: "none",
borderRadius: "8px",
background: "#8b2626",
color: "#ffffff",
fontWeight: 700,
cursor: "pointer",
},

actions: {
display: "flex",
flexWrap: "wrap",
gap: "10px",
alignItems: "center",
},

listSection: {
marginTop: "28px",
},

listHeader: {
display: "flex",
flexWrap: "wrap",
justifyContent: "space-between",
alignItems: "center",
gap: "12px",
},

list: {
display: "grid",
gap: "16px",
marginTop: "16px",
},

itemTitle: {
overflowWrap: "anywhere",
},

message: {
whiteSpace: "pre-wrap",
lineHeight: 1.7,
overflowWrap: "anywhere",
},

date: {
color: "#c4c4c4",
fontSize: "13px",
lineHeight: 1.6,
},

publishedBadge: {
color: "#8be28b",
fontWeight: 700,
fontSize: "12px",
},

draftBadge: {
color: "#f0d27a",
fontWeight: 700,
fontSize: "12px",
},

success: {
padding: "12px",
marginTop: "16px",
borderRadius: "8px",
background: "#16351f",
color: "#a8f0b5",
overflowWrap: "anywhere",
},

error: {
padding: "12px",
marginTop: "16px",
borderRadius: "8px",
background: "#3a1717",
color: "#ffbaba",
overflowWrap: "anywhere",
},
};