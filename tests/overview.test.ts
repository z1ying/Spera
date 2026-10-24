import { describe, expect, it } from "vitest";
import { buildOverview } from "../src/lib/overview";
import { SUPPRESSED } from "../src/lib/privacy";

const C = (o: Partial<Record<"MCC" | "RACC" | "EMC", boolean>> = {}) => ({ MCC: false, RACC: false, EMC: false, ...o });

describe("buildOverview (§8)", () => {
  // 12 people at org A (enough to report), 3 at org B (must be suppressed).
  const registry = Array.from({ length: 15 }, (_, i) => ({ participantKey: `p${i}`, releaseYear: 2021 }));
  registry.push({ participantKey: "ctrl", releaseYear: 2021 });
  const enrollments = registry
    .filter((p) => p.participantKey !== "ctrl")
    .map((p, i) => ({
      participantKey: p.participantKey,
      orgId: i < 12 ? "A" : "B",
      status: i % 2 === 0 ? "completed" : "dropped",
      credits: i % 4 === 0 ? C({ RACC: true }) : C(),
    }));
  const outcomes = [
    { participantKey: "p1", eventType: "conviction", eventDate: new Date("2022-05-01") },
    { participantKey: "p2", eventType: "conviction", eventDate: new Date("2022-05-01") },
    { participantKey: "ctrl", eventType: "conviction", eventDate: new Date("2022-05-01") },
  ];
  const orgs = [
    { id: "A", name: "Org A", dataGrade: "A" },
    { id: "B", name: "Org B", dataGrade: "B" },
    { id: "C", name: "Org C", dataGrade: "C" },
  ];
  const o = buildOverview({ registry, enrollments, outcomes, orgs });

  it("counts only people with an enrollment as participants", () => {
    expect(o.participants).toBe(15);
    expect(o.overall.events).toBe(2); // ctrl's conviction is not a participant outcome
  });
  it("builds a person-level funnel", () => {
    expect(o.funnel).toEqual({ enrolled: 15, completed: 8, credited: 4 });
  });
  it("suppresses organizations under 10 people and flags orgs with no data", () => {
    const b = o.orgs.find((r) => r.id === "B")!;
    expect(b.participants).toBe(SUPPRESSED);
    expect(b.rate).toBe(SUPPRESSED);
    expect(o.orgs.find((r) => r.id === "A")!.participants).toBe(12);
    expect(o.orgsWithoutData).toBe(1);
  });
  it("suppresses credit tiers under 10 people", () => {
    expect(o.tiers.find((t) => t.tier === "racc")!.n).toBe(SUPPRESSED);
    expect(o.tiers.find((t) => t.tier === "none")!.n).toBe(11);
  });
  it("restricts to one organization for a per-org report", () => {
    const a = buildOverview({ registry, enrollments, outcomes, orgs, orgId: "A" });
    expect(a.participants).toBe(12);
    expect(a.orgs.map((r) => r.id)).toEqual(["A"]);
  });
});
