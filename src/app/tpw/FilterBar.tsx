"use client";

import { useMemo, useState } from "react";
import { filterRuns, NO_FILTERS, type Filters } from "@/lib/dashboard";
import { programYear, type Run } from "@/lib/runs";
import MultiSelect from "./MultiSelect";

/** A run as it crosses from the server: dates as ISO strings. */
export type WireRun = Omit<Run, "startDate" | "endDate" | "submittedAt"> & { startDate: string | null; endDate: string | null; submittedAt: string | null };

const date = (s: string | null) => (s ? new Date(s) : null);

/** All runs (dates restored), the filters, and the runs that pass them — shared by the dashboard and the data explorer. */
export function useFilteredRuns(wire: WireRun[]) {
  const all = useMemo<Run[]>(
    () => wire.map((r) => ({ ...r, startDate: date(r.startDate), endDate: date(r.endDate), submittedAt: date(r.submittedAt) })),
    [wire],
  );
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const runs = useMemo(() => filterRuns(all, filters), [all, filters]);
  return { all, runs, filters, setFilters };
}

type Field = keyof Filters;

/** Filters for the TPW pages; `fields` picks which ones to show (all by default). */
export default function FilterBar({
  all,
  filters: f,
  setFilters: setF,
  fields = ["facilities", "orgs", "programs", "years"],
}: {
  all: Run[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  fields?: Field[];
}) {
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
  const filtered = Object.values(f).some((v) => v.length > 0);

  return (
    <section aria-label="Filters" className="mt-6 print:hidden">
      <div className={`grid items-end gap-3 sm:grid-cols-2 ${fields.length === 4 ? "lg:grid-cols-[1fr_1fr_1fr_1fr_auto]" : "lg:grid-cols-[minmax(0,16rem)_minmax(0,16rem)_auto]"}`}>
        {fields.includes("facilities") && (
          <MultiSelect label="Facility" options={options.facilities} value={f.facilities} onChange={(v) => setF({ ...f, facilities: v })} />
        )}
        {fields.includes("years") && <MultiSelect label="Year" options={options.years} value={f.years} onChange={(v) => setF({ ...f, years: v })} />}
        {fields.includes("orgs") && <MultiSelect label="Organization" options={options.orgs} value={f.orgs} onChange={(v) => setF({ ...f, orgs: v })} />}
        {fields.includes("programs") && (
          <MultiSelect label="Program" options={options.programs} value={f.programs} onChange={(v) => setF({ ...f, programs: v })} />
        )}
        <button
          type="button"
          onClick={() => setF(NO_FILTERS)}
          disabled={!filtered}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-transparent"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
