/**
 * Seed the ImpactLink database from the validated M0 demo dataset
 * (design doc §5, acceptance report: ../hsi-demo-data/validation_report.md).
 *
 *   npm run seed
 *
 * Loads the CLEAN CSVs (organizations, programs, participants, enrollments,
 * outcomes, cost_params) from ../hsi-demo-data/ via Prisma into SQLite.
 * Idempotent: wipes the six tables first, then bulk-inserts.
 *
 * Two source-data adaptations (logged in DECISIONS.md):
 *  - enrollments.csv splits credits into credits_mcc/racc/emc columns;
 *    §4 stores one JSON object -> assembled here.
 *  - programs.csv uses title-case type labels; §4 locks a lowercase enum
 *    -> normalized here.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR =
  process.env.SEED_DATA_DIR ?? path.resolve(process.cwd(), "data", "demo-data");

/** Minimal RFC-4180 CSV parser (handles quoted fields, embedded commas/quotes). */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

function readCsv(name: string): Record<string, string>[] {
  return parseCsv(readFileSync(path.join(DATA_DIR, name), "utf8"));
}

/** "2021-09-02" -> Date at UTC midnight. */
function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const PROGRAM_TYPE_MAP: Record<string, string> = {
  Education: "education",
  Vocational: "vocational",
  "Substance Use": "sud",
  "Restorative Justice": "restorative",
  "Reentry Support": "reentry",
};

async function chunked<T>(items: T[], size: number, fn: (batch: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

async function main() {
  console.log(`Seeding from ${DATA_DIR}`);

  // Wipe in FK-safe order (idempotent re-runs).
  await prisma.outcome.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.program.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.costParam.deleteMany();

  const orgs = readCsv("organizations.csv").map((r) => ({
    id: r.id,
    name: r.name,
    programTypes: r.program_types,
    facilities: r.facilities,
    dataGrade: r.data_grade,
  }));
  await prisma.organization.createMany({ data: orgs });

  const programs = readCsv("programs.csv").map((r) => ({
    id: r.id,
    orgId: r.org_id,
    name: r.name,
    type: PROGRAM_TYPE_MAP[r.type] ?? "other",
    facility: r.facility,
    startDate: parseDate(r.start_date),
    endDate: parseDate(r.end_date),
  }));
  await prisma.program.createMany({ data: programs });

  // participants.csv = 5,000 program participants + the 2,000-person
  // synthetic control group (control members have no enrollments; §5.2).
  const participants = readCsv("participants.csv").map((r) => ({
    participantKey: r.participant_key,
    releaseYear: Number(r.release_year),
    ageBand: r.age_band,
    gender: r.gender,
    riskBand: r.risk_band,
  }));
  await chunked(participants, 1000, (b) => prisma.participant.createMany({ data: b }));

  const enrollments = readCsv("enrollments.csv").map((r) => ({
    id: r.id,
    participantKey: r.participant_key,
    programId: r.program_id,
    enrollDate: parseDate(r.enroll_date),
    status: r.status,
    completionDate: r.completion_date ? parseDate(r.completion_date) : null,
    credits: JSON.stringify({
      MCC: r.credits_mcc === "1",
      RACC: r.credits_racc === "1",
      EMC: r.credits_emc === "1",
    }),
  }));
  await chunked(enrollments, 1000, (b) => prisma.enrollment.createMany({ data: b }));

  const outcomes = readCsv("outcomes.csv").map((r) => ({
    id: r.id,
    participantKey: r.participant_key,
    eventType: r.event_type,
    eventDate: parseDate(r.event_date),
    offenseLevel: r.offense_level,
  }));
  await chunked(outcomes, 1000, (b) => prisma.outcome.createMany({ data: b }));

  const costParams = readCsv("cost_params.csv").map((r) => ({
    key: r.key,
    value: Number(r.value),
    source: r.source,
    year: Number(r.year),
  }));
  await prisma.costParam.createMany({ data: costParams });

  const counts = {
    organizations: await prisma.organization.count(),
    programs: await prisma.program.count(),
    participants: await prisma.participant.count(),
    enrollments: await prisma.enrollment.count(),
    outcomes: await prisma.outcome.count(),
    costParams: await prisma.costParam.count(),
  };
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
