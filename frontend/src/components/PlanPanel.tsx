import { QueryPlan } from "@/lib/api";

export function PlanPanel({ plan }: { plan: QueryPlan }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
      <div className="font-medium text-slate-900 dark:text-slate-100">Query plan</div>
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        <Row label="Metric" value={plan.metric} />
        <Row label="Time grain" value={plan.time_grain} />
        <Row label="Breakdown" value={plan.breakdown ?? "—"} />
        <Row
          label="Date range"
          value={
            plan.date_from || plan.date_to
              ? `${plan.date_from ?? "…"} → ${plan.date_to ?? "…"}`
              : "—"
          }
        />
        <Row
          label="Filters"
          value={
            plan.filters.length === 0
              ? "—"
              : plan.filters
                  .map(
                    (f) =>
                      `${f.field} ${f.op} ${
                        Array.isArray(f.value)
                          ? "[" + (f.value as unknown[]).join(", ") + "]"
                          : String(f.value)
                      }`,
                  )
                  .join("; ")
          }
          full
        />
      </dl>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-300">
          SQL executed
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-slate-100">
          {plan.sql}
        </pre>
      </details>
    </div>
  );
}

function Row({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="inline text-slate-500 dark:text-slate-400">{label}: </dt>
      <dd className="inline text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}
