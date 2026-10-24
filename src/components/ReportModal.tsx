"use client";

import Link from "next/link";
import { useEffect } from "react";
import type { OrgSummary } from "@/lib/orgSummary";
import { fmt } from "@/lib/orgSummary";
import ReportView from "./ReportView";

/** Pops up right after a submission: thanks, then the organization's report. */
export default function ReportModal({ s, added, onClose }: { s: OrgSummary; added: number | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-thanks"
        className="w-full max-w-4xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl bg-emerald-50 px-6 py-4">
          <div>
            <p id="report-thanks" className="text-lg font-semibold text-emerald-950">
              ✓ Thank you — your program is in.
            </p>
            {added !== null && (
              <p className="text-sm text-emerald-900">It adds {fmt(added)} participant programming hours to TPW&apos;s network.</p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-3 py-1 text-xl leading-none text-slate-500 hover:bg-white">
            ×
          </button>
        </div>
        <div className="p-6 sm:p-8">
          <ReportView s={s} />
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
            Report another program
          </button>
          <Link href="/report" className="rounded-lg bg-emerald-800 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-900">
            Download or print in My report →
          </Link>
        </div>
      </div>
    </div>
  );
}
