"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartRow, VizSpec } from "@/lib/api";
import { fmtDateISO } from "@/lib/format";

type Props = {
  rows: ChartRow[];
  viz: VizSpec;
  height?: number;
};

const PALETTE = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

export function ChartRenderer({ rows, viz, height = 300 }: Props) {
  if (!rows || rows.length === 0) {
    return <EmptyState />;
  }

  const xKey = viz.x ?? "x";
  const yKey = viz.y ?? "y";

  // Pre-format dates on the period axis so charts render readable labels.
  const data = rows.map((r) => {
    if (xKey === "period" && typeof r[xKey] === "string") {
      return { ...r, [xKey]: fmtDateISO(r[xKey] as string) };
    }
    return r;
  });

  if (viz.type === "number") {
    const v = rows[0]?.[yKey] ?? null;
    return (
      <div className="flex h-32 items-center justify-center text-5xl font-semibold tabular-nums">
        {v === null ? "—" : typeof v === "number" ? v.toLocaleString() : String(v)}
      </div>
    );
  }

  if (viz.type === "table") {
    return <TableView rows={rows} />;
  }

  if (viz.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={xKey} fontSize={12} />
          <YAxis fontSize={12} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={PALETTE[0]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // bar / stacked_bar
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Bar dataKey={yKey} fill={PALETTE[0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyState() {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-slate-500">
      No data.
    </div>
  );
}

function TableView({ rows }: { rows: ChartRow[] }) {
  const cols = Object.keys(rows[0] ?? {});
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-300"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
              {cols.map((c) => (
                <td key={c} className="px-3 py-2 tabular-nums">
                  {r[c] === null ? "—" : String(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
