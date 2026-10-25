import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Choices for the organization form: names only, no counts. */
export async function GET() {
  const [orgs, facilities] = await Promise.all([
    prisma.partnerOrg.findMany({ include: { programs: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.facility.findMany({ orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({
    orgs: orgs.map((o) => ({ name: o.name, programs: o.programs.map((p) => p.name) })),
    facilities: facilities.map((f) => ({ code: f.code, name: f.name, underserved: f.underserved, womens: f.womens })),
  });
}
