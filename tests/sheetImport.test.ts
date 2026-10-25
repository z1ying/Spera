import { describe, expect, it } from "vitest";
import { mapColumns, matchFacility, parseMonth, readSheet } from "../src/lib/sheetImport";

const FAC = [
  { code: "CTF", name: "Correctional Training Facility (CTF)" },
  { code: "SQ", name: "San Quentin Rehabilitation Center (SQ)" },
];

describe("columns", () => {
  it("maps TPW's own headers and ignores CALC columns", () => {
    const col = mapColumns([
      "CDCR Facility", "Yard", "Organization Name", "Program Name", "Schedule Status (Planned, In Progress, Completed)",
      "Start Date", "End Date", "Total Programming hours", "Number of Participants", "Number of Participants Completed",
      "CALC: Total Participant Programming hours", "CALC: Program Year",
    ]);
    expect(col).toEqual({ facility: 0, yard: 1, org: 2, program: 3, status: 4, start: 5, end: 6, hours: 7, participants: 8, completed: 9 });
  });
});

describe("dates become month + year", () => {
  it.each([
    ["2025-01-29", "2025-01-01"],
    ["2025-03", "2025-03-01"],
    ["1/29/2025", "2025-01-01"],
    ["11/3/24", "2024-11-01"],
    ["01/2025", "2025-01-01"],
    ["Jan 2025", "2025-01-01"],
    ["September 2026", "2026-09-01"],
    ["TBD", ""],
    ["", ""],
  ])("%s → %s", (raw, want) => expect(parseMonth(raw)).toBe(want));
  it("flags what it can't read", () => expect(parseMonth("spring")).toBeNull());
});

describe("prisons", () => {
  it("matches by code in parentheses, bare code or name", () => {
    expect(matchFacility("Correctional Training Facility (CTF)", FAC)).toBe("CTF");
    expect(matchFacility("sq", FAC)).toBe("SQ");
    expect(matchFacility("Folsom", FAC)).toBeNull();
  });
});

describe("readSheet", () => {
  const csv = [
    "CDCR Facility,Yard,Organization Name,Program Name,Schedule Status,Start Date,End Date,Total Programming hours,Number of Participants,Number of Participants Completed",
    "Correctional Training Facility (CTF),North,GRIP,Guiding Rage Into Power,Completed,2024-11-01,2025-03-26,104,37,28",
    ",,,,,,,,,",
    "Folsom (FSP),,GRIP,Guiding Rage Into Power,completed,1/2025,TBD,52,10,12",
  ].join("\n");
  const r = readSheet(csv, FAC);
  it("skips blank template rows and keeps line numbers", () => {
    expect(r.rows.map((x) => x.line)).toEqual([2, 4]);
    expect(r.missingColumns).toEqual([]);
  });
  it("produces valid runs and explains problems", () => {
    expect(r.rows[0].problems).toEqual([]);
    expect(r.rows[0].input).toMatchObject({ facilityCode: "CTF", startDate: "2024-11-01", totalHours: 104, completed: 28 });
    expect(r.rows[1].input.status).toBe("Completed");
    expect(r.rows[1].problems).toContain('Prison "Folsom (FSP)" not recognized.');
    expect(r.rows[1].problems).toContain("More people completed than took part.");
  });
});
