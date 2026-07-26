"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; created_at?: string };

export default function ChatCompanion({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      api.getChatHistory(courseId).then(setMessages).catch(() => {});
    }
  }, [open, courseId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const message = text || input;
    if (!message.trim() || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setSending(true);
    try {
      const reply = await api.sendChatMessage(courseId, message);
      setMessages((m) => [...m, { role: "assistant", content: reply.content }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: "I couldn't reach the model just now — try again in a moment." }]);
    } finally {
      setSending(false);
    }
  }

  const suggestions = ["Summarize this chapter", "Quiz me on what I've read", "What should I read next?"];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 bg-ink text-paper rounded-full w-14 h-14 flex items-center justify-center shadow-xl hover:bg-cover transition z-50"
        aria-label="Open AI learning companion"
      >
        <MessageCircle size={22} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[32rem] bg-surface border border-line rounded-md shadow-2xl flex flex-col z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-ink rounded-t-md">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-gold" />
          <div>
            <p className="text-paper text-sm font-medium leading-tight">Learning companion</p>
            <p className="text-paper/50 text-[11px] leading-tight">{courseTitle}</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-paper/70 hover:text-paper" aria-label="Close chat">
          <X size={18} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2 pt-4">
            <p className="text-sm text-muted text-center mb-4">Ask anything about this course.</p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left text-sm border border-line rounded-sm px-3 py-2 hover:border-cover transition text-ink/80"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-sm px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-cover text-white" : "bg-paper text-ink border border-line"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && <p className="text-xs text-muted font-mono">thinking…</p>}
      </div>

      <div className="border-t border-line p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a question…"
          className="flex-1 border border-line rounded-sm px-3 py-2 text-sm focus:border-cover outline-none"
        />
        <button
          onClick={() => send()}
          disabled={sending}
          className="bg-ink text-paper rounded-sm w-10 flex items-center justify-center hover:bg-cover transition disabled:opacity-50"
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
