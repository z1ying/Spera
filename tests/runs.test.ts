import { describe, expect, it } from "vitest";
import { hoursFromSchedule, missingFields, participantHours, priorService, programYear, right4Signals, totals, validateRun, type Run } from "../src/lib/runs";

const run = (o: Partial<Run>): Run => ({
  id: "r",
  orgId: "o",
  orgName: "Org",
  programName: "P",
  facilityCode: "CTF",
  facilityName: "Correctional Training Facility (CTF)",
  underserved: false,
  womens: false,
  yard: null,
  status: "Completed",
  startDate: new Date("2024-06-01"),
  endDate: new Date("2025-02-12"),
  totalHours: 176,
  participants: 45,
  completed: 35,
  specialPopulations: false,
  nonEnglishLanguage: null,
  ...o,
});

describe("TPW's calculated fields", () => {
  it("participant hours = completed × hours; program year = start year", () => {
    expect(participantHours(run({}))).toBe(6160); // matches the workbook's CALC column
    expect(programYear(run({}))).toBe(2024);
    expect(participantHours(run({ completed: null }))).toBeNull();
  });
});

describe("totals", () => {
  const rs = [
    run({}),
    run({ completed: 18, participants: 45 }),
    run({ status: "In Progress", completed: null }), // TBD
    run({ status: "Completed", participants: null, completed: null, totalHours: null, startDate: null }),
  ];
  const t = totals(rs);
  it("adds only known values and counts what is missing", () => {
    expect(t.participants).toBe(135);
    expect(t.completed).toBe(53);
    expect(t.participantHours).toBe(6160 + 18 * 176);
    expect(t.incompleteRuns).toBe(1);
    expect(missingFields(rs[3])).toEqual(["start date", "programming hours", "number of participants", "number completed"]);
  });
  it("completion rate uses completed runs with both counts only", () => {
    expect(t.completionRate).toBeCloseTo(53 / 90, 10);
    expect(totals([]).completionRate).toBeNull();
  });
});

describe("RIGHT 4.0 signals", () => {
  it("counts underserved, special-population and non-English criteria, at most +1.0", () => {
    const s = right4Signals([
      run({ underserved: true, facilityCode: "CTF" }),
      run({ specialPopulations: true }),
      run({ womens: true, underserved: true, facilityCode: "CIW" }),
    ]);
    expect(s.underservedInstitutions).toEqual(["CIW", "CTF"]);
    expect(s.womensRuns).toBe(1);
    expect(s.additionalPoints).toBe(1);
    expect(right4Signals([run({ nonEnglishLanguage: "Spanish" })]).additionalPoints).toBe(0.5);
    expect(right4Signals([run({ underserved: true }), run({ specialPopulations: true }), run({ nonEnglishLanguage: "Spanish" })]).additionalPoints).toBe(1);
  });
});

describe("RIGHT 4.0 prior service (2 of the 5 preceding years)", () => {
  it("uses every year a run was active", () => {
    const r = priorService([run({ startDate: new Date("2024-06-01"), endDate: new Date("2025-02-12") })], 2026);
    expect(r.window).toEqual([2021, 2022, 2023, 2024, 2025]);
    expect(r.yearsWithProgramming).toEqual([2024, 2025]);
    expect(r.meets).toBe(true);
    expect(priorService([run({ startDate: new Date("2025-03-01"), endDate: null })], 2026).meets).toBe(false);
  });
});

describe("form validation", () => {
  const ok = { orgName: "Org", programName: "P", facilityCode: "CTF", status: "Completed", startDate: "2025-01-01", endDate: "2025-03-01", totalHours: 24, participants: 20, completed: 15 };
  const codes = new Set(["CTF"]);
  it("accepts a valid run", () => expect(validateRun(ok, codes)).toEqual([]));
  it("explains problems in plain words", () => {
    expect(validateRun({ ...ok, completed: 25 }, codes)).toContain("More people completed than took part.");
    expect(validateRun({ ...ok, endDate: "2024-01-01" }, codes)).toContain("End date is before the start date.");
    expect(validateRun({ ...ok, facilityCode: "XYZ" }, codes)).toContain("Choose the prison.");
  });
  it("computes hours from a schedule", () => expect(hoursFromSchedule(2, 3, 12)).toBe(72));
});
