"use client";

/**
 * Small visual building blocks for organization-facing pages. One brand hue
 * (emerald) for single-series marks; text stays in slate ink; bars are thin
 * with rounded data-ends; every chart has a hover tooltip or labelled values.
 */
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compact, fmt } from "@/lib/orgSummary";

const BRAND = "#047857";

export function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-sm font-medium text-slate-700">{label}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

/** Completion as a ring: share of participants in finished runs who completed. */
export function Ring({ value, label }: { value: number | null; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-5">
      <svg viewBox="0 0 80 80" className="h-20 w-20 shrink-0" role="img" aria-label={`${label}: ${value === null ? "no data" : `${Math.round(v * 100)}%`}`}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={BRAND}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="45" textAnchor="middle" className="fill-slate-900 text-[17px] font-semibold">
          {value === null ? "—" : `${Math.round(v * 100)}%`}
        </text>
      </svg>
      <div className="text-sm font-medium text-slate-700">{label}</div>
    </div>
  );
}

/** Participant programming hours per program year — single series, value on each cap. */
export function YearColumns({ data }: { data: { year: number; participantHours: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} tick={{ fontSize: 12, fill: "#334155" }} />
          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} width={48} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            formatter={(v) => [`${fmt(Number(v))} hours`, "Participant programming hours"]}
            labelFormatter={(l) => `Program year ${l}`}
          />
          <Bar
            dataKey="participantHours"
            fill={BRAND}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            label={{ position: "top", fontSize: 12, fill: "#0f172a", formatter: (v: unknown) => compact(Number(v)) }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bars, value at the tip; hover shows the full numbers. */
export function HBars({
  rows,
}: {
  rows: { key: string; label: React.ReactNode; value: number; title: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.key} title={r.title} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 text-sm">
          <span className="truncate text-slate-700">{r.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-3 rounded-r" style={{ width: `${(r.value / max) * 100}%`, minWidth: 4, background: BRAND }} />
            <span className="shrink-0 tabular-nums text-xs text-slate-600">{compact(r.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** RIGHT 4.0 points as four segments; filled = estimated points. */
export function PointsMeter({ points, max = 4 }: { points: number; max?: number }) {
  return (
    <div>
      <div className="flex gap-1" role="img" aria-label={`${points} of ${max} points`}>
        {Array.from({ length: max * 2 }, (_, i) => (
          <span key={i} className={`h-4 flex-1 ${i % 2 ? "rounded-r" : "rounded-l"} ${i < points * 2 ? "bg-emerald-700" : "bg-slate-200"}`} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.7rem] text-slate-500">
        {Array.from({ length: max + 1 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </div>
    </div>
  );
}
