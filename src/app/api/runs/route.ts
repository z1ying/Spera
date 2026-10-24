import { NextResponse } from "next/server";
import { createRun, RunInputError } from "@/lib/runWrite";
import type { RunInput } from "@/lib/runs";

export const runtime = "nodejs";

/** An organization submits one program run. No sign-in (design doc §27). */
export async function POST(req: Request) {
  try {
    return NextResponse.json(await createRun((await req.json()) as RunInput), { status: 201 });
  } catch (e) {
    if (e instanceof RunInputError) return NextResponse.json({ problems: e.problems }, { status: 422 });
    throw e;
  }
}
