/**
 * Privacy primitives — design doc §4.1 and §7.3.
 *
 * Two rules govern everything in this codebase:
 *  1. The central database never sees a raw identity. Orgs hash their local
 *     IDs locally (with a salt only they hold) and upload only the hash.
 *  2. Small groups are never reported. Any aggregate over fewer than
 *     SMALL_CELL_THRESHOLD people is replaced with "<10" so no individual
 *     can be re-identified from a published breakdown.
 */
import { createHash } from "node:crypto";

/**
 * participant_key = SHA256(org_local_id + ":" + SALT), hex-encoded (§4.1).
 * The SALT stays with the organization; this function is what the org-side
 * tooling runs before anything leaves their machine.
 *
 * Note: the M0 demo CSVs carry 16-hex-char truncated keys produced by the
 * Python generator (same SHA-256, truncated for readability). This function
 * implements the full-length spec form for real deployments.
 */
export function participantKey(orgLocalId: string, salt: string): string {
  return createHash("sha256").update(`${orgLocalId}:${salt}`, "utf8").digest("hex");
}

/** Groups smaller than this are suppressed (§4.1 / §7.3). */
export const SMALL_CELL_THRESHOLD = 10;

export const SUPPRESSED = "<10" as const;

export type SuppressedValue = number | typeof SUPPRESSED;

export interface GroupRow {
  label: string;
  n: number;
  value: number | null;
}

export interface SuppressedGroupRow {
  label: string;
  n: SuppressedValue;
  value: SuppressedValue | null;
}

/** Suppress a single value when its group is below the threshold. */
export function suppressValue(n: number, value: number | null): SuppressedValue | null {
  if (n < SMALL_CELL_THRESHOLD) return SUPPRESSED;
  return value;
}

/**
 * Apply small-cell suppression to a set of group aggregates (§7.3):
 * rows with n < 10 have both their count and value replaced with "<10"
 * and must not be charted or included in reports.
 */
export function suppressSmallCells(rows: GroupRow[]): SuppressedGroupRow[] {
  return rows.map((row) =>
    row.n < SMALL_CELL_THRESHOLD
      ? { label: row.label, n: SUPPRESSED, value: SUPPRESSED }
      : { label: row.label, n: row.n, value: row.value },
  );
}
