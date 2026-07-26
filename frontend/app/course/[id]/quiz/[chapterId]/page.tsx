"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { api, getToken } from "@/lib/api";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

export default function QuizPage({ params }: { params: { id: string; chapterId: string } }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api
      .getQuiz(params.chapterId)
      .then(setQuiz)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params.chapterId]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await api.submitQuiz(params.chapterId, answers);
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href={`/course/${params.id}`} className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-6">
          <ArrowLeft size={14} /> Back to course
        </Link>

        <h1 className="font-display text-3xl font-semibold text-ink mb-8">Chapter quiz</h1>

        {loading && <p className="text-muted font-mono text-sm">Loading quiz…</p>}
        {error && <p className="text-danger text-sm">{error}</p>}

        {quiz && !result && (
          <div className="space-y-8">
            {quiz.questions.map((q: any, i: number) => (
              <div key={q.id} className="border border-line rounded-md bg-surface p-5">
                <p className="text-xs font-mono text-muted mb-2">Question {i + 1}</p>
                <p className="font-medium text-ink mb-4">{q.question}</p>

                {q.type === "short_answer" ? (
                  <input
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Your answer"
                    className="w-full border border-line rounded-sm px-3 py-2 text-sm focus:border-cover outline-none"
                  />
                ) : (
                  <div className="space-y-2">
                    {q.options.map((opt: string) => (
                      <label
                        key={opt}
                        className={`flex items-center gap-2 border rounded-sm px-3 py-2 text-sm cursor-pointer transition ${
                          answers[q.id] === opt ? "border-cover bg-cover/5" : "border-line"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                          className="accent-cover"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length === 0}
              className="w-full bg-ink text-paper py-3 rounded-sm font-medium hover:bg-cover transition disabled:opacity-50"
            >
              {submitting ? "Scoring…" : "Submit quiz"}
            </button>
          </div>
        )}

        {result && (
          <div>
            <div className="text-center border border-line rounded-md bg-surface p-8 mb-8">
              <p className="text-xs font-mono uppercase text-muted mb-2">Your score</p>
              <p className="font-display text-5xl font-semibold text-ink">{result.score}%</p>
              <p className="text-sm text-muted mt-1">
                {result.results.filter((r: any) => r.is_correct).length} of {result.total} correct
              </p>
            </div>

            <div className="space-y-4">
              {result.results.map((r: any, i: number) => (
                <div key={i} className={`border rounded-sm p-4 ${r.is_correct ? "border-success/40 bg-success/5" : "border-danger/40 bg-danger/5"}`}>
                  <div className="flex items-start gap-2">
                    {r.is_correct ? (
                      <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-danger mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-ink">{r.question}</p>
                      <p className="text-xs text-muted mt-1">
                        Your answer: <span className="font-mono">{r.your_answer || "—"}</span>
                        {!r.is_correct && (
                          <>
                            {" · "}Correct: <span className="font-mono">{r.correct_answer}</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-ink/70 mt-1.5">{r.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href={`/course/${params.id}`}
              className="block text-center mt-8 bg-cover text-white py-3 rounded-sm font-medium hover:bg-cover-dim transition"
            >
              Back to course
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
