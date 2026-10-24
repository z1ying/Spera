/** Enrolled → completed → credited (§8), person-level. */
export default function Funnel({ funnel }: { funnel: { enrolled: number; completed: number; credited: number } }) {
  const steps = [
    { label: "Enrolled", n: funnel.enrolled },
    { label: "Completed a program", n: funnel.completed },
    { label: "Earned a credit", n: funnel.credited },
  ];
  const max = Math.max(funnel.enrolled, 1);
  return (
    <ol className="space-y-3" aria-label="Participation funnel">
      {steps.map((s, i) => (
        <li key={s.label}>
          <div className="flex justify-between text-sm">
            <span>{s.label}</span>
            <span className="tabular-nums text-slate-700">
              {s.n.toLocaleString("en-US")}
              {i > 0 && funnel.enrolled > 0 && (
                <span className="ml-2 text-xs text-slate-500">{((s.n / funnel.enrolled) * 100).toFixed(0)}%</span>
              )}
            </span>
          </div>
          <div className="mt-1 h-3 rounded bg-slate-100">
            <div className="h-3 rounded bg-emerald-800 print:bg-emerald-800" style={{ width: `${(s.n / max) * 100}%`, opacity: 1 - i * 0.22 }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
