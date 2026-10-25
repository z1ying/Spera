/**
 * Grant opportunities shown to organizations (design doc §28). Curated by
 * hand from CDCR's own pages into data/grants.json, so TPW can update it
 * without code; every entry carries its source.
 */
import data from "../../data/grants.json";

export interface Grant {
  id: string;
  /** Which of CDCR's grant types this round belongs to. */
  typeId: string;
  name: string;
  fullName?: string;
  funder: string;
  status: "open" | "awarded" | "upcoming";
  releasedOn?: string;
  dueDate?: string;
  dueTime?: string;
  fundingPeriod: string;
  totalFunding?: number;
  howAwarded?: string;
  eligibility?: string[];
  points?: string[];
  documents?: string[];
  notes?: string[];
  links?: { label: string; url: string }[];
  programSummary?: { limit: string; mustInclude: string[]; ifNonEnglish: string };
}

/** One of the five grant programs on CDCR's DRP grants page. */
export interface GrantType {
  id: string;
  short: string;
  name: string;
  description: string;
  whoCanApply: string;
}

export const GRANTS = data as { verifiedOn: string; source: string; sourceUrl: string; types: GrantType[]; grants: Grant[] };

/** Rounds of one type, open first, then newest funding period first (file order). */
export const roundsOf = (typeId: string) =>
  GRANTS.grants.filter((g) => g.typeId === typeId).sort((a, b) => Number(b.status === "open") - Number(a.status === "open"));

/** Whole days from `today` until the due date (0 on the day, negative after). */
export function daysUntil(due: string, today = new Date()): number {
  const d = Date.UTC(+due.slice(0, 4), +due.slice(5, 7) - 1, +due.slice(8, 10));
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d - t) / 86_400_000);
}
