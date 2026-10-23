import { describe, expect, it } from "vitest";
import {
  BASELINES,
  COSTS,
  convictionRate,
  creditTier,
  impactSummary,
  type OutcomeRecord,
  type ParticipantRecord,
} from "../src/lib/metrics";
import { SUPPRESSED, suppressSmallCells, suppressValue } from "../src/lib/privacy";

/** Relative tolerance check (§7.4: 0.5%). */
function expectWithin(actual: number, expected: number, relTol = 0.005) {
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThanOrEqual(relTol);
}

const P = (key: string, releaseYear: number, credits = { MCC: false, RACC: false, EMC: false }): ParticipantRecord => ({
  participantKey: key,
  releaseYear,
  credits,
});
const conviction = (key: string, isoDate: string): OutcomeRecord => ({
  participantKey: key,
  eventType: "conviction",
  eventDate: new Date(isoDate),
});

describe("§7.2 worked example (unit-test standard answer)", () => {
  const result = impactSummary({
    n: 1800,
    participantRate: 0.211,
    baselineRate: 0.456,
    returnYears: 1.0,
  });

  it("computes avoided returns = 441 people", () => {
    expect(result).not.toBeNull();
    expectWithin(result!.avoided, 441);
  });

  it("computes conservative savings ≈ $9.50M (marginal cost $21,534)", () => {
    expectWithin(result!.savingsConservative, 441 * COSTS.marginalCostYear);
    expectWithin(result!.savingsConservative, 9_500_000, 0.005);
  });

  it("computes capacity savings ≈ $56.35M (average cost $127,788)", () => {
    expectWithin(result!.savingsCapacity, 441 * COSTS.avgCostYear);
    expectWithin(result!.savingsCapacity, 56_350_000, 0.005);
  });

  it("defaults to the no-credit baseline and return_years = 1.0", () => {
    const r = impactSummary({ n: 100, participantRate: 0.211 });
    expect(r!.baselineRate).toBe(BASELINES.noCreditTier);
    expect(r!.returnYears).toBe(1.0);
    expectWithin(r!.avoided, (0.456 - 0.211) * 100);
  });

  it("scales linearly with the return_years assumption", () => {
    const r = impactSummary({ n: 1800, participantRate: 0.211, baselineRate: 0.456, returnYears: 2 });
    expectWithin(r!.savingsConservative, 2 * 441 * COSTS.marginalCostYear);
  });
});

describe("convictionRate (§7.1 / §7.4)", () => {
  it("counts only convictions inside the 3-year window", () => {
    const cohort = [P("a", 2022), P("b", 2022), P("c", 2022), P("d", 2022)];
    const outcomes = [
      conviction("a", "2023-05-01"), // within window
      conviction("b", "2026-06-01"), // year releaseYear+4 -> outside
      { participantKey: "c", eventType: "arrest", eventDate: new Date("2023-01-15") }, // not a conviction
    ];
    const res = convictionRate(cohort, outcomes);
    expect(res.n).toBe(4);
    expect(res.events).toBe(1);
    expect(res.rate).toBeCloseTo(0.25, 10);
  });

  it("returns null (not 0) for an empty cohort", () => {
    const res = convictionRate([], []);
    expect(res.rate).toBeNull();
    expect(res.n).toBe(0);
    expect(impactSummary({ n: 0, participantRate: res.rate })).toBeNull();
  });

  it("excludes cohorts without a complete 3-year follow-up and counts them (§7.4)", () => {
    const cohort = [P("old", 2023), P("recent", 2024), P("recent2", 2025)];
    const res = convictionRate(cohort, [conviction("recent", "2025-03-01")]);
    expect(res.n).toBe(1);
    expect(res.excludedIncompleteFollowUp).toBe(2);
    expect(res.events).toBe(0); // the 2024 participant's event must not leak in
    expect(res.rate).toBe(0);
  });

  it("filters by credit tier", () => {
    const cohort = [
      P("racc1", 2021, { MCC: true, RACC: true, EMC: false }),
      P("none1", 2021),
      P("none2", 2021),
    ];
    const outcomes = [conviction("none1", "2022-02-02")];
    expect(convictionRate(cohort, outcomes, { tier: "racc" }).rate).toBe(0);
    expect(convictionRate(cohort, outcomes, { tier: "none" }).rate).toBeCloseTo(0.5, 10);
  });
});

describe("creditTier (§5.2 priority: RACC > EMC > MCC)", () => {
  it("assigns mutually exclusive tiers", () => {
    expect(creditTier({ MCC: true, RACC: true, EMC: true })).toBe("racc");
    expect(creditTier({ MCC: true, RACC: false, EMC: true })).toBe("emc");
    expect(creditTier({ MCC: true, RACC: false, EMC: false })).toBe("any");
    expect(creditTier({ MCC: false, RACC: false, EMC: false })).toBe("none");
  });
});

describe("small-cell suppression (§7.3)", () => {
  it("suppresses groups with n < 10", () => {
    const rows = suppressSmallCells([
      { label: "tiny org", n: 9, value: 0.2 },
      { label: "boundary org", n: 10, value: 0.3 },
      { label: "big org", n: 500, value: 0.25 },
    ]);
    expect(rows[0].n).toBe(SUPPRESSED);
    expect(rows[0].value).toBe(SUPPRESSED);
    expect(rows[1].n).toBe(10);
    expect(rows[1].value).toBe(0.3);
    expect(rows[2].value).toBe(0.25);
  });

  it("suppressValue honors the same threshold", () => {
    expect(suppressValue(9, 0.42)).toBe(SUPPRESSED);
    expect(suppressValue(10, 0.42)).toBe(0.42);
  });
});
