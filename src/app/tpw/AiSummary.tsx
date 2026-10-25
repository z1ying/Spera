"use client";

import { useEffect, useRef, useState } from "react";
import type { Filters } from "@/lib/dashboard";
import type { Summary } from "@/lib/networkInsights";

/**
 * AI summary of the current view: a few business insights with a next step
 * each, written by Gemma from numbers recomputed on the server. Runs once on
 * load; after the filters change, TPW staff regenerate it when they want.
 */
export default function AiSummary({ filters }: { filters: Filters }) {
  const key = JSON.stringify(filters);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [forKey, setForKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tpw/insights", { method: "POST", headers: { "content-type": "application/json" }, body: key });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not write the summary.");
      setSummary(out);
      setForKey(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write the summary.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stale = summary && forKey !== key;

  return (
    <section aria-label="AI summary" className="mt-8 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-sun-100 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-800 text-white">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9zM5 15l.7 1.6L7.3 17l-1.6.7L5 19.3l-.7-1.6L2.7 17l1.6-.4z" />
            </svg>
          </span>
          <div>
            <h2 className="font-serif text-2xl text-slate-900">AI summary</h2>
            <p className="text-xs text-slate-500">Insights and next steps from the numbers in this view</p>
          </div>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className={`rounded-lg px-4 py-2 text-sm font-medium print:hidden ${
            stale ? "bg-brand-800 text-white hover:bg-brand-900" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          } disabled:opacity-50`}
        >
          {busy ? "Analyzing…" : stale ? "Update for these filters" : "Regenerate"}
        </button>
      </div>

      {busy && !summary && (
        <div className="mt-5 grid gap-3 md:grid-cols-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      )}
      {error && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>}

      {summary && (
        <div className={busy ? "opacity-50" : ""}>
          {stale && <p className="mt-3 text-xs text-amber-800">The filters changed since this summary was written.</p>}
          {summary.headline && <p className="mt-4 text-base font-medium text-slate-900">{summary.headline}</p>}
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {summary.insights.map((i, n) => (
              <li key={n} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="flex items-baseline gap-2 text-sm font-semibold text-slate-900">
                  <span className="text-brand-800">{n + 1}</span>
                  {i.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{i.finding}</p>
                {i.recommendation && (
                  <p className="mt-2 rounded-lg bg-sun-100 px-3 py-2 text-sm text-slate-800">
                    <span className="font-semibold">Next step: </span>
                    {i.recommendation}
                  </p>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-500">
            Written by Gemma from the figures on this page only. Associations, not causes — check before sharing outside TPW.
          </p>
        </div>
      )}
    </section>
  );
}
