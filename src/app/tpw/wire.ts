import type { Run } from "@/lib/runs";
import type { WireRun } from "./FilterBar";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** Runs ready to hand to a client component: dates as ISO strings. */
export function toWire(runs: Run[]): WireRun[] {
  return runs.map((r) => ({ ...r, startDate: iso(r.startDate), endDate: iso(r.endDate), submittedAt: iso(r.submittedAt) }));
}
