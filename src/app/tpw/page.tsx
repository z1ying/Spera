import { loadRuns } from "@/lib/loadRuns";
import { groupTotals, missingFields, programYear, right4Signals, totals, type Run, type Totals } from "@/lib/runs";
import { isTpwSignedIn } from "@/lib/tpwAuth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "TPW dashboard — ImpactLink" };

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

function Card({ value, label, sub, primary }: { value: string; label: string; sub?: string; primary?: boolean }) {
  return (
    <div className={`rounded-xl border bg-white p-5 ${primary ? "border-emerald-800 ring-1 ring-emerald-800" : "border-slate-200"}`}>
      <div className={`text-3xl font-semibold tabular-nums ${primary ? "text-emerald-900" : ""}`}>{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-800">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 w-full min-w-16 rounded bg-slate-100">
      <div className="h-2 rounded bg-emerald-800" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

function TotalsRow({ label, t, max, extra }: { label: React.ReactNode; t: Totals; max: number; extra?: React.ReactNode }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-3">{label}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{t.runs}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{fmt(t.participants)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{fmt(t.completed)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{pct(t.completionRate)}</td>
      <td className="py-2 pr-3 text-right tabular-nums font-medium">{fmt(t.participantHours)}</td>
      <td className="w-32 py-2">
        <Bar value={t.participantHours} max={max} />
      </td>
      {extra}
    </tr>
  );
}

const HEAD = ["Runs", "Participants", "Completed", "Completion", "Participant hours", ""];

function Table({ title, first, rows, extraHead }: { title: string; first: string; rows: React.ReactNode; extraHead?: string[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-1 pr-3">{first}</th>
              {[...HEAD, ...(extraHead ?? [])].map((h, i) => (
                <th key={i} className={`py-1 pr-3 ${i < 5 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </section>
  );
}

// TPW dashboard — design doc §28. Real data: TPW's program-run reports plus
// form submissions. TPW staff only.
export default async function TpwDashboard() {
  if (!(await isTpwSignedIn())) return <LoginForm />;

  const runs = await loadRuns();
  const t = totals(runs);
  const years = groupTotals(runs, programYear).sort((a, b) => Number(a.key) - Number(b.key));
  const orgs = groupTotals(runs, (r) => r.orgName).sort((a, b) => String(a.key).localeCompare(String(b.key)));
  const prisons = groupTotals(runs, (r) => r.facilityCode).sort((a, b) => b.totals.participantHours - a.totals.participantHours);
  const incomplete = runs.filter((r) => missingFields(r).length > 0);
  const yearSpan = years.length ? `${years[0].key}–${years[years.length - 1].key}` : "—";
  const max = (xs: { totals: Totals }[]) => Math.max(0, ...xs.map((x) => x.totals.participantHours));
  const facilityOf = (code: string): Run => runs.find((r) => r.facilityCode === code)!;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-800">TPW network · program reporting</p>
          <h1 className="mt-1 text-3xl font-semibold">Programming across the network</h1>
          <p className="mt-1 text-sm text-slate-600">
            {orgs.length} organizations · {t.runs} program runs · {prisons.length} prisons · program years {yearSpan}
          </p>
        </div>
        <a href="/api/tpw/export" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50">
          Download all runs (CSV)
        </a>
      </div>

      <section aria-label="Core numbers" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card primary value={fmt(t.participantHours)} label="Participant programming hours" sub="Completed × programming hours, summed" />
        <Card value={fmt(t.participants)} label="Participants" sub={`${t.inProgressRuns} runs still in progress`} />
        <Card value={fmt(t.completed)} label="Completed" sub={`${pct(t.completionRate)} of participants in finished runs`} />
        <Card value={fmt(t.programmingHours)} label="Programming hours offered" sub="Hours per participant, summed over runs" />
      </section>

      <div className="mt-6 grid gap-6">
        <Table
          title="By program year"
          first="Year"
          rows={years.map((y) => <TotalsRow key={y.key} label={y.key} t={y.totals} max={max(years)} />)}
        />

        <Table
          title="By organization"
          first="Organization"
          extraHead={["RIGHT 4.0 signals"]}
          rows={orgs.map((o) => {
            const s = right4Signals(o.runs);
            return (
              <TotalsRow
                key={o.key}
                label={
                  <>
                    <span className="font-medium">{o.key}</span>
                    <span className="block text-xs text-slate-500">{[...new Set(o.runs.map((r) => r.programName))].join(" · ")}</span>
                  </>
                }
                t={o.totals}
                max={max(orgs)}
                extra={
                  <td className="py-2 pl-3 text-xs text-slate-700">
                    {s.underservedRuns > 0 ? `${s.underservedRuns} runs at underserved prisons (${s.underservedInstitutions.join(", ")})` : "No underserved-prison runs"}
                    {s.specialPopulationRuns > 0 && ` · ${s.specialPopulationRuns} serving RHU/EOP/MHCB`}
                    {s.languages.length > 0 && ` · offered in ${s.languages.join(", ")}`}
                    <span className="block font-medium text-emerald-900">+{s.additionalPoints} point evidence</span>
                  </td>
                }
              />
            );
          })}
        />

        <Table
          title="By prison"
          first="Prison"
          rows={prisons.map((p) => {
            const f = facilityOf(String(p.key));
            return (
              <TotalsRow
                key={p.key}
                label={
                  <>
                    {f.facilityName}
                    {f.underserved && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-emerald-900">RIGHT 4.0 underserved</span>}
                    {f.womens && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-700">Women&apos;s</span>}
                  </>
                }
                t={p.totals}
                max={max(prisons)}
              />
            );
          })}
        />

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold">Needs a follow-up ({incomplete.length})</h2>
          <p className="mt-1 text-sm text-slate-700">Runs with missing numbers are counted only where the number is known — nothing is guessed.</p>
          <ul className="mt-3 space-y-1 text-sm">
            {incomplete.map((r) => (
              <li key={r.id}>
                <span className="font-medium">{r.orgName}</span> — {r.programName}, {r.facilityCode} ({r.status}, started {day(r.startDate)}):{" "}
                <span className="text-amber-900">missing {missingFields(r).join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="mt-8 text-xs leading-relaxed text-slate-500">
        <p>
          Definitions follow TPW&apos;s Collective Impact Report: participant programming hours = participants completed × total
          programming hours; program year = year of the start date. RIGHT 4.0 signals: CDCR&apos;s RIGHT Grant 4.0 RFA (released
          Oct 1, 2026, due Nov 30, 2026) gives 1–3 points by budget plus up to two half-points for programming at an underserved
          institution (Attachment A), serving RHU/EOP/MHCB, or offering a program in a language other than English.
        </p>
      </footer>
    </main>
  );
}
