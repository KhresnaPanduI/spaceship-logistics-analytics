// Surface the system's capabilities before any question is asked.
// Mirrors the registry on the backend — kept in sync manually since the registry
// changes only at code-edit time.

const METRICS = [
  { name: "total_orders", unit: "count" },
  { name: "delivered_orders", unit: "count" },
  { name: "delayed_orders", unit: "count" },
  { name: "on_time_rate", unit: "%" },
  { name: "delay_rate", unit: "%" },
  { name: "avg_delivery_days", unit: "days" },
  { name: "total_revenue_usd", unit: "USD" },
];

const BREAKDOWNS = [
  "carrier",
  "region",
  "product_category",
  "warehouse",
  "client_id",
  "destination_city",
];

const TIME_GRAINS = ["day", "week", "month", "year", "none"];

export function AskEmptyState() {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-6 dark:border-slate-800/70 dark:bg-slate-900">
      <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        What you can ask
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        The AI routes natural-language questions to one of two structured tools:
        <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">
          query_metric
        </code>
        for analytics, or
        <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">
          forecast
        </code>
        for demand prediction. Anything outside the registry below returns a clear
        &quot;unsupported&quot; response rather than a hallucinated answer.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Section title="Metrics">
          <ul className="mt-2 space-y-1 text-xs">
            {METRICS.map((m) => (
              <li key={m.name} className="flex items-baseline justify-between gap-3">
                <code className="text-slate-800 dark:text-slate-200">{m.name}</code>
                <span className="text-slate-400">{m.unit}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Breakdowns">
          <ul className="mt-2 space-y-1 text-xs">
            {BREAKDOWNS.map((b) => (
              <li key={b}>
                <code className="text-slate-800 dark:text-slate-200">{b}</code>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Time grains">
          <ul className="mt-2 space-y-1 text-xs">
            {TIME_GRAINS.map((g) => (
              <li key={g}>
                <code className="text-slate-800 dark:text-slate-200">{g}</code>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Forecasts run at the
            <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
              product_category × month
            </code>
            grain. SKU-level forecasting is out of scope (355 unique SKUs over 400
            rows is too sparse to model).
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {title}
      </div>
      {children}
    </div>
  );
}
