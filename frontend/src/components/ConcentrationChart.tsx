"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartRow } from "@/lib/api";
import { fmtCurrencyUSD, fmtPercent } from "@/lib/format";

type Props = {
  rows: ChartRow[];
  height?: number;
};

const REVENUE = "#6366f1"; // indigo-500
const DELAY = "#d97706"; // amber-600 — darker for contrast on white
const GRID = "#e2e8f0";

// Strip the shared "CL-" prefix so axis labels fit without overlap; the
// numeric ID is unambiguous since all 30 clients share the prefix.
function shortClientId(v: string): string {
  return v.startsWith("CL-") ? v.slice(3) : v;
}

// Combo chart: revenue as bars (left axis, USD), delay rate as a line
// (right axis, %). Reads concentration risk and service quality together
// for the top-N revenue clients.
export function ConcentrationChart({ rows, height = 320 }: Props) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        No data.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="client_id"
          fontSize={11}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={0}
          tickFormatter={shortClientId}
        />
        <YAxis
          yAxisId="left"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
          }
          width={60}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          width={45}
          domain={[0, "auto"]}
        />
        <Tooltip
          formatter={(value, name) => {
            const key = String(name ?? "");
            if (key === "revenue_usd") return [fmtCurrencyUSD(value as number), "Revenue"];
            if (key === "delay_rate") return [fmtPercent(value as number), "Delay rate"];
            return [String(value), key];
          }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
          labelStyle={{ fontWeight: 500 }}
          cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(v: string) => (v === "revenue_usd" ? "Revenue" : "Delay rate")}
        />
        <Bar
          yAxisId="left"
          dataKey="revenue_usd"
          fill={REVENUE}
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="delay_rate"
          stroke={DELAY}
          strokeWidth={2}
          dot={{ r: 3, fill: DELAY }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
