/**
 * Grant opportunities shown to organizations (design doc §28). Curated by
 * hand from CDCR's own pages into data/grants.json, so TPW can update it
 * without code; every entry carries its source.
 */
import data from "../../data/grants.json";

export interface Grant {
  id: string;
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

export const GRANTS = data as { verifiedOn: string; source: string; sourceUrl: string; grants: Grant[] };

/** Whole days from `today` until the due date (0 on the day, negative after). */
export function daysUntil(due: string, today = new Date()): number {
  const d = Date.UTC(+due.slice(0, 4), +due.slice(5, 7) - 1, +due.slice(8, 10));
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d - t) / 86_400_000);
}
