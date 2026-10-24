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
    right3Target: r.facility.right3Target,
    womens: r.facility.womens,
    yard: r.yard,
    status: r.status,
    startDate: r.startDate,
    endDate: r.endDate,
    totalHours: r.totalHours,
    participants: r.participants,
    completed: r.completed,
    specialPopulations: r.specialPopulations,
  };
}

/** All program runs (TPW dashboard only — callers must check TPW sign-in). */
export async function loadRuns(): Promise<Run[]> {
  const rows = await prisma.programRun.findMany({ include, orderBy: [{ startDate: "desc" }, { id: "asc" }] });
  return rows.map(toRun);
}

export async function loadRunsByIds(ids: string[]): Promise<(Run & { editToken: string | null })[]> {
  const rows = await prisma.programRun.findMany({ where: { id: { in: ids } }, include });
  return rows.map((r) => ({ ...toRun(r), editToken: r.editToken }));
}
