import { NextResponse } from "next/server";
import { loadRuns } from "@/lib/loadRuns";
import { groupTotals, priorService, programYear, right4Signals, totals } from "@/lib/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One organization's summary from its reported runs: the numbers for its
 * one-page report and its RIGHT 4.0 readiness. Organizations don't sign in,
 * so this is reachable by organization name (per-organization private links
 * are on the roadmap).
 */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("org")?.trim();
  if (!name) return NextResponse.json({ error: "Choose an organization." }, { status: 400 });
  const runs = (await loadRuns()).filter((r) => r.orgName.toLowerCase() === name.toLowerCase());
  const t = totals(runs);
  const years = runs.map(programYear).filter((y): y is number => y !== null);
  const byYear = groupTotals(runs, programYear)
    .sort((a, b) => Number(a.key) - Number(b.key))
    .map((g) => ({ year: g.key, participantHours: g.totals.participantHours, participants: g.totals.participants, completed: g.totals.completed }));
  const byPrison = groupTotals(runs, (r) => r.facilityCode)
    .map((g) => ({
      code: String(g.key),
      name: g.runs[0].facilityName,
      underserved: g.runs[0].underserved,
      womens: g.runs[0].womens,
      runs: g.totals.runs,
      participants: g.totals.participants,
      completed: g.totals.completed,
      participantHours: g.totals.participantHours,
    }))
    .sort((a, b) => b.participantHours - a.participantHours);
  return NextResponse.json({
    org: runs[0]?.orgName ?? name,
    runs: runs.length,
    yearFrom: years.length ? Math.min(...years) : null,
    yearTo: years.length ? Math.max(...years) : null,
    programs: [...new Set(runs.map((r) => r.programName))],
    prisons: byPrison.map(({ code, name, underserved }) => ({ code, name, underserved })),
    byYear,
    byPrison,
    priorService: priorService(runs, 2026),
    signals: right4Signals(runs),
    numbers: {
      programmingHours: t.programmingHours,
      participants: t.participants,
      completed: t.completed,
      participantHours: t.participantHours,
      completionRate: t.completionRate,
      completedRuns: t.completedRuns,
      inProgressRuns: t.inProgressRuns,
    },
  });
}
