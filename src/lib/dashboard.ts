/**
 * TPW network dashboard — design doc §28. Pure functions over program runs:
 * filters, the yearly trend, the avoided-returns estimate and reporting
 * timeliness. No I/O.
 */
import { programYear, totals, type Run } from "./runs";

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
