/**
 * Spreadsheet upload for organizations (design doc §28): a CSV in the
 * layout of TPW's Collective Impact Report (or close to it) becomes program
 * runs. Pure — the browser previews with it, the server re-validates.
 */
import { parseCsvTable } from "./csv";
import { STATUSES, validateRun, type RunInput } from "./runs";

type Field = "facility" | "yard" | "org" | "program" | "status" | "start" | "end" | "hours" | "participants" | "completed";

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Header prefixes (normalized) for each field; TPW's own headers first. */
const HEADERS: [Field, string[]][] = [
  ["completed", ["numberofparticipantscompleted", "participantscompleted", "completed"]],
  ["participants", ["numberofparticipants", "participants", "tookpart"]],
  ["facility", ["cdcrfacility", "cdcrfacilities", "facility", "prison", "institution"]],
  ["yard", ["yard"]],
  ["org", ["organizationname", "organization", "org"]],
  ["program", ["programname", "program"]],
  ["status", ["schedulestatus", "status"]],
  ["start", ["startdate", "start"]],
  ["end", ["enddate", "end"]],
  ["hours", ["totalprogramminghours", "courseHoursperparticipant".toLowerCase(), "programminghours", "coursehours", "hours"]],
];

/** Column index per field. CALC columns are ignored: Spera recalculates them. */
export function mapColumns(headers: string[]): Partial<Record<Field, number>> {
  const out: Partial<Record<Field, number>> = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    if (!n || n.startsWith("calc")) return;
    for (const [field, prefixes] of HEADERS) {
      if (out[field] === undefined && prefixes.some((p) => n.startsWith(p))) {
        out[field] = i;
        return;
      }
    }
  });
  return out;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const ym = (y: number, m: number) => (m >= 1 && m <= 12 && y > 1900 ? `${y}-${String(m).padStart(2, "0")}-01` : null);
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);

/**
 * Month + year from common spreadsheet date styles, as "YYYY-MM-01":
 * 2025-01-29, 2025-01, 1/29/2025, 1/29/25, 01/2025, Jan 2025, January 2025.
 * Blank or "TBD" → "" (unknown). Anything else → null (a problem).
 */
export function parseMonth(raw: string): string | null {
  const s = raw.trim();
  if (!s || /^tbd$/i.test(s)) return "";
  let m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(s);
  if (m) return ym(+m[1], +m[2]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (m) return ym(fullYear(+m[3]), +m[1]);
  m = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return ym(+m[2], +m[1]);
  m = /^([a-z]{3})[a-z]*\.?\s+(\d{4})$/i.exec(s);
  if (m && MONTHS.includes(m[1].toLowerCase())) return ym(+m[2], MONTHS.indexOf(m[1].toLowerCase()) + 1);
  return null;
}

/** "45", "45.0" → 45; blank / "TBD" → null; otherwise NaN (a problem). */
function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(/,/g, "");
  if (!s || /^tbd$/i.test(s)) return null;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

export interface Facility {
  code: string;
  name: string;
}

/** Facility by code in parentheses ("… (CTF)"), bare code, or full name. */
export function matchFacility(raw: string, facilities: Facility[]): string | null {
  const s = raw.trim();
  if (!s) return null;
  const code = /\(([A-Z]+)/.exec(s)?.[1] ?? s.toUpperCase();
  return (
    facilities.find((f) => f.code === code)?.code ??
    facilities.find((f) => norm(f.name) === norm(s))?.code ??
    null
  );
}

export interface SheetRow {
  /** 1-based line in the file (header = 1). */
  line: number;
  input: RunInput;
  problems: string[];
}

export interface SheetResult {
  rows: SheetRow[];
  /** Fields the file has no column for (rows can still be fine if they're optional). */
  missingColumns: string[];
}

const REQUIRED: [Field, string][] = [
  ["org", "Organization Name"],
  ["program", "Program Name"],
  ["facility", "CDCR Facility"],
  ["status", "Schedule Status"],
];

export function readSheet(text: string, facilities: Facility[], fallbackOrg = ""): SheetResult {
  const { headers, rows } = parseCsvTable(text);
  const col = mapColumns(headers);
  const missingColumns = REQUIRED.filter(([f]) => col[f] === undefined && !(f === "org" && fallbackOrg)).map(([, label]) => label);
  const codes = new Set(facilities.map((f) => f.code));
  const cell = (r: string[], f: Field) => (col[f] === undefined ? "" : (r[col[f]!] ?? "").trim());

  const out: SheetRow[] = [];
  rows.forEach((r, i) => {
    if (r.every((c) => !c.trim())) return; // blank template rows
    const problems: string[] = [];
    const facilityRaw = cell(r, "facility");
    const facilityCode = matchFacility(facilityRaw, facilities);
    if (facilityRaw && !facilityCode) problems.push(`Prison "${facilityRaw}" not recognized.`);
    const statusRaw = cell(r, "status");
    const status = STATUSES.find((s) => s.toLowerCase() === statusRaw.toLowerCase()) ?? statusRaw;
    const start = parseMonth(cell(r, "start"));
    const end = parseMonth(cell(r, "end"));
    if (start === null) problems.push(`Start date "${cell(r, "start")}" not understood.`);
    if (end === null) problems.push(`End date "${cell(r, "end")}" not understood.`);
    const nums = { totalHours: parseNumber(cell(r, "hours")), participants: parseNumber(cell(r, "participants")), completed: parseNumber(cell(r, "completed")) };
    for (const [k, v] of Object.entries(nums)) if (Number.isNaN(v)) problems.push(`${k === "totalHours" ? "Programming hours" : k === "participants" ? "Participants" : "Completed"} is not a number.`);
    const input: RunInput = {
      orgName: cell(r, "org") || fallbackOrg,
      programName: cell(r, "program"),
      facilityCode: facilityCode ?? "",
      yard: cell(r, "yard"),
      status,
      startDate: start ?? "",
      endDate: end ?? "",
      totalHours: Number.isNaN(nums.totalHours) ? null : nums.totalHours,
      participants: Number.isNaN(nums.participants) ? null : nums.participants,
      completed: Number.isNaN(nums.completed) ? null : nums.completed,
    };
    const validation = validateRun(input, codes).filter((p) => !(facilityRaw && p === "Choose the prison."));
    out.push({ line: i + 2, input, problems: [...problems, ...validation] });
  });
  return { rows: out, missingColumns };
}
