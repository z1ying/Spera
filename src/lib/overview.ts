/**
 * Overview + report aggregates — design doc §8 (M4) and §9 (M5).
 * Pure: takes plain records, returns everything the overview and report
 * pages render. Every group-level number passes small-cell suppression
 * (§7.3) here, so pages cannot accidentally show a group under 10 people.
 *
 * "Participants" = registry members with at least one enrollment on file.
 * Comparisons use the framework's published, cited baselines — never the
 * synthetic comparison group, which is uncalibrated (DECISIONS 2026-10-23).
 */
import { DEFAULT_FRAMEWORK as F } from "./framework";
import {
  CREDIT_TIERS,
  NO_CREDITS,
  TIER_ANCHORS,
  convictionRate,
  creditTier,
  type Credits,
  type OutcomeRecord,
  type ParticipantRecord,
  type RateResult,
} from "./metrics";
import { SMALL_CELL_THRESHOLD, suppressValue, type SuppressedValue } from "./privacy";

export interface EnrollmentRecord {
  participantKey: string;
  orgId: string;
  status: string;
  credits: Credits;
}

export interface OrgRecord {
  id: string;
  name: string;
  dataGrade: string;
}

export interface TierRow {
  tier: string;
  label: string;
  n: SuppressedValue;
  rate: SuppressedValue | null;
  /** Published anchor for this tier, with its citation. */
  anchor: number | null;
  anchorCitation: number | null;
}

export interface OrgRow {
  id: string;
  name: string;
  grade: string;
  participants: SuppressedValue;
  completionRate: SuppressedValue | null;
  rate: SuppressedValue | null;
}

export interface CohortRow {
  releaseYear: number;
  n: SuppressedValue;
  followUpComplete: boolean;
  rate: SuppressedValue | null;
}

export interface Overview {
  participants: number;
  overall: RateResult;
  funnel: { enrolled: number; completed: number; credited: number };
  tiers: TierRow[];
  cohorts: CohortRow[];
  orgs: OrgRow[];
  /** Organizations with no participants on file (e.g. before their first import). */
  orgsWithoutData: number;
}

export const TIER_LABELS: Record<string, string> = {
  none: "No credits",
  any: "Any credit",
  emc: "Educational merit (EMC)",
  racc: "Rehabilitative achievement (RACC)",
};

const orCredits = (a: Credits, b: Credits): Credits =>
  Object.fromEntries(Object.keys({ ...a, ...b }).map((k) => [k, !!a[k] || !!b[k]]));

export function buildOverview(args: {
  registry: { participantKey: string; releaseYear: number }[];
  enrollments: EnrollmentRecord[];
  outcomes: OutcomeRecord[];
  orgs: OrgRecord[];
  /** Restrict everything to one organization's participants (per-org report). */
  orgId?: string;
}): Overview {
  const enrollments = args.orgId ? args.enrollments.filter((e) => e.orgId === args.orgId) : args.enrollments;
  const releaseYear = new Map(args.registry.map((p) => [p.participantKey, p.releaseYear]));

  // Person-level view: credits OR-ed across enrollments, completed if any enrollment completed.
  const people = new Map<string, { credits: Credits; completed: boolean; orgs: Set<string> }>();
  for (const e of enrollments) {
    if (!releaseYear.has(e.participantKey)) continue;
    const p = people.get(e.participantKey) ?? { credits: { ...NO_CREDITS }, completed: false, orgs: new Set<string>() };
    p.credits = orCredits(p.credits, e.credits);
    p.completed ||= e.status === "completed";
    p.orgs.add(e.orgId);
    people.set(e.participantKey, p);
  }

  const toRecord = (key: string): ParticipantRecord => ({
    participantKey: key,
    releaseYear: releaseYear.get(key)!,
    credits: people.get(key)!.credits,
  });
  const cohort = [...people.keys()].map(toRecord);
  const outcomes = args.outcomes.filter((o) => people.has(o.participantKey));
  const sup = (r: RateResult) => ({ n: suppressValue(r.n, r.n)!, rate: suppressValue(r.n, r.rate) });

  const tiers: TierRow[] = CREDIT_TIERS.map((tier) => {
    const r = convictionRate(cohort, outcomes, { tier });
    return {
      tier,
      label: TIER_LABELS[tier] ?? tier,
      ...sup(r),
      anchor: TIER_ANCHORS[tier] ?? null,
      anchorCitation: F.tierAnchors[tier]?.citation ?? null,
    };
  });

  const years = [...new Set(cohort.map((p) => p.releaseYear))].sort();
  const cohorts: CohortRow[] = years.map((y) => {
    const members = cohort.filter((p) => p.releaseYear === y);
    const complete = F.latestMatureCohortYear !== null && y <= F.latestMatureCohortYear;
    const r = convictionRate(members, outcomes, {});
    return {
      releaseYear: y,
      n: suppressValue(members.length, members.length)!,
      followUpComplete: complete,
      rate: complete ? suppressValue(members.length, r.rate) : null,
    };
  });

  const orgs: OrgRow[] = args.orgs
    .filter((o) => !args.orgId || o.id === args.orgId)
    .map((o) => {
      const keys = [...people].filter(([, p]) => p.orgs.has(o.id)).map(([k]) => k);
      const n = keys.length;
      const completed = keys.filter((k) => people.get(k)!.completed).length;
      const r = convictionRate(keys.map(toRecord), outcomes, {});
      return {
        id: o.id,
        name: o.name,
        grade: o.dataGrade,
        participants: n === 0 ? 0 : suppressValue(n, n)!,
        completionRate: n === 0 ? null : suppressValue(n, completed / n),
        rate: n === 0 ? null : suppressValue(r.n, r.rate),
      };
    });

  const all = [...people.values()];
  return {
    participants: people.size,
    overall: convictionRate(cohort, outcomes),
    funnel: {
      enrolled: all.length,
      completed: all.filter((p) => p.completed).length,
      credited: all.filter((p) => Object.values(p.credits).some(Boolean)).length,
    },
    tiers,
    cohorts,
    orgs,
    orgsWithoutData: orgs.filter((o) => o.participants === 0).length,
  };
}

/** Headline numbers are suppressed as a whole when the cohort is too small. */
export const isReportable = (o: Overview) => o.overall.n >= SMALL_CELL_THRESHOLD;
