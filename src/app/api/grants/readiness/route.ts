import { NextResponse } from "next/server";
import { loadRuns } from "@/lib/loadRuns";
import { priorService, right4Signals, totals } from "@/lib/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One organization's RIGHT 4.0 readiness and the numbers to cite, from the
 * runs on file. Organizations don't sign in, so this is reachable by
 * organization name (per-organization private links are on the roadmap).
 */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("org")?.trim();
  if (!name) return NextResponse.json({ error: "Choose an organization." }, { status: 400 });
  const runs = (await loadRuns()).filter((r) => r.orgName.toLowerCase() === name.toLowerCase());
  const t = totals(runs);
  return NextResponse.json({
    org: runs[0]?.orgName ?? name,
    runs: runs.length,
    programs: [...new Set(runs.map((r) => r.programName))],
    prisons: [...new Map(runs.map((r) => [r.facilityCode, { code: r.facilityCode, name: r.facilityName, underserved: r.underserved }])).values()],
    priorService: priorService(runs, 2026),
    signals: right4Signals(runs),
    numbers: {
      programmingHours: t.programmingHours,
      participants: t.participants,
      completed: t.completed,
      participantHours: t.participantHours,
      completionRate: t.completionRate,
      completedRuns: t.completedRuns,
    },
  });
}
