import { NextResponse } from "next/server";
import { createRun, RunInputError } from "@/lib/runWrite";
import type { RunInput } from "@/lib/runs";

export const runtime = "nodejs";
const MAX_ROWS = 500;

/** Spreadsheet upload: each row is validated again here and saved on its own. */
export async function POST(req: Request) {
  const { rows } = (await req.json()) as { rows?: { line: number; input: RunInput }[] };
  if (!rows?.length) return NextResponse.json({ error: "No rows to import." }, { status: 400 });
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `Upload at most ${MAX_ROWS} rows at a time.` }, { status: 400 });
  let created = 0;
  const failed: { line: number; problems: string[] }[] = [];
  for (const r of rows) {
    try {
      await createRun(r.input);
      created++;
    } catch (e) {
      if (e instanceof RunInputError) failed.push({ line: r.line, problems: e.problems });
      else throw e;
    }
  }
  return NextResponse.json({ created, failed });
}
