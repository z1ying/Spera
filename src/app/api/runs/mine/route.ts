import { NextResponse } from "next/server";
import { loadRunsByIds } from "@/lib/loadRuns";
import { tokenMatches } from "@/lib/runWrite";
import { participantHours, programYear } from "@/lib/runs";

export const runtime = "nodejs";

/** The runs this browser submitted — only those whose edit token it holds. */
export async function POST(req: Request) {
  const { items } = (await req.json()) as { items?: { id: string; editToken: string }[] };
  const list = (items ?? []).slice(0, 200);
  const tokens = new Map(list.map((i) => [i.id, i.editToken]));
  const runs = (await loadRunsByIds(list.map((i) => i.id))).filter((r) => tokenMatches(r.editToken, tokens.get(r.id)));
  return NextResponse.json(
    runs.map(({ editToken: _t, ...r }) => ({ ...r, participantHours: participantHours(r), programYear: programYear(r) })),
  );
}
