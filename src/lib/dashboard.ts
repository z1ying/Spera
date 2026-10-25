/**
 * TPW network dashboard — design doc §28. Pure functions over program runs:
 * filters, the yearly trend, the avoided-returns estimate and reporting
 * timeliness. No I/O.
 */
import { missingFields, priorService, programYear, right4Signals, totals, type Run } from "./runs";

export interface Filters {
  facilities: string[];
  orgs: string[];
  programs: string[];
  /** Program years, as strings ("2024"); "none" = no start date. */
  years: string[];
}

export const NO_FILTERS: Filters = { facilities: [], orgs: [], programs: [], years: [] };

/** An empty list means "All"; otherwise a run must match one of the chosen values. */
export function filterRuns(runs: Run[], f: Filters): Run[] {
  const ok = (chosen: string[], v: string) => chosen.length === 0 || chosen.includes(v);
  return runs.filter(
    (r) =>
      ok(f.facilities, r.facilityCode) &&
      ok(f.orgs, r.orgName) &&
      ok(f.programs, r.programName) &&
      ok(f.years, String(programYear(r) ?? "none")),
  );
}

/** Participants and completions per program year, oldest first. */
export function yearTrend(runs: Run[]) {
  const years = [...new Set(runs.map(programYear).filter((y): y is number => y !== null))].sort((a, b) => a - b);
  return years.map((year) => {
    const rs = runs.filter((r) => programYear(r) === year);
    const t = totals(rs);
    return {
      year,
      participants: t.participants,
      completed: t.completed,
      participantHours: t.participantHours,
      completionRate: t.completionRate,
      /** Runs still planned or in progress: their completions aren't in yet. */
      openRuns: t.plannedRuns + t.inProgressRuns,
    };
  });
}

/**
 * Published inputs for the avoided-returns estimate.
 * [2] CDCR, recidivism report news release, 2024-02-13: three-year conviction
 *     rate 45.6% for people who earned no credits, 39.2% for people who earned
 *     any rehabilitative credit.
 * [3] LAO, "How Much Does It Cost to Incarcerate a Person?" 2025-26: marginal
 *     cost $21,534 and average cost $127,788 per person-year.
 * Completers are treated as credit earners and given the "any credit" rate —
 * the most conservative of CDCR's published credit tiers.
 */
export const SAVINGS_INPUTS = {
  noCreditRate: 0.456,
  creditRate: 0.392,
  marginalCost: 21_534,
  averageCost: 127_788,
  yearsAvoidedPerReturn: 1,
} as const;

export function savingsEstimate(completed: number, k = SAVINGS_INPUTS) {
  const avoidedReturns = completed * (k.noCreditRate - k.creditRate);
  return {
    completed,
    avoidedReturns,
    conservative: avoidedReturns * k.yearsAvoidedPerReturn * k.marginalCost,
    capacity: avoidedReturns * k.yearsAvoidedPerReturn * k.averageCost,
  };
}

const DAY = 24 * 60 * 60 * 1000;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Days from a program's end to the organization's report, per organization
 * (median). Only runs reported through Spera's form count: imported
 * spreadsheets and past-year estimates don't record when the program was
 * reported.
 */
export function timeliness(runs: Run[]) {
  const byOrg = new Map<string, number[]>();
  for (const r of runs) {
    if (r.source !== "form" || !r.endDate || !r.submittedAt) continue;
    const days = Math.max(0, Math.round((r.submittedAt.getTime() - r.endDate.getTime()) / DAY));
    byOrg.set(r.orgName, [...(byOrg.get(r.orgName) ?? []), days]);
  }
  return [...byOrg]
    .map(([org, days]) => ({ org, days: median(days), reports: days.length }))
    .sort((a, b) => a.days - b.days || a.org.localeCompare(b.org));
}

/** Year of the next RIGHT 4.0 application; prior service counts the five years before it. */
export const RIGHT4_APPLICATION_YEAR = 2026;

/**
 * RIGHT 4.0 readiness per organization: prior service (programming in at least
 * 2 of the 5 preceding years) and evidence for the additional half-points.
 * Budget points (1–3) depend on the organization's own budget, which Spera
 * doesn't hold.
 */
export function right4Readiness(runs: Run[], applicationYear = RIGHT4_APPLICATION_YEAR) {
  const byOrg = new Map<string, Run[]>();
  for (const r of runs) byOrg.set(r.orgName, [...(byOrg.get(r.orgName) ?? []), r]);
  return [...byOrg]
    .map(([org, rs]) => {
      const ps = priorService(rs, applicationYear);
      const s = right4Signals(rs);
      const next: string[] = [];
      if (!ps.meets) next.push(`Needs programming in ${2 - ps.yearsWithProgramming.length} more of ${ps.window[0]}–${ps.window[4]}`);
      if (s.additionalPoints < 1) {
        const missing = [
          !s.criteria.underserved && "an underserved prison",
          !s.criteria.specialPopulations && "RHU/EOP/MHCB",
          !s.criteria.nonEnglish && "a non-English program",
        ].filter(Boolean);
        next.push(`+${(1 - s.additionalPoints).toFixed(1)} more possible with ${missing.join(" or ")}`);
      }
      return {
        org,
        window: ps.window,
        yearsWithProgramming: ps.yearsWithProgramming,
        meetsPriorService: ps.meets,
        underservedInstitutions: s.underservedInstitutions,
        specialPopulations: s.criteria.specialPopulations,
        languages: s.languages,
        additionalPoints: s.additionalPoints,
        next,
      };
    })
    .sort((a, b) => a.org.localeCompare(b.org));
}

/** Completion of each finished run with known counts — one point per cohort. */
export function runCompletion(runs: Run[]) {
  return runs
    .filter((r) => r.status === "Completed" && r.participants && r.completed !== null)
    .map((r) => ({
      id: r.id,
      org: r.orgName,
      program: r.programName,
      prison: r.facilityCode,
      year: programYear(r),
      participants: r.participants!,
      rate: r.completed! / r.participants!,
    }));
}

/** Runs with every number filled in, per organization, and which numbers are missing. */
export function completeness(runs: Run[]) {
  const byOrg = new Map<string, Run[]>();
  for (const r of runs) byOrg.set(r.orgName, [...(byOrg.get(r.orgName) ?? []), r]);
  return [...byOrg]
    .map(([org, rs]) => {
      const missing = new Map<string, number>();
      for (const r of rs) for (const m of missingFields(r)) missing.set(m, (missing.get(m) ?? 0) + 1);
      return { org, runs: rs.length, complete: rs.filter((r) => missingFields(r).length === 0).length, missing: [...missing].sort((a, b) => b[1] - a[1]) };
    })
    .sort((a, b) => a.complete / a.runs - b.complete / b.runs || a.org.localeCompare(b.org));
}
