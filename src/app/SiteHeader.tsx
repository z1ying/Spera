"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ORG_LINKS = [
  { href: "/", label: "Report a program" },
  { href: "/grants", label: "Grants" },
  { href: "/data-use", label: "How data is used" },
];

/**
 * Two faces (design doc §28): organizations see only their own pages — no
 * dashboard tab — plus a small "TPW staff" link. Under /tpw, TPW staff see
 * their navigation and can sign out.
 */
export default function SiteHeader({ tpwSignedIn }: { tpwSignedIn: boolean }) {
  const path = usePathname();
  const tpwArea = path.startsWith("/tpw");
  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      aria-current={path === href ? "page" : undefined}
      className={path === href ? "font-medium text-slate-900" : "text-slate-600 hover:text-slate-900"}
    >
      {label}
    </Link>
  );

  return (
    <header className="border-b border-slate-200 bg-white print:hidden">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3 text-sm">
        <Link href={tpwArea ? "/tpw" : "/"} className="font-semibold text-emerald-900">
          ImpactLink{tpwArea && <span className="ml-1 font-normal text-slate-500">· TPW</span>}
        </Link>
        {tpwArea ? (
          <>
            {tpwSignedIn && link("/tpw", "Dashboard")}
            <span className="ml-auto flex items-center gap-4">
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
          <>
            {ORG_LINKS.map((l) => link(l.href, l.label))}
            <Link href="/tpw" className="ml-auto text-xs text-slate-400 hover:text-slate-700">
              TPW staff
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
