"use client";

import Link from "next/link";
import { useState } from "react";
import { DEFAULT_FRAMEWORK as F } from "@/lib/framework";
import { money } from "@/lib/format";
import { impactSummary } from "@/lib/metrics";
import { Cite } from "./Cite";

/**
 * Impact in two calibers (§7.1): conservative at marginal cost, capacity at
 * average cost. Baseline and return_years are explicit, adjustable
 * assumptions, and both are carried into the report link so the report
 * footnote prints the values used.
 */
export default function ImpactPanel({ n, rate, orgId }: { n: number; rate: number | null; orgId?: string }) {
  const [baselineKey, setBaselineKey] = useState(F.baselines.default);
  const [returnYears, setReturnYears] = useState(1.0);
  const baseline = F.baselines.options[baselineKey];
  const r = baseline.value === null ? null : impactSummary({ n, participantRate: rate, baselineRate: baseline.value, returnYears });
  const params = new URLSearchParams({ baseline: baselineKey, years: String(returnYears), ...(orgId ? { org: orgId } : {}) });

  return (
    <div>
      <div className="flex flex-wrap gap-6 text-sm">
        <fieldset>
          <legend className="font-medium">Compare against</legend>
          {Object.entries(F.baselines.options).map(([key, b]) => (
            <label key={key} className="mt-1 flex items-center gap-2">
              <input type="radio" name="baseline" checked={baselineKey === key} onChange={() => setBaselineKey(key)} />
              <span>
                {b.label} — {b.value === null ? "not set" : `${(b.value * 100).toFixed(1)}%`}
                <Cite n={b.citation} />
              </span>
            </label>
          ))}
        </fieldset>
        <label className="min-w-56">
          <span className="font-medium">Years of incarceration per avoided return: {returnYears.toFixed(1)}</span>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.5}
            value={returnYears}
            onChange={(e) => setReturnYears(Number(e.target.value))}
            className="mt-2 block w-full accent-emerald-800"
          />
          <span className="text-xs text-slate-500">An explicit assumption, printed on the report.</span>
        </label>
      </div>

      {r === null ? (
        <p className="mt-6 text-sm text-slate-600">Not enough data to compute impact.</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-slate-100 p-4">
            <div className="text-3xl font-semibold tabular-nums">{Math.round(r.avoided).toLocaleString("en-US")}</div>
            <div className="text-sm text-slate-700">fewer convictions than the baseline rate predicts</div>
          </div>
          <div className="rounded-lg border-2 border-emerald-800 p-4">
            <div className="text-3xl font-semibold tabular-nums text-emerald-900">{money(r.savingsConservative)}</div>
            <div className="text-sm text-slate-700">
              conservative — marginal cost ${F.costs.marginal.value!.toLocaleString("en-US")}/person-year
              <Cite n={F.costs.marginal.citation} />
            </div>
          </div>
          <div className="rounded-lg border border-slate-300 p-4">
            <div className="text-3xl font-semibold tabular-nums text-slate-700">{money(r.savingsCapacity)}</div>
            <div className="text-sm text-slate-700">
              long-run capacity — average cost ${F.costs.average.value!.toLocaleString("en-US")}/person-year
              <Cite n={F.costs.average.citation} />
            </div>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        Association with a dose-response gradient, not proven causation: participants may differ from the baseline
        population in ways the data does not capture.
      </p>
      <Link
        href={`/report?${params}`}
        className="mt-5 inline-block rounded-md bg-emerald-800 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-900 print:hidden"
      >
        Generate one-page report
      </Link>
    </div>
  );
}
