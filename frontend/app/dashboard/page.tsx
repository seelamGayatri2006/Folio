"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Spine from "@/components/Spine";
import { api, getToken } from "@/lib/api";
import { UploadCloud } from "lucide-react";

type CourseSummary = {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  status: string;
  completion_pct: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    Promise.all([api.listCourses(), api.dashboardStats()])
      .then(([c, s]) => {
        setCourses(c);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">Your shelf</h1>
            <p className="text-muted text-sm mt-1">Every PDF you've turned into a course.</p>
          </div>
          <Link
            href="/upload"
            className="bg-cover text-white px-4 py-2.5 rounded-sm font-medium flex items-center gap-2 hover:bg-cover-dim transition"
          >
            <UploadCloud size={16} /> Upload a PDF
          </Link>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <Stat label="Courses" value={stats.total_courses} />
            <Stat label="Lessons done" value={`${stats.completed_lessons}/${stats.total_lessons}`} />
            <Stat label="Avg. quiz score" value={stats.avg_quiz_score !== null ? `${stats.avg_quiz_score}%` : "—"} />
            <Stat label="Time learning" value={`${stats.minutes_spent} min`} />
          </div>
        )}

        {loading ? (
          <p className="text-muted font-mono text-sm">Loading your shelf…</p>
        ) : courses.length === 0 ? (
          <EmptyShelf />
        ) : (
          <div className="bg-ink rounded-md p-8 overflow-x-auto">
            <div className="flex items-end gap-4 min-w-max">
              {courses.map((c) => (
                <Spine
                  key={c.id}
                  id={c.id}
                  title={c.title}
                  difficulty={c.difficulty}
                  completionPct={c.completion_pct}
                  status={c.status}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border border-line rounded-sm p-4 bg-surface">
      <p className="text-xs font-mono uppercase tracking-wide text-muted mb-1">{label}</p>
      <p className="font-display text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function EmptyShelf() {
  return (
    <div className="border border-dashed border-line rounded-md py-20 text-center">
      <p className="font-display text-xl text-ink mb-2">Your shelf is empty</p>
      <p className="text-muted text-sm mb-6">Upload your first PDF and Folio will build the course for you.</p>
      <Link
        href="/upload"
        className="inline-block bg-ink text-paper px-5 py-2.5 rounded-sm font-medium hover:bg-cover transition"
      >
        Upload a PDF
      </Link>
    </div>
  );
}
