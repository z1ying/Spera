/**
 * Writing program runs from the organization form (design doc §28).
 * Organizations don't sign in: a new run returns a random edit token that
 * only the submitting browser keeps, and editing requires it.
 */
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { validateRun, type RunInput } from "./runs";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const day = (s?: string) => (s ? new Date(`${s}T00:00:00Z`) : null);
const numOrNull = (v: number | null | undefined) => (v === undefined || v === null || Number.isNaN(v) ? null : v);

export class RunInputError extends Error {
  constructor(public problems: string[]) {
    super(problems.join(" "));
  }
}

async function resolveOrgAndProgram(input: RunInput) {
  const orgName = input.orgName.trim();
  const programName = input.programName.trim();
  const orgs = await prisma.partnerOrg.findMany();
  let org = orgs.find((o) => o.name.toLowerCase() === orgName.toLowerCase());
  if (!org) {
    const id = orgs.some((o) => o.id === slug(orgName)) ? `${slug(orgName)}-${randomUUID().slice(0, 4)}` : slug(orgName) || randomUUID();
    org = await prisma.partnerOrg.create({ data: { id, name: orgName } });
  }
  const programs = await prisma.partnerProgram.findMany({ where: { orgId: org.id } });
  let program = programs.find((p) => p.name.toLowerCase() === programName.toLowerCase());
  if (!program) {
    program = await prisma.partnerProgram.create({
      data: { id: `${org.id}--${slug(programName) || randomUUID().slice(0, 8)}`, orgId: org.id, name: programName },
    });
  }
  return { org, program };
}

async function checked(input: RunInput) {
  const codes = new Set((await prisma.facility.findMany({ select: { code: true } })).map((f) => f.code));
  const problems = validateRun(input, codes);
  if (problems.length) throw new RunInputError(problems);
  const { org, program } = await resolveOrgAndProgram(input);
  return {
    orgId: org.id,
    programId: program.id,
    facilityCode: input.facilityCode,
    yard: input.yard?.trim() || null,
    status: input.status,
    startDate: day(input.startDate),
    endDate: day(input.endDate),
    totalHours: numOrNull(input.totalHours),
    participants: numOrNull(input.participants),
    completed: input.status === "Completed" ? numOrNull(input.completed) : null,
    specialPopulations: !!input.specialPopulations,
    nonEnglishLanguage: input.nonEnglishLanguage?.trim() || null,
  };
}

export async function createRun(input: RunInput) {
  const data = await checked(input);
  const editToken = randomBytes(18).toString("base64url");
  const run = await prisma.programRun.create({
    data: { id: `run-${randomUUID()}`, ...data, source: "form", editToken },
  });
  return { id: run.id, editToken };
}

export function tokenMatches(stored: string | null, given: string | undefined): boolean {
  if (!stored || !given || stored.length !== given.length) return false;
  return timingSafeEqual(Buffer.from(stored), Buffer.from(given));
}

export async function updateRun(id: string, editToken: string | undefined, input: RunInput) {
  const existing = await prisma.programRun.findUnique({ where: { id } });
  if (!existing || !tokenMatches(existing.editToken, editToken)) return false;
  await prisma.programRun.update({ where: { id }, data: await checked(input) });
  return true;
}
