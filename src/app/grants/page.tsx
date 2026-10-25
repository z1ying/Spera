import Link from "next/link";
import { daysUntil, GRANTS } from "@/lib/grants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Grants — Spera" };

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

const ACTIONS = [
  { href: "/grants/check", icon: "✓", title: "Do we qualify?", text: "Eligibility and estimated points, from the programs you've reported." },
  { href: "/grants/write", icon: "✎", title: "Write our application", text: "An AI assistant drafts your Program Summary with your real numbers." },
  { href: "/grants/check#documents", icon: "☰", title: "What to prepare", text: "The documents CDCR asks for, as a checklist." },
];

// Grants overview (design doc §28): the open grant at a glance and three ways in.
export default function GrantsOverview() {
  const open = GRANTS.grants.find((g) => g.status === "open");
  const others = GRANTS.grants.filter((g) => g.status !== "open");
  const left = open?.dueDate ? daysUntil(open.dueDate) : null;

  return (
    <>
      {open && (
        <section className="grid items-center gap-6 rounded-3xl bg-emerald-900 p-8 text-white sm:grid-cols-[auto_1fr]">
          <div className="text-center">
            <div className="text-7xl font-semibold tabular-nums leading-none">{left !== null && left >= 0 ? left : 0}</div>
            <div className="mt-1 text-sm uppercase tracking-wide text-emerald-100">days left</div>
          </div>
          <div>
            <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Open now</span>
            <h1 className="mt-3 text-3xl font-semibold">{open.name}</h1>
            <p className="mt-1 text-emerald-100">
              ${((open.totalFunding ?? 0) / 1e6).toFixed(1)} million from CDCR · due {longDate(open.dueDate!)}
            </p>
            <p className="mt-3 text-sm text-emerald-50">Every eligible organization gets points; each point is worth the same share.</p>
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-700 hover:shadow"
          >
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-900">
              {a.icon}
            </span>
            <h2 className="mt-4 text-lg font-semibold group-hover:text-emerald-900">{a.title} →</h2>
            <p className="mt-1 text-sm text-slate-600">{a.text}</p>
          </Link>
        ))}
      </section>

      <details className="mt-8 text-sm text-slate-600">
        <summary className="cursor-pointer">Other CDCR grants (awarded for their current period)</summary>
        <ul className="mt-2 space-y-1 pl-4">
          {others.map((g) => (
            <li key={g.id}>
              {g.name} — funding {g.fundingPeriod}
            </li>
          ))}
        </ul>
      </details>
      <p className="mt-4 text-xs text-slate-500">
        Checked against{" "}
        <a href={GRANTS.sourceUrl} className="underline" target="_blank" rel="noreferrer">
          CDCR&apos;s grant pages
        </a>{" "}
        on {longDate(GRANTS.verifiedOn)}. The official RFA always decides.
        {open?.links?.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="ml-2 underline">
            {l.label}
          </a>
        ))}
      </p>
    </>
  );
}
