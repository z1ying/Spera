import { describe, expect, it } from "vitest";
import { completeness, filterRuns, NO_FILTERS, right4Readiness, runCompletion, savingsEstimate, timeliness, yearTrend } from "../src/lib/dashboard";
import type { Run } from "../src/lib/runs";

const run = (o: Partial<Run>): Run => ({
  id: "r",
  orgId: "o",
  orgName: "Defy Ventures",
  programName: "CEO of Your New Life",
  facilityCode: "CTF",
  facilityName: "Correctional Training Facility (CTF)",
  underserved: true,
  womens: false,
  yard: null,
  status: "Completed",
  startDate: new Date("2024-06-01"),
  endDate: new Date("2024-09-01"),
  totalHours: 100,
  participants: 20,
  completed: 15,
  specialPopulations: false,
  nonEnglishLanguage: null,
  ...o,
});

const runs = [
  run({ id: "a" }),
  run({ id: "b", orgName: "Other Org", facilityCode: "SQ", startDate: new Date("2025-02-01"), participants: 10, completed: 8 }),
  run({ id: "c", status: "In Progress", startDate: new Date("2025-08-01"), participants: 12, completed: null }),
];

describe("filters", () => {
  it("shows everything with nothing ticked", () => {
    expect(filterRuns(runs, NO_FILTERS)).toHaveLength(3);
  });
  it("matches any of several values in a filter, and all filters together", () => {
    expect(filterRuns(runs, { ...NO_FILTERS, facilities: ["CTF", "SQ"] })).toHaveLength(3);
    expect(filterRuns(runs, { ...NO_FILTERS, facilities: ["CTF"], years: ["2025"] }).map((r) => r.id)).toEqual(["c"]);
  });
});

describe("trend", () => {
  it("adds up each program year and flags years with open runs", () => {
    expect(yearTrend(runs)).toEqual([
      expect.objectContaining({ year: 2024, participants: 20, completed: 15, openRuns: 0 }),
      expect.objectContaining({ year: 2025, participants: 22, completed: 8, openRuns: 1 }),
    ]);
  });
});

describe("avoided-returns estimate", () => {
  it("uses the no-credit vs credit gap and both LAO costs", () => {
    const s = savingsEstimate(1000);
    expect(s.avoidedReturns).toBeCloseTo(64);
    expect(s.conservative).toBeCloseTo(64 * 21_534);
    expect(s.capacity).toBeCloseTo(64 * 127_788);
  });
});

describe("reporting timeliness", () => {
  it("counts only runs reported through the form, as a median per organization", () => {
    const end = new Date("2025-01-01");
    const at = (days: number) => new Date(end.getTime() + days * 86_400_000);
    const t = timeliness([
      run({ id: "1", source: "form", endDate: end, submittedAt: at(10) }),
      run({ id: "2", source: "form", endDate: end, submittedAt: at(30) }),
      run({ id: "3", source: "form", endDate: end, submittedAt: at(20) }),
      run({ id: "4", orgName: "Other Org", source: "form", endDate: end, submittedAt: at(5) }),
      run({ id: "5", source: "import:tpw.xlsx#2", endDate: end, submittedAt: at(400) }),
      run({ id: "6", source: "estimate", endDate: end, submittedAt: at(900) }),
    ]);
    expect(t).toEqual([
      { org: "Other Org", days: 5, reports: 1 },
      { org: "Defy Ventures", days: 20, reports: 3 },
    ]);
  });
});

describe("RIGHT 4.0 readiness", () => {
  it("checks prior service and says what would add points", () => {
    const [r] = right4Readiness([run({ id: "1" }), run({ id: "2", startDate: new Date("2025-03-01") })]);
    expect(r).toMatchObject({ org: "Defy Ventures", meetsPriorService: true, yearsWithProgramming: [2024, 2025], additionalPoints: 0.5 });
    expect(r.next).toEqual(["+0.5 more possible with RHU/EOP/MHCB or a non-English program"]);
  });
  it("flags missing prior service", () => {
    const [r] = right4Readiness([run({ id: "1" })]);
    expect(r.next[0]).toBe("Needs programming in 1 more of 2021–2025");
  });
});

describe("per-run completion and completeness", () => {
  it("keeps only finished runs with known counts", () => {
    expect(runCompletion(runs).map((r) => [r.id, r.rate])).toEqual([
      ["a", 0.75],
      ["b", 0.8],
    ]);
  });
  it("counts complete runs and missing fields per organization", () => {
    const c = completeness([run({ id: "1" }), run({ id: "2", totalHours: null }), run({ id: "3", orgName: "Other Org" })]);
    expect(c[0]).toEqual({ org: "Defy Ventures", runs: 2, complete: 1, missing: [["programming hours", 1]] });
  });
});
