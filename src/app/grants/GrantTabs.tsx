"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/grants", label: "Overview" },
  { href: "/grants/check", label: "Do we qualify?" },
  { href: "/grants/write", label: "Write our application" },
];

export default function GrantTabs() {
  const path = usePathname();
  return (
    <nav aria-label="Grants" className="flex gap-1 rounded-full bg-slate-100 p-1 text-sm">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={path === t.href ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 ${path === t.href ? "bg-sun-200 font-medium text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
