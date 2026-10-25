import { describe, expect, it } from "vitest";
import { insightsPrompt, networkFacts, parseSummary } from "../src/lib/networkInsights";
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
const facilities = [
  { code: "CTF", name: "CTF", underserved: true, womens: false },
  { code: "KVSP", name: "KVSP", underserved: true, womens: false },
  { code: "CIW", name: "CIW", underserved: true, womens: true },
  { code: "SQ", name: "SQ", underserved: false, womens: false },
];

describe("facts for the AI summary", () => {
  const facts = networkFacts([run({ id: "a" }), run({ id: "b", startDate: new Date("2025-03-01"), status: "In Progress", completed: null })], facilities, "the whole network");
  it("states the view's real numbers", () => {
    expect(facts).toContain("Participants 40; completed 15");
    expect(facts).toContain("programs at 1 of 4 CDCR prisons");
    expect(facts).toContain("not served: KVSP, CIW");
    expect(facts).toContain("1 runs still open");
  });
  it("checks RIGHT 4.0 prior service per organization", () => {
    expect(facts).toContain("Defy Ventures: programming in 2024, 2025 (meets prior service)");
  });
  it("tells the model to use only these numbers", () => {
    expect(insightsPrompt(facts)).toMatch(/Use only numbers that appear in FACTS/);
  });
  it("says so when the view is empty", () => {
    expect(networkFacts([], facilities, "x")).toContain("No program runs in this view.");
  });
});

describe("reading the model's reply", () => {
  it("accepts JSON inside a code fence", () => {
    const s = parseSummary('```json\n{"headline":"H","insights":[{"title":"T","finding":"F","recommendation":"R"}]}\n```');
    expect(s).toEqual({ headline: "H", insights: [{ title: "T", finding: "F", recommendation: "R" }] });
  });
  it("drops a recommendation that just says none", () => {
    expect(parseSummary('{"headline":"H","insights":[{"title":"T","finding":"F","recommendation":"None."}]}')?.insights[0].recommendation).toBe("");
  });
  it("rejects replies without insights", () => {
    expect(parseSummary("Sorry, I can't.")).toBeNull();
    expect(parseSummary('{"headline":"H","insights":[]}')).toBeNull();
  });
});
