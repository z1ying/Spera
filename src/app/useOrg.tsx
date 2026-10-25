"use client";

import { useEffect, useState } from "react";
import type { OrgSummary } from "@/lib/orgSummary";
import SearchPick from "./SearchPick";

const LAST = "spera.last";

/** The organization this browser last used (convenience only). */
function readLast(): string {
  try {
    return (JSON.parse(localStorage.getItem(LAST) ?? "{}") as { orgName?: string }).orgName ?? "";
  } catch {
    return "";
  }
}
function writeLast(orgName: string) {
  try {
    const prev = JSON.parse(localStorage.getItem(LAST) ?? "{}");
    localStorage.setItem(LAST, JSON.stringify({ ...prev, orgName }));
  } catch {
    // storage blocked: the page still works, it just won't remember
  }
}

/** Remembered organization + its summary, shared by the report and grants pages. */
export function useOrgSummary() {
  const [orgs, setOrgs] = useState<string[]>([]);
  const [org, setOrg] = useState("");
  const [summary, setSummary] = useState<OrgSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/form-options")
      .then((r) => r.json())
      .then((o: { orgs: { name: string }[] }) => {
        const names = o.orgs.map((x) => x.name);
        setOrgs(names);
        const last = readLast();
        if (names.includes(last)) setOrg(last);
      })
      .catch(() => setOrgs([]));
  }, []);

  useEffect(() => {
    setSummary(null);
    if (!org) return;
    writeLast(org);
    setLoading(true);
    fetch(`/api/org-summary?org=${encodeURIComponent(org)}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [org]);

  return { orgs, org, setOrg, summary, loading };
}

export function OrgPicker({ orgs, org, setOrg }: { orgs: string[]; org: string; setOrg: (o: string) => void }) {
  return (
    <SearchPick
      items={orgs}
      label={(o) => o}
      toText={(o) => o}
      selected={org || null}
      onPick={setOrg}
      onClear={() => setOrg("")}
      placeholder="Type your organization's name"
    />
  );
}
