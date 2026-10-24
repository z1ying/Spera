"use client";

import type { OrgSummary } from "@/lib/orgSummary";
import { fmt } from "@/lib/orgSummary";
import { HBars, Ring, Stat, YearColumns } from "./viz";

/**
 * An organization's one-page program report (design doc §28): what it
 * delivered, as TPW counts it. Shown right after a submission and on
 * /report (printable). Numbers come only from the runs it reported.
 */
export default function ReportView({ s }: { s: OrgSummary }) {
  const n = s.numbers;
  const span = s.yearFrom === null ? "" : s.yearFrom === s.yearTo ? `${s.yearFrom}` : `${s.yearFrom}–${s.yearTo}`;
  const womens = s.byPrison.filter((p) => p.womens).map((p) => p.code);
  const today = new Date().toLocaleDateString("en-US", { dateStyle: "long" });

  if (s.runs === 0) return <p className="text-slate-600">No programs reported yet for {s.org}.</p>;

  return (
    <article className="report-page space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-emerald-800 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Program report {span && `· ${span}`}</p>
          <h2 className="text-2xl font-semibold">{s.org}</h2>
          <p className="text-sm text-slate-600">{s.programs.join(" · ")}</p>
        </div>
        <p className="text-xs text-slate-500">TPW network · {today}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
        <div className="rounded-2xl bg-emerald-800 p-6 text-white">
          <div className="text-5xl font-semibold tabular-nums tracking-tight">{fmt(n.participantHours)}</div>
          <div className="mt-2 text-sm font-medium text-emerald-50">participant programming hours delivered</div>
          <div className="text-xs text-emerald-100">{fmt(n.completed)} people completed × course length</div>
        </div>
        <Ring value={n.completionRate} label="of participants completed their program" />
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat value={fmt(n.participants)} label="Participants" />
        <Stat value={fmt(n.completed)} label="Completed" />
        <Stat value={fmt(s.runs)} label="Program runs" sub={n.inProgressRuns ? `${n.inProgressRuns} in progress` : undefined} />
        <Stat value={fmt(s.byPrison.length)} label="Prisons" />
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Participant programming hours by year</h3>
          <YearColumns data={s.byYear} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Where you programmed</h3>
          <HBars
            rows={s.byPrison.slice(0, 8).map((p) => ({
              key: p.code,
              label: (
                <>
                  {p.code}
                  {p.underserved && <span className="ml-1 text-emerald-800">★</span>}
                </>
              ),
              value: p.participantHours,
              title: `${p.name}: ${fmt(p.participants)} participants, ${fmt(p.completed)} completed, ${fmt(p.participantHours)} participant hours`,
            }))}
          />
          {s.byPrison.length > 8 && <p className="mt-2 text-xs text-slate-500">+{s.byPrison.length - 8} more prisons</p>}
          <p className="mt-3 text-xs text-slate-500">★ underserved prison in CDCR&apos;s RIGHT Grant 4.0</p>
        </div>
      </section>

      {(s.signals.underservedInstitutions.length > 0 || womens.length > 0 || s.signals.languages.length > 0) && (
        <section className="flex flex-wrap gap-2 text-sm">
          {s.signals.underservedInstitutions.length > 0 && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-900">
              Underserved prisons served: {s.signals.underservedInstitutions.join(", ")}
            </span>
          )}
          {womens.length > 0 && <span className="rounded-full bg-slate-100 px-3 py-1">Women&apos;s prisons: {womens.join(", ")}</span>}
          {s.signals.languages.length > 0 && <span className="rounded-full bg-slate-100 px-3 py-1">Taught in {s.signals.languages.join(", ")}</span>}
        </section>
      )}

      <footer className="border-t border-slate-200 pt-2 text-[0.7rem] text-slate-500">
        Reported to Transformative Programming Works through ImpactLink. Participant programming hours = participants completed ×
        total programming hours (TPW&apos;s definition). Counts only — no individual data.
      </footer>
    </article>
  );
}
