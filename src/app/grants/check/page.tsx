"use client";

import { useState } from "react";
import { PointsMeter } from "@/components/viz";
import { GRANTS } from "@/lib/grants";
import { fmt } from "@/lib/orgSummary";
import { BUDGET_TIERS } from "@/lib/runs";
import { OrgPicker, useOrgSummary } from "../../useOrg";

const open = GRANTS.grants.find((g) => g.status === "open")!;

function Tick({ state, children }: { state: "yes" | "no" | "ask"; children: React.ReactNode }) {
  const style = { yes: "bg-brand-700 text-white", no: "bg-amber-200 text-amber-900", ask: "bg-slate-200 text-slate-600" }[state];
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${style}`}>
        {state === "yes" ? "✓" : state === "no" ? "!" : "?"}
      </span>
      <span className="text-sm">{children}</span>
    </li>
  );
}

// "Do we qualify?" — RIGHT 4.0 eligibility and estimated points from the org's reported runs.
export default function GrantCheck() {
  const { orgs, org, setOrg, summary: s, loading } = useOrgSummary();
  const [budget, setBudget] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const extra = s?.signals.additionalPoints ?? 0;
  const points = budget === null ? extra : Math.min(4, budget + extra);
  const sentence = s
    ? `${s.org} has delivered ${fmt(s.numbers.completedRuns)} completed program runs at ${s.prisons.length} CDCR institutions, reaching ${fmt(s.numbers.participants)} participants, with ${fmt(s.numbers.completed)} completing and ${fmt(s.numbers.participantHours)} total participant programming hours.`
    : "";

  return (
    <>
      <h1 className="text-3xl font-semibold">Do we qualify for {open.name}?</h1>
      <div className="mt-4">
        <OrgPicker orgs={orgs} org={org} setOrg={setOrg} />
      </div>
      {loading && <p className="mt-6 text-slate-500">Loading…</p>}

      {s && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Eligibility</h2>
            <ul className="mt-4 space-y-3">
              <Tick state={s.priorService.meets ? "yes" : "no"}>
                Programmed in CDCR prisons 2 of the last 5 years
                <span className="block text-xs text-slate-500">
                  On file: {s.priorService.yearsWithProgramming.join(", ") || "none"}
                </span>
              </Tick>
              <Tick state={s.runs > 0 ? "yes" : "no"}>Running a program now</Tick>
              <Tick state="ask">501(c)(3), or fiscally sponsored by one</Tick>
              <Tick state="ask">Office in California</Tick>
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Estimated points</h2>
              <span className="text-3xl font-semibold tabular-nums text-brand-900">
                {points}
                <span className="text-base text-slate-400"> / 4</span>
              </span>
            </div>
            <div className="mt-3">
              <PointsMeter points={points} />
            </div>
            <p className="mt-4 text-xs font-medium text-slate-600">Annual budget (not saved)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BUDGET_TIERS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  aria-pressed={budget === t.points}
                  onClick={() => setBudget(t.points)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    budget === t.points ? "border-brand-800 bg-brand-800 text-white" : "border-slate-300 hover:border-brand-700"
                  }`}
                >
                  {t.label} · {t.points}
                </button>
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              <Tick state={s.signals.criteria.underserved ? "yes" : "no"}>
                +0.5 underserved prison{s.signals.criteria.underserved && ` (${s.signals.underservedInstitutions.join(", ")})`}
              </Tick>
              <Tick state={s.signals.criteria.specialPopulations ? "yes" : "no"}>+0.5 serves RHU / EOP / MHCB</Tick>
              <Tick state={s.signals.criteria.nonEnglish ? "yes" : "no"}>
                +0.5 language other than English{s.signals.criteria.nonEnglish && ` (${s.signals.languages.join(", ")})`}
              </Tick>
            </ul>
            <p className="mt-3 text-xs text-slate-500">Half-points cap at +1. Estimate only — CDCR decides.</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2">
            <h2 className="text-lg font-semibold">Numbers you can cite</h2>
            <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed">{sentence}</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(sentence);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
              className="mt-3 rounded-lg bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </section>
        </div>
      )}

      <section id="documents" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">What to prepare</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {open.documents?.map((d) => (
            <li key={d}>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-800" />
                <span>{d}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">{open.notes?.join(" ")}</p>
      </section>
    </>
  );
}
