"use client";

import { useState } from "react";
import PastRecords from "./PastRecords";

/**
 * Submit data, two kinds: this year's programs as they happen ("Current
 * records", the page content passed in) or years gone by, from memory ("Past
 * records (retroactive)").
 */
export default function RecordSwitch({ current }: { current: React.ReactNode }) {
  const [mode, setMode] = useState<"current" | "past">("current");
  const btn = (id: "current" | "past", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === id}
      onClick={() => setMode(id)}
      className={`rounded-xl px-5 py-2 text-base ${mode === id ? "bg-sun-200 font-medium text-slate-900 shadow-sm" : "text-slate-800 hover:text-slate-950"}`}
    >
      {label}
    </button>
  );
  return (
    <>
      <div className="mx-auto max-w-6xl px-6 pt-12">
        <div role="tablist" aria-label="Which records" className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5">
          {btn("current", "Current records")}
          {btn("past", "Past records (retroactive)")}
        </div>
      </div>
      {mode === "current" ? current : <PastRecords />}
    </>
  );
}
