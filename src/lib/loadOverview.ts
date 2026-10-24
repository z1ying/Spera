import { prisma } from "./db";
import { buildOverview, type Overview } from "./overview";
import type { Credits } from "./metrics";

/** Loads the records buildOverview needs (server only). */
export async function loadOverview(orgId?: string): Promise<{ overview: Overview; lastImport: Date | null }> {
  const [registry, enrollments, outcomes, orgs, lastJob] = await Promise.all([
    prisma.participant.findMany({ select: { participantKey: true, releaseYear: true } }),
    prisma.enrollment.findMany({
      select: { participantKey: true, status: true, credits: true, program: { select: { orgId: true } } },
    }),
    prisma.outcome.findMany({ select: { participantKey: true, eventType: true, eventDate: true } }),
    prisma.organization.findMany({ select: { id: true, name: true, dataGrade: true }, orderBy: { name: "asc" } }),
    prisma.importJob.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const overview = buildOverview({
    registry,
    enrollments: enrollments.map((e) => ({
      participantKey: e.participantKey,
      orgId: e.program.orgId,
      status: e.status,
      credits: JSON.parse(e.credits) as Credits,
    })),
    outcomes,
    orgs,
    orgId,
  });
  return { overview, lastImport: lastJob?.createdAt ?? null };
}
