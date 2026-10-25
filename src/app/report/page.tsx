"use client";

import ReportView from "@/components/ReportView";
import Link from "next/link";
import { useOrgSummary } from "../useOrg";

// "My report" — the one-page report of the organization this browser submitted
// data for (no name to type); printable / save as PDF.
export default function MyReport() {
  const { org, summary, loading, ready } = useOrgSummary();
  return (
    <main className="mx-auto max-w-4xl px-6 py-10 print:max-w-none print:p-0">
      <div className="print:hidden">
        <h1 className="text-4xl font-semibold">My report</h1>
        <p className="mt-1 text-slate-600">One page on what your organization delivered — ready for grants and your board.</p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          {org ? <span className="rounded-full bg-brand-800 px-4 py-2 text-sm text-white">{org}</span> : <span />}
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
        {ready && !org && (
          <div className="text-center">
            <p className="text-lg text-slate-700">Your report appears here after you submit your first program from this browser.</p>
            <Link href="/" className="mt-4 inline-block rounded-lg bg-brand-800 px-5 py-2.5 font-medium text-white hover:bg-brand-900">
              Submit data
            </Link>
          </div>
        )}
        {summary && <ReportView s={summary} />}
      </div>
    </main>
  );
}
