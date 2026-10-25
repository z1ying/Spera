"use client";

import { usePathname } from "next/navigation";

/**
 * Footer for the organization side: TPW's funding goal (figures from TPW) and
 * a way to help. The home page's half-ring comes to rest on its top edge
 * (id="spera-footer", see RisingSun).
 */
export default function SiteFooter() {
  if (usePathname().startsWith("/tpw")) return null;
  return (
    <footer id="spera-footer" className="border-t border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-10 gap-y-1 px-6 py-2.5 text-sm">
        <p className="text-slate-600">
          <span className="font-medium text-slate-900">TPW&apos;s goal:</span> raise California&apos;s rehabilitation budget from 0.1% to
          1% of corrections spending — about $140M a year, reaching about 95,000 people.
        </p>
        <a href="https://www.thetpw.org/" target="_blank" rel="noreferrer" className="shrink-0 font-medium text-brand-800 hover:underline">
          Help TPW get there →
        </a>
      </div>
    </footer>
  );
}
