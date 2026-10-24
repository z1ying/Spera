/**
 * Cleaning + validation for the import wizard — design doc §6.1 steps 4–6.
 * Pure functions, no I/O: callers pass in the participant registry, the
 * program dictionary and what is already on file, and get back the rows to
 * insert plus a receipt in which every problem is listed, never dropped
 * silently (§6.1) and every unmatched key is counted (§6.1 step 6, §23).
 */
import { DEFAULT_FRAMEWORK, type FrameworkConfig, type OutcomeEventType } from "./framework";
import { NO_CREDITS, type Credits } from "./metrics";
import type { ImportKind } from "./mapping";

// ---------- field parsers ----------

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function utcDate(y: number, m: number, d: number): Date | null {
  const dt = new Date(Date.UTC(y, m, d));
  // Reject impossible dates such as 02/31 instead of letting them roll over.
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m || dt.getUTCDate() !== d) return null;
  return dt;
}

/**
 * The three date styles seen in CBO exports (§5.3): MM/DD/YYYY, YYYY-MM-DD,
 * DD-Mon-YY. Two-digit years are 20YY. Returns null when unparseable.
 */
export function parseFlexibleDate(raw: string): Date | null {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return utcDate(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return utcDate(+m[3], +m[1] - 1, +m[2]);
  m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/.exec(s);
  if (m) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month === undefined) return null;
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return utcDate(year, month, +m[1]);
  }
  return null;
}

/** yes/no in English and Spanish, plus the status words themselves. */
export function parseCompleted(raw: string): boolean | null {
  const s = raw.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (["yes", "y", "si", "true", "1", "completed", "complete", "completado"].includes(s)) return true;
  if (["no", "n", "false", "0", "dropped", "abandono"].includes(s)) return false;
  return null;
}

/**
 * "MCC+RACC", "M+R+E", "EMC; MCC" -> Credits, using the framework's credit
 * codes and aliases. Unknown tokens are reported, never guessed.
 */
export function parseCredits(
  raw: string,
  framework: FrameworkConfig = DEFAULT_FRAMEWORK,
): { credits: Credits; unknown: string[] } {
  const tokens = new Map<string, string>();
  for (const c of framework.credits) for (const t of [c.code, ...c.aliases]) tokens.set(t.toUpperCase(), c.code);
  const credits: Credits = Object.fromEntries(framework.credits.map((c) => [c.code, false]));
  const unknown: string[] = [];
  for (const token of raw.split(/[+,;/\s]+/).filter(Boolean)) {
    const code = tokens.get(token.toUpperCase());
    if (code) credits[code] = true;
    else unknown.push(token);
  }
  return { credits, unknown };
}

const EVENT_WORDS: Record<OutcomeEventType, string[]> = {
  conviction: ["conviction", "convicted", "condena"],
  arrest: ["arrest", "arrested", "arresto"],
  return_to_custody: ["return_to_custody", "rtc", "returned_to_custody", "reincarceration"],
  parole_violation: ["parole_violation", "pv", "violation", "technical_violation", "violacion_de_libertad_condicional"],
  parole_discharge: ["parole_discharge", "discharge", "discharged", "parole_completed", "discharged_from_parole"],
};

/** Map an external system's event label to a tracked outcome event, or null. */
export function parseEventType(
  raw: string,
  framework: FrameworkConfig = DEFAULT_FRAMEWORK,
): OutcomeEventType | null {
  const s = raw.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]+/g, "_");
  for (const type of framework.outcomeEvents) if (EVENT_WORDS[type].includes(s)) return type;
  return null;
}

/** Offense level; parole discharges carry none (see OFFENSE_OPTIONAL). */
export function parseOffenseLevel(raw: string): "felony" | "misdemeanor" | null {
  const s = raw.trim().toLowerCase();
  if (["felony", "f", "fel"].includes(s)) return "felony";
  if (["misdemeanor", "m", "misd"].includes(s)) return "misdemeanor";
  return null;
}

// ---------- program dictionary ----------

export interface ProgramEntry {
  programId: string;
  orgId: string;
  /** The program's own name plus every saved alias for it. */
  labels: string[];
}

export function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
}

export type ProgramResolution =
  | { kind: "resolved"; programId: string; orgId: string }
  | { kind: "unknown" }
  | { kind: "ambiguous"; programIds: string[] };

/**
 * Resolve an org's own program name to a program (§6.1 step 4). Exact label
 * first, then case/punctuation-insensitive. When the upload names one org,
 * only that org's programs are candidates; a multi-org file must resolve to
 * exactly one program across the network or the row goes to the queue.
 */
export function makeProgramResolver(entries: ProgramEntry[], orgId: string | null) {
  const pool = orgId ? entries.filter((e) => e.orgId === orgId) : entries;
  const exact = new Map<string, Set<string>>();
  const loose = new Map<string, Set<string>>();
  const orgOf = new Map(pool.map((e) => [e.programId, e.orgId]));
  for (const e of pool) {
    for (const l of e.labels) {
      if (!exact.has(l)) exact.set(l, new Set());
      exact.get(l)!.add(e.programId);
      const n = normalizeLabel(l);
      if (!loose.has(n)) loose.set(n, new Set());
      loose.get(n)!.add(e.programId);
    }
  }
  return (label: string): ProgramResolution => {
    const hits = exact.get(label.trim()) ?? loose.get(normalizeLabel(label));
    if (!hits || hits.size === 0) return { kind: "unknown" };
    if (hits.size > 1) return { kind: "ambiguous", programIds: [...hits] };
    const programId = [...hits][0];
    return { kind: "resolved", programId, orgId: orgOf.get(programId)! };
  };
}

// ---------- receipt ----------

export type IssueCode =
  | "missing_key"
  | "unmatched_key"
  | "missing_program"
  | "unknown_program"
  | "ambiguous_program"
  | "missing_enroll_date"
  | "bad_date"
  | "completion_before_enroll"
  | "missing_completed"
  | "missing_completion_date"
  | "unknown_credit"
  | "missing_event_type"
  | "unknown_event_type"
  | "missing_event_date"
  | "missing_offense_level";

/** Whether an issue keeps the row out of the database. */
export const REJECTING: Record<IssueCode, boolean> = {
  missing_key: true,
  unmatched_key: true,
  missing_program: true,
  unknown_program: true,
  ambiguous_program: true,
  missing_enroll_date: true,
  bad_date: true,
  completion_before_enroll: true,
  missing_completed: true,
  missing_completion_date: false,
  unknown_credit: false,
  missing_event_type: true,
  unknown_event_type: true,
  missing_event_date: true,
  missing_offense_level: true,
};

export const ISSUE_LABELS: Record<IssueCode, string> = {
  missing_key: "Participant key missing",
  unmatched_key: "Participant key not in the registry (unmatched)",
  missing_program: "Program name missing",
  unknown_program: "Program name not in this organization's dictionary",
  ambiguous_program: "Program name matches more than one program",
  missing_enroll_date: "Start date missing",
  bad_date: "Date in an unrecognized format",
  completion_before_enroll: "End date is before start date",
  missing_completed: "Completion status missing",
  missing_completion_date: "Completed, but end date missing (kept, date left blank)",
  unknown_credit: "Unrecognized credit code (ignored)",
  missing_event_type: "Event type missing",
  unknown_event_type: "Event type not recognized",
  missing_event_date: "Event date missing",
  missing_offense_level: "Offense level missing or not recognized",
};

export interface Issue {
  /** 1-based line number in the uploaded file (header = line 1). */
  line: number;
  code: IssueCode;
  value?: string;
}

export interface MatchSummary {
  /** Distinct participant keys in the file. */
  keys: number;
  matched: number;
  unmatched: number;
  /** matched / keys; null for a file with no keys. */
  rate: number | null;
  /** Outcome files only: matched keys that belong to program participants. */
  matchedToParticipants?: number;
  /** Outcome files only: matched keys with no program enrollment (comparison group). */
  matchedToComparison?: number;
}

export interface Receipt {
  kind: ImportKind;
  rowsRead: number;
  duplicatesInFile: number;
  alreadyOnFile: number;
  inserted: number;
  rejectedRows: number;
  match: MatchSummary;
  issues: Issue[];
  issueCounts: Partial<Record<IssueCode, number>>;
  /** Interpretations applied to ambiguous input, printed on the receipt. */
  assumptions: string[];
  /** Unknown program labels, with how many rows each affects (manual queue). */
  unresolvedLabels: { label: string; rows: number }[];
  /** Rows imported per organization (enrollment files). */
  rowsByOrg: Record<string, number>;
  /** Critical-field rejection share per organization (enrollment files). */
  rejectShareByOrg: Record<string, number>;
}

// ---------- enrollment files ----------

export interface EnrollmentInsert {
  participantKey: string;
  programId: string;
  enrollDate: Date;
  status: "completed" | "dropped";
  completionDate: Date | null;
  credits: Credits;
}

/** Target field -> column index in the uploaded file. */
export type ColumnIndex = Partial<Record<string, number>>;

export interface EnrollmentContext {
  registry: Set<string>;
  resolveProgram: (label: string) => ProgramResolution;
  /** `${participantKey}|${programId}` already in the database. */
  existing: Set<string>;
}

function finish(
  base: Omit<Receipt, "issueCounts" | "match" | "rejectedRows">,
  keysSeen: Set<string>,
  matchedKeys: Set<string>,
  rejectedLines: Set<number>,
  extra: Partial<MatchSummary> = {},
): Receipt {
  const issueCounts: Partial<Record<IssueCode, number>> = {};
  for (const i of base.issues) issueCounts[i.code] = (issueCounts[i.code] ?? 0) + 1;
  return {
    ...base,
    rejectedRows: rejectedLines.size,
    issueCounts,
    match: {
      keys: keysSeen.size,
      matched: matchedKeys.size,
      unmatched: keysSeen.size - matchedKeys.size,
      rate: keysSeen.size === 0 ? null : matchedKeys.size / keysSeen.size,
      ...extra,
    },
  };
}

export function cleanEnrollments(
  rows: string[][],
  col: ColumnIndex,
  ctx: EnrollmentContext,
): { receipt: Receipt; inserts: EnrollmentInsert[] } {
  const cell = (r: string[], field: string) => (col[field] === undefined ? "" : (r[col[field]!] ?? "").trim());
  const issues: Issue[] = [];
  const inserts: EnrollmentInsert[] = [];
  const seen = new Set<string>();
  const keysSeen = new Set<string>();
  const matchedKeys = new Set<string>();
  const rejectedLines = new Set<number>();
  const unresolved = new Map<string, number>();
  const rowsByOrg: Record<string, number> = {};
  const totalByOrg: Record<string, number> = {};
  const rejectedByOrg: Record<string, number> = {};
  let duplicatesInFile = 0;
  let alreadyOnFile = 0;
  let blankCredits = 0;

  rows.forEach((r, idx) => {
    const line = idx + 2;
    const rowIssues: Issue[] = [];
    const flag = (code: IssueCode, value?: string) => rowIssues.push({ line, code, value });

    const key = cell(r, "participant_key");
    if (!key) flag("missing_key");
    else {
      keysSeen.add(key);
      if (ctx.registry.has(key)) matchedKeys.add(key);
      else flag("unmatched_key", key);
    }

    const label = cell(r, "program");
    let program: ProgramResolution | null = null;
    if (!label) flag("missing_program");
    else {
      program = ctx.resolveProgram(label);
      if (program.kind === "unknown") {
        flag("unknown_program", label);
        unresolved.set(label, (unresolved.get(label) ?? 0) + 1);
      } else if (program.kind === "ambiguous") flag("ambiguous_program", label);
    }
    const orgId = program?.kind === "resolved" ? program.orgId : null;

    const startRaw = cell(r, "enroll_date");
    const start = startRaw ? parseFlexibleDate(startRaw) : null;
    if (!startRaw) flag("missing_enroll_date");
    else if (!start) flag("bad_date", startRaw);

    const endRaw = cell(r, "completion_date");
    const end = endRaw ? parseFlexibleDate(endRaw) : null;
    if (endRaw && !end) flag("bad_date", endRaw);
    if (start && end && end < start) flag("completion_before_enroll", `${startRaw} → ${endRaw}`);

    const completed = parseCompleted(cell(r, "completed"));
    if (completed === null) flag("missing_completed", cell(r, "completed") || undefined);
    if (completed === true && !endRaw) flag("missing_completion_date");

    const creditsRaw = cell(r, "credits");
    if (!creditsRaw) blankCredits++;
    const { credits, unknown } = parseCredits(creditsRaw);
    for (const u of unknown) flag("unknown_credit", u);

    issues.push(...rowIssues);
    if (orgId) totalByOrg[orgId] = (totalByOrg[orgId] ?? 0) + 1;
    if (rowIssues.some((i) => REJECTING[i.code])) {
      rejectedLines.add(line);
      if (orgId) rejectedByOrg[orgId] = (rejectedByOrg[orgId] ?? 0) + 1;
      return;
    }

    // Narrowed by the rejection check above.
    const programId = (program as { programId: string }).programId;
    const dedupeKey = `${key}|${programId}`;
    if (seen.has(dedupeKey)) {
      duplicatesInFile++;
      return;
    }
    seen.add(dedupeKey);
    if (ctx.existing.has(dedupeKey)) {
      alreadyOnFile++;
      return;
    }
    inserts.push({
      participantKey: key,
      programId,
      enrollDate: start!,
      status: completed ? "completed" : "dropped",
      completionDate: completed ? end : null,
      credits: completed ? credits : { ...NO_CREDITS },
    });
    rowsByOrg[orgId!] = (rowsByOrg[orgId!] ?? 0) + 1;
  });

  const assumptions: string[] = [];
  if (blankCredits > 0)
    assumptions.push(
      `${blankCredits} blank credits cells were read as "no credits earned" — a blank cannot be told apart from a missing value.`,
    );
  assumptions.push("Duplicate rows are the same participant in the same program; the first occurrence is kept.");
  assumptions.push("Dropped enrollments are recorded without credits, whatever the credits cell says.");

  const rejectShareByOrg = Object.fromEntries(
    Object.entries(totalByOrg).map(([o, n]) => [o, (rejectedByOrg[o] ?? 0) / n]),
  );

  return {
    inserts,
    receipt: finish(
      {
        kind: "enrollments",
        rowsRead: rows.length,
        duplicatesInFile,
        alreadyOnFile,
        inserted: inserts.length,
        issues,
        assumptions,
        unresolvedLabels: [...unresolved].map(([label, n]) => ({ label, rows: n })).sort((a, b) => b.rows - a.rows),
        rowsByOrg,
        rejectShareByOrg,
      },
      keysSeen,
      matchedKeys,
      rejectedLines,
    ),
  };
}

// ---------- outcome files ----------

/** Events that are not offenses, so no offense level is expected. */
export const OFFENSE_OPTIONAL: ReadonlySet<OutcomeEventType> = new Set(["parole_discharge"]);

export interface OutcomeInsert {
  participantKey: string;
  eventType: OutcomeEventType;
  eventDate: Date;
  /** null only for events in OFFENSE_OPTIONAL. */
  offenseLevel: "felony" | "misdemeanor" | null;
}

export interface OutcomeContext {
  registry: Set<string>;
  /** Registry keys with at least one program enrollment. */
  enrolled: Set<string>;
  /** `${participantKey}|${eventType}|${yyyy-mm-dd}` already in the database. */
  existing: Set<string>;
}

export const outcomeDedupeKey = (key: string, type: string, date: Date) =>
  `${key}|${type}|${date.toISOString().slice(0, 10)}`;

export function cleanOutcomes(
  rows: string[][],
  col: ColumnIndex,
  ctx: OutcomeContext,
): { receipt: Receipt; inserts: OutcomeInsert[] } {
  const cell = (r: string[], field: string) => (col[field] === undefined ? "" : (r[col[field]!] ?? "").trim());
  const issues: Issue[] = [];
  const inserts: OutcomeInsert[] = [];
  const seen = new Set<string>();
  const keysSeen = new Set<string>();
  const matchedKeys = new Set<string>();
  const rejectedLines = new Set<number>();
  let duplicatesInFile = 0;
  let alreadyOnFile = 0;

  rows.forEach((r, idx) => {
    const line = idx + 2;
    const rowIssues: Issue[] = [];
    const flag = (code: IssueCode, value?: string) => rowIssues.push({ line, code, value });

    const key = cell(r, "participant_key");
    if (!key) flag("missing_key");
    else {
      keysSeen.add(key);
      if (ctx.registry.has(key)) matchedKeys.add(key);
      else flag("unmatched_key", key);
    }

    const typeRaw = cell(r, "event_type");
    const eventType = typeRaw ? parseEventType(typeRaw) : null;
    if (!typeRaw) flag("missing_event_type");
    else if (!eventType) flag("unknown_event_type", typeRaw);

    const dateRaw = cell(r, "event_date");
    const eventDate = dateRaw ? parseFlexibleDate(dateRaw) : null;
    if (!dateRaw) flag("missing_event_date");
    else if (!eventDate) flag("bad_date", dateRaw);

    const offenseLevel = parseOffenseLevel(cell(r, "offense_level"));
    if (!offenseLevel && !(eventType && OFFENSE_OPTIONAL.has(eventType)))
      flag("missing_offense_level", cell(r, "offense_level") || undefined);

    issues.push(...rowIssues);
    if (rowIssues.some((i) => REJECTING[i.code])) {
      rejectedLines.add(line);
      return;
    }

    const dedupeKey = outcomeDedupeKey(key, eventType!, eventDate!);
    if (seen.has(dedupeKey)) {
      duplicatesInFile++;
      return;
    }
    seen.add(dedupeKey);
    if (ctx.existing.has(dedupeKey)) {
      alreadyOnFile++;
      return;
    }
    inserts.push({ participantKey: key, eventType: eventType!, eventDate: eventDate!, offenseLevel });
  });

  const matchedToParticipants = [...matchedKeys].filter((k) => ctx.enrolled.has(k)).length;
  return {
    inserts,
    receipt: finish(
      {
        kind: "outcomes",
        rowsRead: rows.length,
        duplicatesInFile,
        alreadyOnFile,
        inserted: inserts.length,
        issues,
        assumptions: [
          "Records are linked only on the hashed participant key — never on names, dates of birth, or case numbers.",
          "A record whose key is not in the registry is listed as unmatched, not guessed at.",
        ],
        unresolvedLabels: [],
        rowsByOrg: {},
        rejectShareByOrg: {},
      },
      keysSeen,
      matchedKeys,
      rejectedLines,
      { matchedToParticipants, matchedToComparison: matchedKeys.size - matchedToParticipants },
    ),
  };
}

// ---------- data grade (§6.1) ----------

/** Share of rows rejected for critical fields above which an org is grade C. */
export const GRADE_C_REJECT_SHARE = 0.2;

/**
 * A = outcomes linked to the org's participants; B = process data only;
 * C = critical fields missing (too many rejected rows) or no records at all.
 */
export function dataGrade(args: { hasEnrollments: boolean; hasLinkedOutcomes: boolean; rejectShare: number }): "A" | "B" | "C" {
  if (!args.hasEnrollments || args.rejectShare > GRADE_C_REJECT_SHARE) return "C";
  return args.hasLinkedOutcomes ? "A" : "B";
}
