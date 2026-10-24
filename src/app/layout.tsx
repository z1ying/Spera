import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ImpactLink — TPW Impact Framework",
  description:
    "Joins community-program process data with recidivism outcomes, using CDCR's official metrics, to produce funder-ready impact evidence for TPW.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white print:hidden">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-3 text-sm">
            <Link href="/" className="font-semibold text-emerald-900">
              ImpactLink
            </Link>
            <Link href="/" className="text-slate-700 hover:text-slate-900">
              Overview
            </Link>
            <Link href="/import" className="text-slate-700 hover:text-slate-900">
              Import
            </Link>
            <Link href="/data-use" className="text-slate-700 hover:text-slate-900">
              How data is used
            </Link>
            <span className="ml-auto text-xs text-slate-500">Demonstration data are synthetic</span>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
