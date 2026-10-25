"use client";

import Link from "next/link";
import { useState } from "react";
import type { Grant, GrantType } from "@/lib/grants";

/** Simple line illustrations, one per grant type (CDCR's page has no images to reuse). */
function Art({ id, color }: { id: string; color: string }) {
  const common = { fill: "none", stroke: color, strokeWidth: 5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="16 6 88 72" className="h-12 w-14 shrink-0" aria-hidden>
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
            return <circle key={a} cx={x} cy={y} r="6" fill={color} stroke="none" />;
          })}
        </g>
      )}
    </svg>
  );
}

/**
 * Logo-style marks, one per program: an icon plus the program's acronym as a
 * two-tone wordmark (our own design — not CDCR's official artwork).
 */
const MARKS: Record<string, { acronym: string; accent: string; ink: string; tagline: string }> = {
  right: { acronym: "RIGHT", accent: "#2f3190", ink: "#64748b", tagline: "Healing & Transformation" },
  vi: { acronym: "VI", accent: "#e11d48", ink: "#64748b", tagline: "Victim Impact" },
  ipg: { acronym: "IPG", accent: "#f59e0b", ink: "#64748b", tagline: "Innovative Programming" },
  care: { acronym: "CARE", accent: "#0284c7", ink: "#64748b", tagline: "Reentry & Enrichment" },
  rj: { acronym: "RJ", accent: "#7c3aed", ink: "#64748b", tagline: "Restorative Justice" },
};

function Mark({ id }: { id: string }) {
  const m = MARKS[id] ?? { acronym: id.toUpperCase(), accent: "#334155", ink: "#64748b", tagline: "" };
  return (
    <div className="flex h-28 flex-col justify-center bg-white px-4">
      <div className="flex items-center gap-2">
        <Art id={id} color={m.accent} />
        <span className={`${m.acronym.length > 3 ? "text-3xl" : "text-4xl"} font-black leading-none tracking-tight`}>
          <span style={{ color: m.accent }}>{m.acronym[0]}</span>
          <span style={{ color: m.ink }}>{m.acronym.slice(1)}</span>
        </span>
      </div>
      <div className="mt-2 h-1 w-full rounded-full" style={{ background: m.accent }} />
      <div className="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-wide" style={{ color: m.accent }}>
        {m.tagline}
      </div>
    </div>
  );
}

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
  const current = items.find((i) => i.type.id === selected) ?? items[0];
  const open = current?.rounds.find((r) => r.status === "open");

  return (
    <>
      <h1 className="text-2xl font-semibold">CDCR grant programs</h1>

      {/* Auto-scrolling strip: the cards are drawn twice and the track slides by half its width, so it loops seamlessly. */}
      <div className="marquee mt-2 overflow-hidden rounded-2xl py-3" role="tablist" aria-label="Grant programs">
        <div className="marquee-track flex w-max">
          {[0, 1].map((copy) =>
            items.map(({ type, rounds }) => {
              const isOpen = rounds.some((r) => r.status === "open");
              const active = type.id === current?.type.id;
              return (
                <button
                  key={`${copy}-${type.id}`}
                  type="button"
                  role={copy === 0 ? "tab" : undefined}
                  aria-selected={copy === 0 ? active : undefined}
                  aria-hidden={copy === 1 ? true : undefined}
                  tabIndex={copy === 1 ? -1 : undefined}
                  onClick={() => setSelected(type.id)}
                  className={`mr-4 w-56 shrink-0 overflow-hidden rounded-2xl bg-white text-left shadow-sm transition ${
                    active ? "ring-4 ring-brand-700 ring-offset-2" : "ring-1 ring-slate-200 hover:-translate-y-0.5 hover:shadow"
                  }`}
                >
                  <Mark id={type.id} />
                  <div className="border-t border-slate-100 p-4">
                    <div className="font-semibold">{type.short}</div>
                    <div className={`mt-1 text-xs font-medium ${isOpen ? "text-brand-800" : "text-slate-500"}`}>
                      {isOpen ? "● Open now" : "Awarded · next round TBA"}
                    </div>
                  </div>
                </button>
              );
            }),
          )}
        </div>
      </div>

      {current && (
        <section className="mt-6" role="tabpanel" aria-label={current.type.name}>
          {open ? (
            <>
              <div className="grid items-center gap-6 rounded-3xl bg-gradient-to-r from-brand-900 via-brand-800 to-sun-500 p-8 text-white sm:grid-cols-[auto_1fr]">
                <div className="text-center">
                  <div className="text-7xl font-semibold tabular-nums leading-none">{open.daysLeft !== null && open.daysLeft >= 0 ? open.daysLeft : 0}</div>
                  <div className="mt-1 text-sm uppercase tracking-wide text-brand-100">days left</div>
                </div>
                <div>
                  <span className="rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Open now</span>
                  <h2 className="mt-3 text-3xl font-semibold">{open.name}</h2>
                  <p className="mt-1 text-brand-100">
                    ${((open.totalFunding ?? 0) / 1e6).toFixed(1)} million from CDCR · due {open.dueLabel}
                  </p>
                  <p className="mt-3 text-sm text-brand-50">Every eligible organization gets points; each point is worth the same share.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {ACTIONS.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-700 hover:shadow"
                  >
                    <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-lg text-brand-900">
                      {a.icon}
                    </span>
                    <h3 className="mt-4 text-lg font-semibold group-hover:text-brand-900">{a.title} →</h3>
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
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-brand-800 underline">
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
