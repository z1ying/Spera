"use client";

import { useEffect, useState } from "react";
import type { Grant } from "@/lib/grants";
import { BUDGET_TIERS } from "@/lib/runs";
import SearchPick from "../SearchPick";

interface Readiness {
  org: string;
  runs: number;
  programs: string[];
  prisons: { code: string; name: string; underserved: boolean }[];
  priorService: { window: number[]; yearsWithProgramming: number[]; meets: boolean };
  signals: {
    underservedInstitutions: string[];
    specialPopulationRuns: number;
    languages: string[];
    criteria: { underserved: boolean; specialPopulations: boolean; nonEnglish: boolean };
    additionalPoints: number;
  };
  numbers: {
    programmingHours: number;
    participants: number;
    completed: number;
    participantHours: number;
    completionRate: number | null;
    completedRuns: number;
  };
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const LAST = "impactlink.last";

function readLastOrg(): string {
  try {
    return (JSON.parse(localStorage.getItem(LAST) ?? "{}") as { orgName?: string }).orgName ?? "";
  } catch {
    return "";
  }
}

function Check({ ok, children, unknown }: { ok?: boolean; unknown?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          unknown ? "bg-slate-200 text-slate-600" : ok ? "bg-emerald-700 text-white" : "bg-amber-200 text-amber-900"
        }`}
      >
        {unknown ? "?" : ok ? "✓" : "!"}
      </span>
      <span>{children}</span>
    </li>
  );
}

export default function GrantsView({ open, orgs }: { open: Grant; orgs: string[] }) {
  const [orgName, setOrgName] = useState("");
  const [r, setR] = useState<Readiness | null>(null);
  const [budgetPoints, setBudgetPoints] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const last = readLastOrg();
    if (last && orgs.includes(last)) setOrgName(last);
  }, [orgs]);

  useEffect(() => {
    setR(null);
    setCopied(false);
    if (!orgName) return;
    fetch(`/api/grants/readiness?org=${encodeURIComponent(orgName)}`)
      .then((res) => res.json())
      .then(setR)
      .catch(() => setR(null));
  }, [orgName]);

  const sentence = r
    ? `${r.org} has delivered ${fmt(r.numbers.completedRuns)} completed program run${r.numbers.completedRuns === 1 ? "" : "s"} at ${r.prisons.length} CDCR institution${r.prisons.length === 1 ? "" : "s"} (${r.prisons.map((p) => p.code).join(", ")}), reaching ${fmt(r.numbers.participants)} participants, with ${fmt(r.numbers.completed)} completing and ${fmt(r.numbers.participantHours)} total participant programming hours.`
    : "";
  const points = budgetPoints === null || !r ? null : Math.min(4, budgetPoints + r.signals.additionalPoints);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Check your organization for {open.name}</h2>
      <p className="mt-1 text-sm text-slate-600">Uses the programs you&apos;ve reported. Nothing here is submitted anywhere.</p>
      <div className="mt-4">
        <SearchPick
          items={orgs}
          label={(o) => o}
          toText={(o) => o}
          selected={orgName || null}
          onPick={setOrgName}
          onClear={() => setOrgName("")}
          placeholder="Type your organization's name"
        />
      </div>

      {orgName && !r && <p className="mt-4 text-sm text-slate-500">Loading…</p>}

      {r && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-semibold">Eligibility</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <Check ok={r.priorService.meets}>
                Programming in CDCR prisons in at least 2 of {r.priorService.window[0]}–{r.priorService.window[4]}:{" "}
                {r.priorService.yearsWithProgramming.length
                  ? `on file for ${r.priorService.yearsWithProgramming.join(" and ")}`
                  : "none on file yet"}
                {!r.priorService.meets && " — add earlier programs if you ran them."}
              </Check>
              <Check unknown>501(c)(3) in good standing, or a fiscal sponsor that is — you confirm</Check>
              <Check unknown>Physical office in California — you confirm</Check>
              <Check ok={r.runs > 0}>Currently running a program: {r.programs.join(", ") || "none on file"}</Check>
            </ul>

            <h3 className="mt-6 font-semibold">Estimated qualifying points</h3>
            <p className="mt-1 text-xs text-slate-500">Your annual budget (not saved):</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {BUDGET_TIERS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  aria-pressed={budgetPoints === t.points}
                  onClick={() => setBudgetPoints(t.points)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    budgetPoints === t.points ? "border-emerald-800 bg-emerald-800 text-white" : "border-slate-300 hover:border-emerald-700"
                  }`}
                >
                  {t.label} · {t.points} pt
                </button>
              ))}
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <Check ok={r.signals.criteria.underserved}>
                +0.5 underserved prison:{" "}
                {r.signals.criteria.underserved
                  ? `you already program at ${r.signals.underservedInstitutions.join(", ")}`
                  : "none yet — underserved prisons are ASP, CCWF, CIW, CTF, KVSP, NKSP, SAC"}
              </Check>
              <Check ok={r.signals.criteria.specialPopulations}>
                +0.5 serving RHU / EOP / MHCB: {r.signals.criteria.specialPopulations ? `${r.signals.specialPopulationRuns} runs` : "none reported"}
              </Check>
              <Check ok={r.signals.criteria.nonEnglish}>
                +0.5 a language other than English: {r.signals.criteria.nonEnglish ? r.signals.languages.join(", ") : "none reported"}
              </Check>
            </ul>
            <p className="mt-3 text-sm">
              {points === null ? (
                <span className="text-slate-500">Choose a budget range to see an estimate.</span>
              ) : (
                <>
                  <strong className="text-2xl tabular-nums text-emerald-900">{points}</strong> of 4 points{" "}
                  <span className="text-xs text-slate-500">(half-points capped at +1.0)</span>
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Points depend on where and how you propose to program in your application (Attachment A) — this estimate uses your
              current record. CDCR decides eligibility and points.
            </p>
          </div>

          <div>
            <h3 className="font-semibold">Numbers you can cite</h3>
            <dl className="mt-2 grid grid-cols-2 gap-3">
              {[
                ["Participant programming hours", fmt(r.numbers.participantHours)],
                ["Participants", fmt(r.numbers.participants)],
                ["Completed", fmt(r.numbers.completed)],
                ["Completion rate", r.numbers.completionRate === null ? "—" : `${(r.numbers.completionRate * 100).toFixed(1)}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
                  <dt className="text-xs text-slate-600">{label}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-lg border border-slate-200 p-3 text-sm leading-relaxed">{sentence}</p>
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
              className="mt-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
            >
              {copied ? "Copied" : "Copy for your program summary"}
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Participant programming hours follow TPW&apos;s definition: participants completed × course length.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
