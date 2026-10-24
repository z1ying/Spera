import { toCsv } from "@/lib/csv";
import { loadRuns } from "@/lib/loadRuns";
import { participantHours, programYear } from "@/lib/runs";
import { isTpwSignedIn } from "@/lib/tpwAuth";

export const runtime = "nodejs";

/** All program runs as CSV, in TPW's own column names (TPW staff only). */
export async function GET() {
  if (!(await isTpwSignedIn())) return new Response("Sign in as TPW staff first.", { status: 401 });
  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  const n = (v: number | null) => (v === null ? "" : String(v));
  const rows = (await loadRuns()).map((r) => [
    r.facilityName, r.yard ?? "", r.orgName, r.programName, r.status, day(r.startDate), day(r.endDate),
    n(r.totalHours), n(r.participants), n(r.completed), n(participantHours(r)), n(programYear(r)),
    r.right3Target ? "yes" : "no", r.specialPopulations ? "yes" : "no",
  ]);
  const headers = [
    "CDCR Facility", "Yard", "Organization Name", "Program Name", "Schedule Status", "Start Date", "End Date",
    "Total Programming hours", "Number of Participants", "Number of Participants Completed",
    "CALC: Total Participant Programming hours", "CALC: Program Year", "RIGHT 3.0 target institution", "Serves RHU/EOP/MHCB",
  ];
  return new Response("﻿" + toCsv(headers, rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="impactlink_program_runs.csv"' },
  });
}
