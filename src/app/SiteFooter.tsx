"use client";

import { usePathname } from "next/navigation";

/**
 * Footer for the organization side: the case TPW is making, with its source,
 * and a way to help. The home page's half-ring comes to rest on its top edge
 * (id="spera-footer", see RisingSun).
 */
export default function SiteFooter() {
  if (usePathname().startsWith("/tpw")) return null;
  return (
    <footer id="spera-footer" className="border-t border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-10 gap-y-3 px-6 py-6 text-[0.95rem]">
        <p className="max-w-4xl text-slate-600">
          Rehabilitative programs receive less than 0.1% of CDCR&apos;s $14 billion prison budget. TPW has secured $93 million in
          public funding for 140+ community organizations.{" "}
          <a
            href="https://drive.google.com/file/d/1cF_9YXvfNSNqqVIzhNKrHjDFC7uxg2Iw/view"
            target="_blank"
            rel="noreferrer"
            className="align-super text-[0.65rem] text-brand-800 hover:underline"
            title="Transformative Programming Works, 2026 one-pager"
          >
            [TPW]
          </a>
        </p>
        <a href="https://www.thetpw.org/" target="_blank" rel="noreferrer" className="shrink-0 font-medium text-brand-800 hover:underline">
          Help TPW get there →
        </a>
      </div>
    </footer>
  );
}
