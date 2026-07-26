"use client";

import Link from "next/link";

const DIFFICULTY_HEIGHT: Record<string, string> = {
  beginner: "h-56",
  intermediate: "h-64",
  advanced: "h-72",
};

export default function Spine({
  id,
  title,
  difficulty,
  completionPct,
  status,
}: {
  id: string;
  title: string;
  difficulty: string;
  completionPct: number;
  status: string;
}) {
  const height = DIFFICULTY_HEIGHT[difficulty] || "h-56";

  return (
    <Link href={`/course/${id}`} className="group flex flex-col items-center gap-2 w-16 shrink-0">
      <div className={`spine w-16 ${height} flex items-end justify-center pb-3 shadow-lg`}>
        <div className="spine-fill w-full" style={{ height: `${Math.max(completionPct, status === "generating" ? 8 : 3)}%` }} />
        <span className="spine-title relative z-10 text-gold-dim text-xs font-medium tracking-wide max-h-[85%] overflow-hidden line-clamp-1">
          {title}
        </span>
      </div>
      <div className="text-center">
        <p className="font-mono text-[11px] text-muted">
          {status === "generating" ? "generating…" : `${completionPct}%`}
        </p>
      </div>
    </Link>
  );
}
