import Link from "next/link";
import { Cite } from "@/components/Cite";
import Funnel from "@/components/Funnel";
import GradientChart from "@/components/GradientChart";
import ImpactPanel from "@/components/ImpactPanel";
import { DEFAULT_FRAMEWORK as F } from "@/lib/framework";
import { loadOverview } from "@/lib/loadOverview";
import { isReportable } from "@/lib/overview";
import { SUPPRESSED, type SuppressedValue } from "@/lib/privacy";

export const dynamic = "force-dynamic";

const pct = (v: SuppressedValue | null | undefined) =>
  v === null || v === undefined ? "—" : v === SUPPRESSED ? SUPPRESSED : `${(v * 100).toFixed(1)}%`;
const count = (v: SuppressedValue) => (v === SUPPRESSED ? SUPPRESSED : v.toLocaleString("en-US"));

const GRADE_STYLE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-900",
  B: "bg-amber-100 text-amber-900",
  C: "bg-slate-200 text-slate-700",
};

function Card({ value, label, children }: { value: React.ReactNode; label: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-sm text-slate-600">{label}</div>
      {children}
    </div>
  );
}

// Overview dashboard — design doc §8 (M4), for TPW's management/policy team (§20).
export default async function Overview() {
  const { overview: o, lastImport } = await loadOverview();
  const statewide = F.baselines.options.statewide;
  const reportable = isReportable(o);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">TPW network · {F.primaryMeasure.label}</p>
          <h1 className="mt-1 text-3xl font-semibold">Impact overview</h1>
        </div>
        <p className="text-xs text-slate-500">
          {lastImport
            ? `Last import ${lastImport.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}`
            : "Seeded demonstration data"}{" "}
          · Data is gathered quarterly, not live
        </p>
      </div>

      <p className="mt-4 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-900">
        Demonstration data are synthetic, calibrated to published CDCR and TPW statistics. No real personal data is used.
      </p>

      <section aria-label="Headline numbers" className="mt-8 grid gap-4 md:grid-cols-3">
        <Card value={o.participants.toLocaleString("en-US")} label="program participants on file, linked by pseudonymous key" />
        <Card
          value={reportable ? pct(o.overall.rate) : SUPPRESSED}
          label={
            <>
              convicted within {F.primaryMeasure.followUpYears} years of release, vs {pct(statewide.value)} statewide
              <Cite n={statewide.citation} />
            </>
          }
        />
        <Card
          value={o.funnel.enrolled ? `${((o.funnel.completed / o.funnel.enrolled) * 100).toFixed(0)}%` : "—"}
          label="completed their program"
        />
      </section>

      <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">The deeper the participation, the lower the conviction rate</h2>
        <p className="mt-1 text-sm text-slate-600">
          Three-year conviction rate by highest program credit earned. Grey bars are CDCR&apos;s published rates
          <Cite n={2} /> for comparison; tiers under 10 people are not shown.
        </p>
        <div className="mt-4">
          <GradientChart tiers={o.tiers} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Where people fall out</h2>
          <div className="mt-4">
            <Funnel funnel={o.funnel} />
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Release cohorts</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1">Released</th>
                <th className="py-1">People</th>
                <th className="py-1">Follow-up</th>
                <th className="py-1 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {o.cohorts.map((c) => (
                <tr key={c.releaseYear} className="border-t border-slate-100">
                  <td className="py-1.5">{c.releaseYear}</td>
                  <td className="py-1.5 tabular-nums">{count(c.n)}</td>
                  <td className="py-1.5">
                    {c.followUpComplete ? (
                      <span className="text-emerald-800">{F.primaryMeasure.followUpYears} years complete</span>
                    ) : (
                      <span className="text-amber-800">Still maturing</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{c.followUpComplete ? pct(c.rate) : "not yet"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">Cohorts still inside their follow-up window are never averaged in.</p>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">What it is worth</h2>
        <div className="mt-4">
          <ImpactPanel n={o.overall.n} rate={reportable ? o.overall.rate : null} />
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold">Organizations</h2>
          <Link href="/import" className="text-sm text-emerald-800 hover:underline">
            Import data →
          </Link>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Listed alphabetically, not ranked. Data grade: A = outcomes linked · B = program data only · C = no data yet or
          critical fields missing. Groups under 10 people show “{SUPPRESSED}”.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-1">Organization</th>
                <th className="py-1">Grade</th>
                <th className="py-1 text-right">Participants</th>
                <th className="py-1 text-right">Completed</th>
                <th className="py-1 text-right">3-yr conviction</th>
                <th className="py-1" />
              </tr>
            </thead>
            <tbody>
              {o.orgs.map((org) => (
                <tr key={org.id} className="border-t border-slate-100">
                  <td className="py-2">{org.name}</td>
                  <td className="py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${GRADE_STYLE[org.grade] ?? ""}`}>{org.grade}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{count(org.participants)}</td>
                  <td className="py-2 text-right tabular-nums">{pct(org.completionRate)}</td>
                  <td className="py-2 text-right tabular-nums">{org.participants === 0 ? "no data yet" : org.grade === "A" ? pct(org.rate) : "needs outcomes"}</td>
                  <td className="py-2 text-right">
                    {org.participants !== 0 && (
                      <Link href={`/report?org=${org.id}`} className="text-xs text-emerald-800 hover:underline">
                        Report
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
