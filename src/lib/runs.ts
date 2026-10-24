/**
 * Program-run metrics — design doc §28. Pure functions, no I/O.
 *
 * TPW's five core fields, per program run (one cohort of a program):
 *   Total Programming hours, Number of Participants, Number of Participants
 *   Completed, Total Participant Programming hours (= completed × hours),
 *   Program Year (= year of start date).
 * Unknown values stay unknown: a run with "TBD" or a blank count is listed as
 * incomplete and left out of the totals that need it, never guessed.
 */

export const STATUSES = ["Planned", "In Progress", "Completed"] as const;
export type RunStatus = (typeof STATUSES)[number];

export interface Run {
  id: string;
  orgId: string;
  orgName: string;
  programName: string;
  facilityCode: string;
  facilityName: string;
  right3Target: boolean;
  womens: boolean;
  yard: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  totalHours: number | null;
  participants: number | null;
  completed: number | null;
  specialPopulations: boolean;
}

/** Completed × hours — TPW's "CALC: Total Participant Programming hours". */
export function participantHours(r: Pick<Run, "completed" | "totalHours">): number | null {
  return r.completed === null || r.totalHours === null ? null : r.completed * r.totalHours;
}

/** TPW's "CALC: Program Year (Year of Program Start Date)". */
export function programYear(r: Pick<Run, "startDate">): number | null {
  return r.startDate ? r.startDate.getUTCFullYear() : null;
}

/** What is still missing for a run to count fully, in plain words. */
export function missingFields(r: Run): string[] {
  const m: string[] = [];
  if (!r.startDate) m.push("start date");
  if (r.totalHours === null) m.push("programming hours");
  if (r.participants === null) m.push("number of participants");
  if (r.status === "Completed" && r.completed === null) m.push("number completed");
  return m;
}

export interface Totals {
  runs: number;
  completedRuns: number;
  inProgressRuns: number;
  plannedRuns: number;
  programmingHours: number;
  participants: number;
  completed: number;
  participantHours: number;
  /** completed / participants over completed runs where both are known. */
  completionRate: number | null;
  incompleteRuns: number;
}

export function totals(runs: Run[]): Totals {
  const sum = (f: (r: Run) => number | null) => runs.reduce((s, r) => s + (f(r) ?? 0), 0);
  const finished = runs.filter((r) => r.status === "Completed" && r.participants !== null && r.completed !== null);
  const enrolledInFinished = finished.reduce((s, r) => s + r.participants!, 0);
  return {
    runs: runs.length,
    completedRuns: runs.filter((r) => r.status === "Completed").length,
    inProgressRuns: runs.filter((r) => r.status === "In Progress").length,
    plannedRuns: runs.filter((r) => r.status === "Planned").length,
    programmingHours: sum((r) => r.totalHours),
    participants: sum((r) => r.participants),
    completed: sum((r) => r.completed),
    participantHours: sum(participantHours),
    completionRate: enrolledInFinished === 0 ? null : finished.reduce((s, r) => s + r.completed!, 0) / enrolledInFinished,
    incompleteRuns: runs.filter((r) => missingFields(r).length > 0).length,
  };
}

export function groupTotals<K extends string | number>(runs: Run[], key: (r: Run) => K | null) {
  const groups = new Map<K, Run[]>();
  for (const r of runs) {
    const k = key(r);
    if (k === null) continue;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  return [...groups].map(([k, rs]) => ({ key: k, runs: rs, totals: totals(rs) }));
}

/**
 * RIGHT Grant 3.0 qualifying-point signals the data can show (RFA, Oct 2025):
 * +0.5 for programming at a target institution, +0.5 for serving target
 * populations (RHU/EOP/MHCB). Budget points (1–3) need the org's budget,
 * which is not collected here.
 */
export function right3Signals(runs: Run[]) {
  const atTarget = runs.filter((r) => r.right3Target);
  return {
    targetInstitutionRuns: atTarget.length,
    targetInstitutions: [...new Set(atTarget.map((r) => r.facilityCode))].sort(),
    womensRuns: runs.filter((r) => r.womens).length,
    specialPopulationRuns: runs.filter((r) => r.specialPopulations).length,
    /** Additional points the runs evidence (max 1.0), before budget points. */
    additionalPoints: (atTarget.length > 0 ? 0.5 : 0) + (runs.some((r) => r.specialPopulations) ? 0.5 : 0),
  };
}

// ---------- form input ----------

export interface RunInput {
  orgName: string;
  programName: string;
  facilityCode: string;
  yard?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  totalHours?: number | null;
  participants?: number | null;
  completed?: number | null;
  specialPopulations?: boolean;
}

/** Hours helper: "2 sessions a week, 3 hours each, for 12 weeks" = 72. */
export function hoursFromSchedule(sessionsPerPeriod: number, hoursPerSession: number, periods: number): number {
  return Math.round(sessionsPerPeriod * hoursPerSession * periods * 10) / 10;
}

const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Returns a list of problems in plain words; empty = valid. */
export function validateRun(input: RunInput, facilityCodes: Set<string>): string[] {
  const p: string[] = [];
  if (!input.orgName?.trim()) p.push("Choose your organization.");
  if (!input.programName?.trim()) p.push("Choose or name the program.");
  if (!facilityCodes.has(input.facilityCode)) p.push("Choose the prison.");
  if (!STATUSES.includes(input.status as RunStatus)) p.push("Choose a status.");
  if (input.startDate && !isDate(input.startDate)) p.push("Start date is not a valid date.");
  if (input.endDate && !isDate(input.endDate)) p.push("End date is not a valid date.");
  if (isDate(input.startDate) && isDate(input.endDate) && input.endDate! < input.startDate!)
    p.push("End date is before the start date.");
  for (const [label, v] of [
    ["Programming hours", input.totalHours],
    ["Participants", input.participants],
    ["Completed", input.completed],
  ] as const) {
    if (v !== null && v !== undefined && (!Number.isFinite(v) || v < 0)) p.push(`${label} must be zero or more.`);
  }
  if (input.participants != null && input.completed != null && input.completed > input.participants)
    p.push("More people completed than took part.");
  return p;
}
