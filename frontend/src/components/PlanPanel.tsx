import { QueryPlan } from "@/lib/api";

export function PlanPanel({ plan, rowCount }: { plan: QueryPlan; rowCount: number }) {
  // Surfaces the deterministic-execution story: the panel shows the exact SQL
  // we ran, how many rows came back, and how long it took. No LLM math.
  const ms = plan.execution_ms;
  const msLabel = ms < 1 ? "<1ms" : `${ms.toFixed(ms < 10 ? 1 : 0)}ms`;
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-5 text-sm dark:border-slate-800/70 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          Query plan
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] tabular-nums text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {rowCount} {rowCount === 1 ? "row" : "rows"} · {msLabel}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        <Row label="Metric" value={<code>{plan.metric}</code>} />
        <Row label="Time grain" value={plan.time_grain} />
        <Row label="Breakdown" value={plan.breakdown ? <code>{plan.breakdown}</code> : "—"} />
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
          full
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
        />
      </dl>
      <details className="group mt-4">
        <summary className="cursor-pointer select-none text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
          <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span>
          SQL executed
        </summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
          {plan.sql}
        </pre>
      </details>
    </div>
  );
}

function Row({
  label,
  value,
  full = false,
}: {
  label: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="inline text-slate-500 dark:text-slate-400">{label}: </dt>
      <dd className="inline font-medium text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}
