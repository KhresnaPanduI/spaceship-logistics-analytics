import type { ForecastResult } from "@/lib/api";

export function ForecastPlanCard({ plan }: { plan: ForecastResult["plan"] }) {
  const params = plan.params ?? {};
  const paramEntries = Object.entries(params);
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-5 text-sm dark:border-slate-800/70 dark:bg-slate-900/40">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        Forecast plan
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        <Row label="Grain" value={<code>{plan.grain}</code>} />
        <Row label="Entity" value={<code>{plan.entity}</code>} />
        <Row label="Method used" value={<code>{plan.method_used}</code>} />
        <Row label="Horizon" value={`${plan.horizon_months} month(s)`} />
        {paramEntries.length > 0 && (
          <Row
            label="Parameters"
            full
            value={
              <span className="font-mono text-xs">
                {paramEntries
                  .map(([k, v]) => `${k}=${formatParam(v)}`)
                  .join(", ")}
              </span>
            }
          />
        )}
      </dl>
    </div>
  );
}

function formatParam(v: unknown): string {
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : v.toFixed(3);
  }
  return String(v);
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
