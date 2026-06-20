"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, Wrench, AlertCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/app/ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
  actions?: { tool: string; ok: boolean }[];
}

const SUGGESTIONS = [
  "Give me an inventory summary",
  "Which products are low on stock?",
  "Add 20 units to barcode 12345",
  "Create a report of my assets",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .aiStatus()
      .then((s) => setEnabled(s.enabled))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setErr(null);

    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const res = await api.aiChat(next.map((m) => ({ role: m.role, content: m.content })));
      setMessages([
        ...next,
        { role: "assistant", content: res.reply, actions: res.actions },
      ]);
    } catch (e) {
      const message =
        e instanceof ApiError ? e.message : "Something went wrong talking to the assistant.";
      setErr(message);
      // Roll back the unanswered user turn so they can retry cleanly.
      setMessages(messages);
      setInput(trimmed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="AI Assistant"
        description="Ask questions, build reports, and take actions across your inventory — in plain English."
      />

      {enabled === false && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} />
          The AI assistant isn&apos;t enabled yet. An admin needs to set{" "}
          <code className="font-mono">ANTHROPIC_API_KEY</code> on the API.
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-ink-100 bg-white p-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-2xl bg-brand-50 p-4">
              <Sparkles className="text-brand-600" size={28} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-ink-900">
              How can I help with your inventory?
            </h3>
            <p className="mt-1 max-w-md text-sm text-ink-500">
              I can read your stock, generate reports, and take actions like adding
              products or adjusting quantities — all within your permissions.
            </p>
            <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={busy || enabled === false}
                  className="rounded-lg border border-ink-100 bg-ink-50 px-3 py-2.5 text-left text-sm text-ink-700 transition hover:border-brand-200 hover:bg-brand-50 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-ink-400">
            <Loader2 size={15} className="animate-spin" /> Thinking…
          </div>
        )}
      </div>

      {err && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-600">
          <AlertCircle size={14} /> {err}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-end gap-2"
      >
        <textarea
          className="input min-h-[48px] flex-1 resize-none py-3"
          placeholder="Ask the assistant…  (e.g. ‘scan out 5 units of barcode 998’)"
          rows={1}
          value={input}
          disabled={enabled === false}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button
          type="submit"
          className="btn-primary h-12 px-4"
          disabled={busy || !input.trim() || enabled === false}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-4 py-2.5 text-sm text-white"
            : "max-w-[85%] rounded-2xl rounded-bl-sm bg-ink-50 px-4 py-2.5 text-sm text-ink-800"
        }
      >
        <p className="whitespace-pre-wrap">{msg.content}</p>
        {msg.actions && msg.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-ink-200/60 pt-2">
            {msg.actions.map((a, i) => (
              <span
                key={i}
                className={
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
                  (a.ok
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700")
                }
              >
                <Wrench size={11} />
                {a.tool}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
