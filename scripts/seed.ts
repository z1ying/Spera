/**
 * Seed the ImpactLink database with TPW's real program-run data (design doc §28).
 *
 *   npm run seed
 *
 * Source: data/real/*.csv, converted from TPW's "Collective Impact Report"
 * workbook by scripts/convert_tpw_xlsx.py. Aggregate counts per program run;
 * no individuals, no identifiers. Idempotent: wipes the tables first, so
 * re-running also removes anything submitted through the form.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseCsv } from "../src/lib/csv";

const prisma = new PrismaClient();
const REAL_DIR = process.env.SEED_DATA_DIR ?? path.resolve(process.cwd(), "data", "real");

const read = (name: string) => parseCsv(readFileSync(path.join(REAL_DIR, name), "utf8"));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const day = (s: string) => (s ? new Date(`${s}T00:00:00Z`) : null);
const num = (v: string) => (v === "" ? null : Number(v));

async function main() {
  console.log(`Seeding from ${REAL_DIR}`);
  await prisma.programRun.deleteMany();
  await prisma.partnerProgram.deleteMany();
  await prisma.partnerOrg.deleteMany();
  await prisma.facility.deleteMany();

  await prisma.facility.createMany({
    data: read("facilities.csv").map((r) => ({
      code: r.code,
      name: r.name,
      right3Target: r.right3_target === "1",
      womens: r.womens === "1",
    })),
  });

  const runs = read("program_runs.csv");
  const orgs = new Map<string, string>();
  const programs = new Map<string, { id: string; orgId: string; name: string }>();
  for (const r of runs) {
    const orgId = slug(r.organization);
    orgs.set(orgId, r.organization);
    const id = `${orgId}--${slug(r.program)}`;
    programs.set(id, { id, orgId, name: r.program });
  }
  await prisma.partnerOrg.createMany({ data: [...orgs].map(([id, name]) => ({ id, name })) });
  await prisma.partnerProgram.createMany({ data: [...programs.values()] });
  await prisma.programRun.createMany({
    data: runs.map((r) => ({
      id: `run-import-${r.source_row}`,
      orgId: slug(r.organization),
      programId: `${slug(r.organization)}--${slug(r.program)}`,
      facilityCode: r.facility_code,
      yard: r.yard || null,
      // A run with no status in the workbook is recorded as Planned (nothing to count yet).
      status: r.status || "Planned",
      startDate: day(r.start_date),
      endDate: day(r.end_date),
      totalHours: num(r.total_hours),
      participants: num(r.participants),
      completed: num(r.completed),
      notes: r.notes || null,
      source: `import:TPW Collective Impact Report#row${r.source_row}`,
    })),
  });

  console.log("Seeded:", {
    facilities: await prisma.facility.count(),
    organizations: await prisma.partnerOrg.count(),
    programs: await prisma.partnerProgram.count(),
    programRuns: await prisma.programRun.count(),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
