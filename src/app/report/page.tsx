"use client";

import ReportView from "@/components/ReportView";
import { OrgPicker, useOrgSummary } from "../useOrg";

// "My report" — an organization's one-page program report, printable / save as PDF.
export default function MyReport() {
  const { orgs, org, setOrg, summary, loading } = useOrgSummary();
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 print:max-w-none print:p-0">
      <div className="print:hidden">
        <h1 className="text-3xl font-semibold">My report</h1>
        <p className="mt-1 text-slate-600">One page on what your organization delivered — ready for grants and your board.</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="w-full max-w-md flex-1">
            <OrgPicker orgs={orgs} org={org} setOrg={setOrg} />
          </div>
          {summary && summary.runs > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-brand-800 px-5 py-2.5 font-medium text-white hover:bg-brand-900"
            >
              Download / print (PDF)
            </button>
          )}
        </div>
      </div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:mt-0 print:border-0 print:p-0 print:shadow-none">
        {loading && <p className="text-slate-500">Loading…</p>}
        {!org && !loading && <p className="text-slate-500">Choose your organization to see its report.</p>}
        {summary && <ReportView s={summary} />}
      </div>
    </main>
  );
}
