"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toCsv } from "@/lib/csv";
import { groupTotals, missingFields, participantHours, programYear, right4Signals, type Run, type Totals } from "@/lib/runs";
import { CompletenessCard, RunCompletionCard, TrendCard } from "../charts";
import FilterBar, { useFilteredRuns, type WireRun } from "../FilterBar";

/**
 * Data explorer (TPW only): the same filters as the dashboard, then group the
 * runs any way — by organization, program, prison, program year or status,
 * and optionally by a second one — sort by any column, download the view.
 */

type Dim = "org" | "program" | "prison" | "year" | "status";
const DIMS: { id: Dim; label: string }[] = [
  { id: "org", label: "Organization" },
  { id: "program", label: "Program" },
  { id: "prison", label: "Prison" },
  { id: "year", label: "Program year" },
  { id: "status", label: "Status" },
];
const keyOf: Record<Dim, (r: Run) => string> = {
  org: (r) => r.orgName,
  program: (r) => r.programName,
  prison: (r) => r.facilityCode,
  year: (r) => String(programYear(r) ?? "No start date"),
  status: (r) => r.status,
};

// Column names follow TPW's Collective Impact Report.
type Metric = "runs" | "programmingHours" | "participants" | "completed" | "completionRate" | "participantHours";
const METRICS: { id: Metric; label: string }[] = [
  { id: "runs", label: "Runs" },
  { id: "programmingHours", label: "Total programming hours" },
  { id: "participants", label: "Participants" },
  { id: "completed", label: "Completed" },
  { id: "completionRate", label: "Completion" },
  { id: "participantHours", label: "Total participant programming hours" },
];

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");
const show = (m: Metric, t: Totals) => (m === "completionRate" ? pct(t.completionRate) : fmt(t[m]));
const raw = (m: Metric, t: Totals) => (m === "completionRate" ? (t.completionRate ?? -1) : t[m]);

interface Row {
  first: string;
  second?: string;
  firstOfGroup: boolean;
  runs: Run[];
  totals: Totals;
}

export default function Explorer({ wire }: { wire: WireRun[] }) {
  const { all, runs, filters, setFilters } = useFilteredRuns(wire);
  const [by, setBy] = useState<Dim>("org");
  const [then, setThen] = useState<Dim | "">("year");
  const [sort, setSort] = useState<{ m: Metric | "name"; desc: boolean }>({ m: "name", desc: false });

  const facilityName = useMemo(() => new Map(all.map((r) => [r.facilityCode, r])), [all]);
  const label = (d: Dim, k: string) => (d === "prison" ? (facilityName.get(k)?.facilityName ?? k) : k);

  const rows = useMemo<Row[]>(() => {
    const order = <T extends { key: string; totals: Totals }>(xs: T[]) =>
      [...xs].sort((a, b) => {
        const v = sort.m === "name" ? a.key.localeCompare(b.key, "en", { numeric: true }) : raw(sort.m, a.totals) - raw(sort.m, b.totals);
        return sort.desc ? -v : v;
      });
    const level1 = order(groupTotals(runs, keyOf[by]));
    if (!then || then === by) return level1.map((g) => ({ first: g.key, firstOfGroup: true, runs: g.runs, totals: g.totals }));
    return level1.flatMap((g) =>
      order(groupTotals(g.runs, keyOf[then])).map((s, i) => ({ first: g.key, second: s.key, firstOfGroup: i === 0, runs: s.runs, totals: s.totals })),
    );
  }, [runs, by, then, sort]);

  const max = Math.max(0, ...rows.map((r) => r.totals.participantHours));
  const grandTotal = groupTotals(runs, () => "all")[0]?.totals;
  const second = then && then !== by ? then : null;
  const incomplete = runs.filter((r) => missingFields(r).length > 0);

  function download() {
    const head = [DIMS.find((d) => d.id === by)!.label, ...(second ? [DIMS.find((d) => d.id === second)!.label] : []), ...METRICS.map((m) => m.label)];
    const body = rows.map((r) => [
      label(by, r.first),
      ...(second ? [label(second, r.second!)] : []),
      ...METRICS.map((m) => (m.id === "completionRate" ? (r.totals.completionRate === null ? "" : (r.totals.completionRate * 100).toFixed(1)) : String(r.totals[m.id]))),
    ]);
    const blob = new Blob(["\uFEFF" + toCsv(head, body)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `spera_${by}${second ? `_by_${second}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const head = (m: Metric | "name", text: string, right = true) => (
    <th key={m} className={`py-2 pr-3 align-bottom ${right ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => setSort({ m, desc: sort.m === m ? !sort.desc : m !== "name" })}
        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-900 ${sort.m === m ? "text-brand-800" : ""}`}
      >
        {text}
        {sort.m === m && <span aria-hidden>{sort.desc ? "↓" : "↑"}</span>}
      </button>
    </th>
  );

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <Link href="/tpw" className="text-sm text-slate-600 hover:text-slate-900">
            ← Dashboard
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">Data explorer</h1>
          <p className="mt-1 text-slate-600">Filter, group and sort every program run TPW has on file.</p>
        </div>
        <button type="button" onClick={download} className="rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900">
          Download this view (CSV)
        </button>
      </div>

      <FilterBar all={all} filters={filters} setFilters={setFilters} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TrendCard runs={runs} />
        <RunCompletionCard runs={runs} />
      </div>
      <CompletenessCard runs={runs} className="mt-6" />

      <section aria-label="Grouping" className="mt-8 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Group by</p>
          <div role="radiogroup" className="mt-1 inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {DIMS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={by === d.id}
                onClick={() => {
                  setBy(d.id);
                  if (then === d.id) setThen("");
                }}
                className={`rounded-md px-3 py-1.5 text-sm ${by === d.id ? "bg-sun-200 font-medium text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Then by</span>
          <select
            value={then}
            onChange={(e) => setThen(e.target.value as Dim | "")}
            className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Nothing</option>
            {DIMS.filter((d) => d.id !== by).map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <p className="pb-2 text-sm text-slate-500">
          {runs.length} of {all.length} runs · {rows.length} rows
        </p>
      </section>

      <section className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="text-left text-xs text-slate-500">
            <tr>
              {head("name", DIMS.find((d) => d.id === by)!.label, false)}
              {second && <th className="py-2 pr-3 align-bottom uppercase tracking-wide">{DIMS.find((d) => d.id === second)!.label}</th>}
              {METRICS.map((m) => head(m.id, m.label))}
              <th className="w-28" />
              {by === "org" && !second && <th className="py-2 pr-3 align-bottom uppercase tracking-wide">RIGHT 4.0 signals</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const fac = by === "prison" ? facilityName.get(r.first) : second === "prison" ? facilityName.get(r.second!) : undefined;
              const s = by === "org" && !second ? right4Signals(r.runs) : null;
              return (
                <tr key={`${r.first}|${r.second ?? ""}`} className={r.firstOfGroup ? "border-t border-slate-200" : ""}>
                  <td className="py-2 pr-3 font-medium">
                    {r.firstOfGroup ? label(by, r.first) : ""}
                    {by === "prison" && r.firstOfGroup && fac?.underserved && <Tag>RIGHT 4.0 underserved</Tag>}
                  </td>
                  {second && (
                    <td className="py-2 pr-3">
                      {label(second, r.second!)}
                      {second === "prison" && fac?.underserved && <Tag>underserved</Tag>}
                    </td>
                  )}
                  {METRICS.map((m) => (
                    <td key={m.id} className={`py-2 pr-3 text-right tabular-nums ${m.id === "participantHours" ? "font-medium" : ""}`}>
                      {show(m.id, r.totals)}
                    </td>
                  ))}
                  <td className="py-2">
                    <div className="h-2 rounded bg-slate-100">
                      <div className="h-2 rounded bg-brand-800" style={{ width: `${max ? (r.totals.participantHours / max) * 100 : 0}%` }} />
                    </div>
                  </td>
                  {s && (
                    <td className="py-2 pl-3 text-xs text-slate-700">
                      {s.underservedRuns > 0 ? `${s.underservedRuns} runs at underserved prisons (${s.underservedInstitutions.join(", ")})` : "No underserved-prison runs"}
                      {s.specialPopulationRuns > 0 && ` · ${s.specialPopulationRuns} serving RHU/EOP/MHCB`}
                      {s.languages.length > 0 && ` · offered in ${s.languages.join(", ")}`}
                      <span className="block font-medium text-brand-900">+{s.additionalPoints} point evidence</span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {grandTotal && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-semibold">
                <td className="py-2 pr-3">Total</td>
                {second && <td />}
                {METRICS.map((m) => (
                  <td key={m.id} className="py-2 pr-3 text-right tabular-nums">
                    {show(m.id, grandTotal)}
                  </td>
                ))}
                <td />
                {by === "org" && !second && <td />}
              </tr>
            </tfoot>
          )}
        </table>
        {runs.length === 0 && <p className="py-6 text-center text-slate-500">No runs match these filters.</p>}
      </section>

      <details className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-base font-semibold">Every program run in this view ({runs.length})</summary>
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
                      {r.source === "estimate" && <Tag>Estimate</Tag>}
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
        <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-base font-semibold">Needs a follow-up ({incomplete.length})</h2>
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
    </main>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="ml-2 rounded bg-sun-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-800">{children}</span>;
}
