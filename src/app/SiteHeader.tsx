"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const ORG_LINKS = [
  { href: "/", label: "Submit data" },
  { href: "/report", label: "My report" },
  { href: "/grants", label: "Grants" },
  { href: "/data-use", label: "About & privacy" },
];

/** Spera's mark: a sun rising over the horizon. */
export function SunLogo({ className = "h-6 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden>
      <path d="M8 16a12 12 0 0 1 24 0" fill="none" stroke="#e3a92a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M2 17h36" stroke="#26286f" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Soft layered waves, indigo fading into sun-yellow, under the header's right side. */
function WaveBand() {
  return (
    <svg viewBox="0 0 1000 70" preserveAspectRatio="none" className="pointer-events-none absolute right-0 top-full h-16 w-1/2" aria-hidden>
      <defs>
        <linearGradient id="spera-wave" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#f8f6f1" stopOpacity="0" />
          <stop offset="0.35" stopColor="#a2abef" stopOpacity="0.55" />
          <stop offset="0.7" stopColor="#e9a98b" stopOpacity="0.7" />
          <stop offset="1" stopColor="#f0c14b" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path d="M0 0H1000V52C850 40 760 58 620 46S380 30 220 40 60 30 0 24Z" fill="url(#spera-wave)" />
      <path d="M0 0H1000V30C860 22 760 36 620 28S380 14 220 22 60 14 0 10Z" fill="url(#spera-wave)" opacity="0.6" />
    </svg>
  );
}

/**
 * Two faces (design doc §28): organizations see only their own pages — no
 * dashboard — plus a small "TPW" switch. Under /tpw, TPW staff see their
 * navigation and can sign out. The banner states the privacy rule plainly.
 */
export default function SiteHeader({ tpwSignedIn }: { tpwSignedIn: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const tpwArea = path.startsWith("/tpw");

  // Security: TPW access lasts only while on the TPW pages. Stepping back to
  // the organization side signs out, so the TPW switch asks for the passcode
  // every time.
  useEffect(() => {
    if (tpwArea || !tpwSignedIn) return;
    fetch("/api/tpw/logout", { method: "POST", headers: { "x-spera-silent": "1" } }).finally(() => router.refresh());
  }, [tpwArea, tpwSignedIn, router]);
  const active = (href: string) => (href === "/" || href === "/tpw" ? path === href : path.startsWith(href));
  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      aria-current={active(href) ? "page" : undefined}
      className={`rounded-lg px-3 py-1.5 ${active(href) ? "bg-sun-200 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="print:hidden">
      <div className="flex items-center justify-center gap-2 bg-brand-900 px-4 py-2 text-center text-sm text-brand-50">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span>Counts only — Spera never collects names, ID numbers or case numbers.</span>
      </div>
      <header className="relative border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5">
          <Link href={tpwArea ? "/tpw" : "/"} className="flex items-center gap-3">
            <SunLogo />
            <span className="font-serif text-3xl font-semibold tracking-tight text-slate-900">Spera</span>
            <span className="hidden text-sm text-slate-500 md:inline">From attendance to evidence</span>
            {tpwArea && <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-900">TPW</span>}
          </Link>
          <span className="ml-auto flex flex-wrap items-center gap-x-2 gap-y-2 text-[0.95rem]">
            {tpwArea ? (
              <>
                {tpwSignedIn && link("/tpw", "Dashboard")}
                {tpwSignedIn && link("/tpw/data", "Data explorer")}
                <Link href="/" className="px-3 py-1.5 text-slate-800 underline decoration-sun-400 decoration-2 underline-offset-8 hover:text-slate-950">
                  Organization view
                </Link>
                {tpwSignedIn && (
                  <form action="/api/tpw/logout" method="post">
                    <button className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50">Sign out</button>
                  </form>
                )}
              </>
            ) : (
              <>
                {ORG_LINKS.map((l) => link(l.href, l.label))}
                <Link href="/tpw" className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:border-brand-700 hover:text-brand-900">
                  TPW
                </Link>
              </>
            )}
          </span>
        </nav>
        <WaveBand />
      </header>
    </div>
  );
}
