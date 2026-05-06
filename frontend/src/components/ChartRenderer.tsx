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
import { fmtAxisByUnit, fmtByUnit, fmtMonthYear } from "@/lib/format";
import { useIsMobile } from "@/lib/useIsMobile";

type Props = {
  rows: ChartRow[];
  viz: VizSpec;
  height?: number;
};

const ACCENT = "#6366f1"; // indigo-500
const ACCENT_DARK = "#4f46e5"; // indigo-600
const GRID = "#e2e8f0";

export function ChartRenderer({ rows, viz, height = 300 }: Props) {
  const isMobile = useIsMobile();

  if (!rows || rows.length === 0) {
    return <EmptyState />;
  }

  const xKey = viz.x ?? "x";
  const yKey = viz.y ?? "y";
  const yUnit = viz.y_unit ?? null;

  const isPeriod = xKey === "period";

  // Tilt labels when they'd otherwise overlap. Time-series always tilts since
  // 12 monthly ticks don't fit horizontally in a half-width card. Categorical
  // bar/line stays horizontal on desktop and tilts only on narrow viewports.
  const needsAngle = isMobile || isPeriod;
  const xAxisProps = needsAngle
    ? {
        angle: isMobile ? -35 : -25,
        textAnchor: "end" as const,
        height: 50,
        fontSize: isMobile ? 10 : 11,
      }
    : { angle: 0, textAnchor: "middle" as const, height: 30, fontSize: 11 };

  // Pre-format dates on the period axis so chart labels read naturally.
  const data = rows.map((r) => {
    if (isPeriod && typeof r[xKey] === "string") {
      return { ...r, [xKey]: fmtMonthYear(r[xKey] as string) };
    }
    return r;
  });

  if (viz.type === "number") {
    const v = rows[0]?.[yKey] ?? null;
    return (
      <div className="flex h-32 items-center justify-center text-5xl font-semibold tabular-nums tracking-tight">
        {fmtByUnit(v, yUnit)}
      </div>
    );
  }

  if (viz.type === "table") {
    return <TableView rows={rows} />;
  }

  const tooltipFormatter = (value: unknown) => [fmtByUnit(value, yUnit), yKey];
  const yTickFormatter = (v: number) => fmtAxisByUnit(v, yUnit);

  if (viz.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            interval={isMobile ? "preserveStartEnd" : 0}
            {...xAxisProps}
          />
          <YAxis
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={yTickFormatter}
            width={60}
          />
          <Tooltip
            formatter={tooltipFormatter}
            contentStyle={tooltipStyle}
            labelStyle={{ fontWeight: 500 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={ACCENT}
            strokeWidth={2}
            dot={{ r: 3, fill: ACCENT }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // bar / stacked_bar
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={0}
          {...xAxisProps}
        />
        <YAxis
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={yTickFormatter}
          width={60}
        />
        <Tooltip
          formatter={tooltipFormatter}
          contentStyle={tooltipStyle}
          labelStyle={{ fontWeight: 500 }}
          cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey={yKey} fill={ACCENT} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
};

// Re-exported so dashboard cards that want a same-style accent can match.
export const CHART_ACCENT = { light: ACCENT, dark: ACCENT_DARK };

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
                className="border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300"
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
