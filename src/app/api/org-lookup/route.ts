import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const canon = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Exact-name lookup for the organization side (design doc §28). There is no
 * list of organizations anywhere on the organization side: you type your own
 * name and get back only your own programs.
 */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name") ?? "";
  if (!canon(name)) return NextResponse.json({ found: false, name: "", programs: [] });
  const orgs = await prisma.partnerOrg.findMany({ include: { programs: { orderBy: { name: "asc" } } } });
  const org = orgs.find((o) => canon(o.name) === canon(name));
  return NextResponse.json(
    org ? { found: true, name: org.name, programs: org.programs.map((p) => p.name) } : { found: false, name: name.trim(), programs: [] },
  );
}
