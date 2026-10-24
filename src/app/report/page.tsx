import { isTpwSignedIn } from "@/lib/tpwAuth";
import LoginForm from "@/app/tpw/LoginForm";
import Link from "next/link";
import { Cite, References } from "@/components/Cite";
import Funnel from "@/components/Funnel";
import GradientChart from "@/components/GradientChart";
import PrintButton from "@/components/PrintButton";
import { DEFAULT_FRAMEWORK as F } from "@/lib/framework";
import { money } from "@/lib/format";
import { loadOverview } from "@/lib/loadOverview";
import { impactSummary } from "@/lib/metrics";
import { isReportable } from "@/lib/overview";
import { SMALL_CELL_THRESHOLD, SUPPRESSED, type SuppressedValue } from "@/lib/privacy";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impact report — ImpactLink" };

const pct = (v: SuppressedValue | null | undefined) =>
  v === null || v === undefined ? "—" : v === SUPPRESSED ? SUPPRESSED : `${(v * 100).toFixed(1)}%`;

/** Design doc §9 methodology footnote — verbatim, do not rewrite. */
const METHOD_FOOTNOTE =
  "Rates follow CDCR's primary measure: conviction within three years of release. Cost figures use the Legislative Analyst's Office 2025-26 estimates (marginal cost $21,534 and average cost $127,788 per person-year). Demonstration data are synthetic, calibrated to published CDCR and TPW statistics.";

// One-page, print-optimized impact report — design doc §9 (M5). Readers are
// legislators' offices and funders (§20); `?org=` gives one organization a
// report on its own program for its own grant applications.
export default async function Report({
  searchParams,
}: {
  searchParams: Promise<{ baseline?: string; years?: string; org?: string }>;
}) {
  if (!(await isTpwSignedIn())) return <LoginForm />;
  const q = await searchParams;
  const baselineKey = q.baseline && F.baselines.options[q.baseline] ? q.baseline : F.baselines.default;
  const baseline = F.baselines.options[baselineKey];
  const years = Number(q.years);
  const returnYears = Number.isFinite(years) && years >= 0.5 && years <= 2.5 ? years : 1.0;

  const [{ overview: network }, scoped] = await Promise.all([
    loadOverview(),
    q.org ? loadOverview(q.org) : Promise.resolve(null),
  ]);
  const o = scoped?.overview ?? network;
  const org = q.org ? network.orgs.find((r) => r.id === q.org) : undefined;
  const reportable = isReportable(o);
  const impact =
    reportable && baseline.value !== null
      ? impactSummary({ n: o.overall.n, participantRate: o.overall.rate, baselineRate: baseline.value, returnYears })
      : null;
  const today = new Date().toLocaleDateString("en-US", { dateStyle: "long" });
  const statewide = F.baselines.options.statewide;
  const noCredit = F.baselines.options.noCreditTier;

  return (
    <main className="report-page mx-auto max-w-4xl px-6 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <PrintButton />
        <Link href="/future/overview" className="text-sm text-slate-700 hover:underline">
          ← Back to outcomes demo
        </Link>
        <span className="text-xs text-slate-500">
          Baseline: {baseline.label} · {returnYears.toFixed(1)} years per avoided return
        </span>
      </div>

      <header className="border-b-2 border-emerald-900 pb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">
          {org ? `${org.name} · part of the TPW network` : "Transformative Programming Works network"} · Impact report · {today}
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-snug">
          {reportable ? (
            <>
              {pct(o.overall.rate)} of {o.overall.n.toLocaleString("en-US")} program participants were convicted within{" "}
              {F.primaryMeasure.followUpYears} years of release — against {pct(statewide.value)} statewide
              <Cite n={statewide.citation} /> and {pct(noCredit.value)} for people with no program credits
              <Cite n={noCredit.citation} />.
            </>
          ) : (
            <>Fewer than {SMALL_CELL_THRESHOLD} participants with a complete follow-up — results are not reported.</>
          )}
        </h1>
        {org && reportable && (
          <p className="mt-1 text-sm text-slate-600">
            Whole TPW network for comparison: {pct(network.overall.rate)} of {network.overall.n.toLocaleString("en-US")}{" "}
            participants.
          </p>
        )}
      </header>

      {impact && (
        <section className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded border border-slate-300 p-3">
            <div className="text-2xl font-semibold tabular-nums">≈ {Math.round(impact.avoided).toLocaleString("en-US")}</div>
            <div className="text-xs text-slate-700">fewer convictions than the {(impact.baselineRate * 100).toFixed(1)}% baseline predicts</div>
          </div>
          <div className="rounded border-2 border-emerald-900 p-3">
            <div className="text-2xl font-semibold tabular-nums text-emerald-900">{money(impact.savingsConservative)}</div>
            <div className="text-xs text-slate-700">
              <strong>Conservative:</strong> at the marginal cost of incarceration, ${F.costs.marginal.value!.toLocaleString("en-US")}
              /person-year
              <Cite n={F.costs.marginal.citation} /> — what next year&apos;s budget can save
            </div>
          </div>
          <div className="rounded border border-slate-300 p-3">
            <div className="text-2xl font-semibold tabular-nums text-slate-700">{money(impact.savingsCapacity)}</div>
            <div className="text-xs text-slate-700">
              <strong>Long-run capacity:</strong> at the average cost, ${F.costs.average.value!.toLocaleString("en-US")}
              /person-year
              <Cite n={F.costs.average.citation} />
            </div>
          </div>
        </section>
      )}

      <section className="mt-4 grid grid-cols-[3fr_2fr] gap-5">
        <div>
          <h2 className="text-sm font-semibold">Conviction rate by depth of participation</h2>
          <GradientChart tiers={o.tiers} animate={false} fixedWidth={460} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Participation funnel</h2>
          <div className="mt-3">
            <Funnel funnel={o.funnel} />
          </div>
        </div>
      </section>

      {!org && (
        <section className="mt-3">
          <h2 className="text-sm font-semibold">Data quality by organization</h2>
          <p className="mt-1 text-xs text-slate-700">
            {network.orgs.map((r, i) => (
              <span key={r.id}>
                {i > 0 && " · "}
                {r.name} <strong>{r.grade}</strong>
              </span>
            ))}
          </p>
          <p className="text-[0.7rem] text-slate-500">
            A = outcomes linked · B = program data only · C = no data yet or critical fields missing. Organization-level
            figures are shared only with that organization and TPW.
          </p>
        </section>
      )}

      <footer className="mt-4 border-t border-slate-300 pt-3 text-[0.7rem] leading-relaxed text-slate-600">
        <p>
          <strong>Method.</strong> {METHOD_FOOTNOTE}
        </p>
        <p className="mt-1">
          <strong>Assumptions on this page.</strong> Baseline: {baseline.label} ({pct(baseline.value)}). Each conviction
          below the baseline is valued at {returnYears.toFixed(1)} year{returnYears === 1 ? "" : "s"} of incarceration.
          Results show association with a dose-response gradient, not proven causation. Release cohorts without a
          complete follow-up are excluded. Groups of fewer than {SMALL_CELL_THRESHOLD} people are suppressed. Records
          are linked by keyed hash only; no names, birth dates or case numbers are stored.
        </p>
        <div className="mt-2">
          <References numbers={[1, 2, 3]} />
        </div>
      </footer>
    </main>
  );
}
