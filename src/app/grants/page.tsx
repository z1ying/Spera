import { prisma } from "@/lib/db";
import { daysUntil, GRANTS } from "@/lib/grants";
import GrantsView from "./GrantsView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Grants — ImpactLink" };

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

// Grants page for organizations (design doc §28): the open CDCR grant, a
// readiness check from the organization's own reported programs, and the
// other CDCR grant programs. Content comes from data/grants.json.
export default async function GrantsPage() {
  const orgs = (await prisma.partnerOrg.findMany({ select: { name: true }, orderBy: { name: "asc" } })).map((o) => o.name);
  const open = GRANTS.grants.find((g) => g.status === "open");
  const others = GRANTS.grants.filter((g) => g.status !== "open");
  const left = open?.dueDate ? daysUntil(open.dueDate) : null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">For TPW member organizations</p>
      <h1 className="mt-1 text-3xl font-semibold">Grants</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Write your application for state funding with an assistant that already knows your numbers and the grant&apos;s rules —
        plus a quick check of whether you qualify.
      </p>

      {open && (
        <section className="mt-8 rounded-xl border-2 border-emerald-800 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900">
                Open now
              </span>
              <h2 className="mt-3 text-2xl font-semibold">{open.name}</h2>
              <p className="text-sm text-slate-600">
                {open.fullName} · {open.funder}
              </p>
            </div>
            {open.dueDate && (
              <div className="text-right">
                <div className="text-4xl font-semibold tabular-nums text-emerald-900">{left !== null && left >= 0 ? left : "Closed"}</div>
                <div className="text-sm text-slate-600">
                  {left !== null && left >= 0 ? "days left · " : ""}due {longDate(open.dueDate)}, {open.dueTime}
                </div>
              </div>
            )}
          </div>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Total funding</dt>
              <dd className="mt-1 text-lg font-semibold">${((open.totalFunding ?? 0) / 1e6).toFixed(1)} million</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Funding period</dt>
              <dd className="mt-1">{open.fundingPeriod}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">How money is split</dt>
              <dd className="mt-1">{open.howAwarded}</dd>
            </div>
          </dl>
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer font-medium text-emerald-900">Who can apply and how points work</summary>
          <div className="mt-3 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Who can apply</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                {open.eligibility?.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">How points work</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                {open.points?.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          </div>
          </details>
          <div className="mt-5 flex flex-wrap gap-3">
            {open.links?.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50">
                {l.label} ↗
              </a>
            ))}
          </div>
        </section>
      )}

      {open && (
        <div className="mt-6">
          <GrantsView open={open} orgs={orgs} />
        </div>
      )}

      {open?.documents && (
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold">Documents to prepare</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {open.documents.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold">Good to know</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {open.notes?.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Other CDCR grant programs</h2>
        <p className="mt-1 text-sm text-slate-600">Already awarded for their current period; the next round has not been announced.</p>
        <table className="mt-3 w-full text-sm">
          <tbody>
            {others.map((g) => (
              <tr key={g.id} className="border-t border-slate-100">
                <td className="py-2 pr-4 font-medium">{g.name}</td>
                <td className="py-2 pr-4 text-slate-600">Funding {g.fundingPeriod}</td>
                <td className="py-2 text-right text-xs text-slate-500">Awarded</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-6 text-xs text-slate-500">
        Checked against{" "}
        <a href={GRANTS.sourceUrl} className="underline" target="_blank" rel="noreferrer">
          {GRANTS.source}
        </a>{" "}
        on {longDate(GRANTS.verifiedOn)}. The official RFA always decides eligibility, points and deadlines.
      </p>
    </main>
  );
}
