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
 * Demo mode (design doc §25) holds back the enrollments and outcomes of
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
import { dataGrade } from "../src/lib/clean";
import { parseCsv } from "../src/lib/csv";
import { DEMO_NETWORK_KEY, participantKey } from "../src/lib/privacy";

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
  await prisma.programRun.deleteMany();
  await prisma.partnerProgram.deleteMany();
  await prisma.partnerOrg.deleteMany();
  await prisma.facility.deleteMany();
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
    // Placeholder; computed from the records below by the §6.1 grade rule.
    dataGrade: "C",
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

  // Twelve registry entries keyed from raw demo IDs with the demo network key,
  // so demo_raw_ids_english.csv (hashed in the browser on import) can match.
  // They have no enrollments until that file is imported.
  const rawRegistry = readCsv("demo_raw_registry.csv").map((r) => ({
    participantKey: participantKey(r.shared_identifier, DEMO_NETWORK_KEY),
    releaseYear: Number(r.release_year),
    ageBand: r.age_band,
    gender: r.gender,
    riskBand: r.risk_band,
  }));
  await prisma.participant.createMany({ data: rawRegistry });

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

  // Data grade by the same rule the importer applies (src/lib/clean.ts):
  // A = outcomes linked, B = program data only, C = no records. The CSV's
  // preset grades are not used — they contradicted the records (DECISIONS).
  for (const org of orgs) {
    const keys = enrollments.filter((e) => orgByProgram.get(e.programId) === org.id).map((e) => e.participantKey);
    const withOutcomes = new Set(outcomes.map((o) => o.participantKey));
    const grade = dataGrade({
      hasEnrollments: keys.length > 0,
      hasLinkedOutcomes: keys.some((k) => withOutcomes.has(k)),
      rejectShare: 0,
    });
    await prisma.organization.update({ where: { id: org.id }, data: { dataGrade: grade } });
  }

  const real = await seedRealProgramRuns();

  const counts = {
    ...real,
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

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const REAL_DIR = path.resolve(process.cwd(), "data", "real");

/**
 * TPW's real program-run data (design doc §27), converted from its
 * "Collective Impact Report" workbook by scripts/convert_tpw_xlsx.py.
 * Aggregate counts per program run; no individuals, no identifiers.
 */
async function seedRealProgramRuns() {
  const read = (name: string) => parseCsv(readFileSync(path.join(REAL_DIR, name), "utf8"));
  const facilities = read("facilities.csv").map((r) => ({
    code: r.code,
    name: r.name,
    right3Target: r.right3_target === "1",
    womens: r.womens === "1",
  }));
  await prisma.facility.createMany({ data: facilities });

  const runs = read("program_runs.csv");
  const orgs = new Map<string, string>();
  const programs = new Map<string, { id: string; orgId: string; name: string }>();
  for (const r of runs) {
    const orgId = slug(r.organization);
    orgs.set(orgId, r.organization);
    const pid = `${orgId}--${slug(r.program)}`;
    programs.set(pid, { id: pid, orgId, name: r.program });
  }
  await prisma.partnerOrg.createMany({ data: [...orgs].map(([id, name]) => ({ id, name })) });
  await prisma.partnerProgram.createMany({ data: [...programs.values()] });
  const n = (v: string) => (v === "" ? null : Number(v));
  await prisma.programRun.createMany({
    data: runs.map((r) => ({
      id: `run-import-${r.source_row}`,
      orgId: slug(r.organization),
      programId: `${slug(r.organization)}--${slug(r.program)}`,
      facilityCode: r.facility_code,
      yard: r.yard || null,
      // A run with no status in the workbook is recorded as Planned (nothing to count yet).
      status: r.status || "Planned",
      startDate: r.start_date ? parseDate(r.start_date) : null,
      endDate: r.end_date ? parseDate(r.end_date) : null,
      totalHours: n(r.total_hours),
      participants: n(r.participants),
      completed: n(r.completed),
      notes: r.notes || null,
      source: `import:TPW Collective Impact Report#row${r.source_row}`,
    })),
  });
  return { facilities: facilities.length, partnerOrgs: orgs.size, programRuns: runs.length };
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
