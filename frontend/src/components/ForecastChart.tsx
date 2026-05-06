"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ForecastPoint } from "@/lib/api";
import { fmtMonthYear, fmtNumber } from "@/lib/format";

type Props = {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
  height?: number;
};

const HIST = "#6366f1"; // indigo-500
const FCST = "#f59e0b"; // amber-500
const GRID = "#e2e8f0";

export function ForecastChart({ historical, forecast, height = 320 }: Props) {
  // Merge into one row per period so both series share the same x axis.
  const periods = new Map<string, { period: string; historical?: number; forecast?: number }>();
  for (const p of historical) {
    const key = fmtMonthYear(p.period);
    periods.set(key, { period: key, historical: p.value });
  }
  for (const p of forecast) {
    const key = fmtMonthYear(p.period);
    const existing = periods.get(key) ?? { period: key };
    existing.forecast = p.value;
    periods.set(key, existing);
  }
  // Bridge the join: the last historical month is also drawn as the start of the
  // forecast line so the two segments connect visually.
  const lastHist = historical.at(-1);
  if (lastHist) {
    const key = fmtMonthYear(lastHist.period);
    const existing = periods.get(key);
    if (existing && existing.forecast === undefined) {
      existing.forecast = lastHist.value;
    }
  }

  const data = Array.from(periods.values());

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="period" fontSize={12} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={50}
          tickFormatter={(v: number) => fmtNumber(v)}
        />
        <Tooltip
          formatter={(v: unknown) => fmtNumber(typeof v === "number" ? v : Number(v))}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
          labelStyle={{ fontWeight: 500 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="historical"
          name="Historical"
          stroke={HIST}
          strokeWidth={2}
          dot={{ r: 3, fill: HIST }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          name="Forecast"
          stroke={FCST}
          strokeDasharray="6 4"
          strokeWidth={2}
          dot={{ r: 3, fill: FCST }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
