"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { RunInput } from "@/lib/runs";
import { OrgPicker, useOrgSummary } from "./useOrg";
import RisingSun from "./RisingSun";

/**
 * "Past records (retroactive)" on Submit data (design doc §28): years with no data yet, filled in as
 * estimates — one simple screen per year, then a check before saving. Each
 * entry becomes a completed program run for that year, marked as an estimate.
 */

interface Facility {
  code: string;
  name: string;
  underserved: boolean;
}
interface Entry {
  program: string;
  facility: Facility | null;
  participants: number | null;
  completed: number | null;
  hours: number | null;
}

const THIS_YEAR = new Date().getFullYear();
const YEAR_CHOICES = Array.from({ length: 8 }, (_, i) => THIS_YEAR - 8 + i);
const NEW_ENTRY: Entry = { program: "", facility: null, participants: null, completed: null, hours: null };
const fmt = (n: number) => n.toLocaleString("en-US");

function YearTile({ selected, onFile, onClick, children, dashed }: { selected: boolean; onFile?: boolean; onClick: () => void; children: React.ReactNode; dashed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`relative flex h-16 min-w-24 flex-col items-center justify-center rounded-xl border px-5 text-xl transition-colors ${
        dashed ? "border-dashed text-base text-slate-600" : ""
      } ${selected ? "border-brand-800 bg-brand-50 text-brand-900" : "border-slate-300 bg-white text-slate-900 hover:border-brand-700"}`}
    >
      {children}
      {onFile && <span className="text-[0.65rem] font-medium uppercase tracking-wide text-slate-500">on file</span>}
    </button>
  );
}

/** A count people may only roughly know: type a number, or say "Not sure". */
function Estimate({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-700">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input
          inputMode="numeric"
          value={value ?? ""}
          placeholder="Not sure"
          onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value.replace(/[^\d]/g, "")) || 0)))}
          className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg tabular-nums placeholder:text-base placeholder:text-slate-400"
        />
      </span>
    </label>
  );
}

export default function PastRecords() {
  const { orgs, org, setOrg, summary } = useOrgSummary();
  const [programs, setPrograms] = useState<Record<string, string[]>>({});
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [notSure, setNotSure] = useState(false);
  /** 0 = choose years, 1..n = one year each, n+1 = check and save. */
  const [step, setStep] = useState(0);
  const [entries, setEntries] = useState<Record<number, Entry[]>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/form-options")
      .then((r) => r.json())
      .then((o: { orgs: { name: string; programs: string[] }[]; facilities: Facility[] }) => {
        setPrograms(Object.fromEntries(o.orgs.map((x) => [x.name, x.programs])));
        setFacilities(o.facilities);
      })
      .catch(() => setFacilities([]));
  }, []);

  // A different organization starts over.
  useEffect(() => {
    setYears([]);
    setEntries({});
    setStep(0);
    setDone(null);
    setNotSure(false);
  }, [org]);

  const onFile = new Set(summary?.byYear.map((y) => y.year) ?? []);
  const chosen = [...years].sort();
  const year = step >= 1 && step <= chosen.length ? chosen[step - 1] : null;
  const list = year === null ? [] : (entries[year] ?? [NEW_ENTRY]);
  const orgPrograms = useMemo(() => {
    const names = new Set(programs[org] ?? []);
    Object.values(entries).flat().forEach((e) => e.program && names.add(e.program));
    return [...names];
  }, [programs, org, entries]);

  const setEntry = (i: number, patch: Partial<Entry>) =>
    setEntries((all) => ({ ...all, [year!]: list.map((e, j) => (j === i ? { ...e, ...patch } : e)) }));
  const started = (e: Entry) => !!e.program.trim() || !!e.facility || e.participants !== null || e.completed !== null || e.hours !== null;
  /** What a started line still needs before it can be saved, in plain words. */
  const missing = (e: Entry) =>
    [
      !e.program.trim() && "the program",
      !e.facility && "the prison",
      e.participants !== null && e.completed !== null && e.completed > e.participants && "fewer finished than took part",
    ].filter((x): x is string => !!x);
  const yearBlocked = list.some((e) => started(e) && missing(e).length > 0);
  const ready = (e: Entry) => !!e.program.trim() && !!e.facility && (e.participants === null || e.completed === null || e.completed <= e.participants);
  // Progress grows with each answer: the years, then per entry its program,
  // prison and three numbers. Full only on the last (check and save) step.
  const questions = 1 + chosen.reduce((n, y) => n + 5 * (entries[y] ?? [NEW_ENTRY]).length, 0);
  const answered =
    (chosen.length > 0 ? 1 : 0) +
    chosen.reduce(
      (n, y) =>
        n + (entries[y] ?? []).reduce((m, e) => m + [e.program, e.facility, e.participants, e.completed, e.hours].filter((v) => v !== "" && v !== null).length, 0),
      0,
    );
  const progress = step > 0 && step === chosen.length + 1 ? 1 : Math.max(0.02, Math.min(0.95, answered / questions));
  const filled = chosen.flatMap((y) => (entries[y] ?? []).filter(ready).map((e) => ({ year: y, ...e })));

  function toggleYear(y: number) {
    setNotSure(false);
    setYears((ys) => (ys.includes(y) ? ys.filter((x) => x !== y) : [...ys, y]));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const rows = filled.map((e, i) => ({
      line: i + 1,
      input: {
        orgName: org,
        programName: e.program.trim(),
        facilityCode: e.facility!.code,
        status: "Completed",
        startDate: `${e.year}-01-01`,
        totalHours: e.hours,
        participants: e.participants,
        completed: e.completed,
        estimate: true,
      } satisfies RunInput,
    }));
    try {
      const res = await fetch("/api/runs/bulk", { method: "POST", body: JSON.stringify({ rows }) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error ?? "Could not save.");
      if (out.failed.length) throw new Error(out.failed.map((f: { problems: string[] }) => f.problems.join(" ")).join(" "));
      setDone(out.created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const next = (
    label: string,
    onClick: () => void,
    disabled = false,
  ) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-6 py-3 text-lg font-medium text-white hover:bg-brand-900 disabled:opacity-40"
    >
      {label} <span aria-hidden>→</span>
    </button>
  );
  const back = (
    <button type="button" onClick={() => setStep(step - 1)} className="px-2 py-3 text-slate-600 hover:text-slate-900">
      ← Back
    </button>
  );

  return (
    <section className="mx-auto max-w-6xl px-6 pb-16 pt-10">
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-900">Add past records</h1>
      <p className="mt-3 text-base text-slate-600">Only estimates by year. Never upload names and case numbers.</p>
      <RisingSun horizon={false} />

      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Organization</p>
      <div className="mt-3 max-w-md">
        <OrgPicker orgs={orgs} org={org} setOrg={setOrg} />
      </div>

      {org && done === null && (
        <>
          <p className="mt-8 text-slate-500">About 5 minutes</p>
          <div className="mt-3 h-1.5 rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-brand-800 transition-all" style={{ width: `${progress * 100}%` }} />
          </div>

          <section className="mt-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {org}
              {year !== null && ` · ${year} · ${step} of ${chosen.length}`}
            </p>

            {step === 0 && (
              <>
                <h2 className="mt-4 font-serif text-3xl">Which years would you like to add?</h2>
                <p className="mt-3 text-base text-slate-600">Select one or more years. Answer from what you know; &ldquo;Not sure&rdquo; is always an option.</p>
                <div className="mt-8 flex flex-wrap gap-4">
                  {YEAR_CHOICES.map((y) => (
                    <YearTile key={y} selected={years.includes(y)} onFile={onFile.has(y)} onClick={() => toggleYear(y)}>
                      {y}
                    </YearTile>
                  ))}
                  <YearTile
                    dashed
                    selected={notSure}
                    onClick={() => {
                      setYears([]);
                      setNotSure(!notSure);
                    }}
                  >
                    Not sure
                  </YearTile>
                </div>
                {notSure && (
                  <p className="mt-6 max-w-xl rounded-xl bg-sun-100 px-5 py-4 text-slate-800">
                    That&apos;s fine. Old sign-in sheets, grant reports or emails often show which years you ran programs — come back
                    whenever you find one.
                  </p>
                )}
                <div className="mt-10">{next("Continue", () => setStep(1), years.length === 0)}</div>
              </>
            )}

            {year !== null && (
              <>
                <h2 className="mt-4 font-serif text-3xl">What did you run in {year}?</h2>
                <p className="mt-3 text-base text-slate-600">One line per program and prison. Rough numbers are fine; leave a box empty if you&apos;re not sure.</p>
                <datalist id="past-programs">
                  {orgPrograms.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                <div className="mt-8 space-y-5">
                  {list.map((e, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 p-6">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <p className="text-sm text-slate-700">Program</p>
                          <div className="mt-1">
                            <input
                              list="past-programs"
                              value={e.program}
                              onChange={(ev) => setEntry(i, { program: ev.target.value })}
                              placeholder="Program name"
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-slate-700">Prison</p>
                          <div className="mt-1">
                            <select
                              value={e.facility?.code ?? ""}
                              onChange={(ev) => setEntry(i, { facility: facilities.find((f) => f.code === ev.target.value) ?? null })}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                            >
                              <option value="">Choose the prison</option>
                              {facilities.map((f) => (
                                <option key={f.code} value={f.code}>
                                  {f.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-6">
                        <Estimate label="About how many took part?" value={e.participants} onChange={(v) => setEntry(i, { participants: v })} />
                        <Estimate label="About how many finished?" value={e.completed} onChange={(v) => setEntry(i, { completed: v })} />
                        <Estimate label="Hours of programming each" value={e.hours} onChange={(v) => setEntry(i, { hours: v })} />
                      </div>
                      {started(e) && missing(e).length > 0 && (
                        <p className="mt-4 text-sm text-amber-800">To save this line, add {missing(e).join(" and ")}.</p>
                      )}
                      {list.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEntries((all) => ({ ...all, [year]: list.filter((_, j) => j !== i) }))}
                          className="mt-4 text-sm text-slate-500 underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEntries((all) => ({ ...all, [year]: [...list, NEW_ENTRY] }))}
                  className="mt-4 font-medium text-brand-800 hover:underline"
                >
                  + Another program or prison in {year}
                </button>
                <div className="mt-10 flex items-center gap-4">
                  {back}
                  {next(step === chosen.length ? "Review" : "Next year", () => setStep(step + 1), yearBlocked)}
                  {!list.some(started) && (
                    <button type="button" onClick={() => setStep(step + 1)} className="text-slate-500 hover:text-slate-800">
                      Skip {year}
                    </button>
                  )}
                </div>
              </>
            )}

            {step === chosen.length + 1 && step > 0 && (
              <>
                <h2 className="mt-4 font-serif text-3xl">Check and save</h2>
                {filled.length === 0 ? (
                  <p className="mt-3 text-base text-slate-600">You skipped every year, so there is nothing to save. Go back to add one, or come back when you find old records.</p>
                ) : (
                  <>
                    <p className="mt-3 text-base text-slate-600">These are saved as estimates for each year, so everyone can tell them apart from exact records.</p>
                    <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                      <table className="w-full min-w-[36rem] text-left">
                        <thead className="text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-5 py-3">Year</th>
                            <th className="px-5 py-3">Program</th>
                            <th className="px-5 py-3">Prison</th>
                            <th className="px-5 py-3 text-right">Took part</th>
                            <th className="px-5 py-3 text-right">Finished</th>
                            <th className="px-5 py-3 text-right">Hours each</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filled.map((e, i) => (
                            <tr key={i} className="border-t border-slate-100">
                              <td className="px-5 py-3 tabular-nums">{e.year}</td>
                              <td className="px-5 py-3">{e.program}</td>
                              <td className="px-5 py-3">{e.facility!.code}</td>
                              <td className="px-5 py-3 text-right tabular-nums">{e.participants === null ? "Not sure" : fmt(e.participants)}</td>
                              <td className="px-5 py-3 text-right tabular-nums">{e.completed === null ? "Not sure" : fmt(e.completed)}</td>
                              <td className="px-5 py-3 text-right tabular-nums">{e.hours === null ? "Not sure" : fmt(e.hours)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {error && <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-amber-900">{error}</p>}
                <div className="mt-10 flex items-center gap-4">
                  {back}
                  {next(saving ? "Saving…" : `Save ${filled.length} record${filled.length === 1 ? "" : "s"}`, save, saving || filled.length === 0)}
                </div>
              </>
            )}
          </section>
        </>
      )}

      {done !== null && (
        <div role="status" className="mt-12 rounded-2xl border border-brand-200 bg-brand-50 p-8">
          <p className="font-serif text-3xl text-brand-900">✓ {done} past record{done === 1 ? "" : "s"} added.</p>
          <p className="mt-2 text-slate-700">They now count in your report and in TPW&apos;s totals, marked as estimates.</p>
          <div className="mt-5 flex flex-wrap gap-6">
            <Link href="/report" className="font-medium text-brand-800 underline">
              See my report →
            </Link>
            <button
              type="button"
              onClick={() => {
                setDone(null);
                setYears([]);
                setEntries({});
                setStep(0);
              }}
              className="font-medium text-slate-600 underline"
            >
              Add more years
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
