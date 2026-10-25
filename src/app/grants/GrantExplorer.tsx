"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Grant, GrantType } from "@/lib/grants";

/** Simple line illustrations, one per grant type (CDCR's page has no images to reuse). */
function Art({ id }: { id: string }) {
  const common = { fill: "none", stroke: "white", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-full" aria-hidden>
      {id === "right" && (
        // sunrise over a horizon: healing and transformation
        <g {...common}>
          <path d="M20 60h80" />
          <path d="M38 60a22 22 0 0 1 44 0" />
          <path d="M60 22v8M34 32l6 6M86 32l-6 6M26 50h6M88 50h6" />
        </g>
      )}
      {id === "vi" && (
        // heart held by two hands
        <g {...common}>
          <path d="M60 52c-14-9-20-16-20-24a10 10 0 0 1 20-3 10 10 0 0 1 20 3c0 8-6 15-20 24z" />
          <path d="M24 58c10 0 16 6 36 6s26-6 36-6" />
        </g>
      )}
      {id === "ipg" && (
        // light bulb
        <g {...common}>
          <path d="M60 16a18 18 0 0 0-10 33v7h20v-7a18 18 0 0 0-10-33z" />
          <path d="M52 64h16M55 70h10" />
          <path d="M60 30v12M54 36h12" />
        </g>
      )}
      {id === "care" && (
        // an open door with a path leading out
        <g {...common}>
          <path d="M44 62V18h32v44" />
          <path d="M44 18l18 6v42l-18-4" />
          <path d="M70 66l20 6M30 72l14-10" />
        </g>
      )}
      {id === "rj" && (
        // circle of people
        <g {...common}>
          <circle cx="60" cy="42" r="18" strokeDasharray="4 6" />
          {[0, 72, 144, 216, 288].map((a) => {
            const x = 60 + 30 * Math.cos(((a - 90) * Math.PI) / 180);
            const y = 42 + 30 * Math.sin(((a - 90) * Math.PI) / 180);
            return <circle key={a} cx={x} cy={y} r="5" fill="white" stroke="none" />;
          })}
        </g>
      )}
    </svg>
  );
}

const COLORS: Record<string, string> = {
  right: "from-emerald-700 to-emerald-900",
  vi: "from-rose-500 to-rose-700",
  ipg: "from-amber-500 to-amber-700",
  care: "from-sky-600 to-sky-800",
  rj: "from-violet-600 to-violet-800",
};

const ACTIONS = [
  { href: "/grants/check", icon: "✓", title: "Do we qualify?", text: "Eligibility and estimated points." },
  { href: "/grants/write", icon: "✎", title: "Write our application", text: "AI drafts with your real numbers." },
  { href: "/grants/check#documents", icon: "☰", title: "What to prepare", text: "CDCR's documents as a checklist." },
];

export interface TypeWithRounds {
  type: GrantType;
  rounds: (Grant & { daysLeft: number | null; dueLabel: string | null })[];
}

export default function GrantExplorer({ items }: { items: TypeWithRounds[] }) {
  const [selected, setSelected] = useState(items[0]?.type.id ?? "");
  const strip = useRef<HTMLDivElement>(null);
  const current = items.find((i) => i.type.id === selected) ?? items[0];
  const open = current?.rounds.find((r) => r.status === "open");
  const scroll = (dir: number) => strip.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">CDCR grant programs</h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => scroll(-1)} aria-label="Scroll left" className="h-9 w-9 rounded-full border border-slate-300 bg-white hover:bg-slate-50">
            ←
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Scroll right" className="h-9 w-9 rounded-full border border-slate-300 bg-white hover:bg-slate-50">
            →
          </button>
        </div>
      </div>

      <div ref={strip} className="-mx-3 mt-2 flex snap-x snap-mandatory scroll-px-3 gap-4 overflow-x-auto px-3 py-3" role="tablist" aria-label="Grant programs">
        {items.map(({ type, rounds }) => {
          const isOpen = rounds.some((r) => r.status === "open");
          const active = type.id === current?.type.id;
          return (
            <button
              key={type.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(type.id)}
              className={`w-56 shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left shadow-sm transition ${
                active ? "ring-4 ring-emerald-700 ring-offset-2" : "ring-1 ring-slate-200 hover:-translate-y-0.5 hover:shadow"
              }`}
            >
              <div className={`bg-gradient-to-br ${COLORS[type.id] ?? "from-slate-600 to-slate-800"} px-4 pt-4`}>
                <Art id={type.id} />
              </div>
              <div className="p-4">
                <div className="font-semibold">{type.short}</div>
                <div className={`mt-1 text-xs font-medium ${isOpen ? "text-emerald-800" : "text-slate-500"}`}>
                  {isOpen ? "● Open now" : "Awarded · next round TBA"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {current && (
        <section className="mt-6" role="tabpanel" aria-label={current.type.name}>
          {open ? (
            <>
              <div className="grid items-center gap-6 rounded-3xl bg-emerald-900 p-8 text-white sm:grid-cols-[auto_1fr]">
                <div className="text-center">
                  <div className="text-7xl font-semibold tabular-nums leading-none">{open.daysLeft !== null && open.daysLeft >= 0 ? open.daysLeft : 0}</div>
                  <div className="mt-1 text-sm uppercase tracking-wide text-emerald-100">days left</div>
                </div>
                <div>
                  <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Open now</span>
                  <h2 className="mt-3 text-3xl font-semibold">{open.name}</h2>
                  <p className="mt-1 text-emerald-100">
                    ${((open.totalFunding ?? 0) / 1e6).toFixed(1)} million from CDCR · due {open.dueLabel}
                  </p>
                  <p className="mt-3 text-sm text-emerald-50">Every eligible organization gets points; each point is worth the same share.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {ACTIONS.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-700 hover:shadow"
                  >
                    <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-900">
                      {a.icon}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold group-hover:text-emerald-900">{a.title} →</h3>
                    <p className="mt-1 text-sm text-slate-600">{a.text}</p>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-8">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Not accepting applications
              </span>
              <h2 className="mt-3 text-2xl font-semibold">{current.type.name}</h2>
              <p className="mt-2 max-w-2xl text-slate-700">{current.type.description}</p>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium">Who can apply:</span> {current.type.whoCanApply}
              </p>
            </div>
          )}

          {current.rounds.filter((r) => r.status !== "open").length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Current funded rounds</h3>
              <ul className="mt-2 grid gap-3 sm:grid-cols-2">
                {current.rounds
                  .filter((r) => r.status !== "open")
                  .map((r) => (
                    <li key={r.id} className="rounded-xl bg-slate-50 p-4 text-sm">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-slate-600">Funding {r.fundingPeriod}</div>
                      {r.links?.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-emerald-800 underline">
                          {l.label} ↗
                        </a>
                      ))}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  );
}
