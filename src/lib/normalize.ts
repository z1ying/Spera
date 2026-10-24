/**
 * Canonical form of a shared identifier (e.g. a CDCR number) before hashing:
 * trimmed, upper-case, spaces and dashes removed, so "ab-1234" and "AB1234"
 * link to one person. Shared by the server (privacy.ts) and the browser.
 */
export function normalizeCdcrNumber(identifier: string): string {
  return identifier.trim().toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Network key for the synthetic demo only (data/demo-data/demo_raw_*.csv).
 * Real deployments get their key from TPW and never commit it.
 */
export const DEMO_NETWORK_KEY = "impactlink-demo-network-key";
