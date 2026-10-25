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
  /** Underserved institution in CDCR RIGHT Grant 4.0 (Attachment A). */
  underserved: boolean;
  womens: boolean;
  yard: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  totalHours: number | null;
  participants: number | null;
  completed: number | null;
  specialPopulations: boolean;
  /** Language other than English; null = English. */
  nonEnglishLanguage: string | null;
  /** "form", "estimate" or "import:<file>#<row>". */
  source?: string;
  /** When the run was saved on Spera. */
  submittedAt?: Date | null;
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
 * CDCR RIGHT Grant 4.0 (RFA released 2026-10-01, due 2026-11-30):
 * budget points 1–3, plus at most two half-points from three criteria —
 * programming at an underserved institution, serving RHU/EOP/MHCB, or
 * offering a program in a language other than English. Max 4 points.
 */
export const RIGHT4 = {
  name: "RIGHT Grant 4.0",
  dueDate: "2026-11-30",
  totalFunding: 19_400_000,
  maxPoints: 4,
} as const;

export const BUDGET_TIERS = [
  { label: "Under $250,000", points: 1 },
  { label: "$250,000 – $500,000", points: 2 },
  { label: "Over $500,000", points: 3 },
] as const;

export function right4Signals(runs: Run[]) {
  const atUnderserved = runs.filter((r) => r.underserved);
  const criteria = {
    underserved: atUnderserved.length > 0,
    specialPopulations: runs.some((r) => r.specialPopulations),
    nonEnglish: runs.some((r) => !!r.nonEnglishLanguage),
  };
  const met = Object.values(criteria).filter(Boolean).length;
  return {
    underservedRuns: atUnderserved.length,
    underservedInstitutions: [...new Set(atUnderserved.map((r) => r.facilityCode))].sort(),
    womensRuns: runs.filter((r) => r.womens).length,
    specialPopulationRuns: runs.filter((r) => r.specialPopulations).length,
    languages: [...new Set(runs.map((r) => r.nonEnglishLanguage).filter((l): l is string => !!l))].sort(),
    criteria,
    /** Additional points the runs evidence: 0.5 per criterion met, at most 1.0. */
    additionalPoints: Math.min(1, met * 0.5),
  };
}

/** Calendar years a run was active (start year through end year, or start year only). */
export function yearsActive(r: Pick<Run, "startDate" | "endDate">): number[] {
  if (!r.startDate) return [];
  const from = r.startDate.getUTCFullYear();
  const to = r.endDate ? Math.max(from, r.endDate.getUTCFullYear()) : from;
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/**
 * RIGHT 4.0 prior-service requirement: programming inside a CDCR institution
 * during at least two of the five years preceding the application.
 */
export function priorService(runs: Run[], applicationYear: number) {
  const window = Array.from({ length: 5 }, (_, i) => applicationYear - 5 + i);
  const active = new Set(runs.flatMap(yearsActive));
  const yearsWithProgramming = window.filter((y) => active.has(y));
  return { window, yearsWithProgramming, meets: yearsWithProgramming.length >= 2 };
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
  /** Language other than English, if any. */
  nonEnglishLanguage?: string;
  /** A past year added from memory ("Add past records"): year-level estimate, not an exact record. */
  estimate?: boolean;
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
