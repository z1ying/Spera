/** Blank template in the column layout of TPW's Collective Impact Report. */
const HEADERS = [
  "CDCR Facility", "Yard", "Organization Name", "Program Name", "Schedule Status (Planned, In Progress, Completed)",
  "Start Date", "End Date", "Total Programming hours", "Number of Participants", "Number of Participants Completed",
];
const EXAMPLE = ["San Quentin Rehabilitation Center (SQ)", "", "Your organization", "Your program", "Completed", "2025-01", "2025-04", "39", "28", "25"];

export function GET() {
  const body = "﻿" + [HEADERS.map((h) => `"${h}"`).join(","), EXAMPLE.join(",")].join("\n") + "\n";
  return new Response(body, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="spera_program_template.csv"' },
  });
}
