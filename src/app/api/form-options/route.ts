import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Prisons for the organization form. Organization names are never listed (see /api/org-lookup). */
export async function GET() {
  const facilities = await prisma.facility.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({
    facilities: facilities.map((f) => ({ code: f.code, name: f.name, underserved: f.underserved, womens: f.womens })),
  });
}
