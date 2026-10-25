"use client";

import { useEffect, useState } from "react";

/**
 * "What to prepare" for RIGHT 4.0: CDCR's required documents (data/grants.json,
 * one row each) with how often each needs refreshing. The status is the
 * organization's own note — nothing is known until they set it — and is kept
 * in this browser only.
 */
const DOCS: { name: string; refresh: "Evergreen" | "Per grant" | "Yearly" }[] = [
  { name: "Proof of active non-profit 501(c)(3) status — IRS determination letter (or fiscal sponsor's)", refresh: "Evergreen" },
  { name: "Fiscal sponsor agreement (if applicable)", refresh: "Per grant" },
  { name: "Annual budget for FY 2024-25 and FY 2025-26, one PDF per year", refresh: "Yearly" },
  { name: "STD 204 Payee Data Record", refresh: "Per grant" },
  { name: "STD 205 Payee Data Record Supplement (optional)", refresh: "Per grant" },
  { name: "Supplement Payee Data Record", refresh: "Per grant" },
  { name: "Office of Business Services form 1000", refresh: "Per grant" },
  { name: "Office of Business Services form 1500", refresh: "Per grant" },
  { name: "Office of Business Services form 1510", refresh: "Per grant" },
  { name: "Certificate of Insurance", refresh: "Yearly" },
  { name: "Workers' Compensation exemption (if applicable)", refresh: "Yearly" },
  { name: "Contractor Certification Clauses", refresh: "Per grant" },
  { name: "California Secretary of State certification", refresh: "Per grant" },
  { name: "Program Summary (max 2 pages)", refresh: "Per grant" },
  { name: "Attachment A — Institution Locations & Populations", refresh: "Per grant" },
];

const STATUSES = ["To check", "Ready", "Needs update", "Missing"] as const;
type Status = (typeof STATUSES)[number];
const PILL: Record<Status, string> = {
  "To check": "bg-slate-100 text-slate-500",
  Ready: "bg-brand-100 text-brand-900",
  "Needs update": "bg-sun-200 text-slate-900",
  Missing: "bg-slate-200 text-slate-700",
};

export default function DocumentsTable({ org, notes }: { org: string; notes?: string[] }) {
  const key = `spera.docs.${org || "_"}`;
  const [status, setStatus] = useState<Record<string, Status>>({});

  useEffect(() => {
    try {
      setStatus(JSON.parse(localStorage.getItem(key) ?? "{}"));
    } catch {
      setStatus({});
    }
  }, [key]);

  function set(name: string, s: Status) {
    const next = { ...status, [name]: s };
    setStatus(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // storage blocked: the table still works for this visit
    }
  }

  const ready = DOCS.filter((d) => status[d.name] === "Ready").length;

  return (
    <section id="documents" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl text-slate-900">What to prepare</h2>
        <p className="text-sm text-slate-500">
          Documents CDCR&apos;s RIGHT 4.0 grant requires · {ready} of {DOCS.length} ready
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="text-left text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-4 font-medium">Document</th>
              <th className="w-40 py-2 pr-4 font-medium">Status</th>
              <th className="w-28 py-2 font-medium">Refresh</th>
            </tr>
          </thead>
          <tbody>
            {DOCS.map((d) => {
              const s = status[d.name] ?? "To check";
              return (
                <tr key={d.name} className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 text-slate-900">{d.name}</td>
                  <td className="py-2.5 pr-4">
                    <select
                      aria-label={`Status of ${d.name}`}
                      value={s}
                      onChange={(e) => set(d.name, e.target.value as Status)}
                      className={`cursor-pointer appearance-none rounded-full border-0 px-3 py-1 text-xs font-medium ${PILL[s]}`}
                    >
                      {STATUSES.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 text-slate-500">{d.refresh}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Click a status to update it — it&apos;s saved in this browser only. {notes?.join(" ")}
      </p>
    </section>
  );
}
