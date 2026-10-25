"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ORG_LINKS = [
  { href: "/", label: "Report a program" },
  { href: "/report", label: "My report" },
  { href: "/grants", label: "Grants" },
  { href: "/data-use", label: "About & Privacy" },
];

/**
 * Two faces (design doc §28): organizations see only their own pages — no
 * dashboard tab — plus a small "TPW staff" link. Under /tpw, TPW staff see
 * their navigation and can sign out.
 */
export default function SiteHeader({ tpwSignedIn }: { tpwSignedIn: boolean }) {
  const path = usePathname();
  const tpwArea = path.startsWith("/tpw");
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      aria-current={active(href) ? "page" : undefined}
      className={active(href) ? "font-medium text-slate-900" : "text-slate-600 hover:text-slate-900"}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-slate-200 bg-white print:hidden">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-sm">
        <Link href={tpwArea ? "/tpw" : "/"} className="flex items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight text-emerald-900">Spera</span>
          <span className="hidden text-sm text-slate-500 sm:inline">From attendance to evidence</span>
          {tpwArea && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">TPW</span>}
        </Link>
        {tpwArea ? (
          <>
            <span className="ml-auto flex items-center gap-6">
              {tpwSignedIn && link("/tpw", "Dashboard")}
              <Link href="/" className="text-slate-600 hover:text-slate-900">
                Organization view
              </Link>
              {tpwSignedIn && (
                <form action="/api/tpw/logout" method="post">
                  <button className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-50">Sign out</button>
                </form>
              )}
            </span>
          </>
        ) : (
          <span className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-2">
            {ORG_LINKS.map((l) => link(l.href, l.label))}
            <Link
              href="/tpw"
              className="rounded-md border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-800"
            >
              TPW
            </Link>
          </span>
        )}
      </nav>
    </header>
  );
}
