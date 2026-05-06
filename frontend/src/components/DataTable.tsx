import { ChartRow, Unit } from "@/lib/api";
import { fmtByUnit, fmtMonthYear, fmtNumber } from "@/lib/format";

type Props = {
  rows: ChartRow[];
  // When provided, the column equal to `metricCol` is formatted with `metricUnit`.
  metricCol?: string | null;
  metricUnit?: Unit | null;
};

export function DataTable({ rows, metricCol, metricUnit }: Props) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">No rows.</p>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50/70 dark:bg-slate-800/30">
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="border-b border-slate-200 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/30"
            >
              {cols.map((c) => (
                <td key={c} className="px-3 py-2 tabular-nums">
                  {formatCell(r[c], c, metricCol, metricUnit)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(
  v: unknown,
  col: string,
  metricCol?: string | null,
  metricUnit?: Unit | null,
): string {
  if (v === null || v === undefined) return "—";

  if (metricCol && col === metricCol && typeof v === "number") {
    return fmtByUnit(v, metricUnit);
  }

  if (col === "period" && typeof v === "string") {
    return fmtMonthYear(v);
  }

  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    return v.slice(0, 10);
  }

  if (typeof v === "number") {
    if (Number.isInteger(v)) return fmtNumber(v);
    // Heuristic for unhinted floats: 2 decimals reads better than 4.
    return v.toFixed(2);
  }

  return String(v);
}
