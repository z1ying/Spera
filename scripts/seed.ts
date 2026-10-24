/**
 * Seed the ImpactLink database from the validated M0 demo dataset
 * (design doc §5, acceptance report: ../hsi-demo-data/validation_report.md).
 *
 *   npm run seed
 *
 * Loads the CLEAN CSVs (organizations, programs, participants, enrollments,
 * outcomes, cost_params) from ../hsi-demo-data/ via Prisma into SQLite.
 * Idempotent: wipes the tables first, then bulk-inserts.
 *
 *   npm run seed:demo   (= seed.ts --demo)
 *
 * Demo mode (design doc §23) holds back the enrollments and outcomes of
 * DEMO_HOLDOUT_ORGS so the live demo can bring them back in two steps:
 * sample_import_C_spanish.csv (process half) then
 * sample_import_D_outcomes_external.csv (outcome half). The participant
 * registry (release cohorts) stays complete — it is the join target.
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
import { parseCsv } from "../src/lib/csv";

const prisma = new PrismaClient();
const DEMO = process.argv.includes("--demo");
/** Organizations whose records arrive live in the demo (both are in sample C). */
const DEMO_HOLDOUT_ORGS = new Set(["org-07", "org-08"]);
const DATA_DIR =
  process.env.SEED_DATA_DIR ?? path.resolve(process.cwd(), "data", "demo-data");

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
  await prisma.programAlias.deleteMany();
  await prisma.program.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.costParam.deleteMany();

  const orgs = readCsv("organizations.csv").map((r) => ({
    id: r.id,
    name: r.name,
    programTypes: r.program_types,
    facilities: r.facilities,
    // Held-out orgs have no records yet: grade C (critical data missing)
    // until the live import brings them in.
    dataGrade: DEMO && DEMO_HOLDOUT_ORGS.has(r.id) ? "C" : r.data_grade,
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

  // Per-org program-name dictionaries (derived from the generator's labels).
  const aliases = readCsv("program_aliases.csv").map((r) => ({
    orgId: r.org_id,
    label: r.label,
    programId: r.program_id,
  }));
  await prisma.programAlias.createMany({ data: aliases });
  const orgByProgram = new Map(programs.map((p) => [p.id, p.orgId]));

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

  const allEnrollments = readCsv("enrollments.csv");
  const heldOutKeys = new Set(
    DEMO
      ? allEnrollments
          .filter((r) => DEMO_HOLDOUT_ORGS.has(orgByProgram.get(r.program_id) ?? ""))
          .map((r) => r.participant_key)
      : [],
  );
  const enrollments = allEnrollments
    .filter((r) => !heldOutKeys.has(r.participant_key))
    .map((r) => ({
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

  const outcomes = readCsv("outcomes.csv")
    .filter((r) => !heldOutKeys.has(r.participant_key))
    .map((r) => ({
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
    programAliases: await prisma.programAlias.count(),
  };
  if (DEMO) console.log(`Demo mode: held out ${heldOutKeys.size} participants' records (${[...DEMO_HOLDOUT_ORGS].join(", ")})`);
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
