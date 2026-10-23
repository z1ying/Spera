/**
 * Metrics engine — design doc §7. Pure functions, no I/O, unit-tested
 * against the §7.2 worked example (tests/metrics.test.ts).
 *
 * Definitions follow CDCR's primary recidivism measure: conviction within
 * three years of release, with arrest and return-to-custody as supplemental
 * measures (§7.1). Follow-up completeness: cohorts released after
 * MAX_COHORT_YEAR cannot have a full 3-year follow-up yet and are EXCLUDED
 * from rates (and counted), never silently averaged in (§7.4).
 */

/** LAO 2025-26 per-person-year incarceration costs (§7.1, seeded in CostParam). */
export const COSTS = {
  marginalCostYear: 21534,
  avgCostYear: 127788,
} as const;

/** Switchable baselines (§7.1): no-credit tier rate vs statewide rate. */
export const BASELINES = {
  /** CDCR 2020-21: conviction rate for people who earned no program credits. Default. */
  noCreditTier: 0.456,
  /** CDCR FY2019-20: statewide 3-year conviction rate. */
  statewide: 0.391,
} as const;

/** Cohorts released after this year lack a complete 3-year follow-up (§7.4). */
export const MAX_COHORT_YEAR = 2023;

/** Mutually exclusive credit tiers, highest first (§5.2 / generator rule). */
export type CreditTier = "none" | "any" | "emc" | "racc";

export const CREDIT_TIERS: CreditTier[] = ["none", "any", "emc", "racc"];

/** Published CDCR anchors each tier must reproduce within ±2pp (§5.4). */
export const TIER_ANCHORS: Record<CreditTier, number> = {
  none: 0.456,
  any: 0.392,
  emc: 0.261,
  racc: 0.211,
};

export interface Credits {
  MCC: boolean;
  RACC: boolean;
  EMC: boolean;
}

export const NO_CREDITS: Credits = { MCC: false, RACC: false, EMC: false };

/**
 * Highest credit tier for a participant (§5.2): RACC outranks EMC, which
 * outranks any other credit (MCC). Buckets are mutually exclusive so tier
 * rates can be compared against the published anchors.
 */
export function creditTier(credits: Credits): CreditTier {
  if (credits.RACC) return "racc";
  if (credits.EMC) return "emc";
  if (credits.MCC) return "any";
  return "none";
}

export interface ParticipantRecord {
  participantKey: string;
  releaseYear: number;
  credits: Credits;
}

export interface OutcomeRecord {
  participantKey: string;
  /** arrest | conviction | return_to_custody */
  eventType: string;
  eventDate: Date;
}

export interface RateResult {
  /** null when the (eligible) cohort is empty — never 0 (§7.4). */
  rate: number | null;
  /** Eligible participants in the denominator. */
  n: number;
  /** Participants with at least one qualifying event in the window. */
  events: number;
  /** Participants excluded for incomplete follow-up (releaseYear too recent). */
  excludedIncompleteFollowUp: number;
}

export interface ConvictionRateOptions {
  /** Restrict to one credit tier. Omit for the whole cohort. */
  tier?: CreditTier;
  /** Follow-up window in years. CDCR standard is 3. */
  followUpYears?: number;
  /** Cohorts released after this year are excluded as incomplete. */
  maxCohortYear?: number;
}

/**
 * Share of a cohort convicted within `followUpYears` of release (§7.1).
 *
 * Window convention: release data is tracked at year granularity, and in
 * the source systems releases fall in the first half of the release year
 * with events recorded up to release + followUpYears. The window is
 * therefore [Jan 1 of releaseYear, Jan 1 of releaseYear + followUpYears + 1),
 * i.e. events whose calendar year is within releaseYear + followUpYears.
 */
export function convictionRate(
  participants: ParticipantRecord[],
  outcomes: OutcomeRecord[],
  opts: ConvictionRateOptions = {},
): RateResult {
  const followUpYears = opts.followUpYears ?? 3;
  const maxCohortYear = opts.maxCohortYear ?? MAX_COHORT_YEAR;

  const inTier = opts.tier
    ? participants.filter((p) => creditTier(p.credits) === opts.tier)
    : participants;

  const eligible = inTier.filter((p) => p.releaseYear <= maxCohortYear);
  const excludedIncompleteFollowUp = inTier.length - eligible.length;

  const eligibleKeys = new Set(eligible.map((p) => p.participantKey));
  const releaseYearByKey = new Map(eligible.map((p) => [p.participantKey, p.releaseYear]));

  const convictedKeys = new Set<string>();
  for (const o of outcomes) {
    if (o.eventType !== "conviction") continue;
    if (!eligibleKeys.has(o.participantKey) || convictedKeys.has(o.participantKey)) continue;
    const releaseYear = releaseYearByKey.get(o.participantKey)!;
    const start = Date.UTC(releaseYear, 0, 1);
    const end = Date.UTC(releaseYear + followUpYears + 1, 0, 1);
    const t = o.eventDate.getTime();
    if (t >= start && t < end) convictedKeys.add(o.participantKey);
  }

  const n = eligible.length;
  const events = convictedKeys.size;
  return {
    rate: n === 0 ? null : events / n,
    n,
    events,
    excludedIncompleteFollowUp,
  };
}

/**
 * Avoided returns (§7.1): (rate_baseline − rate_participants) × n.
 * Returns null when the participant rate is unknown (empty cohort).
 */
export function avoidedReturns(
  baselineRate: number,
  participantRate: number | null,
  n: number,
): number | null {
  if (participantRate === null || n === 0) return null;
  return (baselineRate - participantRate) * n;
}

export interface ImpactSummaryArgs {
  /** Number of program participants in the cohort. */
  n: number;
  /** Participants' 3-year conviction rate (null if cohort empty). */
  participantRate: number | null;
  /** Baseline to compare against. Defaults to the no-credit tier (§7.1). */
  baselineRate?: number;
  /**
   * Assumed years of re-incarceration avoided per avoided return.
   * Explicit assumption: default 1.0, UI-adjustable 0.5–2.5, and the
   * report footnote must print the value used (§7.1).
   */
  returnYears?: number;
  marginalCostYear?: number;
  avgCostYear?: number;
}

export interface ImpactResult {
  n: number;
  participantRate: number;
  baselineRate: number;
  returnYears: number;
  avoided: number;
  /** Conservative caliber: marginal cost (LAO $21,534/person-year). */
  savingsConservative: number;
  /** Capacity caliber: average cost (LAO $127,788/person-year). */
  savingsCapacity: number;
}

/**
 * Full impact translation (§7.1). Returns null for an empty cohort —
 * callers must render "no data", never $0 of impact.
 */
export function impactSummary(args: ImpactSummaryArgs): ImpactResult | null {
  const baselineRate = args.baselineRate ?? BASELINES.noCreditTier;
  const returnYears = args.returnYears ?? 1.0;
  const marginalCostYear = args.marginalCostYear ?? COSTS.marginalCostYear;
  const avgCostYear = args.avgCostYear ?? COSTS.avgCostYear;

  const avoided = avoidedReturns(baselineRate, args.participantRate, args.n);
  if (avoided === null || args.participantRate === null) return null;

  return {
    n: args.n,
    participantRate: args.participantRate,
    baselineRate,
    returnYears,
    avoided,
    savingsConservative: avoided * returnYears * marginalCostYear,
    savingsCapacity: avoided * returnYears * avgCostYear,
  };
}
