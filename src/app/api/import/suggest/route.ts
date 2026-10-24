import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { suggestMapping } from "@/lib/importer";

export const runtime = "nodejs";

/** Step 1 → 2 of the wizard: headers, sample rows and a suggested mapping. */
export async function POST(req: Request) {
  const { text } = (await req.json()) as { fileName?: string; text?: string };
  if (!text?.trim()) return NextResponse.json({ error: "The file is empty." }, { status: 400 });
  const [suggestion, orgs, programs] = await Promise.all([
    suggestMapping(text),
    prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { id: "asc" } }),
    prisma.program.findMany({ select: { id: true, name: true, orgId: true }, orderBy: { id: "asc" } }),
  ]);
  return NextResponse.json({ ...suggestion, orgs, programs });
}
