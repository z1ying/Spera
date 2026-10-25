"use client";

import Link from "next/link";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SAVINGS_INPUTS, savingsEstimate, timeliness, yearTrend } from "@/lib/dashboard";
import { groupTotals, totals } from "@/lib/runs";
import AiSummary from "./AiSummary";
import FilterBar, { useFilteredRuns, type WireRun } from "./FilterBar";

const BRAND = "#2f3190";
const SUN = "#e3a92a";
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const money = (n: number) => `$${fmt(n)}`;
const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);

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
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sun-400 text-brand-900">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
    <div className="flex items-center gap-4 rounded-xl border border-sun-300 bg-sun-100 px-5 py-4">
      <Icon d={icon} />
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">{label}</div>
        <div className="font-serif text-3xl tabular-nums text-brand-900">{value}</div>
        {sub && <div className="truncate text-xs text-slate-700">{sub}</div>}
      </div>
    </div>
  );
}

function FunnelBar({ label, value, of }: { label: string; value: number; of: number }) {
  const share = of ? value / of : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">
          {fmt(value)} · {pct(share)}
        </span>
      </div>
      <div className="mt-1.5 h-3 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-800" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

function Timely({ title, sub, rows, max }: { title: string; sub: string; rows: { org: string; days: number }[]; max: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{sub}</p>
      <ul className="mt-4 space-y-4">
        {rows.map((r) => (
          <li key={r.org}>
            <div className="flex justify-between text-sm">
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
// plus what organizations submit on Spera. TPW staff only. The full tables
// live in the data explorer (/tpw/data).
export default function Dashboard({ wire }: { wire: WireRun[] }) {
  const { all, runs, filters: f, setFilters } = useFilteredRuns(wire);

  const t = totals(runs);
  const trend = yearTrend(runs);
  const savings = savingsEstimate(t.completed);
  const timely = timeliness(runs);
  // Fastest and slowest never overlap: with few organizations, each gets half.
  const fastest = timely.slice(0, Math.min(3, Math.ceil(timely.length / 2)));
  const slowest = timely.slice(fastest.length).reverse().slice(0, 3);
  const slowestDays = timely.length ? timely[timely.length - 1].days : 0;
  const orgCount = new Set(runs.map((r) => r.orgName)).size;
  const chart = trend.map((y) => ({ ...y, label: y.openRuns ? `${y.year}*` : String(y.year) }));

  // Each program: completion in finished runs and programming hours per person who completed.
  const programs = groupTotals(runs, (r) => `${r.programName}\u0000${r.orgName}`)
    .map((p) => {
      const [name, org] = p.key.split("\u0000");
      return {
        name,
        org,
        participants: p.totals.participants,
        rate: p.totals.completionRate,
        hours: p.totals.completed ? p.totals.participantHours / p.totals.completed : null,
      };
    })
    .sort((a, b) => b.participants - a.participants);
  const maxHours = Math.max(0, ...programs.map((p) => p.hours ?? 0));

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">For TPW management</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Network dashboard</h1>
          <p className="mt-1 text-slate-600">Process data reported by member organizations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <Link href="/tpw/data" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Explore the data →
          </Link>
          <button type="button" onClick={() => window.print()} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900">
            Generate report
          </button>
        </div>
      </div>

      <FilterBar all={all} filters={f} setFilters={setFilters} />

      <section aria-label="Core numbers" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ICONS.people} label="Participants" value={fmt(t.participants)} sub={`${t.inProgressRuns + t.plannedRuns} runs still open`} />
        <Kpi icon={ICONS.cap} label="Completed" value={fmt(t.completed)} sub={t.completionRate === null ? undefined : `${pct(t.completionRate)} of finished runs`} />
        <Kpi icon={ICONS.building} label="Organizations" value={fmt(orgCount)} sub={`${t.runs} program cohorts`} />
        <Kpi icon={ICONS.clock} label="Participant hours" value={fmt(t.participantHours)} sub="completed × programming hours" />
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-2xl text-slate-900">Estimated savings from avoided returns</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-sun-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-800">Conservative (marginal cost)</p>
            <p className="mt-2 font-serif text-3xl tabular-nums text-slate-900">{money(savings.conservative)}</p>
            <p className="mt-1 text-sm text-slate-800">
              at {money(SAVINGS_INPUTS.marginalCost)} per person-year <Cite n={3} href={SOURCES.lao} />
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Long-run capacity (average cost)</p>
            <p className="mt-2 font-serif text-3xl tabular-nums text-slate-900">{money(savings.capacity)}</p>
            <p className="mt-1 text-sm text-slate-600">
              at {money(SAVINGS_INPUTS.averageCost)} per person-year <Cite n={3} href={SOURCES.lao} />
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-600">
          Based on the current filtered view: {fmt(t.completed)} people completed a program. If they return to prison at the rate CDCR
          reports for people who earned rehabilitative credits ({pct(SAVINGS_INPUTS.creditRate)}) instead of the no-credit rate (
          {pct(SAVINGS_INPUTS.noCreditRate)}) <Cite n={2} href={SOURCES.cdcr} />, about {fmt(savings.avoidedReturns)} returns are avoided — one year
          of incarceration each. Association, not causation.
        </p>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-serif text-xl text-slate-900">{trend.length > 1 ? "Participation over time" : "Participation funnel"}</h2>
          {trend.length > 1 ? (
            <>
              <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
                <span>By program year</span>
                <span className="flex items-center gap-2">
                  <span className="h-1 w-5 rounded" style={{ background: BRAND }} /> Enrolled
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1 w-5 rounded" style={{ background: SUN }} /> Completed
                </span>
              </div>
              <div className="mt-3 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chart} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 12 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 12 }} tickFormatter={(v: number) => fmt(v)} width={48} />
                    <Tooltip
                      formatter={(v, name) => [fmt(Number(v)), name === "participants" ? "Enrolled" : "Completed"]}
                      labelFormatter={(_, p) => {
                        const y = p?.[0]?.payload as (typeof chart)[number] | undefined;
                        return y ? `${y.year} · completion ${pct(y.completionRate)}${y.openRuns ? ` · ${y.openRuns} runs still open` : ""}` : "";
                      }}
                    />
                    <Line type="monotone" dataKey="participants" stroke={BRAND} strokeWidth={2.5} dot={{ r: 4, fill: BRAND }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="completed" stroke={SUN} strokeWidth={2.5} dot={{ r: 4, fill: SUN }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {chart.some((y) => y.openRuns) && <p className="mt-2 text-xs text-slate-500">* Some cohorts that year are still open, so their completions aren&apos;t in yet.</p>}
            </>
          ) : (
            <div className="mt-4 space-y-5">
              <FunnelBar label="Enrolled" value={t.participants} of={t.participants} />
              <FunnelBar label="Completed" value={t.completed} of={t.participants} />
              {trend.length === 1 && <p className="text-xs text-slate-500">One program year selected — pick more years to see the trend.</p>}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-serif text-xl text-slate-900">Programs: completion and dose</h2>
          <p className="mt-1 text-xs text-slate-600">
            Completion in finished runs · programming hours per person who completed · network completion {pct(t.completionRate)}
          </p>
          <div className="mt-4 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Program</span>
            <span>Completion</span>
            <span>Hours per completer</span>
          </div>
          <ul className="mt-2 space-y-3">
            {programs.map((p) => (
              <li key={`${p.name}|${p.org}`} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-4 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">{p.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {p.org} · {fmt(p.participants)} participants{p.participants < 20 ? " · small group" : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 flex-1 rounded-full bg-slate-100">
                    <span className="block h-full rounded-full" style={{ width: `${(p.rate ?? 0) * 100}%`, background: BRAND }} />
                  </span>
                  <span className="w-12 text-right tabular-nums">{pct(p.rate)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 flex-1 rounded-full bg-slate-100">
                    <span className="block h-full rounded-full" style={{ width: `${maxHours && p.hours ? (p.hours / maxHours) * 100 : 0}%`, background: SUN }} />
                  </span>
                  <span className="w-12 text-right tabular-nums">{p.hours === null ? "—" : fmt(p.hours)}</span>
                </span>
              </li>
            ))}
          </ul>
          {programs.length === 0 && <p className="mt-4 text-sm text-slate-500">No programs in this view.</p>}
          <p className="mt-4 text-xs text-slate-500">Groups under 20 participants are too small to compare.</p>
        </section>
      </div>

      <AiSummary filters={f} />

      {timely.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-2xl text-slate-900">Reporting timeliness</h2>
          <p className="mt-1 text-sm text-slate-600">How long organizations take to report data after a program ends. This measures timing, not program results.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {fastest.length > 0 && slowest.length > 0 ? (
              <>
                <Timely title="Most timely reports" sub="Shortest time between program end and report" rows={fastest} max={slowestDays} />
                <Timely title="Least timely reports" sub="Organizations TPW may want to check in with" rows={slowest} max={slowestDays} />
              </>
            ) : (
              <Timely title="Time to report" sub="Only one organization has reported on Spera so far" rows={timely} max={slowestDays} />
            )}
          </div>
          <p className="mt-4 text-xs text-slate-600">
            Timeliness is the median number of days between a program&apos;s end date and the date the organization submitted it on Spera.
            Imported records and past-year estimates are excluded.
          </p>
        </section>
      )}

      <footer className="mt-12 space-y-2 text-xs leading-relaxed text-slate-500">
        <p>
          Definitions follow TPW&apos;s Collective Impact Report: participant programming hours = participants completed × total
          programming hours; program year = year of the start date. Hours per completer = total participant programming hours ÷ participants completed.
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
