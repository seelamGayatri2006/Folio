"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ChatCompanion from "@/components/ChatCompanion";
import { api, getToken } from "@/lib/api";
import { CheckCircle2, Circle, Clock, Target, ListTree, Loader2, Search } from "lucide-react";

export default function CoursePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  async function load() {
    const c = await api.getCourse(params.id);
    setCourse(c);
    setLoading(false);
    return c;
  }

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    load();
  }, [params.id]);

  // Poll while the course is still being generated
  useEffect(() => {
    if (course?.status !== "generating") return;
    const interval = setInterval(() => load(), 4000);
    return () => clearInterval(interval);
  }, [course?.status]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    const results = await api.searchCourse(params.id, query);
    setSearchResults(results);
  }

  if (loading || !course) {
    return (
      <main className="min-h-screen bg-paper">
        <Navbar />
        <p className="text-center text-muted font-mono text-sm mt-20">Loading course…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-10 grid md:grid-cols-[3rem_1fr] gap-8">
        {/* Signature spine progress rail */}
        <div className="hidden md:flex flex-col items-center gap-1 sticky top-20 h-fit">
          <div className="w-3 rounded-full bg-line overflow-hidden" style={{ height: `${Math.max(course.chapters.length * 40, 120)}px` }}>
            <div
              className="w-full bg-gradient-to-b from-gold to-[#A87F2E] transition-all"
              style={{ height: `${course.completion_pct}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-muted mt-2">{course.completion_pct}%</span>
        </div>

        <div>
          {course.status === "generating" && (
            <div className="flex items-center gap-2 bg-gold-dim/40 border border-gold text-ink text-sm px-4 py-3 rounded-sm mb-6">
              <Loader2 size={15} className="animate-spin" />
              Folio is still writing this course — chapters will appear as they're ready.
            </div>
          )}
          {course.status === "failed" && (
            <div className="bg-danger/10 border border-danger text-danger text-sm px-4 py-3 rounded-sm mb-6">
              Course generation failed. Try re-uploading the PDF.
            </div>
          )}

          <h1 className="font-display text-3xl font-semibold text-ink">{course.title}</h1>
          <p className="text-muted text-sm mt-2 max-w-2xl leading-relaxed">{course.description}</p>

          <div className="flex flex-wrap gap-4 mt-5 text-sm">
            <Meta icon={<Clock size={14} />} text={`${course.estimated_minutes} min`} />
            <Meta icon={<Target size={14} />} text={course.difficulty} />
            <Meta icon={<ListTree size={14} />} text={`${course.chapters.length} chapters`} />
          </div>

          {course.objectives?.length > 0 && (
            <div className="mt-6 grid sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-mono uppercase text-muted mb-2">You'll learn</p>
                <ul className="text-sm text-ink/80 space-y-1">
                  {course.objectives.map((o: string, i: number) => (
                    <li key={i}>• {o}</li>
                  ))}
                </ul>
              </div>
              {course.prerequisites?.length > 0 && (
                <div>
                  <p className="text-xs font-mono uppercase text-muted mb-2">Prerequisites</p>
                  <ul className="text-sm text-ink/80 space-y-1">
                    {course.prerequisites.map((p: string, i: number) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSearch} className="mt-8 relative max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chapters, lessons, keywords…"
              className="w-full border border-line rounded-sm pl-9 pr-3 py-2 text-sm bg-surface focus:border-cover outline-none"
            />
          </form>

          {searchResults && (
            <div className="mt-3 border border-line rounded-sm bg-surface divide-y divide-line">
              {searchResults.length === 0 ? (
                <p className="text-sm text-muted p-3">No matches.</p>
              ) : (
                searchResults.map((r, i) => (
                  <Link
                    key={i}
                    href={r.type === "lesson" ? `/course/${params.id}/lesson/${r.lesson_id}` : `#chapter-${r.chapter_id}`}
                    className="block p-3 text-sm hover:bg-paper"
                  >
                    <span className="text-xs font-mono uppercase text-muted mr-2">{r.type}</span>
                    {r.title}
                  </Link>
                ))
              )}
            </div>
          )}

          <div className="mt-10 space-y-6">
            {course.chapters.map((ch: any, idx: number) => (
              <div key={ch.id} id={`chapter-${ch.id}`} className="border border-line rounded-md bg-surface overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                  <div>
                    <p className="text-xs font-mono text-muted">Chapter {idx + 1}</p>
                    <h2 className="font-display font-semibold text-ink">{ch.title}</h2>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-gold">{ch.completion_pct}%</p>
                    <Link
                      href={`/course/${params.id}/quiz/${ch.id}`}
                      className="text-xs text-cover font-medium hover:underline"
                    >
                      Take quiz →
                    </Link>
                  </div>
                </div>
                <ul>
                  {ch.lessons.map((l: any) => (
                    <li key={l.id}>
                      <Link
                        href={`/course/${params.id}/lesson/${l.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-paper transition text-sm border-b border-line last:border-b-0"
                      >
                        {l.completed ? (
                          <CheckCircle2 size={16} className="text-success shrink-0" />
                        ) : (
                          <Circle size={16} className="text-line shrink-0" />
                        )}
                        <span className="text-ink/90">{l.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {course.chapters.length === 0 && course.status === "generating" && (
              <p className="text-sm text-muted font-mono">Writing the first chapter…</p>
            )}
          </div>
        </div>
      </div>

      <ChatCompanion courseId={params.id} courseTitle={course.title} />
    </main>
  );
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-ink/70 bg-paper border border-line rounded-full px-3 py-1">
      {icon} {text}
    </span>
  );
}
