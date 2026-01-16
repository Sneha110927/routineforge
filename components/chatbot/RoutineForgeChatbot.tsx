"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X, Sparkles } from "lucide-react";

type Role = "assistant" | "user";

type ChatMsg = {
  id: string;
  role: Role;
  text: string;
  time: string;
};

function nowHHMM(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function uid(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const QUICK = [
  "What should I eat today?",
  "How do I stay motivated?",
  "Best workout for beginners?",
  "Tips for better sleep?",
] as const;

export default function RoutineForgeChatbot() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");

  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      id: uid(),
      role: "assistant",
      text:
        "Hi! I’m your RoutineForge AI assistant. I can help you with questions about your routine, meal planning, workouts, and healthy lifestyle tips. How can I help you today?",
      time: nowHHMM(),
    },
  ]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  const canSend = useMemo(() => input.trim().length > 0 && !busy, [input, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setInput("");

    const userMsg: ChatMsg = {
      id: uid(),
      role: "user",
      text: trimmed,
      time: nowHHMM(),
    };
    setMessages((p) => [...p, userMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const raw = await res.text();
      let data: { ok: boolean; reply?: string; message?: string };
      try {
        data = raw ? (JSON.parse(raw) as { ok: boolean; reply?: string; message?: string }) : { ok: false, message: "Empty response" };
      } catch {
        data = { ok: false, message: "Invalid response" };
      }

      const replyText =
        res.ok && data.ok && typeof data.reply === "string"
          ? data.reply
          : data.message ?? "Sorry, I couldn’t answer that right now.";

      const botMsg: ChatMsg = {
        id: uid(),
        role: "assistant",
        text: replyText,
        time: nowHHMM(),
      };
      setMessages((p) => [...p, botMsg]);
    } catch {
      setMessages((p) => [
        ...p,
        { id: uid(), role: "assistant", text: "Network error. Please try again.", time: nowHHMM() },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "grid h-14 w-14 place-items-center rounded-full",
          "bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 active:scale-[0.99]"
        )}
        aria-label="Open chatbot"
      >
        <MessageCircle size={22} />
      </button>

      {/* Panel */}
      {open ? (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_25px_80px_rgba(0,0,0,0.22)]">
            {/* Header */}
            <div className="flex items-center justify-between bg-emerald-600 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15">
                  <Bot size={18} />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">RoutineForge AI</p>
                  <p className="text-xs opacity-90">Always here to help</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-xl hover:bg-white/15"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="bg-white">
              <div ref={listRef} className="h-[340px] overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn("mb-4 flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {m.role === "assistant" ? (
                      <div className="mr-2 mt-1 grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                        <Sparkles size={14} />
                      </div>
                    ) : null}

                    <div className="max-w-[78%]">
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          m.role === "user"
                            ? "bg-emerald-600 text-white"
                            : "border border-slate-200 bg-white text-slate-800"
                        )}
                      >
                        {m.text}
                      </div>
                      <div className={cn("mt-1 text-[11px] text-slate-400", m.role === "user" ? "text-right" : "text-left")}>
                        {m.time}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-2">
                  <p className="mb-2 text-xs text-slate-500">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK.map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={busy}
                        onClick={() => send(q)}
                        className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-slate-100 bg-white px-4 py-3">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") send(input);
                    }}
                    disabled={busy}
                  />

                  <button
                    type="button"
                    onClick={() => send(input)}
                    disabled={!canSend}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-xl",
                      canSend ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-200 text-slate-500"
                    )}
                    aria-label="Send"
                  >
                    <Send size={16} />
                  </button>
                </div>

                <p className="mt-2 text-center text-[11px] text-slate-400">
                  AI assistant for health & routine guidance
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
