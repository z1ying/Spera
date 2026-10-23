// Placeholder home page (scaffold night). The real overview dashboard —
// headline number cards, credit-tier gradient, funnel — is M4 in the
// design doc (§8/§11) and is built on Saturday.
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">
        Hack for Social Impact 2026 · Justice Reform · TPW
      </p>
      <h1 className="mt-3 text-4xl font-bold">ImpactLink</h1>
      <p className="mt-4 text-lg text-slate-600">
        From attendance sheets to evidence. ImpactLink joins the process data
        community organizations already keep with the outcome data that lives
        in other systems — parole and recidivism records — and computes
        impact using CDCR&apos;s official metrics.
      </p>
      <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
        Demonstration data are synthetic, calibrated to published CDCR and
        TPW statistics. No real personal data is used.
      </p>
    </main>
  );
}
