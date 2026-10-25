"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { OrgSummary } from "@/lib/orgSummary";
import { fmt } from "@/lib/orgSummary";
import { Ring, Stat } from "./viz";

/** What the organization just submitted, exactly as entered. */
export interface SubmittedRun {
  orgName: string;
  programName: string;
  facilityName: string;
  underserved: boolean;
  status: string;
  programYear: number | null;
  totalHours: number | null;
  participants: number | null;
  completed: number | null;
  participantHours: number | null;
}

const show = (v: number | null) => (v === null ? "—" : fmt(v));

/**
 * Pops up right after a submission (design doc §28). It leads with the
 * program run the organization just entered — its own numbers and TPW's
 * calculation — then one line on the organization's running total.
 */
export default function ReportModal({ s, run, onClose }: { s: OrgSummary; run: SubmittedRun; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const completionRate =
    run.participants && run.completed !== null ? Math.min(1, run.completed / run.participants) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-report-title"
        className="w-full max-w-3xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 sm:px-8">
          <div>
            <p className="text-sm font-medium text-brand-800">✓ Thank you — your program is in</p>
            <h2 id="run-report-title" className="mt-1 text-2xl font-semibold">
              {run.programName}
            </h2>
            <p className="text-sm text-slate-600">
              {run.orgName} · {run.facilityName}
              {run.underserved && <span className="ml-1 text-brand-800">★ RIGHT 4.0 underserved prison</span>}
              {" · "}
              {run.status}
              {run.programYear !== null && ` · Program year ${run.programYear}`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-3 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100">
            ×
          </button>
        </div>

        <div className="space-y-4 px-6 py-6 sm:px-8">
          <section className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-sun-500 p-6 text-white">
              <div className="text-5xl font-semibold tabular-nums tracking-tight">{show(run.participantHours)}</div>
              <div className="mt-2 text-sm font-medium text-brand-50">participant programming hours</div>
              <div className="text-xs text-brand-100">
                {run.participantHours === null
                  ? "Add how many completed once the program finishes."
                  : `${fmt(run.completed!)} completed × ${fmt(run.totalHours!)} hours`}
              </div>
            </div>
            <Ring value={completionRate} label="completed the program" />
          </section>
          <section className="grid grid-cols-3 gap-4">
            <Stat value={show(run.totalHours)} label="Course hours" sub="per participant" />
            <Stat value={show(run.participants)} label="Took part" />
            <Stat value={show(run.completed)} label="Completed" />
          </section>
        </div>

        <div className="mx-6 mb-6 rounded-xl bg-slate-50 px-5 py-4 text-sm sm:mx-8">
          <span className="font-medium">{s.org} so far</span>
          <span className="text-slate-600">
            {" "}
            — all programs reported to TPW, including this one: {fmt(s.numbers.participantHours)} participant programming hours ·{" "}
            {fmt(s.numbers.participants)} participants · {fmt(s.runs)} program runs at {fmt(s.byPrison.length)} prisons
          </span>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4 sm:px-8">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
            Report another program
          </button>
          <Link href="/report" className="rounded-lg bg-brand-800 px-5 py-2 text-sm font-medium text-white hover:bg-brand-900">
            My report &amp; download →
          </Link>
        </div>
      </div>
    </div>
  );
}
