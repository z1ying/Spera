"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { filterRuns, NO_FILTERS, SAVINGS_INPUTS, savingsEstimate, timeliness, yearTrend, type Filters } from "@/lib/dashboard";
import { groupTotals, missingFields, participantHours, programYear, right4Signals, totals, type Run, type Totals } from "@/lib/runs";
import MultiSelect from "./MultiSelect";

/** A run as it crosses from the server: dates as ISO strings. */
export type WireRun = Omit<Run, "startDate" | "endDate" | "submittedAt"> & { startDate: string | null; endDate: string | null; submittedAt: string | null };

const BRAND = "#2f3190";
const SUN = "#e3a92a";
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const money = (n: number) => `$${fmt(n)}`;
const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");
const date = (s: string | null) => (s ? new Date(s) : null);

const SOURCES = {
  cdcr: "https://www.cdcr.ca.gov/news/2024/02/13/cdcr-recidivism-report-finds-recidivism-rates-drop-2/",
  lao: "https://lao.ca.gov/policyareas/cj/6_cj_inmatecost",
};
const Cite = ({ n, href }: { n: number; href: string }) => (
  <a href={href} target="_blank" rel="noreferrer" className="align-super text-[0.65em] font-semibold text-brand-800 hover:underline">
    [{n}]
  </a>
);

function Icon({ d }: { d: React.ReactNode }) {
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-800">
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {d}
      </svg>
    </span>
  );
}
const ICONS = {
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
    </>
  ),
  cap: (
    <>
      <path d="M2 9l10-5 10 5-10 5z" />
      <path d="M6 11v5c3 2.5 9 2.5 12 0v-5" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M10 21v-4h4v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7">
      <div className="flex items-center gap-5">
        <Icon d={icon} />
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{label}</span>
      </div>
      <div className="mt-6 font-serif text-5xl tabular-nums text-slate-900">{value}</div>
      <div className="mt-2 h-6 text-lg text-brand-800">{sub}</div>
    </div>
  );
}

function FunnelBar({ label, value, of }: { label: string; value: number; of: number }) {
  const share = of ? value / of : 0;
  return (
    <div>
      <div className="flex justify-between text-lg">
        <span>{label}</span>
        <span className="font-medium tabular-nums">
          {fmt(value)} · {pct(share)}
        </span>
      </div>
      <div className="mt-2 h-4 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-800" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 w-full min-w-16 rounded bg-slate-100">
      <div className="h-2 rounded bg-brand-800" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

function TotalsRow({ label, t, max, extra }: { label: React.ReactNode; t: Totals; max: number; extra?: React.ReactNode }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-3">{label}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{t.runs}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{fmt(t.programmingHours)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{fmt(t.participants)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{fmt(t.completed)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{pct(t.completionRate)}</td>
      <td className="py-2 pr-3 text-right font-medium tabular-nums">{fmt(t.participantHours)}</td>
      <td className="w-32 py-2">
        <Bar value={t.participantHours} max={max} />
      </td>
      {extra}
    </tr>
  );
}

// Column names follow TPW's Collective Impact Report.
const HEAD = ["Runs", "Total programming hours", "Participants", "Completed", "Completion", "Total participant programming hours", ""];
const RIGHT_ALIGNED = 6;

function Table({ title, first, rows, extraHead }: { title: string; first: string; rows: React.ReactNode; extraHead?: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-1 pr-3">{first}</th>
              {[...HEAD, ...(extraHead ?? [])].map((h, i) => (
                <th key={i} className={`py-1 pr-3 align-bottom ${i < RIGHT_ALIGNED ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </section>
  );
}

function Timely({ title, sub, rows, max }: { title: string; sub: string; rows: { org: string; days: number }[]; max: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">{title}</p>
      <p className="mt-2 text-lg text-slate-600">{sub}</p>
      <ul className="mt-8 space-y-6">
        {rows.map((r) => (
          <li key={r.org}>
            <div className="flex justify-between text-lg">
              <span>{r.org}</span>
              <span className="font-semibold tabular-nums">{fmt(r.days)} days</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${max ? Math.max(4, (r.days / max) * 100) : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// TPW dashboard — design doc §28. Real data only: TPW's program-run reports
// plus what organizations submit on Spera. TPW staff only.
export default function Dashboard({ wire }: { wire: WireRun[] }) {
  const all = useMemo<Run[]>(
    () => wire.map((r) => ({ ...r, startDate: date(r.startDate), endDate: date(r.endDate), submittedAt: date(r.submittedAt) })),
    [wire],
  );
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const runs = useMemo(() => filterRuns(all, f), [all, f]);

  const options = useMemo(() => {
    const uniq = <T,>(xs: T[]) => [...new Set(xs)];
    const facilities = uniq(all.map((r) => r.facilityCode))
      .map((code) => ({ value: code, label: all.find((r) => r.facilityCode === code)!.facilityName }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const named = (xs: string[]) => uniq(xs).sort().map((v) => ({ value: v, label: v }));
    const years = uniq(all.map((r) => String(programYear(r) ?? "none")))
      .sort()
      .map((v) => ({ value: v, label: v === "none" ? "No start date" : v }));
    return { facilities, orgs: named(all.map((r) => r.orgName)), programs: named(all.map((r) => r.programName)), years };
  }, [all]);

  const t = totals(runs);
  const trend = yearTrend(runs);
  const savings = savingsEstimate(t.completed);
  const timely = timeliness(runs);
  const filtered = Object.values(f).some((v) => v.length > 0);
  // Fastest and slowest never overlap: with few organizations, each gets half.
  const fastest = timely.slice(0, Math.min(3, Math.ceil(timely.length / 2)));
  const slowest = timely.slice(fastest.length).reverse().slice(0, 3);
  const slowestDays = timely.length ? timely[timely.length - 1].days : 0;

  const orgs = groupTotals(runs, (r) => r.orgName).sort((a, b) => String(a.key).localeCompare(String(b.key)));
  const orgYears = orgs.map((o) => ({
    org: String(o.key),
    rows: groupTotals<number | string>(o.runs, (r) => programYear(r) ?? "No start date").sort((a, b) =>
      typeof a.key === "string" ? 1 : typeof b.key === "string" ? -1 : a.key - b.key,
    ),
  }));
  const prisons = groupTotals(runs, (r) => r.facilityCode).sort((a, b) => b.totals.participantHours - a.totals.participantHours);
  const incomplete = runs.filter((r) => missingFields(r).length > 0);
  const max = (xs: { totals: Totals }[]) => Math.max(0, ...xs.map((x) => x.totals.participantHours));
  const facilityOf = (code: string): Run => runs.find((r) => r.facilityCode === code)!;
  const chart = trend.map((y) => ({ ...y, label: y.openRuns ? `${y.year}*` : String(y.year) }));

  return (
    <main className="mx-auto max-w-7xl px-6 py-12 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">For TPW management</p>
          <h1 className="mt-3 font-serif text-5xl font-semibold tracking-tight text-slate-900">Network dashboard</h1>
          <p className="mt-4 text-xl text-slate-600">Process data reported by member organizations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <a href="/api/tpw/export" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-slate-700 hover:bg-slate-50">
            Download runs (CSV)
          </a>
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-brand-800 px-6 py-3 text-lg font-medium text-white hover:bg-brand-900">
            Generate report
          </button>
        </div>
      </div>

      <section aria-label="Filters" className="mt-12 print:hidden">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <MultiSelect label="Facility" options={options.facilities} value={f.facilities} onChange={(v) => setF({ ...f, facilities: v })} />
          <MultiSelect label="Organization" options={options.orgs} value={f.orgs} onChange={(v) => setF({ ...f, orgs: v })} />
          <MultiSelect label="Program" options={options.programs} value={f.programs} onChange={(v) => setF({ ...f, programs: v })} />
          <MultiSelect label="Year" options={options.years} value={f.years} onChange={(v) => setF({ ...f, years: v })} />
        </div>
        <button
          type="button"
          onClick={() => setF(NO_FILTERS)}
          disabled={!filtered}
          className="mt-4 rounded-lg px-4 py-2 font-medium text-slate-800 hover:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-transparent"
        >
          Reset
        </button>
      </section>

      <section aria-label="Core numbers" className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ICONS.people} label="Participants" value={fmt(t.participants)} sub={`${t.inProgressRuns + t.plannedRuns} runs still open`} />
        <Kpi icon={ICONS.cap} label="Completed" value={fmt(t.completed)} sub={t.completionRate === null ? undefined : `${pct(t.completionRate)} of finished runs`} />
        <Kpi icon={ICONS.building} label="Organizations" value={fmt(orgs.length)} sub={`${t.runs} program cohorts`} />
        <Kpi icon={ICONS.clock} label="Participant hours" value={fmt(t.participantHours)} sub="completed × programming hours" />
      </section>

      <section className="mt-16">
        <h2 className="font-serif text-4xl text-slate-900">{trend.length > 1 ? "Participation over time" : "Participation funnel"}</h2>
        {trend.length > 1 ? (
          <>
            <p className="mt-3 text-lg text-slate-600">Enrolled and completed by program year (year a cohort started).</p>
            <div className="mt-6 flex gap-6 text-sm">
              <span className="flex items-center gap-2">
                <span className="h-1 w-6 rounded" style={{ background: BRAND }} /> Enrolled
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1 w-6 rounded" style={{ background: SUN }} /> Completed
              </span>
            </div>
            <div className="mt-3 h-80 rounded-2xl border border-slate-200 bg-white p-4 pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 14 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 13 }} tickFormatter={(v: number) => fmt(v)} width={56} />
                  <Tooltip
                    formatter={(v, name) => [fmt(Number(v)), name === "participants" ? "Enrolled" : "Completed"]}
                    labelFormatter={(_, p) => {
                      const y = p?.[0]?.payload as (typeof chart)[number] | undefined;
                      return y ? `${y.year} · completion ${pct(y.completionRate)}${y.openRuns ? ` · ${y.openRuns} runs still open` : ""}` : "";
                    }}
                  />
                  <Line type="monotone" dataKey="participants" stroke={BRAND} strokeWidth={3} dot={{ r: 5, fill: BRAND }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="completed" stroke={SUN} strokeWidth={3} dot={{ r: 5, fill: SUN }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {chart.some((y) => y.openRuns) && (
              <p className="mt-3 text-sm text-slate-500">* Some cohorts that year are still planned or in progress, so their completions aren&apos;t in yet.</p>
            )}
          </>
        ) : (
          <div className="mt-8 space-y-8">
            <FunnelBar label="Enrolled" value={t.participants} of={t.participants} />
            <FunnelBar label="Completed" value={t.completed} of={t.participants} />
            {trend.length === 1 && <p className="text-sm text-slate-500">One program year selected — pick more years to see the trend.</p>}
          </div>
        )}
      </section>

      <section className="mt-16 border-t border-slate-200 pt-12">
        <h2 className="font-serif text-4xl text-slate-900">Estimated savings from avoided returns</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-sun-200 p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-800">Conservative (marginal cost)</p>
            <p className="mt-4 font-serif text-5xl tabular-nums text-slate-900">{money(savings.conservative)}</p>
            <p className="mt-3 text-lg text-slate-800">
              at {money(SAVINGS_INPUTS.marginalCost)} per person-year <Cite n={3} href={SOURCES.lao} />
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">Long-run capacity (average cost)</p>
            <p className="mt-4 font-serif text-5xl tabular-nums text-slate-900">{money(savings.capacity)}</p>
            <p className="mt-3 text-lg text-slate-600">
              at {money(SAVINGS_INPUTS.averageCost)} per person-year <Cite n={3} href={SOURCES.lao} />
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Based on the current filtered view: {fmt(t.completed)} people completed a program. If they return to prison at the rate CDCR
          reports for people who earned rehabilitative credits ({pct(SAVINGS_INPUTS.creditRate)}) instead of the no-credit rate (
          {pct(SAVINGS_INPUTS.noCreditRate)}) <Cite n={2} href={SOURCES.cdcr} />, about {fmt(savings.avoidedReturns)} returns are avoided — one year
          of incarceration each. Association, not causation.
        </p>
      </section>

      <section className="mt-16">
        <h2 className="font-serif text-4xl text-slate-900">Reporting timeliness</h2>
        <p className="mt-3 text-lg text-slate-600">How long organizations take to report data after a program ends. This measures timing, not program results.</p>
        {timely.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-slate-600">
            Nothing to show yet. Timing starts with programs organizations report on Spera after they end — the records imported from
            TPW&apos;s spreadsheet and past-year estimates don&apos;t say when they were reported.
          </p>
        ) : (
          <>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {fastest.length > 0 && slowest.length > 0 ? (
                <>
                  <Timely title="Most timely reports" sub="Shortest time between program end and report" rows={fastest} max={slowestDays} />
                  <Timely title="Least timely reports" sub="Organizations TPW may want to check in with" rows={slowest} max={slowestDays} />
                </>
              ) : (
                <Timely title="Time to report" sub="Only one organization has reported on Spera so far" rows={timely} max={slowestDays} />
              )}
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Timeliness is the median number of days between a program&apos;s end date and the date the organization submitted it on Spera.
              Imported records and past-year estimates are excluded.
            </p>
          </>
        )}
      </section>

      <section className="mt-16 border-t border-slate-200 pt-12">
        <h2 className="font-serif text-4xl text-slate-900">Details</h2>
        <div className="mt-8 grid gap-6">
          <Table
            title="By organization"
            first="Organization"
            extraHead={["RIGHT 4.0 signals"]}
            rows={orgs.map((o) => {
              const s = right4Signals(o.runs);
              return (
                <TotalsRow
                  key={o.key}
                  label={
                    <>
                      <span className="font-medium">{o.key}</span>
                      <span className="block text-xs text-slate-500">{[...new Set(o.runs.map((r) => r.programName))].join(" · ")}</span>
                    </>
                  }
                  t={o.totals}
                  max={max(orgs)}
                  extra={
                    <td className="py-2 pl-3 text-xs text-slate-700">
                      {s.underservedRuns > 0 ? `${s.underservedRuns} runs at underserved prisons (${s.underservedInstitutions.join(", ")})` : "No underserved-prison runs"}
                      {s.specialPopulationRuns > 0 && ` · ${s.specialPopulationRuns} serving RHU/EOP/MHCB`}
                      {s.languages.length > 0 && ` · offered in ${s.languages.join(", ")}`}
                      <span className="block font-medium text-brand-900">+{s.additionalPoints} point evidence</span>
                    </td>
                  }
                />
              );
            })}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-lg font-semibold">Each organization, by program year</h3>
            <p className="mt-1 text-sm text-slate-600">Program year = year of the start date.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-1 pr-3 align-bottom">Organization</th>
                    <th className="py-1 pr-3 align-bottom">Program year</th>
                    {["Runs", "Total programming hours", "Participants", "Completed", "Total participant programming hours"].map((h) => (
                      <th key={h} className="py-1 pr-3 text-right align-bottom">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orgYears.map(({ org, rows }) =>
                    rows.map((y, i) => (
                      <tr key={`${org}-${y.key}`} className={i === 0 ? "border-t border-slate-200" : ""}>
                        <td className="py-1.5 pr-3 font-medium">{i === 0 ? org : ""}</td>
                        <td className="py-1.5 pr-3">{y.key}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{y.totals.runs}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(y.totals.programmingHours)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(y.totals.participants)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(y.totals.completed)}</td>
                        <td className="py-1.5 pr-3 text-right font-medium tabular-nums">{fmt(y.totals.participantHours)}</td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <Table
            title="By prison"
            first="Prison"
            rows={prisons.map((p) => {
              const fac = facilityOf(String(p.key));
              return (
                <TotalsRow
                  key={p.key}
                  label={
                    <>
                      {fac.facilityName}
                      {fac.underserved && <span className="ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-brand-900">RIGHT 4.0 underserved</span>}
                      {fac.womens && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-700">Women&apos;s</span>}
                    </>
                  }
                  t={p.totals}
                  max={max(prisons)}
                />
              );
            })}
          />

          <details className="rounded-2xl border border-slate-200 bg-white p-6">
            <summary className="cursor-pointer text-lg font-semibold">All program runs ({runs.length})</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[60rem] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {["Organization", "Program", "Prison", "Status", "Start date"].map((h) => (
                      <th key={h} className="py-1 pr-3 align-bottom">
                        {h}
                      </th>
                    ))}
                    {["Program year", "Total programming hours", "Participants", "Completed", "Total participant programming hours"].map((h) => (
                      <th key={h} className="py-1 pr-3 text-right align-bottom">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => {
                    const ph = participantHours(r);
                    const cell = (v: number | null) => (v === null ? <span className="text-amber-800">—</span> : fmt(v));
                    return (
                      <tr key={r.id} className="border-t border-slate-100">
                        <td className="py-1.5 pr-3">{r.orgName}</td>
                        <td className="py-1.5 pr-3">
                          {r.programName}
                          {r.source === "estimate" && <span className="ml-2 rounded bg-sun-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-800">Estimate</span>}
                        </td>
                        <td className="py-1.5 pr-3">
                          {r.facilityCode}
                          {r.yard ? ` · ${r.yard}` : ""}
                        </td>
                        <td className="py-1.5 pr-3">{r.status}</td>
                        <td className="py-1.5 pr-3 tabular-nums">{day(r.startDate)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{programYear(r) ?? <span className="text-amber-800">—</span>}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{cell(r.totalHours)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{cell(r.participants)}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">{cell(r.completed)}</td>
                        <td className="py-1.5 pr-3 text-right font-medium tabular-nums">{cell(ph)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>

          {incomplete.length > 0 && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="text-lg font-semibold">Needs a follow-up ({incomplete.length})</h3>
              <p className="mt-1 text-sm text-slate-700">Runs with missing numbers are counted only where the number is known — nothing is guessed.</p>
              <ul className="mt-3 space-y-1 text-sm">
                {incomplete.map((r) => (
                  <li key={r.id}>
                    <span className="font-medium">{r.orgName}</span> — {r.programName}, {r.facilityCode} ({r.status}, started {day(r.startDate)}):{" "}
                    <span className="text-amber-900">missing {missingFields(r).join(", ")}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </section>

      <footer className="mt-12 space-y-2 text-xs leading-relaxed text-slate-500">
        <p>
          Definitions follow TPW&apos;s Collective Impact Report: participant programming hours = participants completed × total
          programming hours; program year = year of the start date. RIGHT 4.0 signals: CDCR&apos;s RIGHT Grant 4.0 RFA gives 1–3 points by
          budget plus up to two half-points for programming at an underserved institution, serving RHU/EOP/MHCB, or offering a program in
          a language other than English.
        </p>
        <p>
          [2] CDCR, &ldquo;CDCR Recidivism Report Finds Recidivism Rates Drop,&rdquo; Feb 13, 2024 — three-year conviction rate 45.6% with
          no credits, 39.2% with rehabilitative credits. [3] Legislative Analyst&apos;s Office, &ldquo;How Much Does It Cost to Incarcerate a
          Person?&rdquo; 2025-26 — $21,534 marginal and $127,788 average cost per person-year.
        </p>
      </footer>
    </main>
  );
}
