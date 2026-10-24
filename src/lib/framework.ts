/**
 * Framework configuration — design doc §26 / docs/data-standard.md.
 *
 * Everything that is specific to one jurisdiction lives in a JSON file under
 * config/frameworks/, not in code: the shared identifier used for the join,
 * the outcome events tracked, the primary measure and its follow-up window,
 * the credit system, published anchors and baselines, and cost figures.
 * TPW's California configuration is the default; another nonprofit adopts
 * ImpactLink by writing its own file. Every number carries a citation number
 * (design doc §18) or is null until a published local source is supplied —
 * a framework file never contains an unsourced statistic.
 */
import tpwCalifornia from "../../config/frameworks/tpw-california.json";
import exampleCountyReentry from "../../config/frameworks/example-county-reentry.json";

export const OUTCOME_EVENT_TYPES = [
  "arrest",
  "conviction",
  "return_to_custody",
  "parole_violation",
  "parole_discharge",
] as const;
export type OutcomeEventType = (typeof OUTCOME_EVENT_TYPES)[number];

export interface SourcedValue {
  /** null = not yet supplied; computations that need it return null. */
  value: number | null;
  label?: string;
  /** Reference number in the README / design doc §18 list. */
  citation: number | null;
}

export interface CreditCode {
  /** Canonical code stored in Enrollment.credits, e.g. "RACC". */
  code: string;
  /** Tier this credit puts a participant in; codes are ranked highest first. */
  tier: string;
  label: string;
  /** Other spellings accepted on import, e.g. "R". */
  aliases: string[];
}

export interface FrameworkConfig {
  id: string;
  name: string;
  sharedIdentifier: { name: string; description: string };
  outcomeEvents: OutcomeEventType[];
  primaryMeasure: { eventType: OutcomeEventType; followUpYears: number; label: string; citation: number | null };
  /** Latest release cohort with a complete follow-up window; null = not set. */
  latestMatureCohortYear: number | null;
  credits: CreditCode[];
  tierAnchors: Record<string, SourcedValue>;
  baselines: { default: string; options: Record<string, SourcedValue & { label: string }> };
  costs: { marginal: SourcedValue; average: SourcedValue };
  smallCellThreshold: number;
}

/** Structural check so a malformed framework file fails loudly at startup. */
export function validateFramework(raw: unknown): FrameworkConfig {
  const f = raw as FrameworkConfig;
  const fail = (msg: string): never => {
    throw new Error(`framework ${(f as { id?: string })?.id ?? "?"}: ${msg}`);
  };
  if (!f || typeof f.id !== "string") fail("missing id");
  if (!f.sharedIdentifier?.name) fail("missing sharedIdentifier.name");
  for (const e of f.outcomeEvents ?? fail("missing outcomeEvents"))
    if (!OUTCOME_EVENT_TYPES.includes(e)) fail(`unknown outcome event "${e}"`);
  if (!f.outcomeEvents.includes(f.primaryMeasure?.eventType)) fail("primaryMeasure.eventType must be a tracked outcome event");
  if (!(f.primaryMeasure.followUpYears > 0)) fail("primaryMeasure.followUpYears must be > 0");
  if (!f.baselines?.options?.[f.baselines.default]) fail("baselines.default must name one of baselines.options");
  const sourced = (v: SourcedValue, where: string) => {
    if (v.value !== null && v.citation === null) fail(`${where} has a value but no citation`);
  };
  Object.entries(f.tierAnchors ?? {}).forEach(([k, v]) => sourced(v, `tierAnchors.${k}`));
  Object.entries(f.baselines.options).forEach(([k, v]) => sourced(v, `baselines.${k}`));
  sourced(f.costs.marginal, "costs.marginal");
  sourced(f.costs.average, "costs.average");
  const codes = new Set<string>();
  for (const c of f.credits) {
    for (const token of [c.code, ...c.aliases].map((t) => t.toUpperCase())) {
      if (codes.has(token)) fail(`credit token "${token}" is used twice`);
      codes.add(token);
    }
  }
  return f;
}

export const FRAMEWORKS: Record<string, FrameworkConfig> = Object.fromEntries(
  [tpwCalifornia, exampleCountyReentry].map((raw) => {
    const f = validateFramework(raw);
    return [f.id, f];
  }),
);

/** TPW's California configuration — the one this deployment runs. */
export const DEFAULT_FRAMEWORK: FrameworkConfig = FRAMEWORKS["tpw-california"];

/** Tiers from lowest to highest participation, starting with "none". */
export function tiersOf(f: FrameworkConfig): string[] {
  const ranked = [...new Set(f.credits.map((c) => c.tier))];
  return ["none", ...ranked.reverse()];
}
