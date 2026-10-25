"use client";

import { useEffect, useState } from "react";
import type { OrgSummary } from "@/lib/orgSummary";
import OrgEntry, { lookupOrg, type OrgMatch } from "./OrgEntry";

const LAST = "impactlink.last";

/** The organization this browser last used (convenience only). */
function readLast(): string {
  try {
    return (JSON.parse(localStorage.getItem(LAST) ?? "{}") as { orgName?: string }).orgName ?? "";
  } catch {
    return "";
  }
}
export function writeLast(orgName: string) {
  try {
    const prev = JSON.parse(localStorage.getItem(LAST) ?? "{}");
    localStorage.setItem(LAST, JSON.stringify({ ...prev, orgName }));
  } catch {
    // storage blocked: the page still works, it just won't remember
  }
}

/** This browser's organization + its summary, shared by the report and grants pages. */
export function useOrgSummary() {
  const [org, setOrgState] = useState("");
  const [found, setFound] = useState(true);
  const [summary, setSummary] = useState<OrgSummary | null>(null);
  const [loading, setLoading] = useState(false);
  /** True once we know which organization (if any) this browser submitted for. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const last = readLast();
    if (!last) return setReady(true);
    lookupOrg(last)
      .then((m) => {
        if (m.found) setOrgState(m.name);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    setSummary(null);
    if (!org || !found) return;
    writeLast(org);
    setLoading(true);
    fetch(`/api/org-summary?org=${encodeURIComponent(org)}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [org, found]);

  const setOrg = (m: OrgMatch | null) => {
    setFound(m?.found ?? true);
    setOrgState(m?.name ?? "");
  };
  return { org, found, setOrg, summary, loading, ready };
}

export function OrgPicker({ org, found, setOrg }: { org: string; found: boolean; setOrg: (m: OrgMatch | null) => void }) {
  return (
    <OrgEntry
      value={org}
      onSet={setOrg}
      onClear={() => setOrg(null)}
      unknownHint={found ? null : "We don't have any programs under that name yet. Check the spelling, or submit your first program."}
    />
  );
}
