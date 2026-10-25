import { prisma } from "./db";
import type { Run } from "./runs";

const include = { org: true, program: true, facility: true } as const;

type Row = Awaited<ReturnType<typeof prisma.programRun.findMany<{ include: typeof include }>>>[number];

export function toRun(r: Row): Run {
  return {
    id: r.id,
    orgId: r.orgId,
    orgName: r.org.name,
    programName: r.program.name,
    facilityCode: r.facilityCode,
    facilityName: r.facility.name,
    underserved: r.facility.underserved,
    womens: r.facility.womens,
    yard: r.yard,
    status: r.status,
    startDate: r.startDate,
    endDate: r.endDate,
    totalHours: r.totalHours,
    participants: r.participants,
    completed: r.completed,
    specialPopulations: r.specialPopulations,
    nonEnglishLanguage: r.nonEnglishLanguage,
  };
}

/** All program runs (TPW dashboard only — callers must check TPW sign-in). */
export async function loadRuns(): Promise<Run[]> {
  const rows = await prisma.programRun.findMany({ include, orderBy: [{ startDate: "desc" }, { id: "asc" }] });
  return rows.map(toRun);
}
