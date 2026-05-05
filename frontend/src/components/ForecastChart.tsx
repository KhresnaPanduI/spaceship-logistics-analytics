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
import { fmtDateISO } from "@/lib/format";

type Props = {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
  height?: number;
};

export function ForecastChart({ historical, forecast, height = 320 }: Props) {
  // Merge into one row per period so both series share the same x axis.
  const periods = new Map<string, { period: string; historical?: number; forecast?: number }>();
  for (const p of historical) {
    const key = fmtDateISO(p.period);
    periods.set(key, { period: key, historical: p.value });
  }
  for (const p of forecast) {
    const key = fmtDateISO(p.period);
    const existing = periods.get(key) ?? { period: key };
    existing.forecast = p.value;
    periods.set(key, existing);
  }
  // Bridge the join: the last historical month is also drawn as the start of the
  // forecast line so the two segments connect visually.
  const lastHist = historical.at(-1);
  if (lastHist) {
    const key = fmtDateISO(lastHist.period);
    const existing = periods.get(key);
    if (existing && existing.forecast === undefined) {
      existing.forecast = lastHist.value;
    }
  }

  const data = Array.from(periods.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="period" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="historical"
          name="Historical"
          stroke="#2563eb"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          name="Forecast"
          stroke="#f59e0b"
          strokeDasharray="6 4"
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
