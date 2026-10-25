"use client";

/**
 * Chart cards for the TPW pages (design doc §28): participation over time,
 * RIGHT 4.0 readiness, completion per cohort, and data completeness. Each
 * reads only the runs in the current filtered view.
 */
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { completeness, right4Readiness, runCompletion, yearTrend } from "@/lib/dashboard";
import { totals, type Run } from "@/lib/runs";

export const BRAND = "#2f3190";
export const SUN = "#e3a92a";
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const pct = (x: number | null) => (x === null ? "—" : `${(x * 100).toFixed(1)}%`);

export function Card({ title, sub, children, className = "" }: { title: string; sub?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>
      <h2 className="font-serif text-xl text-slate-900">{title}</h2>
      {sub && <div className="mt-1 text-xs text-slate-600">{sub}</div>}
      {children}
    </section>
  );
}

const Key = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <span className="flex items-center gap-2">
    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} /> {children}
  </span>
);

function FunnelBar({ label, value, of }: { label: string; value: number; of: number }) {
  const share = of ? value / of : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium tabular-nums">
          {fmt(value)} · {pct(share)}
        </span>
      </div>
      <div className="mt-1.5 h-3 rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-800" style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

/** Enrolled and completed by program year; a two-bar funnel when there's only one year. */
export function TrendCard({ runs }: { runs: Run[] }) {
  const trend = yearTrend(runs);
  const t = totals(runs);
  const chart = trend.map((y) => ({ ...y, label: y.openRuns ? `${y.year}*` : String(y.year) }));
  if (trend.length < 2)
    return (
      <Card title="Participation funnel" sub={trend.length === 1 ? "One program year in this view — pick more years to see the trend." : undefined}>
        <div className="mt-4 space-y-5">
          <FunnelBar label="Enrolled" value={t.participants} of={t.participants} />
          <FunnelBar label="Completed" value={t.completed} of={t.participants} />
        </div>
      </Card>
    );
  return (
    <Card
      title="Participation over time"
      sub={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>By program year</span>
          <Key color={BRAND}>Enrolled</Key>
          <Key color={SUN}>Completed</Key>
        </div>
      }
    >
      <div className="mt-3 h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 12 }} tickFormatter={(v: number) => fmt(v)} width={48} />
            <Tooltip
              formatter={(v, name) => [fmt(Number(v)), name === "participants" ? "Enrolled" : "Completed"]}
              labelFormatter={(_, p) => {
                const y = p?.[0]?.payload as (typeof chart)[number] | undefined;
                return y ? `${y.year} · completion ${pct(y.completionRate)}${y.openRuns ? ` · ${y.openRuns} runs still open` : ""}` : "";
              }}
            />
            <Line type="monotone" dataKey="participants" stroke={BRAND} strokeWidth={2.5} dot={{ r: 4, fill: BRAND }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="completed" stroke={SUN} strokeWidth={2.5} dot={{ r: 4, fill: SUN }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {chart.some((y) => y.openRuns) && <p className="mt-2 text-xs text-slate-500">* Some cohorts that year are still open, so their completions aren&apos;t in yet.</p>}
    </Card>
  );
}

const Check = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <span className={`flex items-start gap-1.5 ${ok ? "text-slate-800" : "text-slate-400"}`}>
    <span aria-hidden className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold ${ok ? "bg-brand-800 text-white" : "bg-slate-200 text-slate-500"}`}>
      {ok ? "✓" : "–"}
    </span>
    <span>{children}</span>
  </span>
);

/** Per organization: does it meet RIGHT 4.0 prior service, and which extra half-points does its data back up? */
export function ReadinessCard({ runs }: { runs: Run[] }) {
  const rows = right4Readiness(runs);
  return (
    <Card title="RIGHT 4.0 readiness" sub="CDCR grant, applications due Nov 30, 2026 · from the programs each organization has reported">
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.org} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-slate-900">{r.org}</span>
              <span className="rounded-full bg-sun-200 px-2.5 py-0.5 text-xs font-semibold text-slate-900">+{r.additionalPoints} of 1.0 extra points</span>
            </div>
            <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
              <Check ok={r.meetsPriorService}>
                Prior service: {r.yearsWithProgramming.length ? r.yearsWithProgramming.join(", ") : "none"} (needs 2 of {r.window[0]}–{r.window[4]})
              </Check>
              <Check ok={r.underservedInstitutions.length > 0}>
                Underserved prison{r.underservedInstitutions.length ? `: ${r.underservedInstitutions.join(", ")}` : ""}
              </Check>
              <Check ok={r.specialPopulations}>Serves RHU/EOP/MHCB</Check>
              <Check ok={r.languages.length > 0}>Non-English program{r.languages.length ? `: ${r.languages.join(", ")}` : ""}</Check>
            </div>
            {r.next.length > 0 && <p className="mt-2 text-xs text-brand-900">Next: {r.next.join(" · ")}</p>}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="mt-4 text-sm text-slate-500">No organizations in this view.</p>}
      <p className="mt-3 text-xs text-slate-500">Budget points (1–3) depend on each organization&apos;s own budget and aren&apos;t shown.</p>
    </Card>
  );
}

function medianOf(xs: number[]): number | null {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** One dot per finished cohort, by program; dots well below the network's typical cohort are flagged for a check-in. */
export function RunCompletionCard({ runs }: { runs: Run[] }) {
  const points = runCompletion(runs);
  const median = medianOf(points.map((p) => p.rate));
  // Flag a cohort 20 points under its own program's median (programs differ by
  // design), and only if it's big enough to mean something.
  const programMedian = new Map([...new Set(points.map((p) => p.program))].map((name) => [name, medianOf(points.filter((p) => p.program === name).map((p) => p.rate))]));
  const flagged = points.filter((p) => p.participants >= 20 && p.rate < (programMedian.get(p.program) ?? 0) - 0.2).sort((a, b) => a.rate - b.rate);
  const ok = points.filter((p) => !flagged.includes(p));
  const programs = [...new Set(points.map((p) => p.program))];
  return (
    <Card
      title="Completion by cohort"
      sub={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>{points.length} finished cohorts · dashed line = median {pct(median)} · bigger dot = more participants</span>
          <Key color={SUN}>20+ points below its program&apos;s median</Key>
        </div>
      }
    >
      {points.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No finished cohorts with both counts in this view.</p>
      ) : (
        <>
          <div className="mt-3" style={{ height: programs.length * 56 + 50 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" dataKey="rate" domain={[0, 1]} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} tick={{ fill: "#475569", fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="program" allowDuplicatedCategory={false} tick={{ fill: "#334155", fontSize: 12 }} tickLine={false} axisLine={false} width={140} />
                <ZAxis type="number" dataKey="participants" range={[40, 260]} />
                {median !== null && <ReferenceLine x={median} stroke="#94a3b8" strokeDasharray="4 4" />}
                <Tooltip
                  cursor={false}
                  content={({ payload }) => {
                    const p = payload?.[0]?.payload as (typeof points)[number] | undefined;
                    return p ? (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow">
                        <div className="font-medium">
                          {p.program} · {p.prison} · {p.year ?? "—"}
                        </div>
                        <div className="text-slate-600">
                          {p.org} · {fmt(p.participants)} participants · {pct(p.rate)} completed
                        </div>
                      </div>
                    ) : null;
                  }}
                />
                <Scatter data={ok} fill={BRAND} fillOpacity={0.75} />
                <Scatter data={flagged} fill={SUN} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {flagged.length > 0 && (
            <p className="mt-2 text-xs text-slate-700">
              Worth a check-in (lockdowns, transfers and schedule clashes are common reasons):{" "}
              {flagged
                .slice(0, 3)
                .map((p) => `${p.program} at ${p.prison}${p.year ? ` (${p.year})` : ""}, ${pct(p.rate)}`)
                .join("; ")}
              {flagged.length > 3 ? ` and ${flagged.length - 3} more` : ""}.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

/** Share of each organization's runs with every number filled in, and what's missing most. */
export function CompletenessCard({ runs, className }: { runs: Run[]; className?: string }) {
  const rows = completeness(runs);
  return (
    <Card
      className={className}
      title="Data completeness"
      sub={
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span>Runs with every number filled in, per organization</span>
          <Key color={BRAND}>Complete</Key>
          <Key color="#fcd9a5">Missing a number</Key>
        </div>
      }
    >
      <ul className="mt-4 space-y-4">
        {rows.map((r) => (
          <li key={r.org}>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-900">{r.org}</span>
              <span className="tabular-nums text-slate-700">
                {r.complete} of {r.runs} complete
              </span>
            </div>
            <div className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-[#fcd9a5]">
              <div className="h-full bg-brand-800" style={{ width: `${(r.complete / r.runs) * 100}%` }} />
            </div>
            {r.missing.length > 0 && (
              <p className="mt-1 text-xs text-slate-600">Missing: {r.missing.map(([field, n]) => `${field} (${n})`).join(", ")}</p>
            )}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="mt-4 text-sm text-slate-500">No runs in this view.</p>}
    </Card>
  );
}
