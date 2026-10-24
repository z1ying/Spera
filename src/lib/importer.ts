/**
 * Server-side import orchestration (design doc §6, §23, §24): picks the
 * mapping suggestion source, runs the pure cleaners in clean.ts against the
 * database, writes the rows, records the ImportJob, and recomputes data
 * grades for the organizations the import touched.
 */
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  cleanEnrollments,
  cleanOutcomes,
  dataGrade,
  makeProgramResolver,
  outcomeDedupeKey,
  type ColumnIndex,
  type ProgramEntry,
  type Receipt,
} from "./clean";
import { parseCsvTable } from "./csv";
import { prisma } from "./db";
import {
  detectKind,
  geminiMapping,
  headerSignature,
  missingRequired,
  ruleMapping,
  type ColumnSuggestion,
  type ImportKind,
  type MappingSource,
} from "./mapping";

const CACHE_FILE = path.resolve(process.cwd(), "data", "mapping_cache.json");

interface StoredMapping {
  signature: string;
  headers: string[];
  /** column -> target field (null = ignored) */
  columns: Record<string, string | null>;
  orgsTouched: string[];
}

export interface Suggestion {
  headers: string[];
  sample: string[][];
  rowCount: number;
  suggestions: ColumnSuggestion[];
  source: MappingSource;
  kind: ImportKind;
  /** Why a preferred source was not used (e.g. Gemini unavailable). */
  note?: string;
  /** For source "template": the import whose confirmed mapping is reused. */
  template?: { fileName: string; createdAt: string };
}

function readCache(): Record<string, ColumnSuggestion[]> {
  try {
    return existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, "utf8")) : {};
  } catch {
    return {};
  }
}

export async function suggestMapping(text: string): Promise<Suggestion> {
  const { headers, rows } = parseCsvTable(text);
  const signature = headerSignature(headers);
  const base = { headers, sample: rows.slice(0, 5), rowCount: rows.length };
  const done = (suggestions: ColumnSuggestion[], source: MappingSource, extra: Partial<Suggestion> = {}): Suggestion => ({
    ...base,
    suggestions,
    source,
    kind: detectKind(suggestions),
    ...extra,
  });

  // 1. A mapping a human already confirmed for this exact format.
  const jobs = await prisma.importJob.findMany({
    where: { status: "committed", mapping: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { fileName: true, createdAt: true, mapping: true },
  });
  for (const job of jobs) {
    const m = JSON.parse(job.mapping!) as StoredMapping;
    if (m.signature !== signature) continue;
    return done(
      headers.map((column) => ({ column, target: m.columns[column] ?? null, confidence: m.columns[column] ? 1 : 0 })),
      "template",
      { template: { fileName: job.fileName, createdAt: job.createdAt.toISOString() } },
    );
  }

  // 2. Offline demo replay of a recorded Gemini answer.
  const cache = readCache();
  if (process.env.DEMO_MODE === "1" && cache[signature]) return done(cache[signature], "cache");

  // 3. Gemini, recording the answer for later offline replay.
  let note: string | undefined;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const suggestions = await geminiMapping(headers, rows, {
        apiKey,
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      });
      try {
        writeFileSync(CACHE_FILE, JSON.stringify({ ...cache, [signature]: suggestions }, null, 2));
      } catch {
        // Cache is a convenience for offline demos; failing to write it is not an error.
      }
      return done(suggestions, "gemini");
    } catch (e) {
      note = `Gemini unavailable (${e instanceof Error ? e.message : "error"}); using rule-based matching.`;
    }
  } else {
    note = "No Gemini key configured; using rule-based matching.";
  }

  // 4. Rules — always available.
  return done(ruleMapping(headers), "rules", { note });
}

export interface CommitRequest {
  fileName: string;
  text: string;
  /** column -> target field (null = ignore column) */
  mapping: Record<string, string | null>;
  /** Set when the file comes from one organization; null for multi-org or outcome files. */
  orgId: string | null;
  /** Answers from the manual program-name queue, saved to the org's dictionary first. */
  labelAssignments?: { label: string; programId: string }[];
}

export interface GradeChange {
  orgId: string;
  name: string;
  before: string;
  after: string;
}

export interface CommitResult {
  jobId: string;
  fileName: string;
  receipt: Receipt;
  gradeChanges: GradeChange[];
  orgNames: Record<string, string>;
}

export class ImportError extends Error {}

const rowId = (prefix: string, jobId: string, i: number) => `${prefix}-${jobId.slice(0, 8)}-${String(i).padStart(5, "0")}`;

async function chunked<T>(items: T[], size: number, fn: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await fn(items.slice(i, i + size));
}

export async function commitImport(req: CommitRequest): Promise<CommitResult> {
  const { headers, rows } = parseCsvTable(req.text);
  const col: ColumnIndex = {};
  headers.forEach((h, i) => {
    const target = req.mapping[h];
    if (target) col[target] = i;
  });
  const targets = Object.keys(col);
  const kind = detectKind(targets.map((target) => ({ target })));
  const missing = missingRequired(kind, targets);
  if (missing.length > 0) throw new ImportError(`Required fields not mapped: ${missing.map((f) => f.label).join(", ")}`);

  const programs = await prisma.program.findMany({ include: { aliases: true } });
  for (const a of req.labelAssignments ?? []) {
    const program = programs.find((p) => p.id === a.programId);
    if (!program) throw new ImportError(`Unknown program ${a.programId}`);
    await prisma.programAlias.upsert({
      where: { orgId_label: { orgId: program.orgId, label: a.label } },
      create: { orgId: program.orgId, label: a.label, programId: program.id },
      update: { programId: program.id },
    });
    program.aliases.push({ orgId: program.orgId, label: a.label, programId: program.id });
  }

  const registry = new Set((await prisma.participant.findMany({ select: { participantKey: true } })).map((p) => p.participantKey));
  const orgsBefore = await prisma.organization.findMany();
  const orgNames = Object.fromEntries(orgsBefore.map((o) => [o.id, o.name]));
  const jobId = randomUUID();
  let receipt: Receipt;
  let touchedOrgs: string[];

  if (kind === "enrollments") {
    const entries: ProgramEntry[] = programs.map((p) => ({
      programId: p.id,
      orgId: p.orgId,
      labels: [p.name, ...p.aliases.map((a) => a.label)],
    }));
    const existing = new Set(
      (await prisma.enrollment.findMany({ select: { participantKey: true, programId: true } })).map(
        (e) => `${e.participantKey}|${e.programId}`,
      ),
    );
    const out = cleanEnrollments(rows, col, {
      registry,
      resolveProgram: makeProgramResolver(entries, req.orgId),
      existing,
    });
    receipt = out.receipt;
    const data = out.inserts.map((e, i) => ({
      id: rowId("ENR", jobId, i),
      participantKey: e.participantKey,
      programId: e.programId,
      enrollDate: e.enrollDate,
      status: e.status,
      completionDate: e.completionDate,
      credits: JSON.stringify(e.credits),
    }));
    await chunked(data, 500, (batch) => prisma.enrollment.createMany({ data: batch }));
    touchedOrgs = Object.keys(receipt.rejectShareByOrg);
  } else {
    const enrolled = new Set(
      (await prisma.enrollment.findMany({ select: { participantKey: true }, distinct: ["participantKey"] })).map(
        (e) => e.participantKey,
      ),
    );
    const existing = new Set(
      (await prisma.outcome.findMany({ select: { participantKey: true, eventType: true, eventDate: true } })).map((o) =>
        outcomeDedupeKey(o.participantKey, o.eventType, o.eventDate),
      ),
    );
    const out = cleanOutcomes(rows, col, { registry, enrolled, existing });
    receipt = out.receipt;
    const data = out.inserts.map((o, i) => ({ id: rowId("OUT", jobId, i), ...o }));
    await chunked(data, 500, (batch) => prisma.outcome.createMany({ data: batch }));
    const newKeys = [...new Set(out.inserts.map((o) => o.participantKey))];
    const orgRows = newKeys.length
      ? await prisma.enrollment.findMany({
          where: { participantKey: { in: newKeys } },
          select: { program: { select: { orgId: true } } },
        })
      : [];
    touchedOrgs = [...new Set(orgRows.map((r) => r.program.orgId))];
  }

  const stored: StoredMapping = {
    signature: headerSignature(headers),
    headers,
    columns: Object.fromEntries(headers.map((h) => [h, req.mapping[h] ?? null])),
    orgsTouched: touchedOrgs,
  };
  await prisma.importJob.create({
    data: {
      id: jobId,
      orgId: req.orgId,
      kind,
      fileName: req.fileName,
      status: "committed",
      mapping: JSON.stringify(stored),
      issues: JSON.stringify(receipt),
    },
  });

  const gradeChanges = await recomputeGrades(touchedOrgs, orgsBefore);
  return { jobId, fileName: req.fileName, receipt, gradeChanges, orgNames };
}

/** Latest enrollment import's rejection share per org (0 if none). */
async function latestRejectShares(): Promise<Record<string, number>> {
  const jobs = await prisma.importJob.findMany({
    where: { kind: "enrollments", status: "committed" },
    orderBy: { createdAt: "asc" },
    select: { issues: true },
  });
  const shares: Record<string, number> = {};
  for (const j of jobs) Object.assign(shares, (JSON.parse(j.issues ?? "{}") as Receipt).rejectShareByOrg ?? {});
  return shares;
}

async function recomputeGrades(
  orgIds: string[],
  before: { id: string; name: string; dataGrade: string }[],
): Promise<GradeChange[]> {
  if (orgIds.length === 0) return [];
  const shares = await latestRejectShares();
  const changes: GradeChange[] = [];
  for (const orgId of orgIds) {
    const hasEnrollments = (await prisma.enrollment.count({ where: { program: { orgId } } })) > 0;
    const linked = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) AS n FROM enrollments e
      JOIN programs p ON p.id = e.program_id
      WHERE p.org_id = ${orgId}
        AND EXISTS (SELECT 1 FROM outcomes o WHERE o.participant_key = e.participant_key)
      LIMIT 1`;
    const grade = dataGrade({
      hasEnrollments,
      hasLinkedOutcomes: Number(linked[0]?.n ?? 0) > 0,
      rejectShare: shares[orgId] ?? 0,
    });
    const prev = before.find((o) => o.id === orgId);
    await prisma.organization.update({ where: { id: orgId }, data: { dataGrade: grade } });
    changes.push({ orgId, name: prev?.name ?? orgId, before: prev?.dataGrade ?? "—", after: grade });
  }
  return changes;
}

/** Bundled demo files the wizard offers as one-click samples (whitelist). */
export const SAMPLE_FILES = [
  { name: "demo_q1_spanish.csv", label: "Spanish CBO export — Q1", kind: "enrollments" },
  { name: "sample_import_D_outcomes_external.csv", label: "External outcome system export", kind: "outcomes" },
  { name: "demo_q2_spanish.csv", label: "Spanish CBO export — Q2 (same format)", kind: "enrollments" },
  { name: "sample_import_A_english.csv", label: "English CBO export", kind: "enrollments" },
  { name: "sample_import_B_abbrev.csv", label: "Abbreviated-header CBO export", kind: "enrollments" },
] as const;

export function readSample(name: string): string | null {
  if (!SAMPLE_FILES.some((s) => s.name === name)) return null;
  return readFileSync(path.resolve(process.cwd(), "data", "demo-data", name), "utf8");
}
