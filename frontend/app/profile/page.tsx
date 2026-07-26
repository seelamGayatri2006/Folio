"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { api, getToken } from "@/lib/api";
import { User, Mail, Calendar, BookOpen, ListChecks, Clock } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    Promise.all([api.me(), api.dashboardStats()]).then(([u, s]) => {
      setUser(u);
      setName(u.name);
      setStats(s);
    });
  }, [router]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const updated = await api.updateProfile(name);
      setUser(updated);
      setEditing(false);
      setMessage("Profile updated.");
    } catch (err: any) {
      setMessage(err.message || "Couldn't update profile");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-paper">
        <Navbar />
        <p className="text-center text-muted font-mono text-sm mt-20">Loading profile…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-display text-3xl font-semibold text-ink mb-8">Your profile</h1>

        <div className="bg-surface border border-line rounded-md p-6 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-cover text-white flex items-center justify-center text-xl font-display font-semibold">
              {user.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-line rounded-sm px-2 py-1 text-lg font-display font-semibold"
                />
              ) : (
                <p className="font-display text-xl font-semibold text-ink">{user.name}</p>
              )}
              <p className="text-sm text-muted flex items-center gap-1.5 mt-1">
                <Mail size={13} /> {user.email}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted flex items-center gap-1.5 mb-4">
            <Calendar size={13} /> Member since {new Date(user.created_at).toLocaleDateString()}
          </p>

          {message && <p className="text-sm text-cover mb-3">{message}</p>}

          {editing ? (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-ink text-paper px-4 py-2 rounded-sm text-sm font-medium hover:bg-cover transition disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setName(user.name);
                }}
                className="border border-line px-4 py-2 rounded-sm text-sm font-medium hover:border-ink transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="border border-line px-4 py-2 rounded-sm text-sm font-medium hover:border-ink transition flex items-center gap-1.5"
            >
              <User size={14} /> Edit name
            </button>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={<BookOpen size={16} className="text-gold" />} label="Courses" value={stats.total_courses} />
            <StatCard icon={<ListChecks size={16} className="text-gold" />} label="Lessons done" value={stats.completed_lessons} />
            <StatCard icon={<Clock size={16} className="text-gold" />} label="Minutes learning" value={stats.minutes_spent} />
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="border border-line rounded-sm bg-surface p-4">
      <div className="mb-2">{icon}</div>
      <p className="text-xs font-mono uppercase text-muted mb-1">{label}</p>
      <p className="font-display text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}