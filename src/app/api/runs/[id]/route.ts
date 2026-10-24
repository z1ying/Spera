import { NextResponse } from "next/server";
import { RunInputError, updateRun } from "@/lib/runWrite";
import type { RunInput } from "@/lib/runs";

export const runtime = "nodejs";

/** Edit a run this browser submitted (e.g. In Progress → Completed). Needs its edit token. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { editToken, ...input } = (await req.json()) as RunInput & { editToken?: string };
  try {
    const ok = await updateRun((await params).id, editToken, input);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ problems: ["You can only edit programs submitted from this browser."] }, { status: 403 });
  } catch (e) {
    if (e instanceof RunInputError) return NextResponse.json({ problems: e.problems }, { status: 422 });
    throw e;
  }
}
