"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TierRow } from "@/lib/overview";

const SHORT: Record<string, string> = { none: "No credits", any: "Any credit", emc: "EMC", racc: "RACC" };

/**
 * Credit-tier gradient (§8): this network's rate next to CDCR's published
 * rate for the same tier. Suppressed tiers (n < 10) are left out (§7.3).
 */
export default function GradientChart({
  tiers,
  animate = true,
  fixedWidth,
}: {
  tiers: TierRow[];
  animate?: boolean;
  /** Render at a fixed pixel width (print report): no resize measuring, prints reliably. */
  fixedWidth?: number;
}) {
  const data = tiers
    .filter((t) => typeof t.rate === "number")
    .map((t) => ({
      tier: SHORT[t.tier] ?? t.tier,
      network: Math.round((t.rate as number) * 1000) / 10,
      published: t.anchor === null ? null : Math.round(t.anchor * 1000) / 10,
    }));
  const reduced =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const chart = (
        <BarChart data={data} width={fixedWidth} height={fixedWidth ? 260 : undefined} margin={{ top: 24, right: 8, left: -12, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="tier" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#334155" }} />
          <YAxis unit="%" domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
          <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: "#f1f5f9" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="network"
            name="This network (demo data)"
            fill="#065f46"
            radius={[3, 3, 0, 0]}
            isAnimationActive={animate && !reduced}
            animationDuration={900}
          >
            <LabelList dataKey="network" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 12, fill: "#0f172a" }} />
          </Bar>
          <Bar
            dataKey="published"
            name="CDCR published [2]"
            fill="#94a3b8"
            radius={[3, 3, 0, 0]}
            isAnimationActive={animate && !reduced}
            animationDuration={900}
          >
            <LabelList dataKey="published" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: "#475569" }} />
          </Bar>
        </BarChart>
  );
  return (
    <div className={fixedWidth ? "" : "h-72 w-full"} role="img" aria-label="Three-year conviction rate by credit tier, this network versus CDCR published rates">
      {fixedWidth ? chart : <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>}
    </div>
  );
}
