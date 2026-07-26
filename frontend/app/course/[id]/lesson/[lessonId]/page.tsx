"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Navbar from "@/components/Navbar";
import ChatCompanion from "@/components/ChatCompanion";
import { api, getToken } from "@/lib/api";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Lightbulb, AlertCircle, Globe2 } from "lucide-react";

export default function LessonPage({ params }: { params: { id: string; lessonId: string } }) {
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [lesson, setLesson] = useState<any>(null);
  const [flatLessons, setFlatLessons] = useState<any[]>([]);
  const [chapterTitle, setChapterTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api.getCourse(params.id).then((c) => {
      setCourse(c);
      const flat: any[] = [];
      let found: any = null;
      let foundChapterTitle = "";
      for (const ch of c.chapters) {
        for (const l of ch.lessons) {
          flat.push(l);
          if (l.id === params.lessonId) {
            found = l;
            foundChapterTitle = ch.title;
          }
        }
      }
      setFlatLessons(flat);
      setLesson(found);
      setChapterTitle(foundChapterTitle);
      setLoading(false);
    });
  }, [params.id, params.lessonId]);

  async function toggleComplete() {
    if (!lesson) return;
    setSaving(true);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);
    try {
      await api.markLesson(lesson.id, !lesson.completed, timeSpent);
      setLesson({ ...lesson, completed: !lesson.completed });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !lesson) {
    return (
      <main className="min-h-screen bg-paper">
        <Navbar />
        <p className="text-center text-muted font-mono text-sm mt-20">Loading lesson…</p>
      </main>
    );
  }

  const idx = flatLessons.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? flatLessons[idx - 1] : null;
  const next = idx < flatLessons.length - 1 ? flatLessons[idx + 1] : null;

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href={`/course/${params.id}`} className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-6">
          <ArrowLeft size={14} /> Back to course
        </Link>

        <p className="text-xs font-mono uppercase text-muted mb-1">{chapterTitle}</p>
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold text-ink">{lesson.title}</h1>
          <button
            onClick={toggleComplete}
            disabled={saving}
            className={`shrink-0 flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-sm border transition ${
              lesson.completed
                ? "bg-success/10 border-success text-success"
                : "border-line text-ink/70 hover:border-cover"
            }`}
          >
            {lesson.completed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
            {lesson.completed ? "Completed" : "Mark complete"}
          </button>
        </div>

        <div className="prose-lesson mt-8">
          <ReactMarkdown>{lesson.content_markdown || ""}</ReactMarkdown>
        </div>

        {lesson.key_takeaways?.length > 0 && (
          <SidePanel icon={<Lightbulb size={16} className="text-gold" />} title="Key takeaways" items={lesson.key_takeaways} />
        )}
        {lesson.important_notes?.length > 0 && (
          <SidePanel icon={<AlertCircle size={16} className="text-cover" />} title="Important notes" items={lesson.important_notes} />
        )}
        {lesson.real_world_examples?.length > 0 && (
          <SidePanel icon={<Globe2 size={16} className="text-success" />} title="Real-world examples" items={lesson.real_world_examples} />
        )}

        {lesson.summary && (
          <div className="mt-8 border-t border-line pt-6">
            <p className="text-xs font-mono uppercase text-muted mb-2">Summary</p>
            <p className="text-sm text-ink/80 leading-relaxed">{lesson.summary}</p>
          </div>
        )}

        <div className="flex justify-between mt-12 pt-6 border-t border-line">
          {prev ? (
            <Link href={`/course/${params.id}/lesson/${prev.id}`} className="text-sm text-ink/70 hover:text-ink flex items-center gap-1">
              <ArrowLeft size={14} /> {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/course/${params.id}/lesson/${next.id}`} className="text-sm text-cover font-medium flex items-center gap-1">
              {next.title} <ArrowRight size={14} />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>

      {course && <ChatCompanion courseId={params.id} courseTitle={course.title} />}
    </main>
  );
}

function SidePanel({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="mt-6 border border-line rounded-sm bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs font-mono uppercase text-muted">{title}</p>
      </div>
      <ul className="text-sm text-ink/80 space-y-1.5">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
