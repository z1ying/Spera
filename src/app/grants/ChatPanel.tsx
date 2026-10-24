"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Draft our Program Summary for RIGHT 4.0",
  "Explain our estimated points and how to raise them",
  "Which documents do we still need to prepare?",
  "Write a short paragraph about our results",
];

/**
 * Grant-writing chat (design doc §28). Drafts are grounded in the
 * organization's reported numbers on the server; the browser only sends the
 * organization's name and the conversation.
 */
export default function ChatPanel({ org }: { org: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [org]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/assistant", { method: "POST", body: JSON.stringify({ org, messages: next }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "The assistant could not answer.");
      setMessages([...next, { role: "assistant", content: body.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The assistant could not answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-semibold">Grant writing assistant</h2>
        <p className="text-xs text-slate-500">
          Drafts for {org}&apos;s RIGHT 4.0 application, using only the numbers you&apos;ve reported. Powered by Gemma.
        </p>
      </header>

      <div className="max-h-[60vh] min-h-80 flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-slate-600">Start with one of these, or ask anything about the application:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-left text-sm hover:border-emerald-700 hover:bg-emerald-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-800 px-4 py-2 text-sm text-white">
              {m.content}
            </div>
          ) : (
            <div key={i} className="max-w-[95%]">
              <div className="whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-900">
                {m.content}
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(m.content);
                    setCopied(i);
                  } catch {
                    setCopied(null);
                  }
                }}
                className="mt-1 text-xs text-slate-500 underline"
              >
                {copied === i ? "Copied" : "Copy"}
              </button>
            </div>
          ),
        )}
        {busy && <p className="text-sm text-slate-500">Writing…</p>}
        {error && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{error}</p>}
        <div ref={end} />
      </div>

      <form
        className="border-t border-slate-100 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <div className="flex gap-2">
          <textarea
            aria-label="Message the assistant"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={2}
            placeholder="e.g. Our class meets twice a week for 2 hours, 20 people. Add that to the summary."
            className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="self-end rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-40"
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-[0.7rem] text-slate-500">
          AI-drafted text must be reviewed by your team and disclosed on the RFA&apos;s GenAI reporting form. Don&apos;t type names or
          ID numbers of participants.
        </p>
      </form>
    </section>
  );
}
