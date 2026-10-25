/**
 * AI summary for the TPW dashboard (design doc §28). The facts are computed
 * here from the runs in the current filtered view; the model only turns them
 * into findings and recommendations and is told to use no other numbers.
 */
import { savingsEstimate } from "./dashboard";
import { groupTotals, missingFields, priorService, programYear, right4Signals, totals, type Run } from "./runs";

export interface FacilityInfo {
  code: string;
  name: string;
  underserved: boolean;
  womens: boolean;
}

export interface Insight {
  title: string;
  finding: string;
  recommendation: string;
}
export interface Summary {
  headline: string;
  insights: Insight[];
}

/** Year a RIGHT 4.0 application is made; prior service counts the five years before it. */
export const APPLICATION_YEAR = 2026;
const r1 = (x: number) => Math.round(x * 10) / 10;
const pct = (x: number | null) => (x === null ? "unknown" : `${r1(x * 100)}%`);
const n = (x: number) => Math.round(x).toLocaleString("en-US");

export function networkFacts(runs: Run[], facilities: FacilityInfo[], scope: string): string {
  const t = totals(runs);
  const lines: string[] = [];
  lines.push(`SCOPE: ${scope}.`);
  if (runs.length === 0) return [...lines, "No program runs in this view."].join("\n");

  const orgs = groupTotals(runs, (r) => r.orgName);
  lines.push(
    `Organizations reporting in this view: ${orgs.length}. TPW's coalition has 100+ member organizations (TPW one-pager), so most members have not reported yet.`,
  );
  lines.push(
    `Program runs: ${t.runs} (${t.completedRuns} completed, ${t.inProgressRuns} in progress, ${t.plannedRuns} planned). Participants ${n(t.participants)}; completed ${n(t.completed)}; completion rate in finished runs ${pct(t.completionRate)}; total participant programming hours ${n(t.participantHours)}.`,
  );

  lines.push("BY PROGRAM YEAR (year the run started):");
  for (const y of groupTotals(runs, programYear).sort((a, b) => Number(a.key) - Number(b.key))) {
    const open = y.totals.plannedRuns + y.totals.inProgressRuns;
    lines.push(
      `- ${y.key}: ${y.totals.runs} runs, ${n(y.totals.participants)} participants, ${n(y.totals.completed)} completed, completion ${pct(y.totals.completionRate)}${open ? `, ${open} runs still open (completions not in yet)` : ""}.`,
    );
  }

  lines.push("BY PROGRAM:");
  for (const p of groupTotals(runs, (r) => `${r.programName} (${r.orgName})`).sort((a, b) => b.totals.participants - a.totals.participants)) {
    const perCompleter = p.totals.completed ? p.totals.participantHours / p.totals.completed : null;
    lines.push(
      `- ${p.key}: ${p.totals.runs} runs, ${n(p.totals.participants)} participants, completion ${pct(p.totals.completionRate)}, ${perCompleter === null ? "hours per completer unknown" : `${r1(perCompleter)} programming hours per completer`}.`,
    );
  }

  const served = new Set(runs.map((r) => r.facilityCode));
  const byPrison = groupTotals(runs, (r) => r.facilityCode).sort((a, b) => b.totals.participants - a.totals.participants);
  lines.push(`PRISONS: programs at ${served.size} of ${facilities.length} CDCR prisons.`);
  for (const p of byPrison) {
    const f = facilities.find((x) => x.code === p.key);
    lines.push(
      `- ${p.key}${f?.underserved ? " (RIGHT 4.0 underserved)" : ""}${f?.womens ? " (women's)" : ""}: ${p.totals.runs} runs, ${n(p.totals.participants)} participants, completion ${pct(p.totals.completionRate)}.`,
    );
  }
  const under = facilities.filter((f) => f.underserved);
  lines.push(
    `RIGHT 4.0 underserved prisons served: ${under.filter((f) => served.has(f.code)).map((f) => f.code).join(", ") || "none"}; not served: ${under.filter((f) => !served.has(f.code)).map((f) => f.code).join(", ") || "none"}.`,
  );
  lines.push(`Women's prisons served: ${facilities.filter((f) => f.womens && served.has(f.code)).map((f) => f.code).join(", ") || "none"}.`);
  const s = right4Signals(runs);
  lines.push(`Runs serving RHU/EOP/MHCB: ${s.specialPopulationRuns}. Languages other than English: ${s.languages.join(", ") || "none"}.`);

  lines.push(`RIGHT 4.0 (CDCR grant, applications due 2026-11-30; needs programming in at least 2 of the years ${APPLICATION_YEAR - 5}–${APPLICATION_YEAR - 1}):`);
  for (const o of orgs) {
    const ps = priorService(o.runs, APPLICATION_YEAR);
    const sig = right4Signals(o.runs);
    lines.push(
      `- ${o.key}: programming in ${ps.yearsWithProgramming.join(", ") || "none of those years"} (${ps.meets ? "meets" : "does not yet meet"} prior service); evidence for +${sig.additionalPoints} additional points (underserved prison: ${sig.criteria.underserved ? "yes" : "no"}, RHU/EOP/MHCB: ${sig.criteria.specialPopulations ? "yes" : "no"}, non-English: ${sig.criteria.nonEnglish ? "yes" : "no"}).`,
    );
  }

  const incomplete = runs.filter((r) => missingFields(r).length > 0);
  const estimates = runs.filter((r) => r.source === "estimate").length;
  lines.push(
    `DATA QUALITY: ${incomplete.length} of ${t.runs} runs are missing a number (${[...new Set(incomplete.flatMap(missingFields))].join(", ") || "none"}); ${estimates} runs are past-year estimates.`,
  );
  const sv = savingsEstimate(t.completed);
  lines.push(
    `ESTIMATE (association, not causation): if completers return at CDCR's rate for credit earners (39.2%) instead of no-credit (45.6%), about ${n(sv.avoidedReturns)} returns avoided, $${n(sv.conservative)} at marginal cost or $${n(sv.capacity)} at average cost (LAO 2025-26).`,
  );
  return lines.join("\n");
}

export function insightsPrompt(facts: string): string {
  return `You are an analyst for Transformative Programming Works (TPW), a coalition of community organizations that run rehabilitative programs in California prisons. TPW secures public funding for its members (including CDCR's RIGHT grant), advocates with CDCR and legislators, and coordinates its members.

Read FACTS and write a short summary for TPW's leadership.

Rules:
1. Use only numbers that appear in FACTS. Never invent, round differently or estimate new numbers. If something isn't in FACTS, don't mention it.
2. Describe associations, never causes. Don't say a program reduces recidivism.
3. Treat groups under 20 participants as too small to compare; say so if you mention them.
4. Recommendations are concrete next steps TPW staff can take (for example: coach an organization on its RIGHT 4.0 application before 2026-11-30, follow up on missing numbers, ask more members to report, raise access at a prison with CDCR).
5. A year with runs still open has incomplete completions; don't call it a decline.
6. Every insight needs a useful recommendation; if there is none, leave that insight out.
7. Plain English. Each finding at most 35 words, each recommendation at most 25 words.

Reply with JSON only, no other text:
{"headline": "one sentence on the most important point", "insights": [{"title": "3-6 words", "finding": "...", "recommendation": "..."}]}
Give 3 to 5 insights, most important first.

FACTS:
${facts}`;
}

/** Reads the model's JSON reply; tolerates code fences and stray text around it. */
export function parseSummary(text: string): Summary | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Partial<Summary>;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const insights = (Array.isArray(raw.insights) ? raw.insights : [])
      .map((i) => ({
        title: str(i?.title),
        finding: str(i?.finding),
        // "None" / "N/A" is no recommendation at all.
        recommendation: /^(none|n\/?a|-+)\.?$/i.test(str(i?.recommendation)) ? "" : str(i?.recommendation),
      }))
      .filter((i) => i.title && i.finding)
      .slice(0, 5);
    if (!insights.length) return null;
    return { headline: str(raw.headline), insights };
  } catch {
    return null;
  }
}
