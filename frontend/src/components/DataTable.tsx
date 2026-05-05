import { ChartRow } from "@/lib/api";

export function DataTable({ rows }: { rows: ChartRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">No rows.</p>;
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/40">
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
            <tr
              key={i}
              className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/20"
            >
              {cols.map((c) => (
                <td key={c} className="px-3 py-2 tabular-nums">
                  {formatCell(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString();
    return v.toFixed(4);
  }
  if (typeof v === "string" && v.match(/^\d{4}-\d{2}-\d{2}/)) {
    return v.slice(0, 10);
  }
  return String(v);
}
