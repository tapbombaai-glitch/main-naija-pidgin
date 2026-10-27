"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  supabase,
  isSupabaseConfigured,
} from "../../../../src/lib/supabase";

const CHAIRMAN_EMAIL = "tapbomba.ai@gmail.com";

type Announcement = {
  id: string;
  title: string;
  message: string;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export default function ChairmanAnnouncementsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [published, setPublished] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("announcements")
        .select(
          "id, title, message, published, created_at, updated_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAnnouncements((data ?? []) as Announcement[]);
    } catch (error) {
      console.error("Loading announcements failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load announcements."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function verifyChairman() {
      if (!isSupabaseConfigured) {
        if (active) {
          setErrorMessage("Supabase is not configured. Check your Render environment variables.");
          setChecking(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          router.replace("/login");
          return;
        }

        const userEmail = (data.user.email ?? "")
          .trim()
          .toLowerCase();

        if (userEmail !== CHAIRMAN_EMAIL) {
          await supabase.auth.signOut();
          router.replace("/login");
          return;
        }

        if (active) {
          setEmail(userEmail);
          setChecking(false);
        }

        await loadAnnouncements();
      } catch (error) {
        console.error("Chairman verification failed:", error);

        if (active) {
          setErrorMessage("Unable to verify Chairman access.");
          setChecking(false);
        }
      }
    }

    void verifyChairman();

    return () => {
      active = false;
    };
  }, [router, loadAnnouncements]);

  function resetForm() {
    setTitle("");
    setMessage("");
    setPublished(false);
    setEditingId(null);
    setNotice("");
  }

  async function saveAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setErrorMessage("");

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();

    if (!cleanTitle || !cleanMessage) {
      setErrorMessage("Enter both a title and an announcement message.");
      return;
    }

    setSaving(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      const user = authData.user;

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      if (
        (user.email ?? "").trim().toLowerCase() !== CHAIRMAN_EMAIL
      ) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      if (editingId) {
        const { error } = await supabase
          .from("announcements")
          .update({
            title: cleanTitle,
            message: cleanMessage,
            published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (error) throw error;

        setNotice("Announcement updated successfully.");
      } else {
        const { error } = await supabase
          .from("announcements")
          .insert({
            title: cleanTitle,
            message: cleanMessage,
            published,
            created_by: user.id,
          });

        if (error) throw error;

        setNotice(
          published
            ? "Announcement published successfully."
            : "Draft saved successfully."
        );
      }

      resetForm();
      await loadAnnouncements();
    } catch (error) {
      console.error("Saving announcement failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save announcement."
      );
    } finally {
      setSaving(false);
    }
  }

  function editAnnouncement(item: Announcement) {
    setEditingId(item.id);
    setTitle(item.title);
    setMessage(item.message);
    setPublished(item.published);
    setNotice("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAnnouncement(item: Announcement) {
    const confirmed = window.confirm(
      `Delete "${item.title}" permanently?`
    );

    if (!confirmed) return;

    setNotice("");
    setErrorMessage("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      const user = authData.user;

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      if (
        (user.email ?? "").trim().toLowerCase() !== CHAIRMAN_EMAIL
      ) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      setNotice("Announcement deleted.");
      if (editingId === item.id) resetForm();

      await loadAnnouncements();
    } catch (error) {
      console.error("Deleting announcement failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete announcement."
      );
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
    }
  }

  if (checking) {
    return (
      <main style={styles.page}>
        <p>Verifying Chairman access...</p>
      </main>
    );
  }

  if (errorMessage && !email) {
    return (
      <main style={styles.page}>
        <h1 style={styles.heading}>Announcement Board</h1>
        <p style={styles.error}>{errorMessage}</p>
        <button style={styles.button} onClick={() => router.replace("/login")}>
          Return to Login
        </button>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.label}>MAIN NAIJA PIDGIN</p>
          <h1 style={styles.heading}>Announcement Board</h1>
          <p>Chairman: {email}</p>
        </div>

        <div style={styles.actions}>
          <button
            style={styles.secondaryButton}
            onClick={() => router.push("/admin/dashboard")}
          >
            Dashboard
          </button>

          <button style={styles.button} onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>

      <section style={styles.card}>
        <h2>{editingId ? "Edit Announcement" : "Create Announcement"}</h2>

        <form onSubmit={saveAnnouncement} style={styles.form}>
          <label style={styles.field}>
            Announcement title
            <input
              style={styles.input}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={150}
              required
            />
          </label>

          <label style={styles.field}>
            Message
            <textarea
              style={styles.textarea}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={7}
              maxLength={10000}
              required
            />
          </label>

          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
            />
            Publish now so workers can read it
          </label>

          <div style={styles.actions}>
            <button type="submit" style={styles.button} disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : published
                    ? "Publish Announcement"
                    : "Save Draft"}
            </button>

            {editingId && (
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      {notice && <p style={styles.success}>{notice}</p>}
      {errorMessage && <p style={styles.error}>{errorMessage}</p>}

      <section style={styles.listSection}>
        <div style={styles.listHeader}>
          <h2>Previous Announcements</h2>

          <button
            style={styles.secondaryButton}
            onClick={() => void loadAnnouncements()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading && <p>Loading announcements...</p>}

        {!loading && announcements.length === 0 && (
          <article style={styles.card}>
            <p>No announcements found. Create your first announcement above.</p>
          </article>
        )}

        <div style={styles.list}>
          {announcements.map((item) => (
            <article key={item.id} style={styles.card}>
              <div style={styles.listHeader}>
                <h3>{item.title}</h3>

                <span
                  style={
                    item.published
                      ? styles.publishedBadge
                      : styles.draftBadge
                  }
                >
                  {item.published ? "Published" : "Draft"}
                </span>
              </div>

              <p style={styles.message}>{item.message}</p>

              <p style={styles.date}>
                Created:{" "}
                {new Date(item.created_at).toLocaleString()}
              </p>

              <div style={styles.actions}>
                <button
                  style={styles.secondaryButton}
                  onClick={() => editAnnouncement(item)}
                >
                  Edit
                </button>

                <button
                  style={styles.deleteButton}
                  onClick={() => void deleteAnnouncement(item)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    background: "#101010",
    color: "#ffffff",
    fontFamily: "Arial, sans-serif",
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
  card: {
    padding: "20px",
    border: "1px solid #383838",
    borderRadius: "12px",
    background: "#1b1b1b",
    overflowWrap: "anywhere",
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
  message: {
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
  },
  date: {
    color: "#c4c4c4",
    fontSize: "13px",
  },
  publishedBadge: {
    color: "#8be28b",
    fontWeight: 700,
  },
  draftBadge: {
    color: "#f0d27a",
    fontWeight: 700,
  },
  success: {
    padding: "12px",
    borderRadius: "8px",
    background: "#16351f",
    color: "#a8f0b5",
  },
  error: {
    padding: "12px",
    borderRadius: "8px",
    background: "#3a1717",
    color: "#ffbaba",
    overflowWrap: "anywhere",
  },
};