import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowRight, Sparkles, MessageCircleQuestion, ListChecks } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-paper">
      <Navbar />

      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="font-mono text-xs tracking-widest text-cover uppercase mb-4">
            Any PDF → a course you can finish
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-ink leading-[1.05] tracking-tight">
            Turn a stack of pages into a course with a spine.
          </h1>
          <p className="font-serif text-lg text-ink/70 mt-6 max-w-md leading-relaxed">
            Upload a textbook, paper, or manual. Folio structures it into chapters and
            lessons, tracks what you've learned, and gives you an AI companion that
            actually knows the material.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/signup"
              className="bg-ink text-paper px-6 py-3 rounded-sm font-medium flex items-center gap-2 hover:bg-cover transition"
            >
              Start reading <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="border border-line px-6 py-3 rounded-sm font-medium text-ink hover:border-ink transition"
            >
              I have an account
            </Link>
          </div>
        </div>

        {/* Signature visual: a shelf of book spines, varying gold-fill = progress */}
        <div className="bg-ink rounded-md p-8 flex items-end justify-center gap-3 h-80">
          {[
            { h: "h-48", fill: "70%" },
            { h: "h-64", fill: "35%" },
            { h: "h-40", fill: "95%" },
            { h: "h-56", fill: "15%" },
            { h: "h-44", fill: "55%" },
          ].map((b, i) => (
            <div key={i} className={`relative w-10 ${b.h} bg-[#1F2A25] rounded-t-sm overflow-hidden`}>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#A87F2E] to-gold" style={{ height: b.fill }} />
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-8">
        <Feature
          icon={<Sparkles size={20} className="text-gold" />}
          title="AI-structured chapters"
          desc="Objectives, prerequisites, and lessons generated straight from your document's own content — not generic filler."
        />
        <Feature
          icon={<MessageCircleQuestion size={20} className="text-gold" />}
          title="A companion that's read it"
          desc="Ask questions, request summaries, or get quizzed — grounded in your PDF via retrieval, not guesswork."
        />
        <Feature
          icon={<ListChecks size={20} className="text-gold" />}
          title="Progress that persists"
          desc="Every lesson, quiz score, and chat is saved to your account so you can pick up exactly where you left off."
        />
      </section>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="border-t border-line pt-5">
      <div className="mb-3">{icon}</div>
      <h3 className="font-display font-semibold text-ink mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed">{desc}</p>
    </div>
  );
}
