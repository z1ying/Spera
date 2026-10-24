import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  cleanEnrollments,
  cleanOutcomes,
  dataGrade,
  makeProgramResolver,
  parseCredits,
  parseEventType,
  parseFlexibleDate,
  type ColumnIndex,
} from "../src/lib/clean";
import { parseCsvTable } from "../src/lib/csv";
import { FRAMEWORKS, validateFramework } from "../src/lib/framework";
import { detectKind, headerSignature, parseGeminiAnswer, ruleMapping } from "../src/lib/mapping";

const iso = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;
const DEMO = path.resolve(__dirname, "..", "data", "demo-data");

describe("date parsing (§5.3 three formats)", () => {
  it("parses MM/DD/YYYY, YYYY-MM-DD and DD-Mon-YY to the same day", () => {
    expect(iso(parseFlexibleDate("03/31/2021"))).toBe("2021-03-31");
    expect(iso(parseFlexibleDate("2021-03-31"))).toBe("2021-03-31");
    expect(iso(parseFlexibleDate("31-Mar-21"))).toBe("2021-03-31");
  });
  it("rejects impossible or unknown dates instead of rolling over", () => {
    expect(parseFlexibleDate("02/31/2021")).toBeNull();
    expect(parseFlexibleDate("March 3rd")).toBeNull();
  });
});

describe("credits and outcome events come from the framework file", () => {
  it("reads codes and aliases, reports unknown tokens", () => {
    const { credits, unknown } = parseCredits("M+R+X");
    expect(credits).toEqual({ RACC: true, EMC: false, MCC: true });
    expect(unknown).toEqual(["X"]);
  });
  it("recognizes parole events (the brief names parole data)", () => {
    expect(parseEventType("PAROLE VIOLATION")).toBe("parole_violation");
    expect(parseEventType("Discharged")).toBe("parole_discharge");
    expect(parseEventType("CONVICTION")).toBe("conviction");
    expect(parseEventType("traffic stop")).toBeNull();
  });
  it("only tracks events the framework lists", () => {
    expect(parseEventType("parole_violation", FRAMEWORKS["example-county-reentry"])).toBeNull();
  });
  it("refuses a framework number without a citation", () => {
    const bad = structuredClone(FRAMEWORKS["tpw-california"]);
    bad.costs.marginal.citation = null;
    expect(() => validateFramework(bad)).toThrow(/citation/);
  });
});

describe("column mapping (§6.1)", () => {
  it("maps all three CBO header styles and the external outcome export by rules", () => {
    const expectTargets = (headers: string[], targets: string[]) =>
      expect(ruleMapping(headers).map((s) => s.target)).toEqual(targets);
    const enrollment = ["participant_key", "program", "enroll_date", "completion_date", "completed", "credits"];
    expectTargets(["participant_id", "program_name", "start_date", "end_date", "completed", "credits"], enrollment);
    expectTargets(["PrtcpntID", "ProgNm", "StrtDt", "EndDt", "Done", "Crdts"], enrollment);
    expectTargets(["id_participante", "programa", "fecha_inicio", "fecha_fin", "completado", "creditos"], enrollment);
    const outcome = ruleMapping(["subject_ref", "incident_type", "incident_dt", "severity"]);
    expect(outcome.map((s) => s.target)).toEqual(["participant_key", "event_type", "event_date", "offense_level"]);
    expect(detectKind(outcome)).toBe("outcomes");
  });
  it("treats the same headers as the same format (template reuse)", () => {
    expect(headerSignature(["Fecha_Inicio", "programa"])).toBe(headerSignature(["fecha inicio", "Programa"]));
  });
  it("validates an LLM answer against the real headers", () => {
    const out = parseGeminiAnswer(
      JSON.stringify({
        mappings: [
          { column: "ProgNm", target: "program", confidence: 0.9 },
          { column: "Invented", target: "program", confidence: 1 },
          { column: "Done", target: "not_a_field", confidence: 0.9 },
        ],
      }),
      ["ProgNm", "Done"],
    );
    expect(out).toEqual([
      { column: "ProgNm", target: "program", confidence: 0.9 },
      { column: "Done", target: null, confidence: 0 },
    ]);
  });
});

const COL: ColumnIndex = { participant_key: 0, program: 1, enroll_date: 2, completion_date: 3, completed: 4, credits: 5 };
const resolver = makeProgramResolver(
  [
    { programId: "p1", orgId: "o1", labels: ["GED Prep"] },
    { programId: "p2", orgId: "o2", labels: ["ged-prep"] },
    { programId: "p3", orgId: "o2", labels: ["Welding"] },
  ],
  null,
);

describe("enrollment cleaning + match rate (§6.1 steps 4–6)", () => {
  const rows = [
    ["k1", "GED Prep", "2021-01-01", "2021-06-01", "yes", "MCC"],
    ["k1", "GED Prep", "01/01/2021", "", "yes", "MCC"], // duplicate person+program
    ["k2", "Welding", "2021-01-01", "2020-12-01", "yes", ""], // ends before it starts
    ["zz", "Welding", "2021-01-01", "", "no", ""], // key not in registry
    ["k3", "Basket Weaving", "2021-01-01", "", "no", ""], // unknown program
    ["k4", "Welding", "2021-01-01", "", "", ""], // completion status missing
    ["k5", "Welding", "2021-02-01", "2021-08-01", "yes", "R"],
  ];
  const { receipt, inserts } = cleanEnrollments(rows, COL, {
    registry: new Set(["k1", "k2", "k3", "k4", "k5"]),
    resolveProgram: resolver,
    existing: new Set(["k5|p3"]),
  });

  it("lists every problem and never imports a rejected row", () => {
    expect(receipt.issueCounts).toMatchObject({
      completion_before_enroll: 1,
      unmatched_key: 1,
      unknown_program: 1,
      missing_completed: 1,
    });
    expect(receipt.rejectedRows).toBe(4);
    expect(receipt.unresolvedLabels).toEqual([{ label: "Basket Weaving", rows: 1 }]);
  });
  it("merges duplicates and skips what is already on file", () => {
    expect(receipt.duplicatesInFile).toBe(1);
    expect(receipt.alreadyOnFile).toBe(1);
    expect(inserts.map((i) => `${i.participantKey}|${i.programId}`)).toEqual(["k1|p1"]);
  });
  it("reports the match rate over distinct keys", () => {
    expect(receipt.match).toMatchObject({ keys: 6, matched: 5, unmatched: 1 });
    expect(receipt.match.rate).toBeCloseTo(5 / 6, 10);
  });
  it("resolves exact labels before loose ones", () => {
    expect(resolver("GED Prep")).toMatchObject({ kind: "resolved", programId: "p1" });
    expect(resolver("ged-prep")).toMatchObject({ kind: "resolved", programId: "p2" });
    expect(resolver("GED PREP")).toMatchObject({ kind: "ambiguous" });
  });
});

describe("outcome cleaning splits matches into participants vs not enrolled", () => {
  it("counts the join both ways and accepts parole discharges without an offense level", () => {
    const rows = [
      ["k1", "CONVICTION", "2022-01-10", "FELONY"],
      ["k2", "parole discharge", "2023-05-01", ""],
      ["k9", "CONVICTION", "2022-01-10", "MISDEMEANOR"],
      ["k3", "ARREST", "2022-03-01", ""],
    ];
    const { receipt, inserts } = cleanOutcomes(
      rows,
      { participant_key: 0, event_type: 1, event_date: 2, offense_level: 3 },
      { registry: new Set(["k1", "k2", "k3"]), enrolled: new Set(["k1"]), existing: new Set() },
    );
    expect(inserts.map((i) => i.eventType)).toEqual(["conviction", "parole_discharge"]);
    expect(receipt.match).toMatchObject({ keys: 4, matched: 3, unmatched: 1, matchedToParticipants: 1, matchedToComparison: 2 });
    expect(receipt.issueCounts).toMatchObject({ unmatched_key: 1, missing_offense_level: 1 });
  });
});

describe("data grade", () => {
  it("A = outcomes linked, B = process only, C = too many critical gaps or no records", () => {
    expect(dataGrade({ hasEnrollments: true, hasLinkedOutcomes: true, rejectShare: 0.1 })).toBe("A");
    expect(dataGrade({ hasEnrollments: true, hasLinkedOutcomes: false, rejectShare: 0.1 })).toBe("B");
    expect(dataGrade({ hasEnrollments: true, hasLinkedOutcomes: true, rejectShare: 0.3 })).toBe("C");
    expect(dataGrade({ hasEnrollments: false, hasLinkedOutcomes: false, rejectShare: 0 })).toBe("C");
  });
});

describe("demo sample files parse end to end", () => {
  it("sample C (Spanish) is fully mapped by rules and every row is accounted for", () => {
    const { headers, rows } = parseCsvTable(readFileSync(path.join(DEMO, "sample_import_C_spanish.csv"), "utf8"));
    const col: ColumnIndex = Object.fromEntries(
      ruleMapping(headers).flatMap((s, i) => (s.target ? [[s.target, i]] : [])),
    );
    const keys = new Set(rows.map((r) => r[0]));
    const { receipt } = cleanEnrollments(rows, col, {
      registry: keys,
      resolveProgram: () => ({ kind: "resolved", programId: "p", orgId: "o" }),
      existing: new Set(),
    });
    expect(receipt.rowsRead).toBe(rows.length);
    expect(receipt.inserted + receipt.duplicatesInFile + receipt.rejectedRows).toBe(rows.length);
    expect(receipt.issueCounts.bad_date ?? 0).toBe(0);
  });
});
